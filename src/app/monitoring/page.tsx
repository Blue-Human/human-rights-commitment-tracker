import type { Metadata } from "next";
import { Box, Container, Divider, Stack, Typography } from "@mui/material";
import { MonitoringList } from "@/components/MonitoringList";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatDate, getCommitments, getMonitoringStatus, getRecentMonitoringItems, groupByUrl, monitoringChannel, type MonitoringChannel } from "@/lib/hrct";

export const metadata: Metadata = {
  title: "Actualidad | Human Rights Commitment Tracker",
  description: "Noticias, publicaciones oficiales y cambios normativos recientes relacionados con las recomendaciones del EPU a España.",
};

const sections: { channel: MonitoringChannel; overline: string; title: string; intro: string; empty: string }[] = [
  {
    channel: "need",
    overline: "Seguimiento del contexto",
    title: "Por qué estas recomendaciones siguen siendo pertinentes",
    intro: "Noticias, estadísticas oficiales y declaraciones públicas que indican que el problema al que responde una recomendación persiste. Son contexto: no prueban que la recomendación se haya cumplido ni que se haya incumplido.",
    empty: "Todavía no se ha registrado ninguna novedad de contexto.",
  },
  {
    channel: "implementation",
    overline: "En estudio",
    title: "Posibles avances en el cumplimiento",
    intro: "Leyes, publicaciones en boletines oficiales, planes y actuaciones oficiales relacionados con una recomendación. Siguen siendo material en estudio hasta que una persona del equipo de investigación los revisa y los incorpora al registro de evidencias.",
    empty: "Ahora mismo no hay publicado ningún posible avance en el cumplimiento.",
  },
  {
    channel: "contradiction",
    overline: "En estudio",
    title: "Posibles novedades en sentido contrario",
    intro: "Novedades que pueden ir en contra de una recomendación. Como todo lo que está pendiente de confirmación, no modifican ninguna valoración hasta que se revisan.",
    empty: "Ahora mismo no hay publicada ninguna novedad en sentido contrario.",
  },
];

export default async function MonitoringPage() {
  const [commitments, items, status] = await Promise.all([getCommitments(), getRecentMonitoringItems(), getMonitoringStatus()]);
  const numbers = Object.fromEntries(commitments.map((c) => [c.public_id, c.recommendation_number || c.public_id]));
  const developments = groupByUrl(items);
  const lastScan = formatDate(status?.last_successful_run_at);

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 } }}>
          <Typography variant="overline" color="primary.main">España · EPU, cuarto ciclo · Actualidad</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, maxWidth: 940, mt: 1.1 }}>Seguimiento de la actualidad</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.8, maxWidth: 860, lineHeight: 1.75 }}>
            HRCT consulta fuentes públicas en busca de material relacionado con cada recomendación: medios de comunicación nacionales, canales de instituciones y de la sociedad civil, búsquedas de noticias y el Boletín Oficial del Estado. El seguimiento mantiene las fichas al día, pero nunca modifica por sí solo una valoración de Blue Human. Cada novedad se marca como revisada o pendiente de confirmación final.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 2, sm: 5 }} sx={{ mt: 3, pt: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
            <Box><Typography variant="overline" color="text.secondary">Recomendaciones en seguimiento</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{status?.recommendations_monitored ?? commitments.length}</Typography></Box>
            <Box><Typography variant="overline" color="text.secondary">Novedades publicadas</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{developments.length}</Typography></Box>
            {!!status?.feeds_monitored && <Box><Typography variant="overline" color="text.secondary">Fuentes consultadas</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{status.feeds_monitored} canales de medios, instituciones y sociedad civil, además de Google News y el BOE</Typography></Box>}
            {lastScan && <Box><Typography variant="overline" color="text.secondary">Última consulta de fuentes</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{lastScan}</Typography></Box>}
          </Stack>
        </Container>

        <Divider />

        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 6 } }}>
          <Stack spacing={6}>
            {sections.filter((section) => section.channel !== "contradiction" || developments.some((d) => monitoringChannel(d) === "contradiction")).map((section) => (
              <Box component="section" key={section.channel}>
                <Typography variant="overline" color="text.secondary">{section.overline}</Typography>
                <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.2 }}>{section.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 840, lineHeight: 1.75, mb: 2.2 }}>{section.intro}</Typography>
                <MonitoringList items={developments.filter((d) => monitoringChannel(d) === section.channel)} numbers={numbers} empty={section.empty} />
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
