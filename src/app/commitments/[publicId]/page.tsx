import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Container, Divider, Stack, Typography } from "@mui/material";
import { MonitoringList } from "@/components/MonitoringList";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/StatusChip";
import { formatDate, getAssessmentHistory, getCommitment, getEvidence, getHumanSecurityDimensions, getLastScannedAt, getMonitoringItems, monitoringChannel, splitRationale } from "@/lib/hrct";

function humanize(value?: string | null) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Not specified";
}

function Meta({ label, value }: { label: string; value: string }) {
  return <Box><Typography variant="overline" color="text.secondary">{label}</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{value}</Typography></Box>;
}

export default async function CommitmentPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const decoded = decodeURIComponent(publicId);
  const [commitment, evidence, dimensions, monitoring, history, lastScannedAt] = await Promise.all([
    getCommitment(decoded),
    getEvidence(decoded),
    getHumanSecurityDimensions(decoded),
    getMonitoringItems(decoded),
    getAssessmentHistory(decoded),
    getLastScannedAt(decoded),
  ]);
  if (!commitment) notFound();

  const pending = commitment.assessment_status === "not_assessed";
  const rationale = splitRationale(commitment.assessment_rationale);
  const items = monitoring.map((item) => ({ ...item, public_ids: [] as string[] }));
  const needContext = items.filter((item) => monitoringChannel(item) === "need");
  const liveImplementation = items.filter((item) => monitoringChannel(item) === "implementation");
  const liveContrary = items.filter((item) => monitoringChannel(item) === "contradiction");

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
                  {pending ? "This recommendation is included in the public pilot dataset. Blue Human has not yet issued an implementation finding for this record." : (rationale.text || "No public rationale is available.")}
                </Typography>
                {!pending && rationale.provisional && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.4, lineHeight: 1.7, maxWidth: 850 }}>
                    Provisional assessment based on public sources, pending final confirmation by Blue Human.
                  </Typography>
                )}
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
                  Reporting, official statements and public information that may indicate the continuing need addressed by this recommendation. Each item is marked as reviewed or pending final confirmation. They are monitoring context, not proof of implementation and not a Blue Human finding unless separately reviewed as evidence.
                </Typography>
                <MonitoringList items={needContext} numbers={{}} empty="The live tracker has not yet identified public context for this recommendation." />
              </Box>

              <Box component="section" sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="overline" color="text.secondary">Authoritative text</Typography>
                <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.8 }}>United Nations recommendation</Typography>
                <Typography sx={{ fontSize: "1.04rem", lineHeight: 1.9, whiteSpace: "pre-line", maxWidth: 860 }}>{commitment.original_text}</Typography>
              </Box>

              {liveImplementation.length > 0 && (
                <Box component="section" sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="overline" color="text.secondary">Research queue</Typography>
                  <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.3 }}>Potential implementation developments</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 840, lineHeight: 1.75, mb: 2 }}>
                    Laws, official actions and reporting matched to this recommendation. They remain candidates until reviewed and promoted into the evidence record.
                  </Typography>
                  <MonitoringList items={liveImplementation} numbers={{}} empty="" />
                </Box>
              )}

              {liveContrary.length > 0 && (
                <Box component="section" sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="overline" color="text.secondary">Research queue</Typography>
                  <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.3 }}>Potential contrary developments</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 840, lineHeight: 1.75, mb: 2 }}>
                    Developments that may run against this recommendation. They are candidates for review and do not change the assessment above.
                  </Typography>
                  <MonitoringList items={liveContrary} numbers={{}} empty="" />
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

              {history.length > 1 && (
                <Box component="section" sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="overline" color="text.secondary">Record history</Typography>
                  <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.2 }}>Assessment history</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 840, lineHeight: 1.75, mb: 2.2 }}>
                    Published assessments are never overwritten. When an assessment changes, the earlier one stays on the record.
                  </Typography>
                  <Stack component="ol" divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderColor: "divider", listStyle: "none", m: 0, p: 0 }}>
                    {history.map((entry) => (
                      <Stack component="li" key={entry.id} direction={{ xs: "column", sm: "row" }} spacing={{ xs: .75, sm: 3 }} sx={{ py: 2.2 }}>
                        <Box sx={{ width: { sm: 150 }, flexShrink: 0 }}>
                          <Typography variant="body2" color="primary.main">{formatDate(entry.published_at) || entry.assessment_date || "Undated"}</Typography>
                          <Typography variant="caption" color="text.secondary">{entry.is_current ? "Current assessment" : "Superseded"}</Typography>
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <StatusChip status={entry.status} />
                          {entry.status !== "not_assessed" && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .4 }}>
                              {humanize(entry.confidence)} confidence · HRCT v{entry.methodology_version || "1.0"}
                            </Typography>
                          )}
                          {!entry.is_current && entry.rationale && <Typography variant="body2" color="text.secondary" sx={{ mt: .8, lineHeight: 1.7 }}>{splitRationale(entry.rationale).text}</Typography>}
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>

            <Box sx={{ width: { xs: "100%", lg: 300 }, position: { lg: "sticky" }, top: { lg: 92 }, borderLeft: { lg: "1px solid" }, borderColor: "divider", pl: { lg: 4 } }}>
              <Typography variant="overline" color="text.secondary">Record information</Typography>
              <Stack spacing={2.3} sx={{ mt: 1.7 }} divider={<Divider flexItem />}>
                <Meta label="Recommendation" value={commitment.recommendation_number || "—"} />
                <Meta label="State response" value={humanize(commitment.acceptance_status)} />
                <Meta label="Mechanism" value={commitment.mechanism_name} />
                <Meta label="Live context items" value={String(needContext.length)} />
                {lastScannedAt && <Meta label="Last source scan" value={formatDate(lastScannedAt)!} />}
                <Meta label="Publication date" value={formatDate(commitment.published_at) || "—"} />
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
      <SiteFooter />
    </>
  );
}
