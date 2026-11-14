// Service-role access to the project's REST API, shared by the review-queue modules.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REST = `${SUPABASE_URL}/rest/v1`;

export async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${REST}/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

export const rpc = (name: string, args: unknown) => rest(`rpc/${name}`, { method: "POST", body: JSON.stringify(args) });

// A source that cannot be opened is never relied on: it may be mistyped or made up.
export async function opens(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "BlueHuman-HRCT/1.0 (+https://bluehuman.org)" }, redirect: "follow", signal: AbortSignal.timeout(12000) });
    await r.body?.cancel();
    return r.status >= 200 && r.status < 400;
  } catch {
    return false;
  }
}

export const reviewerOf = (body: unknown) =>
  `external:${String((body as { reviewer?: unknown })?.reviewer || "assistant").replace(/[^\w .-]/g, "").slice(0, 40)}`;
