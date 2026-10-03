import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Container, Divider, Stack, Typography } from "@mui/material";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/StatusChip";
import { getCommitment, getEvidence, getHumanSecurityDimensions, getSignals, getFreshness, getAssessmentHistory } from "@/lib/hrct";

import { SignalFeed } from "@/components/SignalFeed";
import { monitoringState, recent, uniqueEvents } from "@/lib/live";

function humanize(value?: string | null) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Not specified";
}

function Meta({ label, value }: { label: string; value: string }) {
  return <Box><Typography variant="overline" color="text.secondary">{label}</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{value}</Typography></Box>;
}

export default async function CommitmentPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const decoded = decodeURIComponent(publicId);
  const [commitment, evidence, dimensions, signals, freshness, history] = await Promise.all([
    getCommitment(decoded),
    getEvidence(decoded),
    getHumanSecurityDimensions(decoded),
    getSignals(decoded),
    getFreshness(decoded),
    getAssessmentHistory(decoded),
  ]);
  if (!commitment) notFound();

  const pending = commitment.assessment_status === "not_assessed";
  const currentSignals = signals.filter(s => recent(s));
  const monitoring = freshness[0];

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 } }}>
          <Button component={Link} href="/" startIcon={<ArrowBackRoundedIcon />} sx={{ mb: 3, px: 0 }}>Back to recommendations</Button>
          <Typography variant="overline" color="primary.main">Spain · UPR fourth cycle · Recommendation {commitment.recommendation_number}</Typography>
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
                <Typography variant="overline" color="text.secondary">Human security lens</Typography>
                <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.6 }}>Affected human security dimensions</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 820, lineHeight: 1.75, mb: 2.2 }}>
                  HRCT maps each recommendation to the seven human-security dimensions used by UNDP. More than one dimension may apply because threats to human security are interconnected.
                </Typography>
                <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                  {dimensions.map((dimension) => (
                    <Box key={dimension.code} sx={{ py: 2.2 }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "baseline" }}>
                        <Typography variant="h6" color="primary.main" sx={{ minWidth: 180 }}>{dimension.name}</Typography>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{display:"block"}}>{dimension.reviewed ? "Reviewed classification" : "Proposed classification"} · {humanize(dimension.classification_method)}{dimension.confidence !== null ? ` · score ${dimension.confidence}` : ""}</Typography>
                          {dimension.is_primary && <Typography variant="overline" color="text.secondary">Primary dimension</Typography>}
                          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{dimension.rationale || dimension.description}</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  ))}
                  {!dimensions.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.5 }}>Human-security classification pending.</Typography>}
                </Stack>
              </Box>

              <Box component="section" sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="overline" color="text.secondary">Live context monitoring</Typography>
                <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.2 }}>Why this recommendation remains relevant</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 840, lineHeight: 1.75, mb: 2.2 }}>
                  Automatically discovered reporting, official statements and public information that may indicate the continuing need addressed by this recommendation. These items are monitoring context, not proof of implementation and not a Blue Human finding unless separately reviewed as evidence.
                </Typography>
                <Typography variant="caption" color="text.secondary">Last 90 days · clustered reporting</Typography>
                <SignalFeed signals={currentSignals} />
              </Box>

              <Box component="section" sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="overline" color="text.secondary">Authoritative text</Typography>
                <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.8 }}>United Nations recommendation</Typography>
                <Typography sx={{ fontSize: "1.04rem", lineHeight: 1.9, whiteSpace: "pre-line", maxWidth: 860 }}>{commitment.original_text}</Typography>
              </Box>


              <Box component="section" sx={{pt:4,borderTop:"1px solid",borderColor:"divider"}}>
                <Typography variant="h4" color="primary.main">Assessment history</Typography>
                <Stack divider={<Divider/>}>{history.map(a=><Box key={a.id} sx={{py:2}}>
                  <Typography variant="overline">{a.assessment_date} · HRCT v{a.methodology_version}{a.is_current ? " · Current" : ""}</Typography>
                  <Box sx={{my:1}}><StatusChip status={a.status}/></Box>
                  <Typography variant="body2">{a.rationale}</Typography>
                </Box>)}</Stack>
                {!history.length && <Typography color="text.secondary" sx={{mt:2}}>No published assessment history.</Typography>}
              </Box>

              <Box component="section" sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="overline" color="text.secondary">Reviewed record</Typography>
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
                  {!evidence.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.75 }}>No reviewed implementation evidence has yet been attached to this record.</Typography>}
                </Stack>
              </Box>
            </Stack>

            <Box sx={{ width: { xs: "100%", lg: 300 }, position: { lg: "sticky" }, top: { lg: 92 }, borderLeft: { lg: "1px solid" }, borderColor: "divider", pl: { lg: 4 } }}>
              <Typography variant="overline" color="text.secondary">Record information</Typography>
              <Stack spacing={2.3} sx={{ mt: 1.7 }} divider={<Divider flexItem />}>
                <Meta label="Recommendation" value={commitment.recommendation_number || "—"} />
                <Meta label="State response" value={humanize(commitment.acceptance_status)} />
                <Meta label="Mechanism" value={commitment.mechanism_name} />
                <Meta label="Recent signals" value={String(uniqueEvents(currentSignals).length)} />
                <Meta label="Monitoring" value={monitoringState(monitoring)} />
                <Meta label="Last scan attempt" value={monitoring?.last_run_at ? new Date(monitoring.last_run_at).toLocaleString("en-GB", {timeZone:"UTC"}) + " UTC" : "Not yet scanned"} />
                <Meta label="Last successful scan" value={monitoring?.last_success_at ? new Date(monitoring.last_success_at).toLocaleString("en-GB", {timeZone:"UTC"}) + " UTC" : "None recorded"} />
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
