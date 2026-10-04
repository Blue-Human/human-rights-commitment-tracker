import Link from "next/link";
import { Box, Button, Container, Divider, Stack, Typography } from "@mui/material";
import { CommitmentExplorer } from "@/components/CommitmentExplorer";
import { MonitoringList } from "@/components/MonitoringList";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatDate, getAllHumanSecurityDimensions, getCommitments, getMonitoringStatus, getRecentMonitoringItems, groupByUrl } from "@/lib/hrct";

export default async function Home() {
  const [commitments, monitoring, dimensions, trackerStatus] = await Promise.all([
    getCommitments(),
    getRecentMonitoringItems(),
    getAllHumanSecurityDimensions(),
    getMonitoringStatus(),
  ]);
  const assessed = commitments.filter((x) => x.assessment_status && !["not_assessed", "unable_to_assess"].includes(x.assessment_status)).length;
  const accepted = commitments.filter((x) => x.acceptance_status === "accepted").length;
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
      <Box component="main">
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
          <Typography variant="overline" color="secondary.main">España · Examen Periódico Universal · Cuarto ciclo</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2.35rem", md: "3.45rem" }, mt: 1.2, maxWidth: 900 }}>
            Seguimiento de los compromisos de derechos humanos
          </Typography>
          <Typography sx={{ mt: 2.25, maxWidth: 820, fontSize: { xs: "1rem", md: "1.08rem" }, lineHeight: 1.75, color: "text.secondary" }}>
            Seguimiento público de las recomendaciones internacionales de derechos humanos y de su cumplimiento en España. Cada ficha mantiene el texto oficial de la recomendación de las Naciones Unidas separado de la valoración independiente de Blue Human.
          </Typography>

          <Divider sx={{ my: { xs: 4, md: 5 } }} />

          <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 3, md: 0 }} divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />}>
            {[
              [commitments.length, "Recomendaciones publicadas"],
              [accepted, "Aceptadas por España"],
              [assessed, "Valoraciones de cumplimiento completadas"],
              [developments.length, "Novedades en seguimiento"],
            ].map(([value, label]) => (
              <Box key={String(label)} sx={{ flex: 1, px: { md: 3 }, "&:first-of-type": { pl: 0 }, "&:last-of-type": { pr: 0 } }}>
                <Typography sx={{ fontSize: "1.85rem", fontWeight: 500, color: "primary.main", lineHeight: 1 }}>{value}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: .8 }}>{label}</Typography>
              </Box>
            ))}
          </Stack>
        </Container>

        <Box sx={{ bgcolor: "#f7f8f9", borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
          <Container maxWidth="lg" sx={{ py: 3 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 2, md: 6 }}>
              <Box sx={{ minWidth: 220 }}>
                <Typography variant="overline" color="text.secondary">Ámbito actual</Typography>
                <Typography color="primary.main" sx={{ mt: .4 }}>España</Typography>
              </Box>
              <Box sx={{ minWidth: 280 }}>
                <Typography variant="overline" color="text.secondary">Mecanismo</Typography>
                <Typography color="primary.main" sx={{ mt: .4 }}>Examen Periódico Universal</Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">Fuente oficial</Typography>
                <Typography color="primary.main" sx={{ mt: .4 }}>A/HRC/60/8 · Consejo de Derechos Humanos</Typography>
              </Box>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ pt: { xs: 5, md: 7 } }}>
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

        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
          <Box sx={{ mb: 3.5 }}>
            <Typography variant="overline" color="text.secondary">Registro público</Typography>
            <Typography variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.8rem", md: "2.25rem" }, mt: .5 }}>Recomendaciones y valoraciones</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 820, mt: 1.25, lineHeight: 1.7 }}>
              Las recomendaciones marcadas como «Valoración pendiente» forman parte del catálogo público, pero todavía no cuentan con una conclusión sobre su cumplimiento.
            </Typography>
          </Box>
          <CommitmentExplorer commitments={commitments} dimensionsById={dimensionsById} monitoringCounts={monitoringCounts} />
        </Container>
      </Box>

      <SiteFooter />
    </>
  );
}
