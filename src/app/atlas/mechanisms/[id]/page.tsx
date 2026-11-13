import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, Container, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead } from "@/components/atlas/AtlasShell";
import { ExternalLink, QuoteBlock } from "@/components/atlas/Quote";
import { getBody, getProcedure, getProcedureStatus, getProcedures } from "@/lib/atlas/data";
import { acceptanceNames, bodyPath, procedureKinds, systemNames } from "@/lib/atlas/labels";
import { instrumentMap } from "@/lib/atlas/relations";
import type { Quote } from "@/lib/atlas/types";

export const dynamicParams = false;
export async function generateStaticParams() {
  return (await getProcedures()).map((p) => ({ id: p.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await getProcedure((await params).id);
  return p ? { title: `${p.name_es} | Human Rights Atlas`, description: `${procedureKinds[p.kind] || p.kind} · ${systemNames[p.system]}: base jurídica, legitimación, requisitos, plazos y canal oficial, con la cita de cada norma.` } : {};
}

function Block({ title, quotes, empty, instruments, labelled = false }: { title: string; quotes: Quote[]; empty?: string; instruments: Awaited<ReturnType<typeof instrumentMap>>; labelled?: boolean }) {
  return (
    <Box component="section" sx={{ py: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
      <Typography component="h3" variant="h6" color="primary.main" sx={{ fontSize: "1.05rem" }}>{title}</Typography>
      {quotes.length ? quotes.map((q, i) => (
        <Box key={i}>
          {labelled && q.label && <Typography variant="body2" sx={{ fontWeight: 600, mt: 1.25 }}>{q.label}</Typography>}
          <QuoteBlock q={q} instruments={instruments} compact />
        </Box>
      )) : <Typography variant="body2" color="text.secondary" sx={{ mt: .75 }}>{empty || "No documentado en las fuentes incorporadas al Atlas."}</Typography>}
    </Box>
  );
}

export default async function ProcedurePage({ params }: { params: Promise<{ id: string }> }) {
  const p = await getProcedure((await params).id);
  if (!p) notFound();
  const [instruments, body, status] = await Promise.all([instrumentMap(), p.body ? getBody(p.body) : null, getProcedureStatus()]);
  const states = Object.values(status.procedures[p.id] || {});
  const counts = new Map<string, number>();
  for (const s of states) counts.set(s.s, (counts.get(s.s) || 0) + 1);

  return (
    <AtlasShell crumbs={[{ label: "Mecanismos", href: "/rights/mechanisms" }, { label: p.name_es }]}>
      <PageHead overline={`${systemNames[p.system]} · ${procedureKinds[p.kind] || p.kind}`} title={p.name_es}>
        {body && <p>Órgano: <Link href={bodyPath(body.id)}>{body.name_es}</Link></p>}
        <p>Ficha informativa: reproduce lo que establecen las normas citadas. No determina si un caso es admisible.</p>
      </PageHead>
      <Container maxWidth="lg" sx={{ pb: 5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,1fr) 280px" }, columnGap: 6, rowGap: 3 }}>
          <Box sx={{ minWidth: 0 }}>
            <Block title="1. Base jurídica" quotes={p.basis} empty={p.basis_note} instruments={instruments} />
            <Block title="2. Quién puede iniciarlo" quotes={p.who} instruments={instruments} />
            <Block title="3. Contra quién puede dirigirse" quotes={p.against} instruments={instruments} />
            <Block title="4. Requisitos de acceso y de admisibilidad" quotes={p.requirements} instruments={instruments} labelled />
            <Block title="5. Plazos" quotes={p.deadline} instruments={instruments} labelled empty="Las fuentes incorporadas no fijan un plazo para este procedimiento o no se ha podido citar." />
            <Block title="6. Medidas provisionales o cautelares" quotes={p.interim} instruments={instruments} />
            <Block title="7. Fases y resultado" quotes={p.steps} instruments={instruments} labelled />
            <Block title="8. Seguimiento" quotes={p.follow_up} instruments={instruments} />
            {p.not_quoted?.map((n) => <Typography key={n} variant="body2" color="text.secondary" sx={{ mt: 2 }}>{n}</Typography>)}
          </Box>
          <Box component="aside" aria-label="Presentación y aplicación">
            <Box sx={{ position: { md: "sticky" }, top: 90 }}>
              {p.submission && (
                <Box sx={{ p: 2, bgcolor: brand.navy, color: "#fff" }}>
                  <Typography variant="overline" sx={{ color: "rgba(255,255,255,.7)" }}>Canal oficial</Typography>
                  <Typography variant="body2" sx={{ mt: .5, "& a": { color: "#fff" } }}><ExternalLink href={p.submission.url}>{p.submission.label}</ExternalLink></Typography>
                  <Typography variant="caption" sx={{ display: "block", mt: 1, color: "rgba(255,255,255,.7)" }}>El Atlas no tramita ni reenvía solicitudes.</Typography>
                </Box>
              )}
              {p.official_pages?.map((o) => <Typography key={o.url} variant="body2" sx={{ mt: 1.5 }}><ExternalLink href={o.url}>{o.label}</ExternalLink></Typography>)}
              <Box sx={{ mt: 2.5 }}>
                <Typography variant="overline" color="text.secondary">Aplicación por Estado</Typography>
                {[...counts.entries()].map(([s, n]) => <Typography key={s} variant="body2">{acceptanceNames[s as keyof typeof acceptanceNames]}: {n}</Typography>)}
                <Typography variant="body2" sx={{ mt: 1 }}><Link href={`/rights/mechanisms/guide?tipo=${p.kind}&sistema=${p.system}`}>Consultar un Estado en el orientador</Link></Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>
    </AtlasShell>
  );
}

