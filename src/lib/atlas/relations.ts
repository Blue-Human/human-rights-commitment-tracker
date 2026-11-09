import "server-only";
import { getBodies, getDecisions, getInstruments, getInterpretations, getProcedures, getRights } from "./data";
import { instrumentTitle, longDate } from "./labels";
import type { ArticleContext } from "@/components/atlas/TextReader";
import type { Instrument, Procedure, Quote } from "./types";

// Articles an amendment changes, read from its official title: "Amendment to article 43 (2) of
// the Convention on the Rights of the Child" → ["43"].
export function amendedArticles(amendment: Instrument) {
  const title = amendment.title_en || amendment.title_es || "";
  const match = title.match(/articles?\s+([\d\s(),and]+?)\s+(?:of|de)\b/i);
  return match ? [...match[1].matchAll(/(\d+)(?:\s*\(\d+\))?/g)].map((m) => m[1]) : [];
}

export function amendmentNotice(amendment: Instrument) {
  const date = amendment.entry_into_force?.date;
  return `Este artículo es objeto de una enmienda registrada por el depositario: «${instrumentTitle(amendment)}». ${date ? `Entró en vigor el ${longDate(date)} para los Estados que la han aceptado.` : "El registro no indica su entrada en vigor."} El texto que se muestra es el de la publicación indicada, que puede no incorporarla.`;
}

export async function articleContext(instrumentId: string) {
  const [instruments, interpretations, decisions, rights] = await Promise.all([getInstruments(), getInterpretations(), getDecisions(), getRights()]);
  const context = new Map<string, ArticleContext>();
  const get = (n: string) => {
    if (!context.has(n)) context.set(n, { interpretations: 0, decisions: 0, rights: [] });
    return context.get(n)!;
  };
  for (const g of interpretations) for (const a of g.articles) if (a.instrument === instrumentId) get(a.article).interpretations++;
  for (const d of decisions.items) {
    const seen = new Set<string>();
    for (const a of d.articles) if (a.instrument === instrumentId && !seen.has(a.article)) { seen.add(a.article); get(a.article).decisions++; }
  }
  for (const r of rights) {
    const seen = new Set<string>();
    for (const a of r.articles) if (a.instrument === instrumentId && !seen.has(a.article)) { seen.add(a.article); get(a.article).rights.push({ id: r.id, name: r.name }); }
  }
  for (const amendment of instruments.filter((i) => i.kind === "amendment" && i.parent === instrumentId)) {
    for (const n of amendedArticles(amendment)) get(n).notice = amendmentNotice(amendment);
  }
  return context;
}

// Procedures that quote a given provision (or any provision of an instrument).
export async function proceduresCiting(instrumentId: string, article?: string) {
  const procedures = await getProcedures();
  const refs = (p: Procedure): Quote[] => [...p.basis, ...p.who, ...p.against, ...p.requirements, ...p.deadline, ...p.interim, ...p.steps, ...p.follow_up];
  return procedures.filter((p) => refs(p).some((q) => q.i === instrumentId && (!article || q.a === article)));
}

export async function bodiesOf(instrumentId: string) {
  return (await getBodies()).filter((b) => b.instruments.includes(instrumentId));
}

export async function instrumentMap() {
  return new Map((await getInstruments()).map((i) => [i.id, i]));
}
