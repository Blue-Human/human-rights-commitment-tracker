// Review service for the Human Rights Commitment Tracker. Used by a reviewer or an external
// assistant acting for one.
//   GET  /review-queue/batch           the next recommendations due for a research review
//   POST /review-queue/reviews         a review per recommendation (may update its assessment)
//   GET  /review-queue/confirmations   "implemented" proposals waiting for a person's decision
//   POST /review-queue/confirmations   confirm or reject one (needs the reviewer's confirmation code)
//   GET  /review-queue                 monitoring candidates collected by the tracker, not yet classified
//   POST /review-queue                 a verdict per candidate
//   POST /review-queue/findings        new context sources found for a recommendation
// Auth: "Authorization: Bearer <REVIEW_QUEUE_API_KEY>".

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { opens, rest, reviewerOf } from "./db.ts";
import { getBatch, listConfirmations, resolveConfirmation, submitReviews } from "./research.ts";

const API_KEY = Deno.env.get("REVIEW_QUEUE_API_KEY");
// Same threshold the tracker uses for classified items.
const PUBLIC_RELEVANCE = 0.8;
const CATEGORIES = ["need_context", "implementation_candidate", "contradiction", "noise"] as const;
type Category = typeof CATEGORIES[number];

type Item = {
  id: string; commitment_id: string; kind: string; relation: string; title: string; publisher: string | null;
  source_domain: string | null; source_type: string; published_at: string | null; excerpt: string | null;
};
type Verdict = { id: string; category: Category; relevance: number; note: string };

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

const SOURCE_KINDS = ["news", "official", "legislation", "un_body", "civil_society"] as const;
type Finding = {
  public_id: string; url: string; title: string; publisher: string | null; date: string | null;
  source_kind: typeof SOURCE_KINDS[number]; category: Exclude<Category, "noise">; relevance: number; note: string;
};

function parseFindings(body: unknown): Finding[] | string {
  const list = (body as { findings?: unknown })?.findings;
  if (!Array.isArray(list) || !list.length) return "findings must be a non-empty array";
  if (list.length > 25) return "at most 25 findings per request";
  const out: Finding[] = [];
  for (const raw of list) {
    const f = raw as Record<string, unknown>;
    if (typeof f.public_id !== "string" || !f.public_id) return "each finding needs the recommendation public_id";
    if (typeof f.url !== "string" || !/^https?:\/\/[^\s]+$/.test(f.url)) return "each finding needs the source url";
    if (typeof f.title !== "string" || !f.title.trim()) return "each finding needs the source's own title";
    if (!["need_context", "implementation_candidate", "contradiction"].includes(f.category as string)) return "category must be need_context, implementation_candidate or contradiction";
    if (!SOURCE_KINDS.includes(f.source_kind as typeof SOURCE_KINDS[number])) return `source_kind must be one of ${SOURCE_KINDS.join(", ")}`;
    const relevance = Number(f.relevance);
    if (!(relevance >= 0 && relevance <= 1)) return "relevance must be between 0 and 1";
    if (typeof f.note !== "string" || !f.note.trim()) return "each finding needs a note";
    const date = typeof f.date === "string" && /^\d{4}-\d{2}-\d{2}/.test(f.date) ? f.date.slice(0, 10) : null;
    out.push({
      public_id: f.public_id, url: f.url, title: f.title.trim().slice(0, 400),
      publisher: typeof f.publisher === "string" && f.publisher.trim() ? f.publisher.trim().slice(0, 120) : null,
      date, source_kind: f.source_kind as Finding["source_kind"], category: f.category as Finding["category"],
      relevance, note: f.note.trim().slice(0, 500),
    });
  }
  return out;
}

async function addFindings(findings: Finding[], reviewer: string) {
  const recs: Array<{ id: string; public_id: string; commitment_date: string | null; sources: { publication_date: string | null } | null }> = await rest(`commitments?select=id,public_id,commitment_date,sources(publication_date)&publication_status=eq.published&public_id=in.(${[...new Set(findings.map((f) => `"${f.public_id}"`))].join(",")})`) || [];
  const idOf = new Map(recs.map((r) => [r.public_id, r.id]));
  // A development dated before the recommendation was made cannot be a response to it.
  const sinceOf = new Map(recs.map((r) => [r.public_id, r.commitment_date || r.sources?.publication_date || null]));
  const results = await Promise.all(findings.map(async (f) => {
    const commitmentId = idOf.get(f.public_id);
    if (!commitmentId) return { url: f.url, outcome: "unknown_recommendation" };
    const existing = await rest(`monitoring_items?select=id&commitment_id=eq.${commitmentId}&url=eq.${encodeURIComponent(f.url)}&limit=1`);
    if (existing?.length) return { url: f.url, outcome: "already_on_file" };
    const reachable = await opens(f.url);
    const official = f.source_kind === "official" || f.source_kind === "legislation";
    const legal = f.source_kind === "legislation";
    let kind = "need_context", relation = "supports_need";
    if (f.category === "need_context" && official) { kind = "statement"; relation = "context"; }
    if (f.category === "implementation_candidate") { kind = legal ? "legal_change" : "implementation_candidate"; relation = "supports_progress"; }
    if (f.category === "contradiction") { kind = legal ? "legal_change" : "implementation_candidate"; relation = "contradicts_progress"; }
    const since = sinceOf.get(f.public_id);
    const predates = f.category !== "need_context" && !!f.date && !!since && f.date < since.slice(0, 10);
    const isPublic = reachable && !predates && f.relevance >= PUBLIC_RELEVANCE;
    const now = new Date().toISOString();
    let domain: string | null = null;
    try { domain = new URL(f.url).hostname.replace(/^www\./, ""); } catch { /* validated above */ }
    await rest("monitoring_items?on_conflict=commitment_id,url", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({
        commitment_id: commitmentId, kind, relation, title: f.title, url: f.url, publisher: f.publisher || domain, source_domain: domain,
        source_type: legal ? "legislation" : official ? "official_web" : f.source_kind, published_at: f.date ? `${f.date}T00:00:00Z` : null,
        summary: null, excerpt: null, relevance_score: Number(f.relevance.toFixed(3)), status: "auto", is_public: isPublic,
        connector: "external_search", classification: f.category, classification_note: f.note, classifier: reviewer, classified_at: now, last_seen_at: now,
      }),
    });
    return { url: f.url, outcome: isPublic ? "shown_publicly" : !reachable ? "kept_hidden_url_did_not_open" : predates ? "kept_for_research_predates_recommendation" : "kept_for_research" };
  }));
  const count = (o: string) => results.filter((r) => r.outcome === o).length;
  return {
    shown_publicly: count("shown_publicly"), kept_for_research: count("kept_for_research") + count("kept_for_research_predates_recommendation"),
    url_did_not_open: count("kept_hidden_url_did_not_open"), already_on_file: count("already_on_file"),
    unknown_recommendation: count("unknown_recommendation"), results,
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
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  try {
    if (req.method === "GET" && path.endsWith("/batch")) {
      return Response.json(await getBatch(Math.min(40, Math.max(1, Number(new URL(req.url).searchParams.get("count")) || 10))));
    }
    if (req.method === "POST" && path.endsWith("/reviews")) {
      const r = await submitReviews(await req.json().catch(() => null));
      return Response.json(r.body, { status: r.status });
    }
    if (req.method === "GET" && path.endsWith("/confirmations")) return Response.json(await listConfirmations());
    if (req.method === "POST" && path.endsWith("/confirmations")) {
      const r = await resolveConfirmation(await req.json().catch(() => null));
      return Response.json(r.body, { status: r.status });
    }
    if (req.method === "POST" && path.endsWith("/findings")) {
      const body = await req.json().catch(() => null);
      const findings = parseFindings(body);
      if (typeof findings === "string") return Response.json({ error: findings }, { status: 400 });
      return Response.json(await addFindings(findings, reviewerOf(body)));
    }
    if (req.method === "GET") {
      const limit = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 40));
      return Response.json(await listPending(limit));
    }
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      const verdicts = parseVerdicts(body);
      if (typeof verdicts === "string") return Response.json({ error: verdicts }, { status: 400 });
      const reviewer = reviewerOf(body);
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
