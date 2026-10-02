import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Container, Divider, Stack, Typography } from "@mui/material";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/StatusChip";
import { getCommitment, getEvidence } from "@/lib/hrct";

function humanize(value?: string | null) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Not specified";
}

function Meta({ label, value }: { label: string; value: string }) {
  return <Box><Typography variant="overline" color="text.secondary">{label}</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{value}</Typography></Box>;
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
        <Container maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 } }}>
          <Button component={Link} href="/" startIcon={<ArrowBackRoundedIcon />} sx={{ mb: 3, px: 0 }}>Back to recommendations</Button>
          <Typography variant="overline" color="secondary.main">Spain · UPR fourth cycle · Recommendation {commitment.recommendation_number}</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, maxWidth: 940, mt: 1.1 }}>
            {commitment.title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1.8, maxWidth: 900, lineHeight: 1.75 }}>{commitment.normalized_summary || commitment.original_text}</Typography>
          <Stack direction="row" spacing={2.25} flexWrap="wrap" useFlexGap sx={{ mt: 2.5 }}>
            <StatusChip status={commitment.assessment_status} />
            <Typography variant="caption" color="text.secondary">{humanize(commitment.acceptance_status)}</Typography>
            <Typography variant="caption" color="text.secondary">{commitment.public_id}</Typography>
          </Stack>
        </Container>

        <Divider />

        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 6 } }}>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={{ xs: 4, lg: 7 }} alignItems="flex-start">
            <Stack spacing={5} sx={{ flex: 1, minWidth: 0 }}>
              <Box component="section">
                <Typography variant="overline" color="text.secondary">Blue Human assessment</Typography>
                <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.8 }}>Implementation assessment</Typography>
                <StatusChip status={commitment.assessment_status} />
                <Typography sx={{ mt: 1.8, lineHeight: 1.8, maxWidth: 850 }}>
                  {pending ? "This recommendation is included in the public pilot dataset. Blue Human has not yet issued an implementation finding for this record." : (commitment.assessment_rationale || "No public rationale is available.")}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 2, sm: 5 }} sx={{ mt: 2.5, pt: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
                  <Meta label="Confidence" value={pending ? "Not applicable" : humanize(commitment.assessment_confidence)} />
                  <Meta label="Assessment date" value={pending ? "Pending" : (commitment.assessment_date || "Not specified")} />
                  <Meta label="Methodology" value={`HRCT v${commitment.methodology_version || "1.0"}`} />
                </Stack>
              </Box>

              <Box component="section" sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="overline" color="text.secondary">Authoritative text</Typography>
                <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.8 }}>United Nations recommendation</Typography>
                <Typography sx={{ fontSize: "1.04rem", lineHeight: 1.9, whiteSpace: "pre-line", maxWidth: 860 }}>{commitment.original_text}</Typography>
              </Box>

              <Box component="section" sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="overline" color="text.secondary">Supporting record</Typography>
                <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.5 }}>Evidence considered</Typography>
                <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                  {evidence.map((item) => (
                    <Box key={item.id} sx={{ py: 2.75 }}>
                      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems="flex-start">
                        <Box>
                          <Typography variant="overline" color="text.secondary">{humanize(item.evidence_type)}</Typography>
                          <Typography variant="h6" color="primary.main" sx={{ mt: .25 }}>{item.source_title}</Typography>
                          {item.source_publisher && <Typography variant="body2" color="text.secondary">{item.source_publisher}</Typography>}
                        </Box>
                        {item.source_url && <Button component="a" href={item.source_url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} size="small" sx={{ px: 0 }}>Open source</Button>}
                      </Stack>
                      <Typography variant="body2" sx={{ mt: 1.6, lineHeight: 1.75 }}>{item.finding}</Typography>
                      {item.reliability_notes && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.2 }}>Limitations: {item.reliability_notes}</Typography>}
                    </Box>
                  ))}
                  {!evidence.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.75 }}>No public implementation evidence has yet been attached to this record.</Typography>}
                </Stack>
              </Box>
            </Stack>

            <Box sx={{ width: { xs: "100%", lg: 300 }, position: { lg: "sticky" }, top: { lg: 92 }, borderLeft: { lg: "1px solid" }, borderColor: "divider", pl: { lg: 4 } }}>
              <Typography variant="overline" color="text.secondary">Record information</Typography>
              <Stack spacing={2.3} sx={{ mt: 1.7 }} divider={<Divider flexItem />}>
                <Meta label="Recommendation" value={commitment.recommendation_number || "—"} />
                <Meta label="State response" value={humanize(commitment.acceptance_status)} />
                <Meta label="Mechanism" value={commitment.mechanism_name} />
                <Meta label="Publication date" value={commitment.published_at ? new Date(commitment.published_at).toLocaleDateString("en-GB") : "—"} />
              </Stack>

              <Divider sx={{ my: 3 }} />

              <Typography variant="overline" color="text.secondary">Authoritative source</Typography>
              <Typography variant="body2" color="primary.main" sx={{ mt: .7 }}>{commitment.authoritative_source_title || "United Nations source document"}</Typography>
              {commitment.authoritative_source_reference && <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .5 }}>{commitment.authoritative_source_reference}</Typography>}
              {commitment.authoritative_source_url && <Button component="a" href={commitment.authoritative_source_url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} sx={{ mt: 1.5, px: 0 }}>Open UN source</Button>}
            </Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
