import type { Metadata } from "next";
import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { ExternalLink } from "@/components/atlas/Quote";
import { Figure } from "@/components/Figure";
import { getBodies, getCountries, getDecisions, getInstruments, getInterpretations, getMatrix, getProcedures, getReport, getRights, getSources } from "@/lib/atlas/data";
import { checkNames, instrumentPath, instrumentTitle, longDate } from "@/lib/atlas/labels";

export const metadata: Metadata = {
  title: "Fuentes y cobertura | Human Rights Atlas",
  description: "Inventario de las fuentes oficiales del Atlas, qué se ha recopilado de cada una, cómo se verifica y qué límites quedan.",
};

const integration: Record<string, string> = {
  integrated: "Integrada", partial: "Integración parcial", blocked: "No accesible de forma automatizada", pending: "Pendiente", reference: "Referencia", link: "Enlace al canal oficial",
};

export default async function SourcesPage() {
  const [sources, instruments, countries, matrix, bodies, procedures, interpretations, decisions, rights, report] = await Promise.all([
    getSources(), getInstruments(), getCountries(), getMatrix(), getBodies(), getProcedures(), getInterpretations(), getDecisions(), getRights(), getReport(),
  ]);
  const withText = instruments.filter((i) => i.texts.some((t) => t.complete));
  const failing = instruments.filter((i) => i.texts.length && !i.texts.some((t) => t.complete));
  const noText = instruments.filter((i) => !i.texts.length);
  const records = Object.values(matrix.states).reduce((n, row) => n + Object.keys(row).length, 0);
  const verified = rights.reduce((n, r) => n + r.articles.length, 0) + interpretations.reduce((n, g) => n + g.articles.length, 0) + decisions.items.reduce((n, d) => n + d.articles.length, 0);
  const quotes = procedures.reduce((n, p) => n + p.quoted, 0) + bodies.reduce((n, b) => n + b.competences.filter((c) => c.quote).length + b.composition.filter((c) => c.quote).length + (b.established_by?.quote ? 1 : 0), 0);

  return (
    <AtlasShell crumbs={[{ label: "Sobre el Atlas" }, { label: "Fuentes y cobertura" }]}>
      <PageHead overline="Transparencia" title="Fuentes, cobertura y límites">
        <p>Todos los datos del Atlas proceden de fuentes institucionales. Un proceso automático los descarga, comprueba su integridad, conserva la fecha y la huella de cada documento y los publica; si una fuente deja de responder, se mantienen los datos de la última lectura y se indica. Última ejecución: {longDate(report.run_at.slice(0, 10))}.</p>
      </PageHead>

      <Section id="cobertura" overline="Cobertura" title="Qué contiene el Atlas">
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, columnGap: 4, rowGap: 3 }}>
          <Figure value={String(instruments.length)}>instrumentos incorporados (incluidos reglamentos y enmiendas)</Figure>
          <Figure value={String(withText.length)}>con articulado completo verificado</Figure>
          <Figure value={String(countries.length)}>Estados con datos de los registros</Figure>
          <Figure value={String(records)}>registros de participación (Estado e instrumento)</Figure>
          <Figure value={String(bodies.length)}>órganos</Figure>
          <Figure value={String(procedures.length)}>procedimientos documentados</Figure>
          <Figure value={String(quotes)}>disposiciones citadas literalmente y comprobadas</Figure>
          <Figure value={String(interpretations.length + decisions.items.length)}>interpretaciones y decisiones</Figure>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, maxWidth: 860, lineHeight: 1.7 }}>
          {verified} relaciones entre documentos y artículos, todas con su base expresa (encabezamiento oficial, título oficial o metadatos del órgano). La cobertura no es mundial ni exhaustiva: comprende los sistemas universal y regionales indicados y, para la jurisprudencia, las decisiones de los comités de las Naciones Unidas relativas a España.
        </Typography>
      </Section>

      <Section id="sin-texto" overline="Límites" title="Instrumentos sin articulado en el lector">
        {[...failing, ...noText].map((i) => (
          <Box key={i.id} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}><Link href={instrumentPath(i.id)}>{instrumentTitle(i)}</Link></Typography>
            <Typography variant="caption" color="text.secondary">
              {i.texts.length ? `Versión oficial localizada que no supera los controles: ${i.texts.flatMap((t) => t.checks.filter((c) => !c.ok).map((c) => checkNames[c.check] || c.check)).join("; ")}.` : "No se ha localizado una versión digital oficial con texto extraíble."}
            </Typography>
          </Box>
        ))}
      </Section>

      <Section id="inventario" overline="Inventario" title="Fuentes oficiales">
        <Box sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ width: "100%", minWidth: 860, borderCollapse: "collapse", fontSize: ".85rem", "& th, & td": { textAlign: "left", p: 1, borderBottom: "1px solid", borderColor: "divider", verticalAlign: "top" }, "& thead th": { color: "text.secondary", fontSize: ".78rem" } }}>
            <thead><tr><th scope="col">Fuente</th><th scope="col">Datos</th><th scope="col">Acceso</th><th scope="col">Condiciones de reutilización</th><th scope="col">Última comprobación</th><th scope="col">Estado</th></tr></thead>
            <tbody>
              {sources.sources.map((s) => (
                <tr key={s.id}>
                  <th scope="row" style={{ fontWeight: 500 }}><ExternalLink href={s.url}>{s.name}</ExternalLink><Typography component="span" variant="caption" color="text.secondary" sx={{ display: "block" }}>{s.institution}</Typography></th>
                  <td>{s.data}</td>
                  <td>{s.access}</td>
                  <td>{s.terms || "No indicadas en la fuente"}</td>
                  <td>{s.last_checked ? longDate(s.last_checked) : "—"}{s.documents ? ` · ${s.documents} documentos` : ""}</td>
                  <td>{integration[s.integration] || s.integration}{s.answered_last_run === false ? " · no respondió en la última ejecución" : ""}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      </Section>

      <Section id="ejecucion" overline="Última ejecución" title="Incidencias">
        {report.unavailable.length === 0 && report.errors.length === 0 && !report.quote_errors?.length ? <Typography variant="body2">Sin incidencias.</Typography> : null}
        {report.unavailable.map((u, i) => <Typography key={i} variant="body2" color="text.secondary" sx={{ py: .5, overflowWrap: "anywhere" }}>No disponible · {u.step}</Typography>)}
        {report.errors.map((e, i) => <Typography key={i} variant="body2" color="text.secondary" sx={{ py: .5 }}>Error · {e.step}: {e.detail}</Typography>)}
        {report.quote_errors?.map((e, i) => <Typography key={i} variant="body2" color="error" sx={{ py: .5 }}>Referencia no verificada · {e.where}: {e.detail}</Typography>)}
        <Typography variant="body2" sx={{ mt: 2 }}>El método, los adaptadores por fuente y las pruebas de integridad están documentados en el <ExternalLink href="https://github.com/Blue-Human/human-rights-commitment-tracker/tree/main/docs/atlas">repositorio público</ExternalLink>.</Typography>
      </Section>
    </AtlasShell>
  );
}
