import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import { Box, Card, CardContent, Container, Stack, Typography } from "@mui/material";
import { CommitmentExplorer } from "@/components/CommitmentExplorer";
import { SiteHeader } from "@/components/SiteHeader";
import { getCommitments } from "@/lib/hrct";

export default async function Home() {
  const commitments = await getCommitments();
  const assessed = commitments.filter((x) => x.assessment_status && x.assessment_status !== "unable_to_assess").length;
  const mechanisms = new Set(commitments.map((x) => x.mechanism_code)).size;

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Box sx={{ bgcolor: "primary.main", color: "white", position: "relative", overflow: "hidden" }}>
          <Box sx={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", bgcolor: "secondary.main", opacity: .14, right: -120, top: -180 }} />
          <Container maxWidth="lg" sx={{ py: { xs: 8, md: 11 }, position: "relative" }}>
            <Typography variant="overline" sx={{ color: "secondary.light", fontWeight: 700, letterSpacing: ".14em" }}>BLUE HUMAN · OPEN HUMAN RIGHTS DATA</Typography>
            <Typography variant="h1" sx={{ fontSize: { xs: "2.7rem", md: "4.7rem" }, maxWidth: 900, mt: 1.5 }}>
              Human Rights Commitment Tracker
            </Typography>
            <Typography sx={{ fontSize: { xs: "1.08rem", md: "1.3rem" }, maxWidth: 760, mt: 2.5, color: "rgba(255,255,255,.78)", lineHeight: 1.7 }}>
              Independent, evidence-led monitoring of public human-rights commitments. Every assessment is traceable to sources, methodology and human peer review.
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 7 }}>
            {[
              { icon: <FactCheckRoundedIcon />, value: commitments.length, label: "Published commitments" },
              { icon: <InsightsRoundedIcon />, value: assessed, label: "Substantively assessed" },
              { icon: <GavelRoundedIcon />, value: mechanisms, label: "Mechanisms represented" },
            ].map((item) => (
              <Card key={item.label} sx={{ flex: 1 }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ width: 46, height: 46, borderRadius: 2.5, display: "grid", placeItems: "center", bgcolor: "rgba(0,163,224,.1)", color: "secondary.main" }}>{item.icon}</Box>
                    <Box>
                      <Typography variant="h4" fontWeight={700}>{item.value}</Typography>
                      <Typography color="text.secondary">{item.label}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Stack spacing={1} sx={{ mb: 3 }}>
            <Typography variant="overline" color="secondary.main" fontWeight={700}>Public dataset</Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: "2rem", md: "2.7rem" } }}>Explore commitments</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 720 }}>Search the published record and open any commitment to inspect the evidence and reasoning behind its current assessment.</Typography>
          </Stack>

          <CommitmentExplorer commitments={commitments} />
        </Container>
      </Box>
      <Box component="footer" sx={{ bgcolor: "primary.main", color: "rgba(255,255,255,.72)", mt: 7 }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="body2">Blue Human · Human Rights Commitment Tracker · Evidence before conclusions.</Typography>
        </Container>
      </Box>
    </>
  );
}
