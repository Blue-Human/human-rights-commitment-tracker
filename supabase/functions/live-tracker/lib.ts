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
export type Connector = "gdelt" | "google_news" | "rss" | "boe_search" | "boe_summary";

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
  // Short text taken verbatim from the source (feed description), when available.
  excerpt?: string | null;
  relevance_score: number;
  // How many profile keywords the title shares.
  hits: number;
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

export type Match = { score: number; hits: number; size: number; specific: boolean };

// Crude stemming so that "racismo"/"racista" or "delito"/"delitos" count as the same keyword.
const stem = (t: string) => t.slice(0, 5);

export function match(title: string, query: string): Match {
  const queryTokens = tokens(query);
  const a = new Set(tokens(title).map(stem));
  const b = new Set(queryTokens.map(stem));
  let hits = 0;
  for (const x of b) if (a.has(x)) hits++;
  // A quoted phrase in the profile that appears verbatim in the title is a strong match on its own.
  const foldedTitle = fold(title);
  const phrase = [...query.matchAll(/"([^"]+)"/g)].some((m) => m[1].trim().length >= 8 && foldedTitle.includes(fold(m[1].trim())));
  const score = phrase ? 0.95 : Math.min(0.98, 0.58 + (hits / Math.max(2, b.size)) * 0.4);
  return { score, hits: phrase ? Math.max(2, hits) : hits, size: b.size, specific: b.size === 1 && queryTokens[0].length >= 10 };
}

// One shared generic keyword is not enough to tie a document to a recommendation. A profile
// made of a single long, specific term ("antisemitismo", "desinformación") may match on it alone.
export function isPlausible(m: Match) {
  if (m.hits >= 2) return m.score >= 0.62;
  return m.specific && m.hits === 1;
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

// Profiles hold plain keyword lists. GDELT treats those as "all of these words" and rejects
// short words outright, so the keywords are sent as alternatives restricted to Spanish media;
// the title must then share at least two of them (see isPlausible).
export function gdeltQuery(text: string): string | null {
  const phrases = [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1].trim()).filter((p) => p.length >= 8);
  const words = [...new Set((stripOperators(text.replace(/"/g, " ")).toLowerCase().match(/[\p{L}\p{N}]{5,}/gu) || []).filter((w) => !STOP.has(fold(w))))];
  const terms = [...phrases.map((p) => `"${p}"`), ...words].slice(0, 10);
  if (!terms.length) return null;
  return `${terms.length > 1 ? `(${terms.join(" OR ")})` : terms[0]} sourcecountry:spain`;
}

export async function gdelt(
  query: string,
  kind: "need_context" | "implementation_candidate",
  relation: "supports_need" | "supports_progress",
  days: number,
): Promise<ConnectorResult> {
  const q = gdeltQuery(query);
  if (!q) return { candidates: [], outcome: "ok" };
  const endpoint = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  endpoint.searchParams.set("query", q);
  endpoint.searchParams.set("mode", "artlist");
  endpoint.searchParams.set("maxrecords", "40");
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
      hits: m.hits,
      official,
    });
  }
  return { candidates, outcome: "ok" };
}

function xmlText(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!m) return null;
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
}

// Google News search feed for Spain, in Spanish. Used alongside GDELT, which rate-limits
// shared IPs heavily. Links are Google News article links that redirect to the publisher.
export function googleNewsUrl(text: string, days: number): string | null {
  const phrases = [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1].trim()).filter((p) => p.length >= 8);
  const words = [...new Set((stripOperators(text.replace(/"[^"]*"/g, " ")).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []).filter((w) => !STOP.has(fold(w))))];
  const terms = [...phrases.map((p) => `"${p}"`), ...words].slice(0, 8);
  if (!terms.length) return null;
  const u = new URL("https://news.google.com/rss/search");
  u.searchParams.set("q", `${terms.length > 1 ? `(${terms.join(" OR ")})` : terms[0]} España when:${Math.min(30, Math.max(1, days))}d`);
  u.searchParams.set("hl", "es");
  u.searchParams.set("gl", "ES");
  u.searchParams.set("ceid", "ES:es");
  return u.toString();
}

export async function googleNews(
  query: string,
  kind: "need_context" | "implementation_candidate",
  relation: "supports_need" | "supports_progress",
  days: number,
): Promise<ConnectorResult> {
  const url = googleNewsUrl(query, days);
  if (!url) return { candidates: [], outcome: "ok" };
  let xml: string;
  try {
    const r = await get(url, "application/rss+xml");
    if (r.status === 429) return { candidates: [], outcome: "rate_limited" };
    if (!r.ok) return { candidates: [], outcome: "error", detail: `HTTP ${r.status}` };
    xml = await r.text();
  } catch (e) {
    return { candidates: [], outcome: "error", detail: String(e).slice(0, 200) };
  }
  const candidates: Candidate[] = [];
  for (const [, block] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const rawTitle = xmlText(block, "title");
    const link = xmlText(block, "link");
    if (!rawTitle || !link) continue;
    const publisher = xmlText(block, "source");
    // Feed titles are "Headline - Publisher".
    const title = publisher && rawTitle.endsWith(` - ${publisher}`) ? rawTitle.slice(0, -publisher.length - 3) : rawTitle;
    const m = match(title, query);
    if (!isPlausible(m)) continue;
    const d = domainOf(block.match(/<source[^>]*url="([^"]+)"/i)?.[1] || "");
    const official = isOfficial(d);
    const asStatement = official && kind === "need_context";
    candidates.push({
      connector: "google_news",
      kind: asStatement ? "statement" : kind,
      relation: asStatement ? "context" : relation,
      title,
      url: link,
      publisher: publisher || d,
      source_domain: d,
      source_type: official ? "official_web" : "news",
      published_at: isoDate(xmlText(block, "pubDate")),
      summary: null,
      relevance_score: m.score,
      hits: m.hits,
      official,
    });
  }
  return { candidates, outcome: "ok" };
}

export type Feed = { id: string; name: string; url: string; source_type: string; spain_focused: boolean };
export type FeedItem = { title: string; url: string; description: string | null; published_at: string | null };

function plainText(html: string | null): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ").trim();
  return text || null;
}

// Parses RSS 2.0 (<item>) and Atom (<entry>) feeds.
export function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const [, block] of xml.matchAll(/<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/g)) {
    const title = plainText(xmlText(block, "title"));
    const url = xmlText(block, "link") || block.match(/<link[^>]*href="([^"]+)"/i)?.[1] || null;
    if (!title || !url || !/^https?:\/\//.test(url)) continue;
    items.push({
      title,
      url: url.replace(/&amp;/g, "&"),
      description: plainText(xmlText(block, "description") || xmlText(block, "summary")),
      published_at: isoDate(xmlText(block, "pubDate") || xmlText(block, "published") || xmlText(block, "updated") || xmlText(block, "dc:date")),
    });
  }
  return items;
}

export async function fetchFeed(feed: Feed): Promise<{ items: FeedItem[]; outcome: ConnectorResult["outcome"]; detail?: string }> {
  try {
    const r = await get(feed.url, "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.1");
    if (r.status === 429) return { items: [], outcome: "rate_limited" };
    if (!r.ok) return { items: [], outcome: "error", detail: `HTTP ${r.status}` };
    return { items: parseFeed(await r.text()), outcome: "ok" };
  } catch (e) {
    return { items: [], outcome: "error", detail: String(e).slice(0, 200) };
  }
}

const MENTIONS_SPAIN = /espa[ñn]|spain|spanish/i;
const FEED_MAX_AGE_MS = 14 * 86400000;

// A feed item is tied to a recommendation by its headline: two shared profile keywords, or
// one in the headline plus two more in the lead (some feeds put the whole article in the
// description, so only its first sentences count). Only headline keywords count toward
// showing an item without review. Feeds that are not about Spain must also mention Spain,
// and stale items are ignored.
export function matchFeedItem(
  feed: Feed,
  item: FeedItem,
  query: string,
  kind: "need_context" | "implementation_candidate",
  relation: "supports_need" | "supports_progress",
): Candidate | null {
  if (item.published_at && Date.now() - new Date(item.published_at).getTime() > FEED_MAX_AGE_MS) return null;
  const lead = (item.description || "").slice(0, 300);
  if (!feed.spain_focused && !MENTIONS_SPAIN.test(`${item.title} ${lead}`)) return null;
  const m = match(item.title, query);
  if (!isPlausible(m)) {
    if (m.hits < 1 || match(`${item.title} ${lead}`, query).hits < 3) return null;
  }
  const d = domainOf(item.url);
  const official = feed.source_type === "official_web" || isOfficial(d);
  const asStatement = official && kind === "need_context";
  return {
    connector: "rss",
    kind: asStatement ? "statement" : kind,
    relation: asStatement ? "context" : relation,
    title: item.title,
    url: item.url,
    publisher: feed.name,
    source_domain: d,
    source_type: official ? "official_web" : feed.source_type,
    published_at: item.published_at,
    summary: null,
    excerpt: item.description ? item.description.slice(0, 280) : null,
    relevance_score: m.score,
    hits: m.hits,
    official,
  };
}

// The same story reaches us through several connectors under different URLs.
export function titleKey(title: string) {
  return fold(title).replace(/[^a-z0-9]+/g, " ").trim();
}

type BoeNorm = { identificador?: string; titulo?: string; fecha_publicacion?: string; url_html_consolidada?: string; url_eli?: string };

const BOE_PUBLISHER = "Agencia Estatal Boletín Oficial del Estado";
const BOE_CAVEAT = "Debe revisarse antes de considerarla evidencia de cumplimiento.";

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
      summary: `Norma localizada en la legislación consolidada del BOE. ${BOE_CAVEAT}`,
      relevance_score: m.score,
      hits: m.hits,
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
    summary: `Norma publicada en el Boletín Oficial del Estado y relacionada con esta recomendación. ${BOE_CAVEAT}`,
    relevance_score: m.score,
    hits: m.hits,
    official: true,
  };
}

// A norm published before the recommendation was made cannot be a development in response to it.
// Candidates with no known date are kept out as well.
export function isAfter(c: Candidate, since: string | null) {
  return !!since && !!c.published_at && c.published_at.slice(0, 10) >= since.slice(0, 10);
}

// Without a semantic classifier, only strong keyword matches are shown publicly. News titles
// must share three keywords with the profile: two is enough to file a candidate for review,
// but in practice still lets unrelated stories through.
export function heuristicIsPublic(c: Candidate) {
  if (c.connector === "boe_search" || c.connector === "boe_summary") return c.relevance_score >= 0.8;
  // Keywords cannot tell a step forward from a setback ("Congress rejects..."), so news about
  // implementation waits in the research queue; only continuing-need context is shown.
  if (c.kind === "implementation_candidate") return false;
  return c.hits >= 3 && c.relevance_score >= (c.official ? 0.76 : 0.82);
}

export function lastDays(n: number, now = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getTime() - i * 86400000);
    return d.toISOString().slice(0, 10).replaceAll("-", "");
  });
}
