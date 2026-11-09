import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type {
  AcceptanceStatus, Body, Country, Decision, Instrument, Interpretation, MatrixCell, Participation, Procedure, ProcedureAcceptance,
  Right, Source, TextFile,
} from "./types";

// The Atlas reads the files that scripts/atlas/build.py writes to data/atlas. They are part of the
// deployment (see outputFileTracingIncludes in next.config.ts), so nothing here calls a source.
const root = path.join(process.cwd(), "data", "atlas");

async function json<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(root, file), "utf8")) as T;
}
async function optional<T>(file: string): Promise<T | null> {
  try {
    return await json<T>(file);
  } catch {
    return null;
  }
}

const safe = (value: string) => /^[a-z0-9-]+$/i.test(value);

// A rules document is titled only «Reglamento»: its card names the body it belongs to.
export const getInstruments = cache(async () => {
  const [instruments, bodies] = await Promise.all([
    json<{ generated: string; instruments: Instrument[] }>("instruments.json").then((d) => d.instruments),
    json<{ bodies: Body[] }>("bodies.json").then((d) => d.bodies).catch(() => [] as Body[]),
  ]);
  const name = new Map(bodies.map((b) => [b.id, b.name_es]));
  return instruments.map((i) => (i.title_es || i.category !== "procedural" || !i.bodies[0] ? i
    : { ...i, title_es: `${i.kind === "statute" ? "Estatuto" : "Reglamento"} · ${name.get(i.bodies[0]) ?? i.bodies[0]}`, title_es_note: "Título descriptivo: el documento se titula «Reglamento»." }));
});
export const getInstrument = cache(async (id: string) => (await getInstruments()).find((i) => i.id === id) ?? null);
export const getText = cache(async (id: string, lang: string) => (safe(id) && safe(lang) ? optional<TextFile>(`texts/${id}.${lang}.json`) : null));
export const getParticipation = cache(async (id: string) => (safe(id) ? optional<Participation>(`participation/${id}.json`) : null));

export const getCountries = cache(async () => (await json<{ countries: Country[] }>("countries.json")).countries);
export const getCountry = cache(async (iso3: string) => (await getCountries()).find((c) => c.iso3 === iso3.toUpperCase()) ?? null);
export const getMatrix = cache(async () => (await json<{ generated: string; states: Record<string, Record<string, MatrixCell>> }>("matrix.json")));
export const getAcceptance = cache(async () => (await json<{ countries: Record<string, { ref: { url: string; retrieved?: string }; procedures: ProcedureAcceptance[] }> }>("acceptance.json")).countries);

export const getBodies = cache(async () => (await json<{ bodies: Body[] }>("bodies.json")).bodies);
export const getBody = cache(async (id: string) => (await getBodies()).find((b) => b.id === id) ?? null);
export const getProcedures = cache(async () => (await json<{ procedures: Procedure[] }>("procedures.json")).procedures);
export const getProcedure = cache(async (id: string) => (await getProcedures()).find((p) => p.id === id) ?? null);
export const getProcedureStatus = cache(async () => (await json<{ procedures: Record<string, Record<string, AcceptanceStatus>>; afchpr_34_6: unknown }>("procedure-status.json")));

export const getInterpretations = cache(async () => (await json<{ items: Interpretation[] }>("interpretations.json")).items);
export const getDecisions = cache(async () => (await json<{ hudoc_status: string; items: Decision[] }>("decisions.json")));
export const getRights = cache(async () => (await json<{ rights: Right[] }>("rights.json")).rights);
export const getRight = cache(async (id: string) => (await getRights()).find((r) => r.id === id) ?? null);
export const getSources = cache(async () => (await json<{ generated: string; sources: Source[] }>("sources.json")));
export const getReport = cache(async () => json<{ run_at: string; steps: Record<string, { ok: boolean; error?: string; unavailable?: string }>; unavailable: { step: string; detail: string }[]; errors: { step: string; detail: string }[]; quote_errors?: { where: string; detail: string }[] }>("report.json"));
