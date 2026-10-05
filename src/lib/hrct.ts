import type { SdgLink } from "./sdg";

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
  // True while the current assessment awaits final confirmation by Blue Human.
  assessment_provisional?: boolean | null;
  // Marked by Blue Human as a priority: highlighted and listed first.
  is_priority?: boolean | null;
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
  reviewed_at?: string | null;
};

// The seven dimensions of the UNDP framework, followed by the one Blue Human adds to it.
export const dimensionCodes = ["economic", "food", "health", "environmental", "personal", "community", "political", "technological"] as const;
export type DimensionCode = (typeof dimensionCodes)[number];

export const dimensionNames: Record<DimensionCode, string> = {
  economic: "Seguridad económica",
  food: "Seguridad alimentaria",
  health: "Seguridad sanitaria",
  environmental: "Seguridad ambiental",
  personal: "Seguridad personal",
  community: "Seguridad comunitaria",
  political: "Seguridad política",
  technological: "Seguridad tecnológica",
};

export type HumanSecurityDimension = {
  public_id: string;
  code: DimensionCode;
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
  // One-sentence reason the item is listed under this recommendation.
  note?: string | null;
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
  provisional?: boolean | null;
};

export type MonitoringStatus = {
  last_successful_run_at: string | null;
  runs_last_24h: number;
  recommendations_monitored: number;
  public_items: number;
  last_item_discovered_at: string | null;
  feeds_monitored?: number;
};

export type MonitoringChannel = "need" | "implementation" | "contradiction";

// The three monitoring channels must stay distinct: continuing need is not implementation evidence.
export function monitoringChannel(item: Pick<MonitoringItem, "kind" | "relation">): MonitoringChannel {
  if (item.relation === "contradicts_progress") return "contradiction";
  if (item.relation === "supports_progress") return "implementation";
  return "need";
}

export function reviewLabel(item: Pick<MonitoringItem, "status">) {
  return item.status === "reviewed" ? "Revisado por Blue Human" : "Pendiente de confirmación final";
}

// Some pilot rationales end with a stored validation caveat. The record is left as published;
// the page shows that caveat as a status line instead of as part of the reasoning.
const PILOT_CAVEAT = /\s*AI-assisted pilot assessment based on public sources; human validation remains required before external launch\.?\s*$/;

export function splitRationale(text: string | null | undefined) {
  const value = text || "";
  return { text: value.replace(PILOT_CAVEAT, ""), provisional: PILOT_CAVEAT.test(value) };
}

export const channelLabels: Record<MonitoringChannel, string> = {
  need: "Contexto · necesidad vigente",
  implementation: "Posible avance en el cumplimiento",
  contradiction: "Posible novedad en sentido contrario",
};

export const statusLabels: Record<string, string> = {
  not_assessed: "Valoración pendiente",
  implemented: "Cumplida",
  substantially_implemented: "Avance sustancial",
  in_progress: "En curso",
  limited_progress: "Avance limitado",
  not_implemented: "Sin cumplir",
  unable_to_assess: "Evidencia insuficiente",
  regressed: "Retroceso",
};

export const acceptanceLabels: Record<string, string> = {
  accepted: "Aceptada",
  partially_accepted: "Aceptada parcialmente",
  noted: "Anotada",
};

export const confidenceLabels: Record<string, string> = { high: "Alta", medium: "Media", low: "Baja" };

export const evidenceTypeLabels: Record<string, string> = {
  supports_progress: "Respalda el avance",
  contradicts_progress: "Contradice el avance",
  context: "Contexto",
  mixed: "Mixta",
};

// Stored codes (status, confidence, State response...) are shown through these tables;
// a code without an entry is shown as stored.
export function labelOf(labels: Record<string, string>, value?: string | null, fallback = "Sin especificar") {
  return value ? labels[value] || value.replaceAll("_", " ") : fallback;
}

// Share of a total as a Spanish percentage with at most one decimal: "93,5 %".
export function formatShare(value: number, total: number) {
  return total ? `${((100 * value) / total).toLocaleString("es-ES", { maximumFractionDigits: 1 })}\u00a0%` : "—";
}

export function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null;
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

const byNumber = (c: Commitment) => Number((c.recommendation_number || "").split(".").pop()) || 0;

export async function getCommitments(): Promise<Commitment[]> {
  const rows = await rest<Commitment[]>("hrct_public_commitments?select=*&order=published_at.desc");
  return rows.sort((a, b) => byNumber(a) - byNumber(b));
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
  return rest<AssessmentHistoryEntry[]>(`hrct_public_assessment_history?select=*&public_id=eq.${encodeURIComponent(publicId)}&order=published_at.desc`);
}

export type DimensionLink = Pick<HumanSecurityDimension, "public_id" | "code" | "name" | "is_primary">;

// The API returns at most 1,000 rows per request and the catalogue is close to that, so it is read in pages.
export async function getAllHumanSecurityDimensions(): Promise<DimensionLink[]> {
  const pageSize = 1000;
  const rows: DimensionLink[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await rest<DimensionLink[]>(`hrct_public_human_security?select=public_id,code,name,is_primary&order=public_id.asc,code.asc&limit=${pageSize}&offset=${offset}`);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export async function getDimensionDescriptions(): Promise<Partial<Record<DimensionCode, string>>> {
  const rows = await optional<{ code: DimensionCode; description: string | null }[]>("human_security_dimensions?select=code,description", []);
  return Object.fromEntries(rows.filter((row) => row.description).map((row) => [row.code, row.description]));
}

// Goals and targets of the 2030 Agenda linked to the recommendations. Null when they could not
// be read, so that a page never presents a failed request as "no goals linked".
export async function getAllSdgLinks(): Promise<SdgLink[] | null> {
  const pageSize = 1000;
  const rows: SdgLink[] = [];
  try {
    for (let offset = 0; ; offset += pageSize) {
      const page = await rest<SdgLink[]>(`hrct_public_sdgs?select=public_id,goal,targets,source_published_at&order=public_id.asc,goal.asc&limit=${pageSize}&offset=${offset}`);
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  } catch {
    return null;
  }
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

// A recommendation counts as assessed once it has a conclusion on compliance.
export function isAssessed(c: Pick<Commitment, "assessment_status">) {
  return !!c.assessment_status && !["not_assessed", "unable_to_assess"].includes(c.assessment_status);
}

export type DimensionSummary = {
  code: DimensionCode;
  name: string;
  description: string | null;
  total: number;
  // Recommendations for which this is the primary dimension.
  primary: number;
  accepted: number;
  partiallyAccepted: number;
  noted: number;
  priority: number;
  assessed: number;
  // Recommendations with at least one public monitoring item.
  monitored: number;
  // Recommendations shared with each of the other dimensions, most frequent first.
  overlaps: { code: DimensionCode; count: number }[];
};

// Counts per human-security dimension. A recommendation can belong to several dimensions,
// so the totals of the dimensions add up to more than the catalogue.
export function summarizeDimensions(
  commitments: Commitment[],
  links: DimensionLink[],
  descriptions: Partial<Record<DimensionCode, string>> = {},
  monitoringCounts: Record<string, number> = {},
): DimensionSummary[] {
  const byId = new Map(commitments.map((c) => [c.public_id, c]));
  const codesById = new Map<string, DimensionCode[]>();
  for (const link of links) {
    if (!byId.has(link.public_id) || !dimensionCodes.includes(link.code)) continue;
    codesById.set(link.public_id, [...(codesById.get(link.public_id) || []), link.code]);
  }
  return dimensionCodes.map((code) => {
    const own = links.filter((link) => link.code === code && byId.has(link.public_id));
    const records = own.map((link) => byId.get(link.public_id)!);
    const count = (test: (c: Commitment) => boolean) => records.filter(test).length;
    const shared = new Map<DimensionCode, number>();
    for (const link of own) for (const other of codesById.get(link.public_id) || []) if (other !== code) shared.set(other, (shared.get(other) || 0) + 1);
    return {
      code,
      name: own[0]?.name || dimensionNames[code],
      description: descriptions[code] || null,
      total: own.length,
      primary: own.filter((link) => link.is_primary).length,
      accepted: count((c) => c.acceptance_status === "accepted"),
      partiallyAccepted: count((c) => c.acceptance_status === "partially_accepted"),
      noted: count((c) => c.acceptance_status === "noted"),
      priority: count((c) => !!c.is_priority),
      assessed: count(isAssessed),
      monitored: count((c) => monitoringCounts[c.public_id] > 0),
      overlaps: [...shared.entries()].map(([other, n]) => ({ code: other, count: n })).sort((a, b) => b.count - a.count),
    };
  });
}
