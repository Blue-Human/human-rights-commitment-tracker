// Review queue for monitoring candidates.
// GET  returns candidates the tracker has collected and nobody has classified yet, grouped by
//      recommendation. POST records a verdict per candidate. Used by a reviewer or an external
//      assistant; it never writes evidence or assessments.
// Auth: "Authorization: Bearer <REVIEW_QUEUE_API_KEY>".

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY = Deno.env.get("REVIEW_QUEUE_API_KEY");
const REST = `${SUPABASE_URL}/rest/v1`;
// Same threshold the tracker uses for classified items.
const PUBLIC_RELEVANCE = 0.8;
const CATEGORIES = ["need_context", "implementation_candidate", "contradiction", "noise"] as const;
type Category = typeof CATEGORIES[number];

type Item = {
  id: string; commitment_id: string; kind: string; relation: string; title: string; publisher: string | null;
  source_domain: string | null; source_type: string; published_at: string | null; excerpt: string | null;
};
type Verdict = { id: string; category: Category; relevance: number; note: string };

async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(`${REST}/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

const PENDING = "status=eq.auto&classification=is.null";

async function listPending(limit: number) {
  const items: Item[] = await rest(`monitoring_items?select=id,commitment_id,kind,relation,title,publisher,source_domain,source_type,published_at,excerpt&${PENDING}&order=commitment_id,published_at.desc.nullslast&limit=${limit}`) || [];
  const all: Array<{ id: string }> = await rest(`monitoring_items?select=id&${PENDING}&limit=5000`) || [];
  const ids = [...new Set(items.map((i) => i.commitment_id))];
  const recs: Array<{ id: string; public_id: string; recommendation_number: string | null; title: string; original_text: string }> = ids.length
    ? await rest(`commitments?select=id,public_id,recommendation_number,title,original_text&id=in.(${ids.join(",")})`) || []
    : [];
  return {
    pending_total: all.length,
    returned: items.length,
    recommendations: recs.map((r) => ({
      public_id: r.public_id,
      number: r.recommendation_number,
      title: r.title,
      text: r.original_text,
      candidates: items.filter((i) => i.commitment_id === r.id).map((i) => ({
        id: i.id,
        title: i.title,
        publisher: i.publisher || i.source_domain,
        date: i.published_at?.slice(0, 10) ?? null,
        source_type: i.source_type,
        excerpt: i.excerpt,
      })),
    })),
  };
}

// Mirrors the tracker: a verdict moves an item between monitoring channels, never into evidence.
function patchFor(item: Item, v: Verdict, reviewer: string) {
  const official = item.source_type === "official_web";
  const legal = item.kind === "legal_change";
  let kind = item.kind, relation = item.relation;
  if (v.category === "need_context") { kind = official ? "statement" : "need_context"; relation = official ? "context" : "supports_need"; }
  if (v.category === "implementation_candidate") { kind = legal ? "legal_change" : "implementation_candidate"; relation = "supports_progress"; }
  if (v.category === "contradiction") { kind = legal ? "legal_change" : "implementation_candidate"; relation = "contradicts_progress"; }
  return {
    kind, relation,
    relevance_score: Number(v.relevance.toFixed(3)),
    is_public: v.category !== "noise" && v.relevance >= PUBLIC_RELEVANCE,
    classification: v.category,
    classification_note: v.note,
    classifier: reviewer,
    classified_at: new Date().toISOString(),
  };
}

function parseVerdicts(body: unknown): Verdict[] | string {
  const list = (body as { verdicts?: unknown })?.verdicts;
  if (!Array.isArray(list) || !list.length) return "verdicts must be a non-empty array";
  if (list.length > 100) return "at most 100 verdicts per request";
  const out: Verdict[] = [];
  for (const raw of list) {
    const v = raw as Record<string, unknown>;
    if (typeof v.id !== "string" || !/^[0-9a-f-]{36}$/i.test(v.id)) return "each verdict needs the candidate id";
    if (!CATEGORIES.includes(v.category as Category)) return `category must be one of ${CATEGORIES.join(", ")}`;
    const relevance = Number(v.relevance);
    if (!(relevance >= 0 && relevance <= 1)) return "relevance must be between 0 and 1";
    if (typeof v.note !== "string" || !v.note.trim()) return "each verdict needs a note";
    out.push({ id: v.id, category: v.category as Category, relevance, note: v.note.trim().slice(0, 500) });
  }
  return out;
}

Deno.serve(async (req) => {
  if (!API_KEY) return Response.json({ error: "review queue is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${API_KEY}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    if (req.method === "GET") {
      const limit = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 40));
      return Response.json(await listPending(limit));
    }
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      const verdicts = parseVerdicts(body);
      if (typeof verdicts === "string") return Response.json({ error: verdicts }, { status: 400 });
      const reviewer = `external:${String((body as { reviewer?: unknown }).reviewer || "assistant").replace(/[^\w .-]/g, "").slice(0, 40)}`;
      // Only candidates no person has reviewed or rejected can be classified here.
      const items: Item[] = await rest(`monitoring_items?select=id,commitment_id,kind,relation,title,publisher,source_domain,source_type,published_at,excerpt&status=eq.auto&id=in.(${verdicts.map((v) => v.id).join(",")})`) || [];
      const byId = new Map(items.map((i) => [i.id, i]));
      let updated = 0, published = 0;
      for (const v of verdicts) {
        const item = byId.get(v.id);
        if (!item) continue;
        const patch = patchFor(item, v, reviewer);
        await rest(`monitoring_items?id=eq.${v.id}&status=eq.auto`, { method: "PATCH", body: JSON.stringify(patch) });
        updated++;
        if (patch.is_public) published++;
      }
      const left: Array<{ id: string }> = await rest(`monitoring_items?select=id&${PENDING}&limit=5000`) || [];
      return Response.json({ updated, shown_publicly: published, not_found_or_already_reviewed: verdicts.length - updated, pending_total: left.length });
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (e) {
    return Response.json({ error: String(e).slice(0, 300) }, { status: 500 });
  }
});
