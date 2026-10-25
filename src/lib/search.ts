// The search of the site header: what can be found and how a query is matched. No dependencies, so
// the browser and the tests run the same code. The index itself is built by /api/search.

export type SearchKind = "page" | "recommendation" | "sdg" | "dimension" | "data" | "news";

// `note` is a short line shown beside the title; `text` is searched and quoted when it holds the match.
export type SearchEntry = { kind: SearchKind; title: string; href: string; note?: string; text?: string };

export const kindLabels: Record<SearchKind, string> = {
  page: "Páginas",
  recommendation: "Recomendaciones",
  sdg: "Objetivos de Desarrollo Sostenible",
  dimension: "Seguridad humana",
  data: "Datos",
  news: "Actualidad",
};
const kindOrder = Object.keys(kindLabels) as SearchKind[];

// The pages of the site and the sections of the methodology. They are known without asking the
// server, so they can be found from the first keystroke and when the index cannot be loaded.
export const sitePages: SearchEntry[] = [
  { kind: "page", title: "Inicio", href: "/", text: "Seguimiento de los compromisos de derechos humanos de España: resultados del Examen Periódico Universal, seguridad humana y Agenda 2030." },
  { kind: "page", title: "Recomendaciones", href: "/commitments", text: "Las recomendaciones del cuarto ciclo del Examen Periódico Universal (EPU), con la respuesta de España y la valoración de su cumplimiento." },
  { kind: "page", title: "Datos e históricos", href: "/indicators", text: "Indicadores, series oficiales, estadísticas y mediciones vinculadas a las recomendaciones." },
  { kind: "page", title: "ODS", href: "/ods", text: "Los Objetivos de Desarrollo Sostenible y las metas de la Agenda 2030 con los que se relacionan las recomendaciones." },
  { kind: "page", title: "Actualidad", href: "/monitoring", text: "Seguimiento de la actualidad: noticias, publicaciones de instituciones y de la sociedad civil y novedades del Boletín Oficial del Estado." },
  { kind: "page", title: "Impacto en la seguridad humana", href: "/#seguridad-humana", note: "Inicio", text: "A qué dimensiones de la seguridad humana afectan las recomendaciones." },
  { kind: "page", title: "Metodología", href: "/methodology", text: "Cómo se elaboran las fichas, en qué se basan las valoraciones y cómo se hace el seguimiento de las fuentes públicas." },
  { kind: "page", title: "Qué es una ficha y qué no es", href: "/methodology#alcance", note: "Metodología", text: "Alcance: obligaciones jurídicas, compromisos formales, recomendaciones aceptadas y anotadas." },
  { kind: "page", title: "Estado de cumplimiento", href: "/methodology#valoracion", note: "Metodología", text: "Valoración: cumplida, cumplimiento sustancial, avance limitado, no cumplida, retroceso, evidencia insuficiente y nivel de confianza." },
  { kind: "page", title: "Jerarquía de fuentes", href: "/methodology#evidencias", note: "Metodología", text: "Evidencias: evidencia primaria, institucional independiente, de la sociedad civil y secundaria." },
  { kind: "page", title: "Seguimiento de la actualidad", href: "/methodology#seguimiento", note: "Metodología", text: "El seguimiento se mantiene separado de la evidencia. Valoraciones provisionales y pendientes de confirmación final." },
  { kind: "page", title: "Dimensiones de la seguridad humana", href: "/methodology#seguridad-humana", note: "Metodología", text: "Cómo se asignan las dimensiones económica, alimentaria, sanitaria, ambiental, personal, comunitaria, política y tecnológica." },
  { kind: "page", title: "Relación con los Objetivos de Desarrollo Sostenible", href: "/methodology#agenda-2030", note: "Metodología", text: "Agenda 2030: cómo se relaciona cada recomendación con los ODS y sus metas." },
  { kind: "page", title: "Historial y correcciones", href: "/methodology#historial", note: "Metodología", text: "Integridad del registro: historial de valoraciones, correcciones y derecho de réplica." },
  { kind: "page", title: "Contacto", href: "/contact", text: "Formulario de contacto y correo electrónico para consultas, correcciones, nuevas evidencias, derecho de réplica, medios de comunicación y colaboración." },
  { kind: "page", title: "Open HRCI", href: "/open", text: "Fuentes, método, datos abiertos y código del HRCI: archivos de datos y repositorio en GitHub." },
];

// Lower case and without accents, one character for each one of the text: «España» is found by
// «espana», and a position in the folded text is the same position in the text as written.
export function fold(text: string) {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    const base = ch.length === 1 ? ch.normalize("NFD")[0].toLowerCase() : ch;
    out += base.length === ch.length ? base : ch;
  }
  return out;
}

export type PreparedEntry = { entry: SearchEntry; title: string; text: string };

export function prepare(entries: SearchEntry[]): PreparedEntry[] {
  return entries.map((raw) => {
    const entry = { ...raw, title: raw.title.normalize("NFC"), note: raw.note?.normalize("NFC"), text: raw.text?.normalize("NFC") };
    return { entry, title: fold(`${entry.title} ${entry.note ?? ""}`), text: fold(entry.text ?? "") };
  });
}

export const queryWords = (query: string) => fold(query).split(/\s+/).filter(Boolean).slice(0, 8);

export type SearchGroup = { kind: SearchKind; total: number; entries: SearchEntry[] };

const wordStart = (haystack: string, at: number) => at === 0 || !/[\p{L}\p{N}]/u.test(haystack[at - 1]);
const wordEnd = (haystack: string, at: number) => at >= haystack.length || !/[\p{L}\p{N}]/u.test(haystack[at]);

// How well one word of the query is found in an entry. In the title counts for more than in the
// text, and a whole word for more than a part of one: «50.1» puts recommendation 50.1 before 50.10.
function wordScore(item: PreparedEntry, word: string) {
  let best = 0;
  for (let at = item.title.indexOf(word); at !== -1 && best < 8; at = item.title.indexOf(word, at + 1)) {
    const start = wordStart(item.title, at);
    best = Math.max(best, start && wordEnd(item.title, at + word.length) ? 8 : start ? 5 : 3);
  }
  return best || (item.text.includes(word) ? 1 : 0);
}

// Every word of the query has to be found. Groups are ordered by their best match and, when even,
// in the order of `kindLabels`; `limit` caps each group, except the one named in `whole`.
export function search(index: PreparedEntry[], query: string, limit = 5, whole?: SearchKind): SearchGroup[] {
  const words = queryWords(query);
  if (!words.length) return [];
  const found: Partial<Record<SearchKind, { entry: SearchEntry; score: number }[]>> = {};
  for (const item of index) {
    let score = 0;
    for (const word of words) {
      const one = wordScore(item, word);
      if (!one) { score = 0; break; }
      score += one;
    }
    if (score) (found[item.entry.kind] ??= []).push({ entry: item.entry, score });
  }
  return kindOrder
    .filter((kind) => found[kind])
    .map((kind) => {
      // The sort is stable: among equals, the order of the index is kept.
      const hits = found[kind]!.sort((a, b) => b.score - a.score);
      return { kind, best: hits[0].score, total: hits.length, entries: hits.slice(0, kind === whole ? 50 : limit).map((hit) => hit.entry) };
    })
    .sort((a, b) => b.best - a.best)
    .map(({ kind, total, entries }) => ({ kind, total, entries }));
}

// The part of a text around the first word of the query found in it, or its beginning when none is.
export function excerpt(text: string, words: string[], radius = 64) {
  const folded = fold(text);
  const positions = words.map((word) => folded.indexOf(word)).filter((at) => at !== -1);
  const at = positions.length ? Math.min(...positions) : 0;
  let from = Math.max(0, at - radius), to = Math.min(text.length, at + radius * 2);
  // Cut at a space, not inside a word.
  if (from > 0) from = text.indexOf(" ", from) + 1 || from;
  if (to < text.length) to = text.lastIndexOf(" ", to) > from ? text.lastIndexOf(" ", to) : to;
  return `${from > 0 ? "…" : ""}${text.slice(from, to).trim()}${to < text.length ? "…" : ""}`;
}

// A text cut into the parts that match a word of the query and the parts that do not.
export function marks(text: string, words: string[]): { text: string; hit: boolean }[] {
  const folded = fold(text);
  const hit = new Array<boolean>(text.length).fill(false);
  for (const word of words) {
    for (let at = folded.indexOf(word); at !== -1; at = folded.indexOf(word, at + word.length)) hit.fill(true, at, at + word.length);
  }
  const parts: { text: string; hit: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.hit === hit[i]) last.text += text[i];
    else parts.push({ text: text[i], hit: hit[i] });
  }
  return parts;
}
