import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Divider, Stack, TextField, Typography } from "@mui/material";
import { AdminFrame, AdminSection } from "@/components/AdminFrame";
import { AdminItemRow } from "@/components/AdminItemRow";
import { StatusChip } from "@/components/StatusChip";
import { getRecommendation, listEvidence, listItemsFor, listProposals } from "@/lib/admin/db";
import { requireAdmin } from "@/lib/admin/session";
import { confidenceLabels, evidenceTypeLabels, formatDate, labelOf, splitRationale, statusLabels } from "@/lib/hrct";
import { confirmAssessment, resolveProposal, reviewEvidence, setAssessment } from "../../actions";

export const metadata: Metadata = { title: "Gestionar recomendación | Human Rights Commitment Tracker", robots: { index: false, follow: false } };

const statuses = ["not_assessed", "unable_to_assess", "not_implemented", "limited_progress", "substantially_implemented", "implemented", "regressed"];

export default async function ManageRecommendation({ params }: { params: Promise<{ publicId: string }> }) {
  await requireAdmin();
  const publicId = decodeURIComponent((await params).publicId);
  const rec = await getRecommendation(publicId);
  if (!rec) notFound();
  const [evidence, items, proposals] = await Promise.all([listEvidence(rec.id), listItemsFor(rec.id), listProposals(rec.id)]);
  const assessed = !!rec.assessment_status && rec.assessment_status !== "not_assessed";
  const rationale = splitRationale(rec.assessment_rationale).text;

  return (
    <AdminFrame title={`Recomendación ${rec.recommendation_number}`} intro={rec.title}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <StatusChip status={rec.assessment_status} />
        {assessed && <Typography variant="caption" color="text.secondary">{rec.assessment_provisional ? "Pendiente de confirmación final" : "Confirmada"} · {formatDate(rec.assessment_date)}</Typography>}
        <Button component={Link} href={`/commitments/${encodeURIComponent(rec.public_id)}`} size="small">Ver página pública</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 860, lineHeight: 1.7 }}>{rec.original_text}</Typography>

      {proposals.map((p) => (
        <AdminSection key={p.id} title="Propuesta como cumplida" note={`Una revisión periódica del ${formatDate(p.reviewed_at)} propone marcar esta recomendación como cumplida (confianza: ${labelOf(confidenceLabels, p.confidence).toLowerCase()}). La ficha pública no cambia hasta que decidas.`}>
          {p.change_summary && <Typography variant="body2" sx={{ lineHeight: 1.7, maxWidth: 860 }}>{p.change_summary}</Typography>}
          {p.assessments?.rationale && <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7, maxWidth: 860 }}>{p.assessments.rationale}</Typography>}
          <Stack direction="row" spacing={1.5} sx={{ mt: 1.6 }}>
            <form action={resolveProposal}>
              <input type="hidden" name="public_id" value={rec.public_id} />
              <input type="hidden" name="decision" value="confirm" />
              <Button type="submit" variant="contained" size="small">Confirmar como cumplida</Button>
            </form>
            <form action={resolveProposal}>
              <input type="hidden" name="public_id" value={rec.public_id} />
              <input type="hidden" name="decision" value="reject" />
              <Button type="submit" variant="outlined" size="small">Rechazar</Button>
            </form>
          </Stack>
        </AdminSection>
      ))}

      <AdminSection title="Valoración" note="Al guardar se crea una valoración nueva y la anterior se conserva en el historial. Una valoración que guardas tú se publica como confirmada.">
        {assessed && rec.assessment_provisional && (
          <form action={confirmAssessment}>
            <input type="hidden" name="public_id" value={rec.public_id} />
            <Button type="submit" variant="contained" size="small" sx={{ mb: 2.5 }}>Confirmar la valoración actual tal como está</Button>
          </form>
        )}
        <form action={setAssessment}>
          <input type="hidden" name="public_id" value={rec.public_id} />
          <Stack spacing={2} sx={{ maxWidth: 860 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField name="status" label="Estado" select SelectProps={{ native: true }} defaultValue={rec.assessment_status || "not_assessed"} sx={{ minWidth: 240 }}>
                {statuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
              </TextField>
              <TextField name="confidence" label="Confianza" select SelectProps={{ native: true }} defaultValue={rec.assessment_confidence || "medium"} sx={{ minWidth: 160 }}>
                {Object.entries(confidenceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </TextField>
            </Stack>
            <TextField name="rationale" label="Justificación (se muestra en la página pública)" defaultValue={rationale} multiline minRows={6} required fullWidth />
            <TextField name="reason" label="Motivo del cambio (se guarda en el historial)" fullWidth />
            <Box><Button type="submit" variant="contained">Guardar valoración</Button></Box>
          </Stack>
        </form>
      </AdminSection>

      <AdminSection title="Evidencias" note="La evidencia registrada en una revisión periódica es pública, pero aparece como pendiente hasta que la confirmas.">
        <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
          {evidence.map((e) => (
            <Box key={e.id} sx={{ py: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems="flex-start">
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="overline" color="text.secondary">
                    {labelOf(evidenceTypeLabels, e.evidence_type)} · {!e.is_public ? "No pública" : e.reviewed_at ? "Confirmada" : "Pendiente de confirmación final"}
                  </Typography>
                  <Typography variant="h6" color="primary.main" sx={{ fontSize: "1.05rem" }}>{e.sources?.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{[e.sources?.publisher, formatDate(e.evidence_date)].filter(Boolean).join(" · ")}</Typography>
                </Box>
                {e.sources?.url && <Button component="a" href={e.sources.url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} size="small" sx={{ px: 0, flexShrink: 0 }}>Abrir fuente</Button>}
              </Stack>
              <Typography variant="body2" sx={{ mt: .8, lineHeight: 1.7, maxWidth: 860 }}>{e.finding}</Typography>
              <form action={reviewEvidence}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="public_id" value={rec.public_id} />
                <Stack direction="row" spacing={1.25} sx={{ mt: 1.2 }}>
                  {!e.reviewed_at && <Button type="submit" name="op" value="confirm" variant="contained" size="small">Confirmar</Button>}
                  {e.is_public
                    ? <Button type="submit" name="op" value="hide" variant="outlined" size="small">Ocultar de la web</Button>
                    : <Button type="submit" name="op" value="show" variant="outlined" size="small">Mostrar en la web</Button>}
                </Stack>
              </form>
            </Box>
          ))}
          {!evidence.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.5 }}>No hay evidencias registradas.</Typography>}
        </Stack>
      </AdminSection>

      <AdminSection title="Novedades de seguimiento" note="Noticias y publicaciones relacionadas con esta recomendación. Al aprobar una, se publica como revisada, con tu nota si la escribes.">
        <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
          {items.map((item) => <AdminItemRow key={item.id} item={item} publicId={rec.public_id} />)}
          {!items.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.5 }}>No hay novedades de seguimiento para esta recomendación.</Typography>}
        </Stack>
      </AdminSection>
    </AdminFrame>
  );
}
