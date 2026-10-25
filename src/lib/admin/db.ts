import "server-only";

// Service-role access to Supabase for the admin panel. Server-side only: the key is read from
// SUPABASE_SERVICE_ROLE_KEY and is never sent to the browser. Callers must check the admin
// session first (requireAdmin).

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function adminRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Admin database access is not configured");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const adminRpc = <T>(name: string, args: Record<string, unknown>) =>
  adminRest<T>(`rpc/${name}`, { method: "POST", body: JSON.stringify(args) });

export const adminPatch = (table: string, id: string, values: Record<string, unknown>) =>
  adminRest<null>(`${table}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(values) });

export type AdminRecommendation = {
  id: string; public_id: string; recommendation_number: string | null; title: string; original_text: string;
  acceptance_status: string | null; assessment_status: string | null; assessment_confidence: string | null;
  assessment_rationale: string | null; assessment_date: string | null; assessment_provisional: boolean | null;
  is_priority: boolean;
};

export type Proposal = {
  id: string; reviewed_at: string; reviewer: string; previous_status: string | null; confidence: string | null; change_summary: string | null;
  commitments: { public_id: string; recommendation_number: string | null; title: string } | null;
  assessments: { rationale: string } | null;
};

export type ReviewLogEntry = {
  id: string; reviewed_at: string; reviewer: string; outcome: string; previous_status: string | null; proposed_status: string | null;
  change_summary: string | null; resolution: string | null;
  commitments: { public_id: string; recommendation_number: string | null } | null;
};

export type AdminEvidence = {
  id: string; evidence_type: string; finding: string; is_public: boolean; reviewed_at: string | null; evidence_date: string | null;
  sources: { title: string; url: string | null; publisher: string | null } | null;
};

export type AdminMonitoringItem = {
  id: string; commitment_id: string; kind: string; relation: string; title: string; url: string; publisher: string | null;
  published_at: string | null; summary: string | null; excerpt: string | null; classification: string | null;
  classification_note: string | null; relevance_score: number; status: string; is_public: boolean;
  commitments?: { public_id: string; recommendation_number: string | null } | null;
};

export type Feed = {
  id: string; name: string; url: string; source_type: string; spain_focused: boolean; enabled: boolean;
  last_fetched_at: string | null; last_status: string | null; last_item_count: number | null;
};

const byNumber = (n: string | null) => Number((n || "").split(".").pop()) || 0;

export async function listRecommendations() {
  const rows = await adminRest<AdminRecommendation[]>("hrct_public_commitments?select=id,public_id,recommendation_number,title,original_text,acceptance_status,assessment_status,assessment_confidence,assessment_rationale,assessment_date,assessment_provisional,is_priority");
  return rows.sort((a, b) => byNumber(a.recommendation_number) - byNumber(b.recommendation_number));
}

export async function getRecommendation(publicId: string) {
  const rows = await adminRest<AdminRecommendation[]>(`hrct_public_commitments?select=id,public_id,recommendation_number,title,original_text,acceptance_status,assessment_status,assessment_confidence,assessment_rationale,assessment_date,assessment_provisional,is_priority&public_id=eq.${encodeURIComponent(publicId)}&limit=1`);
  return rows[0] ?? null;
}

export const listProposals = (commitmentId?: string) =>
  adminRest<Proposal[]>(`research_reviews?select=id,reviewed_at,reviewer,previous_status,confidence,change_summary,commitments(public_id,recommendation_number,title),assessments(rationale)&outcome=eq.needs_confirmation&resolution=is.null${commitmentId ? `&commitment_id=eq.${commitmentId}` : ""}&order=reviewed_at.desc`);

export const listReviewLog = (limit = 20) =>
  adminRest<ReviewLogEntry[]>(`research_reviews?select=id,reviewed_at,reviewer,outcome,previous_status,proposed_status,change_summary,resolution,commitments(public_id,recommendation_number)&order=reviewed_at.desc&limit=${limit}`);

export const listEvidence = (commitmentId: string) =>
  adminRest<AdminEvidence[]>(`evidence?select=id,evidence_type,finding,is_public,reviewed_at,evidence_date,sources(title,url,publisher)&commitment_id=eq.${commitmentId}&order=created_at.desc`);

const ITEM_FIELDS = "id,commitment_id,kind,relation,title,url,publisher,published_at,summary,excerpt,classification,classification_note,relevance_score,status,is_public";
// Everything except what was discarded as noise or rejected by a person.
const NOT_DISCARDED = "status=neq.rejected&or=(classification.is.null,classification.neq.noise)";

export const listItemsFor = (commitmentId: string) =>
  adminRest<AdminMonitoringItem[]>(`monitoring_items?select=${ITEM_FIELDS}&commitment_id=eq.${commitmentId}&${NOT_DISCARDED}&order=is_public.desc,published_at.desc.nullslast&limit=80`);

// Items waiting for a person: shown publicly but unconfirmed, or kept for research.
export const listItemsPending = () =>
  adminRest<AdminMonitoringItem[]>(`monitoring_items?select=${ITEM_FIELDS},commitments(public_id,recommendation_number)&status=eq.auto&or=(classification.is.null,classification.neq.noise)&order=is_public.desc,published_at.desc.nullslast&limit=200`);

export const listFeeds = () =>
  adminRest<Feed[]>("monitoring_feeds?select=id,name,url,source_type,spain_focused,enabled,last_fetched_at,last_status,last_item_count&order=name");
