import { Box, Container, Divider, Paper, Stack, Typography } from "@mui/material";
import { CommitmentExplorer } from "@/components/CommitmentExplorer";
import { SiteHeader } from "@/components/SiteHeader";
import { getCommitments } from "@/lib/hrct";

export default async function Home() {
  const commitments = await getCommitments();
  const assessed = commitments.filter((x) => x.assessment_status && !["not_assessed", "unable_to_assess"].includes(x.assessment_status)).length;
  const accepted = commitments.filter((x) => x.acceptance_status === "accepted").length;

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Box sx={{ bgcolor: "#fff", borderBottom: "1px solid", borderColor: "divider" }}>
          <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={{ xs: 4, md: 8 }} alignItems="flex-start">
              <Box sx={{ flex: 1, maxWidth: 780 }}>
                <Typography variant="overline" color="secondary.main">Independent human rights monitoring · Spain · UPR fourth cycle</Typography>
                <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2.6rem", md: "4rem" }, mt: 1.25, mb: 2.5 }}>
                  Human Rights Commitment Tracker
                </Typography>
                <Typography sx={{ fontSize: { xs: "1.05rem", md: "1.22rem" }, lineHeight: 1.75, color: "text.secondary", maxWidth: 760 }}>
                  A public record of international human-rights recommendations, national responses and evidence-based implementation assessments. The tracker separates the authoritative recommendation from Blue Human&apos;s independent assessment.
                </Typography>
              </Box>

              <Paper variant="outlined" square sx={{ width: { xs: "100%", md: 320 }, p: 3, borderTop: "4px solid", borderTopColor: "secondary.main" }}>
                <Typography variant="overline" color="text.secondary">Current pilot scope</Typography>
                <Stack spacing={2.25} sx={{ mt: 1.5 }}>
                  <Box><Typography variant="h4" color="primary.main">Spain</Typography><Typography variant="body2" color="text.secondary">State under review</Typography></Box>
                  <Divider />
                  <Box><Typography variant="h5" color="primary.main">Universal Periodic Review</Typography><Typography variant="body2" color="text.secondary">Fourth cycle · 2025 outcome</Typography></Box>
                  <Divider />
                  <Box><Typography variant="h5" color="primary.main">A/HRC/60/8</Typography><Typography variant="body2" color="text.secondary">Authoritative working-group report</Typography></Box>
                </Stack>
              </Paper>
            </Stack>
          </Container>
        </Box>

        <Box sx={{ bgcolor: "primary.main", color: "white" }}>
          <Container maxWidth="lg">
            <Stack direction={{ xs: "column", sm: "row" }} divider={<Divider flexItem orientation="vertical" sx={{ display: { xs: "none", sm: "block" }, borderColor: "rgba(255,255,255,.2)" }} />}>
              {[
                [commitments.length, "Published recommendations"],
                [accepted, "Accepted by Spain"],
                [assessed, "Implementation assessments completed"],
              ].map(([value, label]) => (
                <Box key={String(label)} sx={{ flex: 1, py: 3, px: { xs: 0, sm: 3 }, "&:first-of-type": { pl: 0 } }}>
                  <Typography variant="h4" sx={{ color: "white" }}>{value}</Typography>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,.72)", mt: .35 }}>{label}</Typography>
                </Box>
              ))}
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
          <Box sx={{ borderLeft: "4px solid", borderLeftColor: "secondary.main", pl: 2.5, mb: 4 }}>
            <Typography variant="overline" color="text.secondary">Public dataset</Typography>
            <Typography variant="h2" color="primary.main" sx={{ fontSize: { xs: "2rem", md: "2.7rem" }, mt: .4 }}>Recommendations and assessments</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 800, mt: 1.25, lineHeight: 1.7 }}>
              Search the published record. Recommendations marked “Assessment pending” are authoritative UPR records already included in the public pilot, but do not yet carry an implementation finding.
            </Typography>
          </Box>
          <CommitmentExplorer commitments={commitments} />
        </Container>
      </Box>

      <Box component="footer" sx={{ bgcolor: "#fff", borderTop: "1px solid", borderColor: "divider", mt: 4 }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Typography variant="body2" color="text.secondary">Blue Human · Human Rights Commitment Tracker</Typography>
            <Typography variant="body2" color="text.secondary">Independent civil-society monitoring · Evidence before conclusions</Typography>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
