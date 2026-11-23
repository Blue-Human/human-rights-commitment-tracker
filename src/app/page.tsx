import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { CommitmentExplorer } from "@/components/CommitmentExplorer";
import { DimensionFilterProvider } from "@/components/DimensionFilter";
import { EpuResults } from "@/components/EpuResults";
import { HumanSecurityImpact } from "@/components/HumanSecurityImpact";
import { MonitoringCard } from "@/components/MonitoringCard";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { dimensionNames, formatDate, getAllHumanSecurityDimensions, getAllSdgLinks, getCommitments, getDimensionDescriptions, getMonitoringStatus, getRecentMonitoringItems, groupByUrl, summarizeDimensions, type DimensionCode } from "@/lib/hrct";
import { crossWithGoals, sdgGoal, summarizeSdgs } from "@/lib/sdg";

export default async function Home() {
  const [commitments, monitoring, dimensions, trackerStatus, descriptions, sdgLinks] = await Promise.all([
    getCommitments(),
    getRecentMonitoringItems(),
    getAllHumanSecurityDimensions(),
    getMonitoringStatus(),
    getDimensionDescriptions(),
    getAllSdgLinks(),
  ]);
  const response = (status: string) => commitments.filter((x) => x.acceptance_status === status).length;
  const accepted = response("accepted"), partiallyAccepted = response("partially_accepted"), noted = response("noted");
  const developments = groupByUrl(monitoring);
  const lastScan = formatDate(trackerStatus?.last_successful_run_at);
  const monitoringCounts: Record<string, number> = {};
  for (const item of monitoring) monitoringCounts[item.public_id] = (monitoringCounts[item.public_id] || 0) + 1;
  const dimensionsById: Record<string, DimensionCode[]> = {};
  for (const d of dimensions) (dimensionsById[d.public_id] ??= []).push(d.code);
  const unclassified = commitments.filter((c) => !dimensionsById[c.public_id]).length;

  // The two classifications of the catalogue, and the recommendations they have in common.
  const publicIds = commitments.map((c) => c.public_id);
  const sdgs = sdgLinks && summarizeSdgs(publicIds, sdgLinks);
  const crossed = crossWithGoals(publicIds, dimensionsById, sdgLinks || []);
  const crossing = crossed.pairs.length > 0 ? {
    dimensions: crossed.keys.map(({ key, total }) => ({ code: key, name: dimensionNames[key], total })),
    goals: crossed.goals.map(({ goal, total }) => ({ number: goal, name: sdgGoal(goal)!.name, color: sdgGoal(goal)!.color, total })),
    pairs: crossed.pairs.map(({ key, goal, count }) => ({ code: key, goal, count })),
    both: crossed.both,
  } : null;

  return (
    <>
      <SiteHeader />
      <DimensionFilterProvider>
        <Box component="main">
          <EpuResults
            total={commitments.length} accepted={accepted} partiallyAccepted={partiallyAccepted} noted={noted}
            classified={dimensions.length > 0 ? commitments.length - unclassified : 0}
            sdg={sdgs ? { linked: sdgs.linked, goals: sdgs.goals.filter((g) => g.public_ids.length).length, targets: sdgs.goals.reduce((sum, g) => sum + Object.keys(g.byTarget).length, 0) } : null}
            crossing={crossing}
          />

          {dimensions.length > 0 && (
            <Container id="seguridad-humana" component="section" aria-labelledby="human-security-heading" maxWidth="lg" sx={{ py: { xs: 5, md: 7 }, scrollMarginTop: { xs: 58, md: 72 } }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary">Seguridad humana</Typography>
                <Typography id="human-security-heading" variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.8rem", md: "2.25rem" }, mt: .5 }}>A qué seguridad afectan las recomendaciones</Typography>
              </Box>
              <HumanSecurityImpact dimensions={summarizeDimensions(commitments, dimensions, descriptions, monitoringCounts)} total={commitments.length} noted={noted} unclassified={unclassified} />
            </Container>
          )}

          <Container id="recomendaciones" maxWidth="lg" sx={{ py: { xs: 5, md: 7 }, borderTop: "1px solid", borderColor: "divider", scrollMarginTop: { xs: 58, md: 72 } }}>
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
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(3,minmax(0,1fr))" }, gap: { xs: 1.5, md: 2.5 } }}>
              {developments.slice(0, 3).map((item) => <MonitoringCard key={item.slug} item={item} />)}
            </Box>
            {!developments.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.75, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>Todavía no se ha publicado ninguna novedad.</Typography>}
            <Button component={Link} href="/monitoring" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 2, px: 0 }}>Ver todas las novedades</Button>
          </Container>
        </Box>
      </DimensionFilterProvider>

      <SiteFooter />
    </>
  );
}
