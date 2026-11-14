import type { Metadata } from "next";
import Link from "next/link";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { AdminFrame, AdminSection } from "@/components/AdminFrame";
import { PriorityTag } from "@/components/PriorityTag";
import { StatusChip } from "@/components/StatusChip";
import { listItemsPending, listProposals, listRecommendations, listReviewLog } from "@/lib/admin/db";
import { requireAdmin } from "@/lib/admin/session";
import { confidenceLabels, formatDate, labelOf } from "@/lib/hrct";
import { resolveProposal, setPriority } from "./actions";

export const metadata: Metadata = { title: "Administración | Human Rights Commitment Tracker", robots: { index: false, follow: false } };

const outcomeLabels: Record<string, string> = {
  no_change: "Sin cambios",
  updated: "Valoración actualizada",
  needs_confirmation: "Propuesta como cumplida",
  rejected_no_verified_evidence: "Rechazada: las fuentes no se pudieron abrir",
};
const resolutionLabels: Record<string, string> = { confirmed: "confirmada", rejected: "rechazada" };

export default async function AdminHome() {
  await requireAdmin();
  const [recommendations, proposals, log, pendingItems] = await Promise.all([listRecommendations(), listProposals(), listReviewLog(), listItemsPending()]);
  const provisional = recommendations.filter((r) => r.assessment_provisional && r.assessment_status !== "not_assessed");

  return (
    <AdminFrame title="Resumen" intro="Decide sobre las propuestas, confirma las valoraciones provisionales y gestiona cada recomendación. Los cambios se publican al instante.">
      <Stack direction="row" flexWrap={{ xs: "wrap", sm: "nowrap" }} useFlexGap spacing={{ xs: 2, sm: 6 }} sx={{ "& > *": { width: { xs: "calc(50% - 8px)", sm: "auto" } } }}>
        {[
          [proposals.length, "Propuestas como cumplidas, a la espera de tu decisión"],
          [provisional.length, "Valoraciones pendientes de confirmación final"],
          [pendingItems.length, "Novedades de seguimiento por revisar"],
          [recommendations.filter((r) => r.is_priority).length, "Recomendaciones prioritarias"],
          [recommendations.length, "Recomendaciones"],
        ].map(([value, label]) => (
          <Box key={String(label)}>
            <Typography sx={{ fontSize: "1.7rem", fontWeight: 500, color: "primary.main", lineHeight: 1 }}>{value}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .6, maxWidth: 200 }}>{label}</Typography>
          </Box>
        ))}
      </Stack>

      <AdminSection title="Propuestas como cumplidas" note="Una revisión periódica ha encontrado evidencia de que estas recomendaciones se han cumplido. No se publica nada hasta que decidas.">
        <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
          {proposals.map((p) => (
            <Box key={p.id} sx={{ py: 2.2 }}>
              <Typography variant="overline" color="text.secondary">
                Recomendación {p.commitments?.recommendation_number} · propuesta el {formatDate(p.reviewed_at)} · confianza {labelOf(confidenceLabels, p.confidence).toLowerCase()}
              </Typography>
              <Typography variant="h6" color="primary.main">{p.commitments?.title}</Typography>
              {p.change_summary && <Typography variant="body2" sx={{ mt: .8, lineHeight: 1.7, maxWidth: 860 }}>{p.change_summary}</Typography>}
              {p.assessments?.rationale && <Typography variant="body2" color="text.secondary" sx={{ mt: .8, lineHeight: 1.7, maxWidth: 860 }}>{p.assessments.rationale}</Typography>}
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                <form action={resolveProposal}>
                  <input type="hidden" name="public_id" value={p.commitments?.public_id} />
                  <input type="hidden" name="decision" value="confirm" />
                  <Button type="submit" variant="contained" size="small">Confirmar como cumplida</Button>
                </form>
                <form action={resolveProposal}>
                  <input type="hidden" name="public_id" value={p.commitments?.public_id} />
                  <input type="hidden" name="decision" value="reject" />
                  <Button type="submit" variant="outlined" size="small">Rechazar</Button>
                </form>
                <Button component={Link} href={`/admin/recommendations/${encodeURIComponent(p.commitments?.public_id || "")}`} size="small">Abrir ficha</Button>
              </Stack>
            </Box>
          ))}
          {!proposals.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.5 }}>No hay nada a la espera de tu decisión.</Typography>}
        </Stack>
      </AdminSection>

      <AdminSection title="Recomendaciones" note="Las recomendaciones que marcas como prioritarias aparecen destacadas y al principio de la lista pública.">
        <Box sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
          {recommendations.map((r, index) => (
            // A line per recommendation on a wide screen; on a phone, a compact block with both actions on its last line.
            <Box key={r.public_id}
              sx={{ display: { xs: "grid", md: "flex" }, gridTemplateColumns: "auto minmax(0,1fr) auto", gridTemplateAreas: '"number status status" "title title title" "state state state" "priority priority manage"', alignItems: "center", columnGap: { xs: 1.5, md: 2.5 }, rowGap: .4, py: 1.3, borderTop: index ? "1px solid" : "none", borderColor: "divider" }}>
              <Typography color="primary.main" sx={{ gridArea: "number", width: { md: 56 }, fontWeight: 500, flexShrink: 0 }}>{r.recommendation_number}</Typography>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ gridArea: "title", flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ minWidth: 0 }}>{r.title}</Typography>
                {r.is_priority && <PriorityTag />}
              </Stack>
              <Box sx={{ gridArea: "status", width: { md: 190 }, flexShrink: 0 }}><StatusChip status={r.assessment_status} /></Box>
              <Typography variant="caption" color="text.secondary" sx={{ gridArea: "state", display: { xs: r.assessment_status === "not_assessed" ? "none" : "block", md: "block" }, width: { md: 170 }, flexShrink: 0 }}>
                {r.assessment_status === "not_assessed" ? "" : r.assessment_provisional ? "Pendiente de confirmación final" : "Confirmada"}
              </Typography>
              <Box component="form" action={setPriority} sx={{ gridArea: "priority", width: { md: 170 }, flexShrink: 0 }}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="public_id" value={r.public_id} />
                <input type="hidden" name="priority" value={String(!r.is_priority)} />
                <Button type="submit" size="small" sx={{ px: 0 }}>{r.is_priority ? "Quitar prioridad" : "Marcar como prioritaria"}</Button>
              </Box>
              <Button component={Link} href={`/admin/recommendations/${encodeURIComponent(r.public_id)}`} size="small" sx={{ gridArea: "manage", flexShrink: 0 }}>Gestionar</Button>
            </Box>
          ))}
        </Box>
      </AdminSection>

      <AdminSection title="Registro de revisiones" note="Las revisiones periódicas más recientes y lo que hizo cada una.">
        <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
          {log.map((entry) => (
            <Box key={entry.id} sx={{ py: 1.5 }}>
              <Typography variant="body2" color="primary.main">
                {formatDate(entry.reviewed_at)} · Recomendación {entry.commitments?.recommendation_number} · {outcomeLabels[entry.outcome] || entry.outcome}
                {entry.resolution ? ` · ${resolutionLabels[entry.resolution] || entry.resolution}` : ""}
              </Typography>
              {entry.change_summary && <Typography variant="body2" color="text.secondary" sx={{ mt: .3, lineHeight: 1.6, maxWidth: 860 }}>{entry.change_summary}</Typography>}
            </Box>
          ))}
          {!log.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.5 }}>Todavía no se ha registrado ninguna revisión periódica.</Typography>}
        </Stack>
      </AdminSection>
    </AdminFrame>
  );
}
