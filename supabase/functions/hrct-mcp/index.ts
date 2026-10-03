// MCP server (Streamable HTTP, stateless) that exposes the HRCT review service as tools for a
// ChatGPT plugin or any other MCP client. It is only an adapter: every tool call is forwarded
// to the review-queue function, which holds all the rules.
//
// Endpoint: /functions/v1/hrct-mcp/<HRCT_MCP_TOKEN>/mcp
// ChatGPT cannot send custom headers or API keys to an MCP server, and this server can write
// to the public record, so the access token is part of the URL. Without it the server answers
// 404. Clients that can send headers may use "Authorization: Bearer <HRCT_MCP_TOKEN>" instead.
// The review-queue key never leaves the server.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { TOOLS } from "./tools.ts";

const MCP_TOKEN = Deno.env.get("HRCT_MCP_TOKEN");
const REVIEW_QUEUE_API_KEY = Deno.env.get("REVIEW_QUEUE_API_KEY");
const REVIEW_QUEUE_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/review-queue`;

const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = { name: "hrct-review", title: "HRCT periodic review", version: "1.0.0" };
const INSTRUCTIONS =
  "Tools for the periodic research review of the Human Rights Commitment Tracker. Get a batch with get_research_batch, research each recommendation in official and institutional sources, then file one review per recommendation with submit_reviews. \"implemented\" can only be proposed; resolve_confirmation is used only on a reviewer's explicit instruction and code.";

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

function sameSecret(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authorized(req: Request): boolean {
  if (!MCP_TOKEN) return false;
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const inPath = segments.some((s) => sameSecret(s, MCP_TOKEN));
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  return inPath || sameSecret(bearer, MCP_TOKEN);
}

async function callTool(name: string, args: Record<string, unknown>) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  const { method, path, body } = tool.request(args);
  let status = 0, payload: unknown;
  try {
    const r = await fetch(`${REVIEW_QUEUE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${REVIEW_QUEUE_API_KEY}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(140000),
    });
    status = r.status;
    const text = await r.text();
    try { payload = JSON.parse(text); } catch { payload = { error: text.slice(0, 500) }; }
  } catch (e) {
    return { isError: true, content: [{ type: "text", text: `The review service could not be reached: ${String(e).slice(0, 200)}` }] };
  }
  // A rejected request comes back as a tool error with the service's explanation, so it can be corrected and retried.
  if (status < 200 || status >= 300) {
    return { isError: true, content: [{ type: "text", text: `The review service rejected the request (HTTP ${status}): ${JSON.stringify(payload)}` }] };
  }
  return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
}

async function handle(msg: RpcRequest): Promise<Record<string, unknown> | null> {
  const isNotification = msg.id === undefined || msg.id === null;
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id: msg.id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id: msg.id ?? null, error: { code, message } });

  if (isNotification) return null;
  switch (msg.method) {
    case "initialize": {
      const requested = String(msg.params?.protocolVersion || "");
      return reply({
        protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS.map(({ request: _request, ...definition }) => definition) });
    case "tools/call": {
      const name = String(msg.params?.name || "");
      const args = (msg.params?.arguments as Record<string, unknown>) || {};
      return reply(await callTool(name, args));
    }
    default:
      return fail(-32601, `Method not found: ${msg.method}`);
  }
}

const JSON_HEADERS = { "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (!authorized(req)) return new Response("Not found", { status: 404 });
  if (!REVIEW_QUEUE_API_KEY) return new Response("Server is not configured", { status: 503 });
  // Stateless server: no server-initiated stream and no session to delete.
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }), { status: 400, headers: JSON_HEADERS });
  }
  const batch = Array.isArray(body);
  const messages = (batch ? body : [body]) as RpcRequest[];
  if (!messages.length || messages.some((m) => !m || m.jsonrpc !== "2.0" || typeof m.method !== "string")) {
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } }), { status: 400, headers: JSON_HEADERS });
  }
  const responses = (await Promise.all(messages.map(handle))).filter((r) => r !== null);
  // Only notifications or responses were sent: nothing to return.
  if (!responses.length) return new Response(null, { status: 202 });
  return new Response(JSON.stringify(batch ? responses : responses[0]), { status: 200, headers: JSON_HEADERS });
});
