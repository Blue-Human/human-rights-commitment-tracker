// Source connectors and relevance heuristics for the HRCT live tracker.
// This module has no Deno- or Supabase-specific code so it can be exercised
// locally against the real sources (see check.ts).

export const USER_AGENT = "BlueHuman-HRCT/1.0 (+https://bluehuman.org)";

// GDELT asks for at most one request every five seconds.
export const GDELT_MIN_INTERVAL_MS = 5500;

export const OFFICIAL_DOMAINS = [
  "boe.es",
  "interior.gob.es",
  "inclusion.gob.es",
  "igualdad.gob.es",
  "lamoncloa.gob.es",
  "defensordelpueblo.es",
  "congreso.es",
  "senado.es",
  "poderjudicial.es",
  "mjusticia.gob.es",
  "exteriores.gob.es",
  "mpr.gob.es",
  "fiscal.es",
  "ine.es",
  "ohchr.org",
  "un.org",
  "coe.int",
  "europa.eu",
];

export type Kind = "need_context" | "implementation_candidate" | "legal_change" | "statement" | "news";
export type Relation = "supports_need" | "supports_progress" | "contradicts_progress" | "context";
export type Connector = "gdelt" | "boe_search" | "boe_summary";

export type Candidate = {
  connector: Connector;
  kind: Kind;
  relation: Relation;
  title: string;
  url: string;
  publisher: string | null;
  source_domain: string | null;
  source_type: string;
  published_at: string | null;
  summary: string | null;
  relevance_score: number;
  official: boolean;
};

export type ConnectorResult = {
  candidates: Candidate[];
  // "rate_limited" and "error" are reported in the run record instead of being swallowed.
  outcome: "ok" | "rate_limited" | "error";
  detail?: string;
};

const STOP = new Set([
  "españa", "espana", "spain", "spanish", "para", "contra", "sobre", "desde", "hasta", "entre", "como",
  "that", "with", "from", "this", "their", "rights", "human", "national", "continue", "strengthen",
  "combat", "ensure", "adopt", "efforts", "measures", "implementation", "effective",
  "derechos", "humanos", "nacional", "medidas", "gobierno",
]);

function fold(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Search-engine operators (sourcecountry:spain, sourcelang:spanish, titulo:...) are not content.
function stripOperators(s: string) {
  return s.replace(/\b[a-z_]+:[^\s()]+/gi, " ").replace(/\b(AND|OR|NOT|NEAR\d*)\b/g, " ");
}

export function tokens(s: string): string[] {
  return (fold(stripOperators(s)).match(/[a-z0-9]{4,}/g) || []).filter((x) => !STOP.has(x));
}

export type Match = { score: number; hits: number; size: number };

export function match(title: string, query: string): Match {
  const a = new Set(tokens(title));
  const b = new Set(tokens(query));
  let hits = 0;
  for (const x of b) if (a.has(x)) hits++;
  return { score: Math.min(0.98, 0.58 + (hits / Math.max(2, b.size)) * 0.4), hits, size: b.size };
}

// A single shared keyword is not enough to tie a document to a recommendation.
export function isPlausible(m: Match) {
  return m.score >= 0.62 && m.hits >= Math.min(2, m.size);
}

export function domainOf(u: string): string | null {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isOfficial(domain: string | null) {
  return !!domain && OFFICIAL_DOMAINS.some((x) => domain === x || domain.endsWith(`.${x}`));
}

// Accepts 20261003101500, 20261003T101500Z (GDELT), 20261003 (BOE) and anything Date can parse.
export function isoDate(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(?:T?(\d{2})(\d{2})(\d{2})Z?)?$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4] ?? "00"}:${m[5] ?? "00"}:${m[6] ?? "00"}Z`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function get(url: URL | string, accept: string): Promise<Response> {
  return fetch(url, { headers: { Accept: accept, "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20000) });
}

export async function gdelt(
  query: string,
  kind: "need_context" | "implementation_candidate",
  relation: "supports_need" | "supports_progress",
  days: number,
): Promise<ConnectorResult> {
  const endpoint = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("mode", "artlist");
  endpoint.searchParams.set("maxrecords", "12");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("sort", "datedesc");
  endpoint.searchParams.set("timespan", `${Math.min(30, Math.max(1, days))}d`);
  let r: Response;
  try {
    r = await get(endpoint, "application/json");
  } catch (e) {
    return { candidates: [], outcome: "error", detail: String(e).slice(0, 200) };
  }
  if (r.status === 429) return { candidates: [], outcome: "rate_limited" };
  if (!r.ok) return { candidates: [], outcome: "error", detail: `HTTP ${r.status}` };
  // GDELT answers malformed queries with HTTP 200 and a plain-text explanation.
  const text = await r.text();
  let data: { articles?: Array<Record<string, string>> };
  try {
    data = text.trim() ? JSON.parse(text) : {};
  } catch {
    return { candidates: [], outcome: "error", detail: text.slice(0, 200) };
  }
  const candidates: Candidate[] = [];
  for (const a of Array.isArray(data.articles) ? data.articles : []) {
    if (!a?.url || !a?.title) continue;
    const m = match(a.title, query);
    if (!isPlausible(m)) continue;
    const d = domainOf(a.url);
    const official = isOfficial(d);
    const asStatement = official && kind === "need_context";
    candidates.push({
      connector: "gdelt",
      kind: asStatement ? "statement" : kind,
      relation: asStatement ? "context" : relation,
      title: a.title,
      url: a.url,
      publisher: a.domain || d,
      source_domain: d,
      source_type: official ? "official_web" : "news",
      published_at: isoDate(a.seendate),
      summary: null,
      relevance_score: m.score,
      official,
    });
  }
  return { candidates, outcome: "ok" };
}

type BoeNorm = { identificador?: string; titulo?: string; fecha_publicacion?: string; url_html_consolidada?: string; url_eli?: string };

const BOE_PUBLISHER = "Agencia Estatal Boletín Oficial del Estado";
const BOE_CAVEAT = "Human review is required before treating this as implementation evidence.";

// The BOE open-data API takes an Elasticsearch-style JSON query; a plain-text query returns HTTP 500.
export function boeSearchQuery(text: string): string | null {
  const words = [...new Set((stripOperators(text).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []).filter((w) => !STOP.has(fold(w))))];
  if (!words.length) return null;
  return JSON.stringify({
    query: { query_string: { query: `titulo:(${words.slice(0, 12).join(" OR ")})` } },
    sort: [{ fecha_publicacion: "desc" }],
  });
}

export async function boeSearch(query: string): Promise<ConnectorResult> {
  const q = boeSearchQuery(query);
  if (!q) return { candidates: [], outcome: "ok" };
  const u = new URL("https://www.boe.es/datosabiertos/api/legislacion-consolidada");
  u.searchParams.set("query", q);
  u.searchParams.set("limit", "25");
  let body: { data?: BoeNorm[] };
  try {
    const r = await get(u, "application/json");
    if (!r.ok) return { candidates: [], outcome: "error", detail: `HTTP ${r.status}` };
    body = await r.json();
  } catch (e) {
    return { candidates: [], outcome: "error", detail: String(e).slice(0, 200) };
  }
  const candidates: Candidate[] = [];
  for (const n of Array.isArray(body.data) ? body.data : []) {
    if (!n.identificador || !n.titulo) continue;
    const m = match(n.titulo, query);
    if (!isPlausible(m)) continue;
    candidates.push({
      connector: "boe_search",
      kind: "legal_change",
      relation: "supports_progress",
      title: n.titulo,
      url: n.url_html_consolidada || `https://www.boe.es/buscar/act.php?id=${encodeURIComponent(n.identificador)}`,
      publisher: BOE_PUBLISHER,
      source_domain: "boe.es",
      source_type: "legislation",
      published_at: isoDate(n.fecha_publicacion),
      summary: `Automatically discovered in BOE consolidated legislation search. ${BOE_CAVEAT}`,
      relevance_score: m.score,
      official: true,
    });
  }
  return { candidates, outcome: "ok" };
}

export type BoeEntry = { id: string; title: string; url: string; date: string };

// Every disposition published in the official gazette on a given day (YYYYMMDD).
// Days without a gazette (Sundays) return 404, which is not an error.
export async function boeDailySummary(day: string): Promise<{ entries: BoeEntry[]; outcome: ConnectorResult["outcome"]; detail?: string }> {
  let body: unknown;
  try {
    const r = await get(`https://www.boe.es/datosabiertos/api/boe/sumario/${day}`, "application/json");
    if (r.status === 404) return { entries: [], outcome: "ok" };
    if (!r.ok) return { entries: [], outcome: "error", detail: `HTTP ${r.status}` };
    body = await r.json();
  } catch (e) {
    return { entries: [], outcome: "error", detail: String(e).slice(0, 200) };
  }
  const entries: BoeEntry[] = [];
  const date = isoDate(day)!;
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (typeof o.identificador === "string" && typeof o.titulo === "string" && /^BOE-A-/.test(o.identificador)) {
      const url = typeof o.url_html === "string" ? o.url_html : `https://www.boe.es/diario_boe/txt.php?id=${o.identificador}`;
      entries.push({ id: o.identificador, title: o.titulo, url, date });
    }
    Object.values(o).forEach(walk);
  };
  walk(body);
  return { entries, outcome: "ok" };
}

export function matchBoeEntry(entry: BoeEntry, query: string): Candidate | null {
  const m = match(entry.title, query);
  if (!isPlausible(m)) return null;
  return {
    connector: "boe_summary",
    kind: "legal_change",
    relation: "supports_progress",
    title: entry.title,
    url: entry.url,
    publisher: BOE_PUBLISHER,
    source_domain: "boe.es",
    source_type: "official_gazette",
    published_at: entry.date,
    summary: `Published in the Boletín Oficial del Estado and automatically matched to this recommendation. ${BOE_CAVEAT}`,
    relevance_score: m.score,
    official: true,
  };
}

// Without a semantic classifier, only strong keyword matches are shown publicly.
export function heuristicIsPublic(c: Candidate) {
  if (c.connector !== "gdelt") return c.relevance_score >= 0.8;
  return c.relevance_score >= (c.official ? 0.76 : 0.82);
}

export function lastDays(n: number, now = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getTime() - i * 86400000);
    return d.toISOString().slice(0, 10).replaceAll("-", "");
  });
}
