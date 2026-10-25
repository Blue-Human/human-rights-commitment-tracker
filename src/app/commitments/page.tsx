import type { Metadata } from "next";
import Link from "next/link";
import { Box, Container, Typography } from "@mui/material";
import { RecommendationRegister, type RegisterItem } from "@/components/RecommendationRegister";
import { RecordDisclosure } from "@/components/RecordDisclosure";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { dimensionCodes, getAllHumanSecurityDimensions, getAllSdgLinks, getCommitments, getRecentMonitoringItems, type DimensionCode } from "@/lib/hrct";
import { sdgGoal } from "@/lib/sdg";

export const metadata: Metadata = {
  title: "Recomendaciones | Human Rights Commitment Institute",
  description: "Las recomendaciones de derechos humanos que España recibió en el cuarto ciclo del Examen Periódico Universal: respuesta del Estado, valoración del cumplimiento, seguridad humana y ODS.",
};

// The list is filtered by what the address says (the register reads it), so the page is rendered for
// each request and arrives already filtered. Waiting for `searchParams` is what asks for that.
export default async function RecommendationsPage({ searchParams }: { searchParams: Promise<unknown> }) {
  const [, commitments, dimensionLinks, sdgLinks, monitoring] = await Promise.all([
    searchParams,
    getCommitments(),
    getAllHumanSecurityDimensions().catch(() => []),
    getAllSdgLinks(),
    getRecentMonitoringItems().catch(() => []),
  ]);

  // The primary dimension first, then the order of the framework; the goals, in their own order.
  const dimensionsById: Record<string, DimensionCode[]> = {};
  for (const d of [...dimensionLinks].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || dimensionCodes.indexOf(a.code) - dimensionCodes.indexOf(b.code))) (dimensionsById[d.public_id] ??= []).push(d.code);
  const goalsById: Record<string, number[]> = {};
  for (const link of sdgLinks || []) if (sdgGoal(link.goal)) (goalsById[link.public_id] ??= []).push(link.goal);
  const developments: Record<string, number> = {};
  for (const item of monitoring) developments[item.public_id] = (developments[item.public_id] || 0) + 1;

  const items: RegisterItem[] = commitments.map((c) => ({
    public_id: c.public_id,
    number: c.recommendation_number || c.public_id,
    title: c.title,
    summary: c.normalized_summary || c.original_text,
    text: c.normalized_summary ? c.original_text : undefined,
    status: c.assessment_status,
    acceptance: c.acceptance_status,
    provisional: !!c.assessment_provisional && c.assessment_status !== "not_assessed",
    priority: !!c.is_priority,
    dimensions: dimensionsById[c.public_id] || [],
    goals: [...new Set(goalsById[c.public_id] || [])].sort((a, b) => a - b),
    developments: developments[c.public_id] || 0,
  }));
  const goals = [...new Set(items.flatMap((item) => item.goals))].sort((a, b) => a - b).map((number) => ({ number, name: sdgGoal(number)!.name }));

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ pt: { xs: 4.5, md: 6 }, pb: { xs: 3, md: 4 } }}>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2.2rem", md: "3rem" } }}>Recomendaciones</Typography>
          <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 720, lineHeight: 1.7 }}>
            Las {commitments.length} recomendaciones de derechos humanos que España recibió en el cuarto ciclo del Examen Periódico Universal, con la respuesta del Estado, la valoración de su cumplimiento y su relación con la seguridad humana y la Agenda 2030.
          </Typography>
        </Container>

        <Container component="section" aria-label="Lista de recomendaciones" maxWidth="lg" sx={{ pb: { xs: 5, md: 7 } }}>
          <RecommendationRegister items={items} goals={goals} />
        </Container>

        <Container component="section" aria-label="Fuente y criterios" maxWidth="lg" sx={{ pb: { xs: 5, md: 7 } }}>
          <Box sx={{ borderBottom: "1px solid", borderColor: "divider", "& a": { color: "inherit" } }}>
            <RecordDisclosure title="Fuente y criterios">
              <Box sx={{ maxWidth: 860, "& p": { lineHeight: 1.75 }, "& p + p": { mt: 1.4 } }}>
                <Typography variant="body2">
                  El texto de cada recomendación es el oficial en español del informe del Grupo de Trabajo sobre el Examen Periódico Universal (A/HRC/60/8), y la respuesta de España, la de su adición (A/HRC/60/8/Add.1). La lista sigue el orden del informe; las recomendaciones que Blue Human sigue como prioritarias aparecen primero.
                </Typography>
                <Typography variant="body2">
                  Las recomendaciones marcadas como «Valoración pendiente» forman parte del catálogo público, pero todavía no cuentan con una conclusión sobre su cumplimiento. Las dimensiones de la seguridad humana y los Objetivos de Desarrollo Sostenible de cada recomendación son clasificaciones propias, hechas a partir de su texto oficial; la justificación de cada una está en la ficha. Los criterios se explican en la <Link href="/methodology">metodología</Link>.
                </Typography>
              </Box>
            </RecordDisclosure>
          </Box>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
