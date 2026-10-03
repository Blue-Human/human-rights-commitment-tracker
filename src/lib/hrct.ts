export type Commitment = {
  id: string;
  public_id: string;
  title: string;
  original_text: string;
  normalized_summary: string | null;
  recommendation_number: string | null;
  acceptance_status: string | null;
  published_at: string | null;
  country_iso2: string;
  country_name: string;
  country_slug: string;
  mechanism_code: string;
  mechanism_name: string;
  authoritative_source_title: string | null;
  authoritative_source_publisher: string | null;
  authoritative_source_reference: string | null;
  authoritative_source_date: string | null;
  authoritative_source_url: string | null;
  assessment_status: string | null;
  assessment_confidence: string | null;
  assessment_rationale: string | null;
  assessment_date: string | null;
  methodology_version: string | null;
  methodology_title: string | null;
  methodology_url: string | null;
};

export type Evidence = {
  id: string;
  public_id: string;
  evidence_type: string;
  finding: string;
  excerpt: string | null;
  reliability_notes: string | null;
  evidence_date: string | null;
  source_title: string;
  source_publisher: string | null;
  source_type: string;
  document_reference: string | null;
  source_url: string | null;
};

export type HumanSecurityDimension = {
  public_id: string;
  code: "economic" | "food" | "health" | "environmental" | "personal" | "community" | "political";
  name: string;
  description: string | null;
  is_primary: boolean;
  rationale: string | null;
};

export type MonitoringItem = {
  public_id: string;
  id: string;
  kind: "need_context" | "implementation_candidate" | "legal_change" | "statement" | "news";
  relation: "supports_need" | "supports_progress" | "contradicts_progress" | "context";
  title: string;
  url: string;
  publisher: string | null;
  source_domain: string | null;
  source_type: string;
  published_at: string | null;
  summary: string | null;
  excerpt: string | null;
  relevance_score: number;
  status: "auto" | "reviewed" | "rejected";
  discovered_at: string;
  ai_classified?: boolean;
};

export type AssessmentHistoryEntry = {
  id: string;
  public_id: string;
  status: string;
  confidence: string | null;
  rationale: string | null;
  assessment_date: string | null;
  is_current: boolean;
  published_at: string | null;
  methodology_version: string | null;
};

export type MonitoringStatus = {
  last_successful_run_at: string | null;
  runs_last_24h: number;
  recommendations_monitored: number;
  public_items: number;
  last_item_discovered_at: string | null;
};

export type MonitoringChannel = "need" | "implementation" | "contradiction";

// The three monitoring channels must stay distinct: continuing need is not implementation evidence.
export function monitoringChannel(item: Pick<MonitoringItem, "kind" | "relation">): MonitoringChannel {
  if (item.relation === "contradicts_progress") return "contradiction";
  if (item.relation === "supports_need" || item.kind === "need_context") return "need";
  return "implementation";
}

export const channelLabels: Record<MonitoringChannel, string> = {
  need: "Context · continuing need",
  implementation: "Potential implementation development",
  contradiction: "Potential contrary development",
};

export function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function rest<T>(path: string): Promise<T> {
  if (!url || !key) return [] as T;
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 120 },
  });
  if (!response.ok) throw new Error(`HRCT public API error: ${response.status}`);
  return response.json();
}

// For views added by later migrations: the page still renders if the view is not deployed yet.
async function optional<T>(path: string, fallback: T): Promise<T> {
  try {
    return await rest<T>(path);
  } catch {
    return fallback;
  }
}

export async function getCommitments(): Promise<Commitment[]> {
  return rest<Commitment[]>("hrct_public_commitments?select=*&order=published_at.desc");
}

export async function getCommitment(publicId: string): Promise<Commitment | null> {
  const rows = await rest<Commitment[]>(`hrct_public_commitments?select=*&public_id=eq.${encodeURIComponent(publicId)}&limit=1`);
  return rows[0] ?? null;
}

export async function getEvidence(publicId: string): Promise<Evidence[]> {
  return rest<Evidence[]>(`hrct_public_evidence?select=*&public_id=eq.${encodeURIComponent(publicId)}&order=evidence_date.desc.nullslast`);
}

export async function getHumanSecurityDimensions(publicId: string): Promise<HumanSecurityDimension[]> {
  return rest<HumanSecurityDimension[]>(`hrct_public_human_security?select=*&public_id=eq.${encodeURIComponent(publicId)}&order=is_primary.desc,name.asc`);
}

export async function getMonitoringItems(publicId: string): Promise<MonitoringItem[]> {
  return rest<MonitoringItem[]>(`hrct_public_monitoring?select=*&public_id=eq.${encodeURIComponent(publicId)}&order=published_at.desc.nullslast,discovered_at.desc&limit=30`);
}

export async function getAssessmentHistory(publicId: string): Promise<AssessmentHistoryEntry[]> {
  return rest<AssessmentHistoryEntry[]>(`hrct_public_assessment_history?select=id,public_id,status,confidence,rationale,assessment_date,is_current,published_at,methodology_version&public_id=eq.${encodeURIComponent(publicId)}&order=published_at.desc`);
}

export async function getAllHumanSecurityDimensions(): Promise<Pick<HumanSecurityDimension, "public_id" | "code" | "name" | "is_primary">[]> {
  return rest(`hrct_public_human_security?select=public_id,code,name,is_primary`);
}

export async function getRecentMonitoringItems(limit = 200): Promise<MonitoringItem[]> {
  return rest<MonitoringItem[]>(`hrct_public_monitoring?select=*&order=published_at.desc.nullslast,discovered_at.desc&limit=${limit}`);
}

export async function getMonitoringStatus(): Promise<MonitoringStatus | null> {
  const rows = await optional<MonitoringStatus[]>("hrct_public_monitoring_status?select=*&limit=1", []);
  return rows[0] ?? null;
}

export async function getLastScannedAt(publicId: string): Promise<string | null> {
  const rows = await optional<{ last_scanned_at: string | null }[]>(`hrct_public_monitoring_coverage?select=last_scanned_at&public_id=eq.${encodeURIComponent(publicId)}&limit=1`, []);
  return rows[0]?.last_scanned_at ?? null;
}

export type Development = MonitoringItem & { public_ids: string[] };

// The same source is often relevant to several recommendations; show it once.
export function groupByUrl(items: MonitoringItem[]): Development[] {
  const byUrl = new Map<string, Development>();
  for (const item of items) {
    const key = `${monitoringChannel(item)}|${item.url}`;
    const existing = byUrl.get(key);
    if (existing) existing.public_ids.push(item.public_id);
    else byUrl.set(key, { ...item, public_ids: [item.public_id] });
  }
  const order = (id: string) => Number(id.split("-").pop()?.split(".").pop()) || 0;
  for (const d of byUrl.values()) d.public_ids.sort((a, b) => order(a) - order(b));
  return [...byUrl.values()];
}
