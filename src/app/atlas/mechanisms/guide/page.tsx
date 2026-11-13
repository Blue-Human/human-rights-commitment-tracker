import type { Metadata } from "next";
import Link from "next/link";
import { Box, Button, Container, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { Checklist } from "@/components/atlas/Checklist";
import { Dot, ExternalLink } from "@/components/atlas/Quote";
import { getBodies, getCountries, getProcedureStatus, getProcedures, getRights } from "@/lib/atlas/data";
import { acceptanceNames, acceptanceTones, procedureKinds, procedurePath, shortDate, startedByPeople, systemNames, systemOrder } from "@/lib/atlas/labels";
import type { Procedure, Quote } from "@/lib/atlas/types";

export const metadata: Metadata = {
  title: "Orientador de mecanismos | Human Rights Atlas",
  description: "Qué procedimientos internacionales consta que se aplican a un Estado y qué requisitos establece cada uno, según los registros y las normas oficiales.",
};

const instrumentsOf = (p: Procedure) => new Set([...p.basis, ...p.requirements, ...p.who].map((q: Quote) => q.i).filter(Boolean) as string[]);
const order: Record<string, number> = { accepted: 0, check: 1, withdrawn: 2, not_accepted: 3, not_recorded: 4 };

type Params = { pais?: string; derecho?: string; sistema?: string; tipo?: string };

export default async function GuidePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [countries, rights, procedures, status, bodies] = await Promise.all([getCountries(), getRights(), getProcedures(), getProcedureStatus(), getBodies()]);
  const bodyName = new Map(bodies.map((b) => [b.id, b.name_es]));
  const country = countries.find((c) => c.iso3 === (params.pais || "").toUpperCase());
  const right = rights.find((r) => r.id === params.derecho);
  const rightInstruments = right ? new Set([...right.articles.map((a) => a.instrument), ...right.instruments.map((i) => i.instrument)]) : null;
  const kinds = [...new Set(procedures.map((p) => p.kind))];
  const sorted = [...countries].sort((a, b) => (a.name_es || a.name_en).localeCompare(b.name_es || b.name_en, "es"));

  const results = country ? procedures
    .filter((p) => (!params.sistema || p.system === params.sistema) && (!params.tipo || p.kind === params.tipo))
    .filter((p) => !rightInstruments || [...instrumentsOf(p)].some((i) => rightInstruments.has(i)))
    .map((p) => ({ p, s: status.procedures[p.id]?.[country.iso3] ?? { s: "check" as const, why: "Sin datos del registro para este Estado" } }))
    .sort((a, b) => order[a.s.s] - order[b.s.s]) : [];

  const select = { p: 1, border: `1px solid ${brand.border}`, bgcolor: "#fff", font: "inherit", fontSize: ".95rem", color: brand.ink, width: "100%" };

  return (
    <AtlasShell crumbs={[{ label: "Mecanismos", href: "/rights/mechanisms" }, { label: "Orientador" }]}>
      <PageHead overline="Mecanismos de protección" title="Orientador">
        <p>Muestra qué procedimientos consta en los registros oficiales que se aplican a un Estado y la lista de requisitos que establece cada norma, para que puedan comprobarse. Funciona solo con reglas explícitas y datos registrados: no interpreta casos, no valora la admisibilidad y no recomienda ninguna vía.</p>
        <p>No escriba aquí datos personales ni hechos de un caso: el orientador no los pide ni los necesita.</p>
      </PageHead>
      <Container maxWidth="lg" sx={{ pb: 3 }}>
        <Box component="form" method="get" action="/rights/mechanisms/guide" sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr)) auto" }, gap: 1.5, alignItems: "end" }}>
          <Box component="label" sx={{ display: "flex", flexDirection: "column", gap: .5, fontSize: ".8rem", color: "text.secondary" }}>
            País
            <Box component="select" name="pais" defaultValue={country?.iso3 || ""} required sx={select}>
              <option value="">Elija un país</option>
              {sorted.map((c) => <option key={c.iso3} value={c.iso3}>{c.name_es || c.name_en}</option>)}
            </Box>
          </Box>
          <Box component="label" sx={{ display: "flex", flexDirection: "column", gap: .5, fontSize: ".8rem", color: "text.secondary" }}>
            Derecho o materia
            <Box component="select" name="derecho" defaultValue={right?.id || ""} sx={select}>
              <option value="">Cualquiera</option>
              {rights.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Box>
          </Box>
          <Box component="label" sx={{ display: "flex", flexDirection: "column", gap: .5, fontSize: ".8rem", color: "text.secondary" }}>
            Sistema
            <Box component="select" name="sistema" defaultValue={params.sistema || ""} sx={select}>
              <option value="">Todos</option>
              {systemOrder.map((s) => <option key={s} value={s}>{systemNames[s]}</option>)}
            </Box>
          </Box>
          <Box component="label" sx={{ display: "flex", flexDirection: "column", gap: .5, fontSize: ".8rem", color: "text.secondary" }}>
            Tipo de mecanismo
            <Box component="select" name="tipo" defaultValue={params.tipo || ""} sx={select}>
              <option value="">Todos</option>
              {kinds.map((k) => <option key={k} value={k}>{procedureKinds[k] || k}</option>)}
            </Box>
          </Box>
          <Button type="submit" variant="contained" sx={{ height: 42 }}>Consultar</Button>
        </Box>
        {right && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>«{right.name}»: se muestran los procedimientos basados en instrumentos que, según su título o el encabezamiento de sus artículos, reconocen este derecho.</Typography>}
      </Container>

      {country && (
        <Section title={`Resultados para ${country.name_es || country.name_en}`} id="resultados" note={`${results.length} procedimientos. El estado de cada uno procede del registro indicado; «Requiere verificación» significa que el dato no está disponible o debe leerse en la fuente.`}>
          {results.length === 0 && <Typography variant="body2" color="text.secondary">Ningún procedimiento coincide con los filtros elegidos.</Typography>}
          {results.map(({ p, s }) => (
            <Box key={p.id} component="article" sx={{ py: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
                <Box sx={{ minWidth: 0, flex: "1 1 420px" }}>
                  <Typography variant="caption" color="text.secondary">{systemNames[p.system]} · {procedureKinds[p.kind] || p.kind}{startedByPeople.has(p.kind) ? " · a instancia de personas u organizaciones" : ""}</Typography>
                  <Typography component="h3" variant="h6" color="primary.main"><Link href={procedurePath(p.id)}>{p.name_es}</Link></Typography>
                  {p.body && <Typography variant="body2" color="text.secondary">{bodyName.get(p.body)}</Typography>}
                </Box>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: .75 }}>
                  <Dot color={acceptanceTones[s.s]} size={11} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: acceptanceTones[s.s] }}>{acceptanceNames[s.s]}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: 320 }}>{s.why}{s.d ? ` · ${shortDate(s.d)}` : ""}</Typography>
                  </Box>
                </Box>
              </Box>
              {s.quote && <Typography variant="body2" color="text.secondary" sx={{ mt: 1, pl: 1.5, borderLeft: `2px solid ${brand.border}` }}>«{s.quote}»</Typography>}
              {(p.requirements.length > 0 || p.deadline.length > 0) && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="overline" color="text.secondary">Requisitos que deben comprobarse</Typography>
                  <Checklist items={[...p.requirements, ...p.deadline].map((q, i) => ({ id: `${p.id}-${i}`, label: q.label || "Requisito", detail: q.quote ? `${q.quote.slice(0, 420)}${q.quote.length > 420 ? "…" : ""}` : q.unavailable || "Requiere verificación en la norma." }))} />
                </Box>
              )}
              {p.submission && <Typography variant="body2" sx={{ mt: 1.5 }}>Presentación: <ExternalLink href={p.submission.url}>{p.submission.label}</ExternalLink></Typography>}
            </Box>
          ))}
        </Section>
      )}
    </AtlasShell>
  );
}
