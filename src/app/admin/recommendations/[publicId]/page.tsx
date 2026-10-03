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
import { formatDate, splitRationale } from "@/lib/hrct";
import { confirmAssessment, resolveProposal, reviewEvidence, setAssessment } from "../../actions";

export const metadata: Metadata = { title: "Manage recommendation | Human Rights Commitment Tracker", robots: { index: false, follow: false } };

const statuses: [string, string][] = [
  ["not_assessed", "Not assessed"],
  ["unable_to_assess", "Insufficient evidence"],
  ["not_implemented", "No implementation"],
  ["limited_progress", "Limited progress"],
  ["substantially_implemented", "Substantial progress"],
  ["implemented", "Implemented"],
  ["regressed", "Regressed"],
];

export default async function ManageRecommendation({ params }: { params: Promise<{ publicId: string }> }) {
  await requireAdmin();
  const publicId = decodeURIComponent((await params).publicId);
  const rec = await getRecommendation(publicId);
  if (!rec) notFound();
  const [evidence, items, proposals] = await Promise.all([listEvidence(rec.id), listItemsFor(rec.id), listProposals(rec.id)]);
  const assessed = !!rec.assessment_status && rec.assessment_status !== "not_assessed";
  const rationale = splitRationale(rec.assessment_rationale).text;

  return (
    <AdminFrame title={`Recommendation ${rec.recommendation_number}`} intro={rec.title}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <StatusChip status={rec.assessment_status} />
        {assessed && <Typography variant="caption" color="text.secondary">{rec.assessment_provisional ? "Pending final confirmation" : "Confirmed"} · {rec.assessment_date}</Typography>}
        <Button component={Link} href={`/commitments/${encodeURIComponent(rec.public_id)}`} size="small">View public page</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 860, lineHeight: 1.7 }}>{rec.original_text}</Typography>

      {proposals.map((p) => (
        <AdminSection key={p.id} title="Proposed as implemented" note={`A periodic review on ${formatDate(p.reviewed_at)} proposes marking this recommendation as implemented (confidence: ${p.confidence}). The public record is unchanged until you decide.`}>
          {p.change_summary && <Typography variant="body2" sx={{ lineHeight: 1.7, maxWidth: 860 }}>{p.change_summary}</Typography>}
          {p.assessments?.rationale && <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.7, maxWidth: 860 }}>{p.assessments.rationale}</Typography>}
          <Stack direction="row" spacing={1.5} sx={{ mt: 1.6 }}>
            <form action={resolveProposal}>
              <input type="hidden" name="public_id" value={rec.public_id} />
              <input type="hidden" name="decision" value="confirm" />
              <Button type="submit" variant="contained" size="small">Confirm as implemented</Button>
            </form>
            <form action={resolveProposal}>
              <input type="hidden" name="public_id" value={rec.public_id} />
              <input type="hidden" name="decision" value="reject" />
              <Button type="submit" variant="outlined" size="small">Reject</Button>
            </form>
          </Stack>
        </AdminSection>
      ))}

      <AdminSection title="Assessment" note="Saving creates a new assessment and keeps the previous one in the history. An assessment you save is published as confirmed.">
        {assessed && rec.assessment_provisional && (
          <form action={confirmAssessment}>
            <input type="hidden" name="public_id" value={rec.public_id} />
            <Button type="submit" variant="contained" size="small" sx={{ mb: 2.5 }}>Confirm the current assessment as it stands</Button>
          </form>
        )}
        <form action={setAssessment}>
          <input type="hidden" name="public_id" value={rec.public_id} />
          <Stack spacing={2} sx={{ maxWidth: 860 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField name="status" label="Status" select SelectProps={{ native: true }} defaultValue={rec.assessment_status || "not_assessed"} sx={{ minWidth: 240 }}>
                {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </TextField>
              <TextField name="confidence" label="Confidence" select SelectProps={{ native: true }} defaultValue={rec.assessment_confidence || "medium"} sx={{ minWidth: 160 }}>
                {["high", "medium", "low"].map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
              </TextField>
            </Stack>
            <TextField name="rationale" label="Rationale (shown on the public page)" defaultValue={rationale} multiline minRows={6} required fullWidth />
            <TextField name="reason" label="Reason for the change (kept in the history)" fullWidth />
            <Box><Button type="submit" variant="contained">Save assessment</Button></Box>
          </Stack>
        </form>
      </AdminSection>

      <AdminSection title="Evidence" note="Evidence filed by a periodic review is public but marked as pending until you confirm it.">
        <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
          {evidence.map((e) => (
            <Box key={e.id} sx={{ py: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems="flex-start">
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="overline" color="text.secondary">
                    {e.evidence_type.replaceAll("_", " ")} · {!e.is_public ? "Not public" : e.reviewed_at ? "Confirmed" : "Pending final confirmation"}
                  </Typography>
                  <Typography variant="h6" color="primary.main" sx={{ fontSize: "1.05rem" }}>{e.sources?.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{[e.sources?.publisher, e.evidence_date].filter(Boolean).join(" · ")}</Typography>
                </Box>
                {e.sources?.url && <Button component="a" href={e.sources.url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} size="small" sx={{ px: 0, flexShrink: 0 }}>Open source</Button>}
              </Stack>
              <Typography variant="body2" sx={{ mt: .8, lineHeight: 1.7, maxWidth: 860 }}>{e.finding}</Typography>
              <form action={reviewEvidence}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="public_id" value={rec.public_id} />
                <Stack direction="row" spacing={1.25} sx={{ mt: 1.2 }}>
                  {!e.reviewed_at && <Button type="submit" name="op" value="confirm" variant="contained" size="small">Confirm</Button>}
                  {e.is_public
                    ? <Button type="submit" name="op" value="hide" variant="outlined" size="small">Hide from the site</Button>
                    : <Button type="submit" name="op" value="show" variant="outlined" size="small">Show on the site</Button>}
                </Stack>
              </form>
            </Box>
          ))}
          {!evidence.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.5 }}>No evidence on file.</Typography>}
        </Stack>
      </AdminSection>

      <AdminSection title="Monitoring items" note="News and publications matched to this recommendation. Approving publishes the item as reviewed, with your note if you write one.">
        <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
          {items.map((item) => <AdminItemRow key={item.id} item={item} publicId={rec.public_id} />)}
          {!items.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.5 }}>No monitoring items for this recommendation.</Typography>}
        </Stack>
      </AdminSection>
    </AdminFrame>
  );
}
