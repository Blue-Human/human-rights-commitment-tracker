import type { Metadata } from "next";
import Link from "next/link";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { AdminFrame, AdminSection } from "@/components/AdminFrame";
import { StatusChip } from "@/components/StatusChip";
import { listItemsPending, listProposals, listRecommendations, listReviewLog } from "@/lib/admin/db";
import { requireAdmin } from "@/lib/admin/session";
import { formatDate } from "@/lib/hrct";
import { resolveProposal } from "./actions";

export const metadata: Metadata = { title: "Administration | Human Rights Commitment Tracker", robots: { index: false, follow: false } };

const outcomeLabels: Record<string, string> = {
  no_change: "No change",
  updated: "Assessment updated",
  needs_confirmation: "Proposed as implemented",
  rejected_no_verified_evidence: "Rejected: sources did not open",
};

export default async function AdminHome() {
  await requireAdmin();
  const [recommendations, proposals, log, pendingItems] = await Promise.all([listRecommendations(), listProposals(), listReviewLog(), listItemsPending()]);
  const provisional = recommendations.filter((r) => r.assessment_provisional && r.assessment_status !== "not_assessed");

  return (
    <AdminFrame title="Overview" intro="Decide on proposals, confirm provisional assessments and manage each recommendation. Changes are published immediately.">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 2, sm: 6 }}>
        {[
          [proposals.length, "Proposed as implemented, awaiting your decision"],
          [provisional.length, "Assessments pending final confirmation"],
          [pendingItems.length, "Monitoring items awaiting review"],
          [recommendations.length, "Recommendations"],
        ].map(([value, label]) => (
          <Box key={String(label)}>
            <Typography sx={{ fontSize: "1.7rem", fontWeight: 500, color: "primary.main", lineHeight: 1 }}>{value}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .6, maxWidth: 200 }}>{label}</Typography>
          </Box>
        ))}
      </Stack>

      <AdminSection title="Proposed as implemented" note="A periodic review found evidence that these recommendations have been implemented. Nothing is published until you decide.">
        <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
          {proposals.map((p) => (
            <Box key={p.id} sx={{ py: 2.2 }}>
              <Typography variant="overline" color="text.secondary">
                Recommendation {p.commitments?.recommendation_number} · proposed {formatDate(p.reviewed_at)} · confidence {p.confidence}
              </Typography>
              <Typography variant="h6" color="primary.main">{p.commitments?.title}</Typography>
              {p.change_summary && <Typography variant="body2" sx={{ mt: .8, lineHeight: 1.7, maxWidth: 860 }}>{p.change_summary}</Typography>}
              {p.assessments?.rationale && <Typography variant="body2" color="text.secondary" sx={{ mt: .8, lineHeight: 1.7, maxWidth: 860 }}>{p.assessments.rationale}</Typography>}
              <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }}>
                <form action={resolveProposal}>
                  <input type="hidden" name="public_id" value={p.commitments?.public_id} />
                  <input type="hidden" name="decision" value="confirm" />
                  <Button type="submit" variant="contained" size="small">Confirm as implemented</Button>
                </form>
                <form action={resolveProposal}>
                  <input type="hidden" name="public_id" value={p.commitments?.public_id} />
                  <input type="hidden" name="decision" value="reject" />
                  <Button type="submit" variant="outlined" size="small">Reject</Button>
                </form>
                <Button component={Link} href={`/admin/recommendations/${encodeURIComponent(p.commitments?.public_id || "")}`} size="small">Open record</Button>
              </Stack>
            </Box>
          ))}
          {!proposals.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.5 }}>Nothing is waiting for your decision.</Typography>}
        </Stack>
      </AdminSection>

      <AdminSection title="Recommendations">
        <Box sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
          {recommendations.map((r, index) => (
            <Stack key={r.public_id} direction={{ xs: "column", md: "row" }} spacing={{ xs: .6, md: 2.5 }} alignItems={{ md: "center" }}
              sx={{ py: 1.3, borderTop: index ? "1px solid" : "none", borderColor: "divider" }}>
              <Typography color="primary.main" sx={{ width: { md: 56 }, fontWeight: 500, flexShrink: 0 }}>{r.recommendation_number}</Typography>
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>{r.title}</Typography>
              <Box sx={{ width: { md: 190 }, flexShrink: 0 }}><StatusChip status={r.assessment_status} /></Box>
              <Typography variant="caption" color="text.secondary" sx={{ width: { md: 170 }, flexShrink: 0 }}>
                {r.assessment_status === "not_assessed" ? "" : r.assessment_provisional ? "Pending final confirmation" : "Confirmed"}
              </Typography>
              <Button component={Link} href={`/admin/recommendations/${encodeURIComponent(r.public_id)}`} size="small" sx={{ flexShrink: 0 }}>Manage</Button>
            </Stack>
          ))}
        </Box>
      </AdminSection>

      <AdminSection title="Review log" note="The most recent periodic reviews and what each one did.">
        <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
          {log.map((entry) => (
            <Box key={entry.id} sx={{ py: 1.5 }}>
              <Typography variant="body2" color="primary.main">
                {formatDate(entry.reviewed_at)} · Recommendation {entry.commitments?.recommendation_number} · {outcomeLabels[entry.outcome] || entry.outcome}
                {entry.resolution ? ` · ${entry.resolution}` : ""}
              </Typography>
              {entry.change_summary && <Typography variant="body2" color="text.secondary" sx={{ mt: .3, lineHeight: 1.6, maxWidth: 860 }}>{entry.change_summary}</Typography>}
            </Box>
          ))}
          {!log.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.5 }}>No periodic review has been recorded yet.</Typography>}
        </Stack>
      </AdminSection>
    </AdminFrame>
  );
}
