import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Container, Divider, Stack, Typography } from "@mui/material";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/StatusChip";
import { getCommitment, getEvidence, getHumanSecurityDimensions, getMonitoringItems } from "@/lib/hrct";

function humanize(value?: string | null) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Not specified";
}

function Meta({ label, value }: { label: string; value: string }) {
  return <Box><Typography variant="overline" color="text.secondary">{label}</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{value}</Typography></Box>;
}

export default async function CommitmentPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const decoded = decodeURIComponent(publicId);
  const [commitment, evidence, dimensions, monitoring] = await Promise.all([
    getCommitment(decoded),
    getEvidence(decoded),
    getHumanSecurityDimensions(decoded),
    getMonitoringItems(decoded),
  ]);
  if (!commitment) notFound();

  const pending = commitment.assessment_status === "not_assessed";
  const needContext = monitoring.filter((item) => item.relation === "supports_need" || item.kind === "need_context");
  const liveImplementation = monitoring.filter((item) => item.relation !== "supports_need" && item.kind !== "need_context");

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
                <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                  {needContext.map((item) => (
                    <Box key={item.id} sx={{ py: 2.6 }}>
                      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems="flex-start">
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="overline" color="text.secondary">{item.source_type === "official_web" ? "Official monitoring" : "News / public reporting"} · Auto-discovered</Typography>
                          <Typography variant="h6" color="primary.main" sx={{ mt: .25 }}>{item.title}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .45 }}>
                            {[item.publisher, item.published_at ? new Date(item.published_at).toLocaleDateString("en-GB") : null].filter(Boolean).join(" · ")}
                          </Typography>
                        </Box>
                        <Button component="a" href={item.url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} size="small" sx={{ px: 0, flexShrink: 0 }}>Open source</Button>
                      </Stack>
                      {item.summary && <Typography variant="body2" sx={{ mt: 1.3, lineHeight: 1.7 }}>{item.summary}</Typography>}
                    </Box>
                  ))}
                  {!needContext.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.75 }}>The live tracker has not yet identified public context for this recommendation.</Typography>}
                </Stack>
              </Box>

              <Box component="section" sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="overline" color="text.secondary">Authoritative text</Typography>
                <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.8 }}>United Nations recommendation</Typography>
                <Typography sx={{ fontSize: "1.04rem", lineHeight: 1.9, whiteSpace: "pre-line", maxWidth: 860 }}>{commitment.original_text}</Typography>
              </Box>

              {liveImplementation.length > 0 && (
                <Box component="section" sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="overline" color="text.secondary">Automated research queue</Typography>
                  <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.3 }}>Potential implementation developments</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 840, lineHeight: 1.75, mb: 2 }}>
                    Laws, official actions and reporting automatically matched to this recommendation. They remain candidates until reviewed and promoted into the evidence record.
                  </Typography>
                  <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                    {liveImplementation.map((item) => (
                      <Box key={item.id} sx={{ py: 2.5 }}>
                        <Typography variant="overline" color="text.secondary">{humanize(item.kind)} · {Math.round(Number(item.relevance_score) * 100)}% match</Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems="flex-start">
                          <Typography variant="h6" color="primary.main" sx={{ mt: .25 }}>{item.title}</Typography>
                          <Button component="a" href={item.url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} size="small" sx={{ px: 0, flexShrink: 0 }}>Open source</Button>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .5 }}>{item.publisher || item.source_domain || "Public source"}</Typography>
                        {item.summary && <Typography variant="body2" sx={{ mt: 1.2, lineHeight: 1.7 }}>{item.summary}</Typography>}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

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
                <Meta label="Live context items" value={String(needContext.length)} />
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
