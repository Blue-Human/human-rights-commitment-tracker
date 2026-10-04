import Link from "next/link";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { CommitmentExplorer } from "@/components/CommitmentExplorer";
import { DimensionFilterProvider } from "@/components/DimensionFilter";
import { EpuResults } from "@/components/EpuResults";
import { HumanSecurityImpact } from "@/components/HumanSecurityImpact";
import { MonitoringList } from "@/components/MonitoringList";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatDate, getAllHumanSecurityDimensions, getCommitments, getDimensionDescriptions, getMonitoringStatus, getRecentMonitoringItems, groupByUrl, isAssessed, summarizeDimensions } from "@/lib/hrct";

export default async function Home() {
  const [commitments, monitoring, dimensions, trackerStatus, descriptions] = await Promise.all([
    getCommitments(),
    getRecentMonitoringItems(),
    getAllHumanSecurityDimensions(),
    getMonitoringStatus(),
    getDimensionDescriptions(),
  ]);
  const assessed = commitments.filter(isAssessed).length;
  const response = (status: string) => commitments.filter((x) => x.acceptance_status === status).length;
  const accepted = response("accepted"), partiallyAccepted = response("partially_accepted"), noted = response("noted");
  const priority = commitments.filter((x) => x.is_priority).length;
  const numbers = Object.fromEntries(commitments.map((c) => [c.public_id, c.recommendation_number || c.public_id]));
  const developments = groupByUrl(monitoring);
  const lastScan = formatDate(trackerStatus?.last_successful_run_at);
  const monitoringCounts: Record<string, number> = {};
  for (const item of monitoring) monitoringCounts[item.public_id] = (monitoringCounts[item.public_id] || 0) + 1;
  const dimensionsById: Record<string, string[]> = {};
  for (const d of dimensions) (dimensionsById[d.public_id] ??= []).push(d.code);

  return (
    <>
      <SiteHeader />
      <DimensionFilterProvider>
        <Box component="main">
          <EpuResults total={commitments.length} accepted={accepted} partiallyAccepted={partiallyAccepted} noted={noted} assessed={assessed} priority={priority} developments={developments.length} />

          {dimensions.length > 0 && (
            <Container id="seguridad-humana" component="section" aria-labelledby="human-security-heading" maxWidth="lg" sx={{ py: { xs: 5, md: 7 }, scrollMarginTop: { xs: 120, md: 72 } }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary">Seguridad humana</Typography>
                <Typography id="human-security-heading" variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.8rem", md: "2.25rem" }, mt: .5 }}>A qué seguridad afectan las recomendaciones</Typography>
              </Box>
              <HumanSecurityImpact dimensions={summarizeDimensions(commitments, dimensions, descriptions, monitoringCounts)} total={commitments.length} noted={noted} />
            </Container>
          )}

          <Container id="recomendaciones" maxWidth="lg" sx={{ py: { xs: 5, md: 7 }, borderTop: "1px solid", borderColor: "divider", scrollMarginTop: { xs: 120, md: 72 } }}>
            <Box sx={{ mb: 3.5 }}>
              <Typography variant="overline" color="text.secondary">Registro público</Typography>
              <Typography variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.8rem", md: "2.25rem" }, mt: .5 }}>Recomendaciones y valoraciones</Typography>
              <Typography color="text.secondary" sx={{ maxWidth: 820, mt: 1.25, lineHeight: 1.7 }}>
                Las recomendaciones marcadas como «Valoración pendiente» forman parte del catálogo público, pero todavía no cuentan con una conclusión sobre su cumplimiento. Las que Blue Human sigue como prioritarias aparecen destacadas al principio de la lista.
              </Typography>
            </Box>
            <CommitmentExplorer commitments={commitments} dimensionsById={dimensionsById} monitoringCounts={monitoringCounts} />
          </Container>

          <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 }, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-end" }} spacing={2} sx={{ mb: 3 }}>
              <Box>
                <Typography variant="overline" color="text.secondary">Seguimiento de la actualidad</Typography>
                <Typography variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.8rem", md: "2.25rem" }, mt: .5 }}>Últimas novedades</Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 820, mt: 1.25, lineHeight: 1.7 }}>
                  Se consultan periódicamente fuentes públicas para cada recomendación. Lo que aparece a continuación es contexto de seguimiento o material pendiente de revisión. No son conclusiones de Blue Human y no modifican ninguna valoración.
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {lastScan ? `Última consulta de fuentes: ${lastScan}` : `${commitments.length} recomendaciones en seguimiento`}
              </Typography>
            </Stack>
            <MonitoringList items={developments.slice(0, 4)} numbers={numbers} empty="Todavía no se ha publicado ninguna novedad." />
            <Button component={Link} href="/monitoring" sx={{ mt: 1.5, px: 0 }}>Ver todas las novedades</Button>
          </Container>
        </Box>
      </DimensionFilterProvider>

      <SiteFooter />
    </>
  );
}
