import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Container, Divider, Paper, Stack, Typography } from "@mui/material";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/StatusChip";
import { getCommitment, getEvidence } from "@/lib/hrct";

function humanize(value?: string | null) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Not specified";
}

function Meta({ label, value }: { label: string; value: string }) {
  return <Box><Typography variant="overline" color="text.secondary">{label}</Typography><Typography sx={{ mt: .25 }}>{value}</Typography></Box>;
}

export default async function CommitmentPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const decoded = decodeURIComponent(publicId);
  const [commitment, evidence] = await Promise.all([getCommitment(decoded), getEvidence(decoded)]);
  if (!commitment) notFound();

  const pending = commitment.assessment_status === "not_assessed";

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Box sx={{ bgcolor: "#fff", borderBottom: "1px solid", borderColor: "divider" }}>
          <Container maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 } }}>
            <Button component={Link} href="/" startIcon={<ArrowBackRoundedIcon />} sx={{ mb: 3 }}>Back to public dataset</Button>
            <Typography variant="overline" color="secondary.main">Spain · Universal Periodic Review · Recommendation {commitment.recommendation_number}</Typography>
            <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2.3rem", md: "3.55rem" }, maxWidth: 980, mt: 1.15 }}>{commitment.title}</Typography>
            <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 900, fontSize: "1.08rem", lineHeight: 1.75 }}>{commitment.normalized_summary || commitment.original_text}</Typography>
            <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mt: 3 }}>
              <StatusChip status={commitment.assessment_status} />
              <Typography variant="caption" sx={{ px: 1, py: .45, border: "1px solid", borderColor: "divider" }}>{humanize(commitment.acceptance_status)}</Typography>
              <Typography variant="caption" sx={{ px: 1, py: .45, border: "1px solid", borderColor: "divider" }}>{commitment.public_id}</Typography>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={{ xs: 4, lg: 7 }} alignItems="flex-start">
            <Stack spacing={5} sx={{ flex: 1, minWidth: 0 }}>
              <Box component="section">
                <Box sx={{ borderLeft: "4px solid", borderLeftColor: "secondary.main", pl: 2, mb: 2.5 }}>
                  <Typography variant="h4" color="primary.main">Implementation assessment</Typography>
                </Box>
                <Paper variant="outlined" square sx={{ p: { xs: 2.5, md: 3.5 } }}>
                  <StatusChip status={commitment.assessment_status} />
                  <Typography sx={{ mt: 2.25, lineHeight: 1.8 }}>
                    {pending ? "This recommendation is part of the published pilot catalogue. Blue Human has not yet issued an implementation finding for this record." : (commitment.assessment_rationale || "No public rationale is available.")}
                  </Typography>
                  <Divider sx={{ my: 3 }} />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 2, sm: 5 }}>
                    <Meta label="Confidence" value={pending ? "Not applicable" : humanize(commitment.assessment_confidence)} />
                    <Meta label="Assessment date" value={pending ? "Pending" : (commitment.assessment_date || "Not specified")} />
                    <Meta label="Methodology" value={`HRCT v${commitment.methodology_version || "1.0"}`} />
                  </Stack>
                </Paper>
              </Box>

              <Box component="section">
                <Box sx={{ borderLeft: "4px solid", borderLeftColor: "secondary.main", pl: 2, mb: 2.5 }}>
                  <Typography variant="h4" color="primary.main">Authoritative recommendation</Typography>
                </Box>
                <Paper variant="outlined" square sx={{ p: { xs: 2.5, md: 3.5 } }}>
                  <Typography sx={{ fontSize: "1.06rem", lineHeight: 1.9, whiteSpace: "pre-line" }}>{commitment.original_text}</Typography>
                </Paper>
              </Box>

              <Box component="section">
                <Box sx={{ borderLeft: "4px solid", borderLeftColor: "secondary.main", pl: 2, mb: 2.5 }}>
                  <Typography variant="h4" color="primary.main">Evidence record</Typography>
                </Box>
                <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", bgcolor: "#fff" }}>
                  {evidence.map((item) => (
                    <Box key={item.id} sx={{ py: 3 }}>
                      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems="flex-start">
                        <Box>
                          <Typography variant="overline" color="text.secondary">{humanize(item.evidence_type)}</Typography>
                          <Typography variant="h6" color="primary.main" sx={{ mt: .25 }}>{item.source_title}</Typography>
                          {item.source_publisher && <Typography variant="body2" color="text.secondary">{item.source_publisher}</Typography>}
                        </Box>
                        {item.source_url && <Button component="a" href={item.source_url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} size="small">Open source</Button>}
                      </Stack>
                      <Typography sx={{ mt: 2, lineHeight: 1.75 }}>{item.finding}</Typography>
                      {item.reliability_notes && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Limitations: {item.reliability_notes}</Typography>}
                    </Box>
                  ))}
                  {!evidence.length && <Typography color="text.secondary" sx={{ py: 3 }}>No public implementation evidence has yet been attached to this record.</Typography>}
                </Stack>
              </Box>
            </Stack>

            <Box sx={{ width: { xs: "100%", lg: 330 }, position: { lg: "sticky" }, top: { lg: 104 } }}>
              <Paper variant="outlined" square sx={{ p: 3, borderTop: "4px solid", borderTopColor: "primary.main" }}>
                <Typography variant="h6" color="primary.main" sx={{ mb: 2.5 }}>Record information</Typography>
                <Stack spacing={2.25} divider={<Divider flexItem />}>
                  <Meta label="Recommendation" value={commitment.recommendation_number || "—"} />
                  <Meta label="State response" value={humanize(commitment.acceptance_status)} />
                  <Meta label="Mechanism" value={commitment.mechanism_name} />
                  <Meta label="Publication date" value={commitment.published_at ? new Date(commitment.published_at).toLocaleDateString("en-GB") : "—"} />
                </Stack>
              </Paper>

              <Paper variant="outlined" square sx={{ p: 3, mt: 2 }}>
                <Typography variant="overline" color="text.secondary">Authoritative source</Typography>
                <Typography color="primary.main" fontWeight={600} sx={{ mt: .5 }}>{commitment.authoritative_source_title || "United Nations source document"}</Typography>
                {commitment.authoritative_source_reference && <Typography variant="body2" color="text.secondary" sx={{ mt: .6 }}>{commitment.authoritative_source_reference}</Typography>}
                {commitment.authoritative_source_url && <Button component="a" href={commitment.authoritative_source_url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} sx={{ mt: 2 }}>Open UN source</Button>}
              </Paper>
            </Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
