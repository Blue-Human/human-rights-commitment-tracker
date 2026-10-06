import type { Metadata } from "next";
import Link from "next/link";
import { Box, Container, Typography } from "@mui/material";
import { MonitoringCard } from "@/components/MonitoringCard";
import { MonitoringExplorer, type ExplorerItem } from "@/components/MonitoringExplorer";
import { RecordDisclosure } from "@/components/RecordDisclosure";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getAllHumanSecurityDimensions, getCommitments, getMonitoringStatus, getRecentMonitoringItems, groupByUrl } from "@/lib/hrct";

export const metadata: Metadata = {
  title: "Actualidad | Human Rights Commitment Institute",
  description: "Noticias, publicaciones oficiales y cambios normativos recientes relacionados con las recomendaciones del EPU a España.",
};

const section = { py: { xs: 5, md: 7 }, borderTop: "1px solid", borderColor: "divider" };

function Heading({ id, overline, title }: { id: string; overline: string; title: string }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="overline" color="text.secondary">{overline}</Typography>
      <Typography id={id} variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.8rem", md: "2.25rem" }, mt: .5 }}>{title}</Typography>
    </Box>
  );
}

export default async function MonitoringPage() {
  const [commitments, items, status, dimensionLinks] = await Promise.all([getCommitments(), getRecentMonitoringItems(), getMonitoringStatus(), getAllHumanSecurityDimensions().catch(() => [])]);
  const numbers = Object.fromEntries(commitments.map((c) => [c.public_id, c.recommendation_number || c.public_id]));
  const dimensionsById: Record<string, string[]> = {};
  for (const d of dimensionLinks) (dimensionsById[d.public_id] ??= []).push(d.code);
  const developments = groupByUrl(items);
  const [lead, ...rest] = developments;
  const next = rest.slice(0, 3);

  // Only what the cards and the filters use travels to the browser.
  const explorer: ExplorerItem[] = developments.map((d) => ({
    slug: d.slug, kind: d.kind, relation: d.relation, title: d.title, publisher: d.publisher, source_domain: d.source_domain, source_type: d.source_type,
    published_at: d.published_at, summary: d.summary, excerpt: d.excerpt, status: d.status, public_ids: d.public_ids,
    dimensions: [...new Set(d.public_ids.flatMap((id) => dimensionsById[id] || []))],
    numbers: d.public_ids.map((id) => numbers[id] || id),
  }));

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ pt: { xs: 4.5, md: 6 }, pb: { xs: 4, md: 5 } }}>
          <Typography variant="overline" color="primary.main" sx={{ borderLeft: "3px solid", borderColor: "secondary.main", pl: 1.5 }}>España · EPU, cuarto ciclo</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2.2rem", md: "3rem" }, mt: 1 }}>Actualidad</Typography>
          <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 660, lineHeight: 1.7 }}>
            Noticias, publicaciones oficiales y cambios normativos relacionados con las recomendaciones de derechos humanos que recibió España.
          </Typography>
        </Container>

        {lead && (
          <Container component="section" aria-labelledby="latest-heading" maxWidth="lg" sx={{ pb: { xs: 5, md: 7 } }}>
            <Typography id="latest-heading" variant="overline" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>Lo más reciente</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: next.length ? "minmax(0,7fr) minmax(0,5fr)" : "minmax(0,1fr)" }, columnGap: 5, rowGap: 1 }}>
              <MonitoringCard item={lead} variant="lead" heading="h2" />
              {next.length > 0 && (
                <Box sx={{ borderTop: { md: "1px solid" }, borderColor: { md: "divider" } }}>
                  {next.map((item) => <MonitoringCard key={item.slug} item={item} variant="row" heading="h2" />)}
                </Box>
              )}
            </Box>
          </Container>
        )}

        <Container component="section" aria-labelledby="all-heading" maxWidth="lg" sx={section}>
          <Heading id="all-heading" overline="Seguimiento de la actualidad" title="Todas las novedades" />
          <MonitoringExplorer items={explorer} />
        </Container>

        <Container component="section" aria-label="Cómo se elabora esta página" maxWidth="lg" sx={{ pb: { xs: 5, md: 7 } }}>
          <Box sx={{ borderBottom: "1px solid", borderColor: "divider", "& a": { color: "inherit" } }}>
            <RecordDisclosure title="Cómo se elabora esta página">
              <Typography variant="body2" sx={{ maxWidth: 860, lineHeight: 1.75 }}>
                HRCT consulta fuentes públicas en busca de material relacionado con cada recomendación: medios de comunicación nacionales, canales de instituciones y de la sociedad civil, búsquedas de noticias y el Boletín Oficial del Estado{status?.feeds_monitored ? ` (${status.feeds_monitored} canales, además de Google News y el BOE)` : ""}. El seguimiento mantiene las fichas al día, pero nunca modifica por sí solo una valoración de Blue Human. Cada novedad se marca como revisada o pendiente de confirmación final.
              </Typography>
              <Typography variant="body2" sx={{ maxWidth: 860, lineHeight: 1.75, mt: 1.4 }}>
                HRCT enlaza cada publicación en su fuente original y, como mucho, cita de ella un fragmento breve. Los criterios están en la <Link href="/methodology#seguimiento">metodología</Link>.
              </Typography>
            </RecordDisclosure>
          </Box>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
