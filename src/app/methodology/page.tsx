import type { Metadata } from "next";
import { Box, Container, Divider, Stack, Typography } from "@mui/material";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/StatusChip";

export const metadata: Metadata = {
  title: "Metodología | Human Rights Commitment Tracker",
  description: "Cómo registra HRCT las recomendaciones, pondera las evidencias, hace seguimiento de las fuentes públicas y conserva el historial de valoraciones.",
};

// Definitions are those of HRCT Methodology v1.0.
const vocabulary: [string, string][] = [
  ["not_assessed", "Todavía no se ha completado una valoración de fondo."],
  ["unable_to_assess", "La evidencia disponible no basta para sostener un juicio fundado sobre el cumplimiento."],
  ["not_implemented", "La evidencia respalda la conclusión de que no se ha producido un cumplimiento significativo."],
  ["limited_progress", "Hay documentada alguna actuación pertinente, pero el cumplimiento sigue siendo claramente incompleto."],
  ["substantially_implemented", "Hay documentado un cumplimiento significativo, aunque quedan pendientes elementos relevantes."],
  ["implemented", "La evidencia disponible respalda que el compromiso objeto de seguimiento se ha cumplido conforme al alcance y los indicadores definidos."],
  ["regressed", "La evidencia indica un deterioro tras un avance o un cumplimiento anteriores."],
];

const sourceTiers: [string, string][] = [
  ["Evidencia primaria", "Legislación, boletines oficiales, registros administrativos, estadísticas oficiales, asignación y ejecución presupuestaria, resoluciones judiciales y documentos formales de aplicación."],
  ["Evidencia institucional independiente", "Órganos de las Naciones Unidas, mecanismos de los tratados, instituciones nacionales de derechos humanos, defensorías del pueblo y mecanismos internacionales de supervisión reconocidos."],
  ["Evidencia de la sociedad civil", "Informes de ONG, informes de organizaciones de vigilancia e investigación de campo documentada."],
  ["Evidencia secundaria", "Publicaciones académicas, periodismo de calidad contrastada y análisis de especialistas."],
];

function Section({ overline, title, children }: { overline: string; title: string; children: React.ReactNode }) {
  return (
    <Box component="section" sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
      <Typography variant="overline" color="text.secondary">{overline}</Typography>
      <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.6 }}>{title}</Typography>
      <Stack spacing={1.6} sx={{ maxWidth: 860, "& p": { lineHeight: 1.8 } }}>{children}</Stack>
    </Box>
  );
}

export default function MethodologyPage() {
  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 } }}>
          <Typography variant="overline" color="primary.main">Metodología de HRCT v1.0</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, maxWidth: 940, mt: 1.1 }}>Metodología</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.8, maxWidth: 860, lineHeight: 1.75 }}>
            El Human Rights Commitment Tracker (HRCT) convierte las recomendaciones y los compromisos de derechos humanos en fichas públicas estructuradas, basadas en evidencias y trazables. Esta página resume cómo se elaboran las fichas, en qué se basan las etiquetas de estado y cómo se hace el seguimiento de las fuentes públicas.
          </Typography>
        </Container>

        <Divider />

        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 6 } }}>
          <Stack spacing={5}>
            <Section overline="Alcance" title="Qué es una ficha y qué no es">
              <Typography>
                HRCT distingue entre las obligaciones jurídicas derivadas de instrumentos vinculantes, los compromisos formales que un Estado ha aceptado o anunciado expresamente, las recomendaciones formuladas por órganos externos y los objetivos de política pública recogidos en estrategias o planes. Una recomendación no es automáticamente una obligación jurídica, y cada ficha indica si España la aceptó o se limitó a tomar nota de ella («anotada»).
              </Typography>
              <Typography>
                HRCT abarca las 324 recomendaciones (50.1 a 50.324) dirigidas a España en el cuarto ciclo del Examen Periódico Universal (documento A/HRC/60/8 de las Naciones Unidas); la respuesta de España a cada una procede del documento A/HRC/60/8/Add.1. El texto oficial de las Naciones Unidas se muestra siempre separado de la valoración de Blue Human.
              </Typography>
            </Section>

            <Section overline="Valoración" title="Estado de cumplimiento">
              <Typography>
                Cada recomendación tiene asignado uno de los siguientes estados de cumplimiento, junto con un nivel de confianza, una justificación escrita y la versión de la metodología aplicada.
              </Typography>
              <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
                {vocabulary.map(([status, meaning]) => (
                  <Stack key={status} direction={{ xs: "column", sm: "row" }} spacing={{ xs: .5, sm: 2 }} sx={{ py: 1.6 }}>
                    <Box sx={{ minWidth: 250 }}><StatusChip status={status} /></Box>
                    <Typography variant="body2">{meaning}</Typography>
                  </Stack>
                ))}
              </Stack>
              <Typography>
                Estas etiquetas son el vocabulario operativo inicial. Los umbrales y los ejemplos se están validando durante el piloto antes de dar la metodología por consolidada.
              </Typography>
              <Typography>
                No se presenta ninguna conclusión sobre el cumplimiento sin evidencia. Una declaración del Gobierno no se considera cumplimiento, y la aprobación de un plan no se considera prueba de un resultado: siempre que la evidencia lo permite, las valoraciones distinguen entre lo que se ha hecho y los resultados que se han logrado. Cuando la evidencia disponible no permite sostener una conclusión responsable, la ficha indica «Evidencia insuficiente» en lugar de forzar una conclusión. La ausencia de evidencia no se interpreta como prueba de incumplimiento, y la evidencia que contradice un avance se conserva en la ficha, no se elimina.
              </Typography>
            </Section>

            <Section overline="Evidencias" title="Jerarquía de fuentes">
              <Typography>
                La evidencia se pondera en función de la afirmación que se quiere sostener con ella. Un nivel inferior no es automáticamente más débil: la pertinencia depende de lo que se esté valorando.
              </Typography>
              <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
                {sourceTiers.map(([name, text]) => (
                  <Stack key={name} direction={{ xs: "column", sm: "row" }} spacing={{ xs: .5, sm: 2 }} sx={{ py: 1.8 }}>
                    <Typography variant="body2" color="primary.main" sx={{ minWidth: 250, fontWeight: 600 }}>{name}</Typography>
                    <Typography variant="body2">{text}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Section>

            <Section overline="Seguimiento de la actualidad" title="El seguimiento se mantiene separado de la evidencia">
              <Typography>
                HRCT consulta periódicamente fuentes públicas para cada recomendación, entre ellas medios de comunicación nacionales, publicaciones de instituciones y de la sociedad civil y el Boletín Oficial del Estado. Lo que encuentra se publica en canales claramente separados: por un lado, el contexto que muestra que el problema de fondo continúa; por otro, los posibles avances en el cumplimiento o las novedades en sentido contrario que están pendientes de revisión.
              </Typography>
              <Typography>
                Una noticia puede mostrar que ha ocurrido un incidente o que se ha anunciado una medida, pero no prueba por sí sola que la medida se aplique de forma efectiva, que alcance a todo el territorio ni que tenga impacto. Por eso las novedades de seguimiento nunca modifican una valoración. Solo pasan a ser evidencia después de revisarse, y cada una se marca como revisada por Blue Human o pendiente de confirmación final.
              </Typography>
              <Typography>
                Toda conclusión debe apoyarse en un documento público citado. Las valoraciones se actualizan mediante revisiones periódicas de fuentes oficiales e institucionales. Una valoración actualizada en una revisión periódica se publica como provisional y se marca como «pendiente de confirmación final» hasta que Blue Human la confirma. Una recomendación solo se muestra como cumplida cuando Blue Human lo ha confirmado.
              </Typography>
            </Section>

            <Section overline="Integridad del registro" title="Historial y correcciones">
              <Typography>
                Las valoraciones publicadas no se sobrescriben. Cuando una valoración cambia, la anterior se conserva en el historial, la nueva pasa a ser la vigente y el cambio queda registrado. La página de cada recomendación muestra ese historial. Cada valoración indica además la versión de la metodología con la que se hizo.
              </Typography>
              <Typography>
                Las correcciones, las nuevas evidencias y los derechos de réplica se tramitan como aportaciones sujetas a revisión. Una aportación aceptada puede dar lugar a nuevas evidencias y, cuando esté justificado, a una nueva valoración; nunca modifica directamente una valoración pública existente.
              </Typography>
            </Section>
          </Stack>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
