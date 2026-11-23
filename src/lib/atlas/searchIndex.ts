import "server-only";
import { prepare, type PreparedEntry, type SearchEntry } from "@/lib/search";
import { getPublishedAnnotations } from "./annotations";
import { getBodies, getCountries, getDecisions, getInstruments, getInterpretations, getProcedures, getRights, getText } from "./data";
import { articlePath, bodyPath, countryPath, instrumentPath, instrumentTitle, kindNames, procedureKinds, procedurePath, rightPath, systemNames } from "./labels";
import type { ArticleNode } from "./types";

// What the Atlas search filters on, besides the words.
export type AtlasMeta = { system?: string; instrument?: string; body?: string; country?: string; date?: string | null };
export type AtlasEntry = SearchEntry & { meta: AtlasMeta };

// Built once per server instance from the files in data/atlas; annotations are read each time,
// since they change without a new deployment.
let built: Promise<{ entries: AtlasEntry[]; prepared: PreparedEntry[] }> | null = null;

async function build() {
  const [instruments, countries, bodies, procedures, interpretations, decisions, rights] = await Promise.all([
    getInstruments(), getCountries(), getBodies(), getProcedures(), getInterpretations(), getDecisions(), getRights(),
  ]);
  const entries: AtlasEntry[] = [];
  for (const r of rights) entries.push({ kind: "right", title: r.name, href: rightPath(r.id), text: r.phrases.join(" · "), meta: {} });
  for (const i of instruments) {
    entries.push({ kind: "instrument", title: instrumentTitle(i), note: `${systemNames[i.system]} · ${kindNames[i.kind]}`, href: instrumentPath(i.id),
      text: [i.title_en, i.popular_name_es, i.registry?.untc, i.registry?.oas, i.registry?.boe, i.registry?.un_symbol].filter(Boolean).join(" · "), meta: { system: i.system, instrument: i.id, date: i.concluded } });
    const lang = i.texts.find((t) => t.complete && t.lang === "es")?.lang || i.texts.find((t) => t.complete)?.lang;
    if (!lang) continue;
    const text = await getText(i.id, lang);
    for (const node of text?.nodes || []) {
      if (node.kind !== "article") continue;
      const a = node as ArticleNode;
      entries.push({ kind: "article", title: `${a.label}${a.heading ? `. ${a.heading}` : ""}`, note: instrumentTitle(i), href: articlePath(i.id, a.number),
        text: a.paragraphs.map((p) => p.text || "").join(" "), meta: { system: i.system, instrument: i.id, date: i.concluded } });
    }
  }
  for (const c of countries) entries.push({ kind: "country", title: c.name_es || c.name_en, note: c.region_es || undefined, href: countryPath(c.iso3), text: `${c.name_en} ${c.iso3}`, meta: { country: c.iso3, system: c.systems.join(" ") } });
  for (const b of bodies) entries.push({ kind: "body", title: b.name_es, note: systemNames[b.system], href: bodyPath(b.id), text: b.name_en || undefined, meta: { system: b.system, body: b.id } });
  for (const p of procedures) entries.push({ kind: "procedure", title: p.name_es, note: `${systemNames[p.system]} · ${procedureKinds[p.kind] || p.kind}`, href: procedurePath(p.id),
    text: [...p.requirements, ...p.deadline].map((q) => `${q.label || ""} ${q.quote || ""}`).join(" "), meta: { system: p.system, body: p.body || undefined } });
  for (const g of interpretations) entries.push({ kind: "interpretation", title: g.title, note: `${g.committee} · ${g.symbol}`, href: g.links.es, text: g.symbol, meta: { system: "un", body: g.body, instrument: g.instrument, date: g.date } });
  for (const d of decisions.items) entries.push({ kind: "decision", title: d.title || (d.communication ? `Comunicación n.º ${d.communication}` : d.symbol || d.id), note: `${d.committee || "TEDH"} · ${d.symbol || d.application || ""}`,
    href: d.links.hudoc || d.links.es, text: [d.symbol, d.conclusion].filter(Boolean).join(" "), meta: { system: d.source === "hudoc" ? "coe" : "un", body: d.body, instrument: d.instrument, country: d.states.join(" "), date: d.date } });
  return { entries, prepared: prepare(entries) };
}

export async function atlasIndex() {
  built ??= build().catch((error) => { built = null; throw error; });
  const base = await built;
  const annotations = await getPublishedAnnotations();
  if (!annotations.length) return base;
  const extra: AtlasEntry[] = annotations.map((a) => ({ kind: "annotation", title: a.title, note: `Anotación de Blue Human · ${a.author_name}`,
    href: `${a.article ? articlePath(a.instrument_id, a.article) : instrumentPath(a.instrument_id)}#nota-${a.id}`, text: a.body, meta: { instrument: a.instrument_id, date: a.published_at } }));
  return { entries: [...base.entries, ...extra], prepared: [...base.prepared, ...prepare(extra)] };
}
