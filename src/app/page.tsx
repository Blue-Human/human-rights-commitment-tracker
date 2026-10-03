import { Box, Container, Divider, Stack, Typography } from "@mui/material";
import { CommitmentExplorer } from "@/components/CommitmentExplorer";
import { SiteHeader } from "@/components/SiteHeader";
import { getCommitments, getSignals, getFreshness } from "@/lib/hrct";

import { SignalFeed } from "@/components/SignalFeed";
import { recent, uniqueEvents, monitoringState } from "@/lib/live";

export default async function Home() {
  const [commitments, signals, freshness] = await Promise.all([getCommitments(),getSignals(),getFreshness()]);
  const currentSignals=signals.filter(s=>recent(s));
  const assessed = commitments.filter((x) => x.assessment_status && !["not_assessed", "unable_to_assess"].includes(x.assessment_status)).length;
  const accepted = commitments.filter((x) => x.acceptance_status === "accepted").length;

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
          <Typography variant="overline" color="secondary.main">Spain · Universal Periodic Review · Fourth cycle</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2.35rem", md: "3.45rem" }, mt: 1.2, maxWidth: 900 }}>
            Human Rights Commitment Tracker
          </Typography>
          <Typography sx={{ mt: 2.25, maxWidth: 820, fontSize: { xs: "1rem", md: "1.08rem" }, lineHeight: 1.75, color: "text.secondary" }}>
            Public monitoring of international human-rights recommendations and their implementation in Spain. Each record preserves the authoritative United Nations recommendation separately from Blue Human&apos;s independent assessment.
          </Typography>

          <Divider sx={{ my: { xs: 4, md: 5 } }} />

          <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 3, md: 0 }} divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" } }} />}>
            {[
              [commitments.length, "Published recommendations"],
              [accepted, "Accepted by Spain"],
              [assessed, "Implementation assessments completed"],
              [freshness.filter(f=>f.last_evidence_at && new Date(f.last_evidence_at).getTime()>=Date.now()-90*86400000).length, "Recommendations with evidence dated in the last 90 days"],
              [new Set(currentSignals.map(s=>s.public_id)).size, "Recommendations with signals (90 days)"],
              [freshness.filter(f=>monitoringState(f)==="Monitoring active").length, "Recommendations with current monitoring"],
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
                <Typography variant="overline" color="text.secondary">Current scope</Typography>
                <Typography color="primary.main" sx={{ mt: .4 }}>Spain</Typography>
              </Box>
              <Box sx={{ minWidth: 280 }}>
                <Typography variant="overline" color="text.secondary">Mechanism</Typography>
                <Typography color="primary.main" sx={{ mt: .4 }}>Universal Periodic Review</Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">Authoritative source</Typography>
                <Typography color="primary.main" sx={{ mt: .4 }}>A/HRC/60/8 · Human Rights Council</Typography>
              </Box>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
          <Box sx={{ mb: 3.5 }}>
            <Typography variant="overline" color="text.secondary">Public register</Typography>
            <Typography variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.8rem", md: "2.25rem" }, mt: .5 }}>Recommendations and assessments</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 820, mt: 1.25, lineHeight: 1.7 }}>
              Recommendations marked “Assessment pending” are included in the pilot dataset but do not yet carry an implementation finding.
            </Typography>
          </Box>
          <CommitmentExplorer commitments={commitments} />
          <Box component="section" sx={{mt:6}}>
            <Typography variant="h2" color="primary.main" sx={{fontSize:"2rem"}}>What changed recently</Typography>
            <Typography color="text.secondary" sx={{mt:2}}>Recent context signals ({uniqueEvents(currentSignals).length} distinct events). Reporting volume does not establish deterioration or non-compliance.</Typography>
            <SignalFeed signals={currentSignals} limit={8} showRecommendation />
          </Box>
        </Container>
      </Box>

      <Box component="footer" sx={{ borderTop: "1px solid", borderColor: "divider", bgcolor: "#fff" }}>
        <Container maxWidth="lg" sx={{ py: 3.5 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
            <Typography variant="body2" color="text.secondary">Blue Human · Human Rights Commitment Tracker</Typography>
            <Typography variant="body2" color="text.secondary">Independent civil-society monitoring</Typography>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
