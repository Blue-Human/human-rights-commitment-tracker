// Periodic research reviews of recommendations.
// A reviewer (or an assistant acting for one) takes a batch of recommendations, checks what has
// happened at official and institutional level since the last review, and files a review for
// each. A review can update the assessment, with evidence; proposing "implemented" is recorded
// but only takes effect when a person at Blue Human confirms it, in the admin panel or with the
// confirmation code.

import { opens, rest, reviewerOf, rpc } from "./db.ts";

const CONFIRMATION_CODE = Deno.env.get("REVIEW_CONFIRMATION_CODE");

const STATUSES = ["unable_to_assess", "not_implemented", "limited_progress", "substantially_implemented", "implemented", "regressed"] as const;
const STATUS_LABEL: Record<string, string> = {
  not_assessed: "Not assessed", unable_to_assess: "Insufficient evidence", not_implemented: "No implementation",
  limited_progress: "Limited progress", substantially_implemented: "Substantial progress", implemented: "Implemented", regressed: "Regressed",
};
const EVIDENCE_TYPES = ["supports_progress", "contradicts_progress", "context", "mixed"];
const SOURCE_TYPES = [
  "legislation", "official_gazette", "government_policy", "government_release", "official_budget", "official_statistics",
  "parliamentary_record", "judicial_decision", "independent_institution", "un_body", "civil_society", "academic", "media",
];

type PublicCommitment = {
  id: string; public_id: string; recommendation_number: string | null; title: string; original_text: string;
  acceptance_status: string | null; commitment_date: string | null; authoritative_source_date: string | null;
  assessment_status: string | null; assessment_confidence: string | null; assessment_rationale: string | null;
  assessment_date: string | null; assessment_provisional: boolean | null;
};
type ReviewRow = { commitment_id: string; reviewed_at: string; outcome: string; resolution: string | null };

const byNumber = (n: string | null) => Number((n || "").split(".").pop()) || 0;

// The next recommendations due for review: those reviewed longest ago (never reviewed first).
// Confirmed "implemented" records and ones waiting for a confirmation decision are left out.
export async function getBatch(count: number) {
  const all: PublicCommitment[] = await rest("hrct_public_commitments?select=id,public_id,recommendation_number,title,original_text,acceptance_status,commitment_date,authoritative_source_date,assessment_status,assessment_confidence,assessment_rationale,assessment_date,assessment_provisional") || [];
  const reviews: ReviewRow[] = await rest("research_reviews?select=commitment_id,reviewed_at,outcome,resolution&order=reviewed_at.desc&limit=10000") || [];
  const lastReviewed = new Map<string, string>();
  const awaiting = new Set<string>();
  for (const r of reviews) {
    // A review that was rejected for lack of verifiable evidence does not count as done.
    if (r.outcome !== "rejected_no_verified_evidence" && !lastReviewed.has(r.commitment_id)) lastReviewed.set(r.commitment_id, r.reviewed_at);
    if (r.outcome === "needs_confirmation" && !r.resolution) awaiting.add(r.commitment_id);
  }
  const eligible = all
    .filter((c) => !(c.assessment_status === "implemented" && !c.assessment_provisional) && !awaiting.has(c.id))
    .sort((a, b) => (lastReviewed.get(a.id) || "").localeCompare(lastReviewed.get(b.id) || "") || byNumber(a.recommendation_number) - byNumber(b.recommendation_number));
  const page = eligible.slice(0, count);
  const ids = page.map((c) => `"${c.public_id}"`).join(",");
  const evidence: Array<{ public_id: string; evidence_type: string; finding: string; source_title: string; source_url: string | null; evidence_date: string | null }> = page.length
    ? await rest(`hrct_public_evidence?select=public_id,evidence_type,finding,source_title,source_url,evidence_date&public_id=in.(${ids})`) || []
    : [];
  const context: Array<{ public_id: string; title: string; url: string; published_at: string | null; relation: string }> = page.length
    ? await rest(`hrct_public_monitoring?select=public_id,title,url,published_at,relation&public_id=in.(${ids})&order=published_at.desc.nullslast&limit=400`) || []
    : [];
  return {
    eligible_total: eligible.length,
    never_reviewed: eligible.filter((c) => !lastReviewed.has(c.id)).length,
    awaiting_confirmation: awaiting.size,
    returned: page.length,
    recommendations: page.map((c) => ({
      public_id: c.public_id,
      number: c.recommendation_number,
      title: c.title,
      text: c.original_text,
      state_response: c.acceptance_status,
      recommendation_date: c.commitment_date || c.authoritative_source_date,
      current_assessment: {
        status: c.assessment_status || "not_assessed",
        confidence: c.assessment_confidence,
        date: c.assessment_date,
        provisional: !!c.assessment_provisional,
        rationale: c.assessment_status && c.assessment_status !== "not_assessed" ? c.assessment_rationale : null,
      },
      last_reviewed: lastReviewed.get(c.id)?.slice(0, 10) ?? null,
      // A recommendation never assessed is looked at from the date it was made.
      look_for_developments_since: (lastReviewed.get(c.id) || (c.assessment_status && c.assessment_status !== "not_assessed" ? c.assessment_date : null) || c.commitment_date || c.authoritative_source_date || "").slice(0, 10) || null,
      evidence_on_file: evidence.filter((e) => e.public_id === c.public_id).map((e) => ({ title: e.source_title, url: e.source_url, date: e.evidence_date, type: e.evidence_type, finding: e.finding })),
      context_on_file: context.filter((m) => m.public_id === c.public_id).slice(0, 8).map((m) => ({ title: m.title, url: m.url, date: m.published_at?.slice(0, 10) ?? null })),
    })),
  };
}

type EvidenceInput = { url: string; title: string; publisher: string | null; date: string | null; source_type: string; evidence_type: string; finding: string; language: string | null };
type ReviewInput = {
  public_id: string; outcome: "no_change" | "update"; proposed_status?: string; confidence?: string;
  rationale?: string; change_summary: string; evidence: EvidenceInput[];
};

function parseReviews(body: unknown): ReviewInput[] | string {
  const list = (body as { reviews?: unknown })?.reviews;
  if (!Array.isArray(list) || !list.length) return "reviews must be a non-empty array";
  if (list.length > 10) return "at most 10 reviews per request";
  const out: ReviewInput[] = [];
  for (const raw of list) {
    const r = raw as Record<string, unknown>;
    const id = typeof r.public_id === "string" ? r.public_id : "";
    if (!id) return "each review needs the recommendation public_id";
    if (r.outcome !== "no_change" && r.outcome !== "update") return `${id}: outcome must be no_change or update`;
    const summary = typeof r.change_summary === "string" ? r.change_summary.trim() : "";
    if (!summary) return `${id}: change_summary is required (say what was checked and what was found)`;
    if (r.outcome === "no_change") { out.push({ public_id: id, outcome: "no_change", change_summary: summary.slice(0, 1500), evidence: [] }); continue; }
    if (!STATUSES.includes(r.proposed_status as typeof STATUSES[number])) return `${id}: proposed_status must be one of ${STATUSES.join(", ")}`;
    if (!["high", "medium", "low"].includes(r.confidence as string)) return `${id}: confidence must be high, medium or low`;
    const rationale = typeof r.rationale === "string" ? r.rationale.trim() : "";
    if (rationale.length < 200) return `${id}: rationale must explain the assessment in at least 200 characters`;
    if (!Array.isArray(r.evidence) || !r.evidence.length) return `${id}: an update needs at least one evidence source`;
    if (r.evidence.length > 10) return `${id}: at most 10 evidence sources`;
    const evidence: EvidenceInput[] = [];
    for (const rawE of r.evidence) {
      const e = rawE as Record<string, unknown>;
      if (typeof e.url !== "string" || !/^https?:\/\/[^\s]+$/.test(e.url)) return `${id}: each evidence source needs its url`;
      if (typeof e.title !== "string" || !e.title.trim()) return `${id}: each evidence source needs its own title`;
      if (typeof e.finding !== "string" || e.finding.trim().length < 30) return `${id}: each evidence source needs a finding (what it establishes)`;
      if (!EVIDENCE_TYPES.includes(e.evidence_type as string)) return `${id}: evidence_type must be one of ${EVIDENCE_TYPES.join(", ")}`;
      if (!SOURCE_TYPES.includes(e.source_type as string)) return `${id}: source_type must be one of ${SOURCE_TYPES.join(", ")}`;
      evidence.push({
        url: e.url, title: e.title.trim().slice(0, 400),
        publisher: typeof e.publisher === "string" && e.publisher.trim() ? e.publisher.trim().slice(0, 160) : null,
        date: typeof e.date === "string" && /^\d{4}-\d{2}-\d{2}/.test(e.date) ? e.date.slice(0, 10) : null,
        source_type: e.source_type as string, evidence_type: e.evidence_type as string, finding: e.finding.trim().slice(0, 2000),
        language: typeof e.language === "string" ? e.language.slice(0, 8) : null,
      });
    }
    out.push({ public_id: id, outcome: "update", proposed_status: r.proposed_status as string, confidence: r.confidence as string, rationale: rationale.slice(0, 6000), change_summary: summary.slice(0, 1500), evidence });
  }
  return out;
}

export async function submitReviews(body: unknown) {
  const reviews = parseReviews(body);
  if (typeof reviews === "string") return { status: 400, body: { error: reviews } };
  const reviewer = reviewerOf(body);
  const results = await Promise.all(reviews.map(async (r) => {
    const evidence = await Promise.all(r.evidence.map(async (e) => ({ ...e, verified: await opens(e.url) })));
    const unverified = evidence.filter((e) => !e.verified).map((e) => e.url);
    const saved: { result: string; review_id?: string; previous_status?: string; status?: string; evidence_recorded?: number } =
      await rpc("hrct_record_research_review", { p: { ...r, reviewer, evidence } });

    return {
      public_id: r.public_id,
      result: saved.result,
      public_status: saved.status ?? null,
      evidence_recorded: saved.evidence_recorded ?? 0,
      evidence_urls_that_did_not_open: unverified,
    };
  }));
  const count = (x: string) => results.filter((r) => r.result === x).length;
  return {
    status: 200,
    body: {
      updated: count("updated"), needs_confirmation: count("needs_confirmation"), no_change: count("no_change"),
      rejected_no_verified_evidence: count("rejected_no_verified_evidence"), unknown_recommendation: count("unknown_recommendation"), results,
    },
  };
}

// Proposals to mark a recommendation as implemented that a person still has to decide on.
export async function listConfirmations() {
  const rows: Array<{ commitment_id: string; reviewed_at: string; reviewer: string; previous_status: string | null; confidence: string | null; change_summary: string | null; assessment_id: string | null }> =
    await rest("research_reviews?select=commitment_id,reviewed_at,reviewer,previous_status,confidence,change_summary,assessment_id&outcome=eq.needs_confirmation&resolution=is.null&order=reviewed_at.desc") || [];
  if (!rows.length) return { pending: 0, proposals: [] };
  const recs: Array<{ id: string; public_id: string; recommendation_number: string | null; title: string }> =
    await rest(`commitments?select=id,public_id,recommendation_number,title&id=in.(${[...new Set(rows.map((r) => r.commitment_id))].join(",")})`) || [];
  const assessments: Array<{ id: string; rationale: string }> = await rest(`assessments?select=id,rationale&id=in.(${rows.map((r) => r.assessment_id).filter(Boolean).join(",")})`) || [];
  const seen = new Set<string>();
  const proposals = [];
  for (const r of rows) {
    if (seen.has(r.commitment_id)) continue;
    seen.add(r.commitment_id);
    const rec = recs.find((x) => x.id === r.commitment_id);
    proposals.push({
      public_id: rec?.public_id, number: rec?.recommendation_number, title: rec?.title,
      proposed_on: r.reviewed_at.slice(0, 10), current_public_status: r.previous_status, proposed_status: "implemented", confidence: r.confidence,
      change_summary: r.change_summary, rationale: assessments.find((a) => a.id === r.assessment_id)?.rationale ?? null,
    });
  }
  return { pending: proposals.length, proposals };
}

export async function resolveConfirmation(body: unknown) {
  const b = (body || {}) as Record<string, unknown>;
  if (!CONFIRMATION_CODE) return { status: 503, body: { error: "confirmation is not configured" } };
  // Only a person who knows the code can confirm; the assistant is never given it in its instructions.
  if (b.confirmation_code !== CONFIRMATION_CODE) return { status: 403, body: { error: "a valid confirmation_code from a Blue Human reviewer is required" } };
  if (typeof b.public_id !== "string" || (b.decision !== "confirm" && b.decision !== "reject")) return { status: 400, body: { error: "public_id and decision (confirm or reject) are required" } };
  const by = typeof b.confirmed_by === "string" && b.confirmed_by.trim() ? b.confirmed_by.trim().slice(0, 80) : "Blue Human reviewer";
  const saved: { result: string } = await rpc("hrct_resolve_research_review", { p_public_id: b.public_id, p_decision: b.decision, p_resolved_by: by });
  return { status: 200, body: { public_id: b.public_id, result: saved.result } };
}
