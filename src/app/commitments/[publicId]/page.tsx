import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { Box, Button, Card, CardContent, Chip, Container, Divider, Stack, Typography } from "@mui/material";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/StatusChip";
import { getCommitment, getEvidence } from "@/lib/hrct";

function humanize(value?: string | null) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Not specified";
}

export default async function CommitmentPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const decoded = decodeURIComponent(publicId);
  const [commitment, evidence] = await Promise.all([getCommitment(decoded), getEvidence(decoded)]);
  if (!commitment) notFound();

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Box sx={{ bgcolor: "#f3f7fa", borderBottom: "1px solid", borderColor: "divider" }}>
          <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
            <Button component={Link} href="/" startIcon={<ArrowBackRoundedIcon />} sx={{ mb: 3 }}>Back to tracker</Button>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Chip label={commitment.country_name} variant="outlined" />
              <Chip label={commitment.mechanism_name} variant="outlined" />
              <StatusChip status={commitment.assessment_status} />
            </Stack>
            <Typography variant="overline" color="secondary.main" fontWeight={700}>{commitment.public_id}</Typography>
            <Typography variant="h1" sx={{ fontSize: { xs: "2.25rem", md: "3.6rem" }, maxWidth: 950, mt: 1 }}>{commitment.title}</Typography>
            <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 850, fontSize: "1.08rem", lineHeight: 1.75 }}>{commitment.normalized_summary || commitment.original_text}</Typography>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="flex-start">
            <Stack spacing={3} sx={{ flex: 1, minWidth: 0 }}>
              <Card>
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <VerifiedRoundedIcon color="secondary" />
                    <Typography variant="h5" fontWeight={700}>Current assessment</Typography>
                  </Stack>
                  <StatusChip status={commitment.assessment_status} />
                  <Typography sx={{ mt: 2.5, lineHeight: 1.8 }}>{commitment.assessment_rationale || "No public rationale is available."}</Typography>
                  <Divider sx={{ my: 3 }} />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={4}>
                    <Box><Typography variant="caption" color="text.secondary">Confidence</Typography><Typography fontWeight={600}>{humanize(commitment.assessment_confidence)}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Assessment date</Typography><Typography fontWeight={600}>{commitment.assessment_date || "Not specified"}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Methodology</Typography><Typography fontWeight={600}>HRCT v{commitment.methodology_version || "1.0"}</Typography></Box>
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Original commitment</Typography>
                  <Typography sx={{ fontSize: "1.08rem", lineHeight: 1.85, whiteSpace: "pre-line" }}>{commitment.original_text}</Typography>
                </CardContent>
              </Card>

              <Box>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Evidence considered</Typography>
                <Stack spacing={2}>
                  {evidence.map((item) => (
                    <Card key={item.id}>
                      <CardContent sx={{ p: 3 }}>
                        <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                          <Box>
                            <Chip size="small" label={humanize(item.evidence_type)} variant="outlined" sx={{ mb: 1.5 }} />
                            <Typography variant="h6" fontWeight={700}>{item.source_title}</Typography>
                            {item.source_publisher && <Typography variant="body2" color="text.secondary">{item.source_publisher}</Typography>}
                          </Box>
                          {item.source_url && <Button component="a" href={item.source_url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} size="small">Source</Button>}
                        </Stack>
                        <Typography sx={{ mt: 2, lineHeight: 1.75 }}>{item.finding}</Typography>
                        {item.reliability_notes && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Limitations: {item.reliability_notes}</Typography>}
                      </CardContent>
                    </Card>
                  ))}
                  {!evidence.length && <Typography color="text.secondary">No public evidence records are attached to this assessment.</Typography>}
                </Stack>
              </Box>
            </Stack>

            <Stack spacing={2} sx={{ width: { xs: "100%", lg: 330 }, position: { lg: "sticky" }, top: { lg: 96 } }}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography fontWeight={700} sx={{ mb: 2 }}>Record details</Typography>
                  <Stack spacing={2}>
                    <Box><Typography variant="caption" color="text.secondary">Recommendation</Typography><Typography>{commitment.recommendation_number || "—"}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Acceptance</Typography><Typography>{humanize(commitment.acceptance_status)}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Mechanism</Typography><Typography>{commitment.mechanism_name}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">Published</Typography><Typography>{commitment.published_at ? new Date(commitment.published_at).toLocaleDateString("en-GB") : "—"}</Typography></Box>
                  </Stack>
                </CardContent>
              </Card>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.5 }}><MenuBookRoundedIcon color="secondary" /><Typography fontWeight={700}>Authoritative source</Typography></Stack>
                  <Typography>{commitment.authoritative_source_title || "Source document"}</Typography>
                  {commitment.authoritative_source_reference && <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>{commitment.authoritative_source_reference}</Typography>}
                  {commitment.authoritative_source_url && <Button component="a" href={commitment.authoritative_source_url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} sx={{ mt: 2 }}>Open source</Button>}
                </CardContent>
              </Card>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
