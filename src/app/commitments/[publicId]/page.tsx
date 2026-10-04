import { Suspense } from "react";
import { RecommendationIndicators } from "@/components/RecommendationIndicators";
import { IndicatorSkeleton } from "@/components/IndicatorSection";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Container, Divider, Stack, Typography } from "@mui/material";
import { MonitoringList } from "@/components/MonitoringList";
import { PriorityTag } from "@/components/PriorityTag";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/StatusChip";
import { RecordDisclosure } from "@/components/RecordDisclosure";
import { acceptanceLabels, confidenceLabels, evidenceTypeLabels, formatDate, getAssessmentHistory, getCommitment, getEvidence, getHumanSecurityDimensions, getLastScannedAt, getMonitoringItems, labelOf, monitoringChannel, splitRationale } from "@/lib/hrct";

function Meta({ label, value }: { label: string; value: string }) {
  return <Box><Typography variant="overline" color="text.secondary">{label}</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{value}</Typography></Box>;
}

export default async function CommitmentPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const decoded = decodeURIComponent(publicId);
  const [commitment, evidence, dimensions, monitoring, history, lastScannedAt] = await Promise.all([
    getCommitment(decoded),
    getEvidence(decoded),
    getHumanSecurityDimensions(decoded),
    getMonitoringItems(decoded),
    getAssessmentHistory(decoded),
    getLastScannedAt(decoded),
  ]);
  if (!commitment) notFound();

  const pending = commitment.assessment_status === "not_assessed";
  const rationale = splitRationale(commitment.assessment_rationale);
  const items = monitoring.map((item) => ({ ...item, public_ids: [] as string[] }));
  const needContext = items.filter((item) => monitoringChannel(item) === "need");
  const liveImplementation = items.filter((item) => monitoringChannel(item) === "implementation");
  const liveContrary = items.filter((item) => monitoringChannel(item) === "contradiction");

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 } }}>
          <Button component={Link} href="/" startIcon={<ArrowBackRoundedIcon />} sx={{ mb: 3, px: 0 }}>Volver a las recomendaciones</Button>
          <Typography variant="overline" color="primary.main" sx={{ display: "block" }}>España · EPU, cuarto ciclo · Recomendación {commitment.recommendation_number}</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, maxWidth: 940, mt: 1.1 }}>
            {commitment.title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1.8, maxWidth: 900, lineHeight: 1.75 }}>{commitment.normalized_summary || commitment.original_text}</Typography>
          <Stack direction="row" spacing={2.25} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 2.5 }}>
            {commitment.is_priority && <PriorityTag />}
            <StatusChip status={commitment.assessment_status} />
            <Typography variant="caption" color="text.secondary">{labelOf(acceptanceLabels, commitment.acceptance_status)}</Typography>
            <Typography variant="caption" color="text.secondary">{commitment.public_id}</Typography>
          </Stack>
        </Container>

        <Divider />

        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 }, '& section[id]': { scrollMarginTop: { xs: 150, sm: 100 } } }}>
          <Stack component="nav" aria-label="Secciones de la recomendación" direction="row" spacing={{ xs: 1, sm: 3 }} useFlexGap flexWrap="wrap" sx={{ mb: { xs: 4, md: 5 }, pb: 1.5, borderBottom: "2px solid", borderColor: "secondary.main" }}>
            {[['Valoración', '#valoracion'], ['Indicadores', '#indicadores'], ['Fuentes y seguimiento', '#fuentes']].map(([label, href]) => <Button key={href} component="a" href={href} sx={{ px: 0 }}>{label}</Button>)}
          </Stack>
          <Stack spacing={{ xs: 5, md: 6 }}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={{ xs: 4, lg: 7 }} alignItems="flex-start">
              <Stack spacing={3} sx={{ flex: 1, minWidth: 0 }}>
                <Box component="section" id="valoracion" aria-labelledby="assessment-heading">
                  <Typography variant="overline" color="text.secondary">Valoración de Blue Human</Typography>
                  <Typography id="assessment-heading" variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.8 }}>Valoración del cumplimiento</Typography>
                  <StatusChip status={commitment.assessment_status} />
                  <Typography sx={{ mt: 1.8, lineHeight: 1.8, maxWidth: 850 }}>
                    {pending ? "Esta recomendación forma parte del catálogo público. Blue Human todavía no ha emitido una conclusión sobre su cumplimiento." : (rationale.text || "No hay una justificación pública disponible.")}
                  </Typography>
                  {!pending && (commitment.assessment_provisional || rationale.provisional) && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.4, lineHeight: 1.7, maxWidth: 850 }}>
                      Valoración provisional basada en fuentes públicas, pendiente de confirmación final por parte de Blue Human.
                    </Typography>
                  )}
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 2, sm: 5 }} sx={{ mt: 2.5, pt: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
                    <Meta label="Confianza" value={pending ? "No aplicable" : labelOf(confidenceLabels, commitment.assessment_confidence)} />
                    <Meta label="Fecha de la valoración" value={pending ? "Pendiente" : (formatDate(commitment.assessment_date) || "Sin especificar")} />
                    <Meta label="Metodología" value={`HRCT v${commitment.methodology_version || "1.0"}`} />
                  </Stack>
                </Box>
                <Box>
                  <RecordDisclosure title="Texto oficial de Naciones Unidas">
                    <Typography sx={{ fontSize: "1.04rem", lineHeight: 1.9, whiteSpace: "pre-line", maxWidth: 860 }}>{commitment.original_text}</Typography>
                  </RecordDisclosure>
                  <RecordDisclosure title="Dimensiones de seguridad humana" count={dimensions.length}>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 820, lineHeight: 1.75, mb: 2.2 }}>
                      HRCT relaciona cada recomendación con las siete dimensiones de la seguridad humana que utiliza el PNUD y con una octava, la seguridad tecnológica, añadida por Blue Human. Puede aplicarse más de una dimensión, porque las amenazas a la seguridad humana están interconectadas.
                    </Typography>
                    <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                      {dimensions.map((dimension) => (
                        <Box key={dimension.code} sx={{ py: 2.2 }}>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "baseline" }}>
                            <Typography variant="h6" color="primary.main" sx={{ minWidth: 180 }}>{dimension.name}</Typography>
                            <Box>
                              {dimension.is_primary && <Typography variant="overline" color="text.secondary">Dimensión principal</Typography>}
                              <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{dimension.rationale || dimension.description}</Typography>
                            </Box>
                          </Stack>
                        </Box>
                      ))}
                      {!dimensions.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.5 }}>Clasificación de seguridad humana pendiente.</Typography>}
                    </Stack>
                  </RecordDisclosure>
                </Box>
              </Stack>
              <Box sx={{ width: { xs: "100%", lg: 300 }, borderLeft: { lg: "1px solid" }, borderColor: "divider", pl: { lg: 4 } }}>
                <RecordDisclosure title="Datos de la ficha y fuente oficial">
                  <Stack spacing={2.3} divider={<Divider flexItem />}>
                    <Meta label="Recomendación" value={commitment.recommendation_number || "—"} />
                    <Meta label="Respuesta del Estado" value={labelOf(acceptanceLabels, commitment.acceptance_status)} />
                    <Meta label="Mecanismo" value={commitment.mechanism_name} />
                    <Meta label="Novedades de contexto" value={String(needContext.length)} />
                    {lastScannedAt && <Meta label="Última consulta de fuentes" value={formatDate(lastScannedAt)!} />}
                    <Meta label="Fecha de publicación" value={formatDate(commitment.published_at) || "—"} />
                  </Stack>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="overline" color="text.secondary">Fuente oficial</Typography>
                  <Typography variant="body2" color="primary.main" sx={{ mt: .7 }}>{commitment.authoritative_source_title || "Documento de las Naciones Unidas"}</Typography>
                  {commitment.authoritative_source_reference && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .5 }}>{commitment.authoritative_source_reference}</Typography>}
                  {commitment.authoritative_source_url && <Button component="a" href={commitment.authoritative_source_url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} sx={{ mt: 1.5, px: 0 }}>Abrir fuente de la ONU</Button>}
                </RecordDisclosure>
              </Box>
            </Stack>

            <Box sx={{ pt: { xs: 4, md: 5 }, borderTop: "1px solid", borderColor: "divider" }}>
              <Suspense fallback={<IndicatorSkeleton />}><RecommendationIndicators publicId={decoded} /></Suspense>
            </Box>

            <Box component="section" id="fuentes" aria-labelledby="sources-heading" sx={{ pt: { xs: 4, md: 5 }, borderTop: "1px solid", borderColor: "divider" }}>
              <Typography variant="overline" color="text.secondary">Documentación de la ficha</Typography>
              <Typography id="sources-heading" variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.5 }}>Fuentes y seguimiento</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 840, lineHeight: 1.7 }}>Evidencias utilizadas en la valoración, actualidad relacionada e historial de cambios.</Typography>
              <Box id="evidencias" sx={{ scrollMarginTop: { xs: 150, sm: 100 } }}>
                <RecordDisclosure title="Evidencias consideradas" count={evidence.length} open={evidence.length > 0}>
                  <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                    {evidence.map((item) => (
                      <Box key={item.id} sx={{ py: 2.75 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems="flex-start">
                          <Box>
                            <Typography variant="overline" color="text.secondary">{labelOf(evidenceTypeLabels, item.evidence_type)} · {item.reviewed_at ? "Revisado por Blue Human" : "Pendiente de confirmación final"}</Typography>
                            <Typography variant="h6" color="primary.main" sx={{ mt: .25 }}>{item.source_title}</Typography>
                            {item.source_publisher && <Typography variant="body2" color="text.secondary">{item.source_publisher}</Typography>}
                          </Box>
                          {item.source_url && <Button component="a" href={item.source_url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} size="small" sx={{ px: 0 }}>Abrir fuente</Button>}
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 1.6, lineHeight: 1.75 }}>{item.finding}</Typography>
                        {item.reliability_notes && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.2 }}>Limitaciones: {item.reliability_notes}</Typography>}
                      </Box>
                    ))}
                    {!evidence.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.75 }}>Todavía no se ha incorporado ninguna evidencia de cumplimiento a esta ficha.</Typography>}
                  </Stack>
                </RecordDisclosure>
              </Box>
              <RecordDisclosure title="Actualidad y contexto" count={items.length}>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="h6" color="primary.main" sx={{ mb: 1 }}>Por qué sigue siendo pertinente</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Contexto público sobre la necesidad a la que responde la recomendación. No determina su cumplimiento.</Typography>
                    <MonitoringList items={needContext} numbers={{}} empty="Todavía no se ha identificado contexto público para esta recomendación." />
                  </Box>
                  {liveImplementation.length > 0 && <Box>
                    <Typography variant="h6" color="primary.main" sx={{ mb: 1 }}>Posibles avances en el cumplimiento</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Actuaciones y noticias en estudio, separadas de las evidencias consideradas.</Typography>
                    <MonitoringList items={liveImplementation} numbers={{}} empty="" />
                  </Box>}
                  {liveContrary.length > 0 && <Box>
                    <Typography variant="h6" color="primary.main" sx={{ mb: 1 }}>Novedades en sentido contrario</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Información en estudio que no modifica la valoración publicada.</Typography>
                    <MonitoringList items={liveContrary} numbers={{}} empty="" />
                  </Box>}
                </Stack>
              </RecordDisclosure>
              {history.length > 1 && <RecordDisclosure title="Historial de valoraciones" count={history.length}>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 840, lineHeight: 1.75, mb: 2.2 }}>
                  Las valoraciones publicadas nunca se sobrescriben. Cuando una valoración cambia, la anterior se conserva en el historial.
                </Typography>
                <Stack component="ol" divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderColor: "divider", listStyle: "none", m: 0, p: 0 }}>
                  {history.map((entry) => (
                    <Stack component="li" key={entry.id} direction={{ xs: "column", sm: "row" }} spacing={{ xs: .75, sm: 3 }} sx={{ py: 2.2 }}>
                      <Box sx={{ width: { sm: 150 }, flexShrink: 0 }}>
                        <Typography variant="body2" color="primary.main">{formatDate(entry.published_at) || formatDate(entry.assessment_date) || "Sin fecha"}</Typography>
                        <Typography variant="caption" color="text.secondary">{entry.is_current ? (entry.provisional ? "Vigente · pendiente de confirmación final" : "Valoración vigente") : "Sustituida"}</Typography>
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <StatusChip status={entry.status} />
                        {entry.status !== "not_assessed" && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .4 }}>
                            Confianza {labelOf(confidenceLabels, entry.confidence).toLowerCase()} · HRCT v{entry.methodology_version || "1.0"}
                          </Typography>
                        )}
                        {!entry.is_current && entry.rationale && <Typography variant="body2" color="text.secondary" sx={{ mt: .8, lineHeight: 1.7 }}>{splitRationale(entry.rationale).text}</Typography>}
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </RecordDisclosure>}
            </Box>
          </Stack>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
