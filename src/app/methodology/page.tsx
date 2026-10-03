import type { Metadata } from "next";
import { Box, Container, Divider, Stack, Typography } from "@mui/material";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/StatusChip";

export const metadata: Metadata = {
  title: "Methodology and use of AI | Human Rights Commitment Tracker",
  description: "How HRCT records recommendations, weighs evidence, uses automated monitoring and AI, and preserves assessment history.",
};

const vocabulary = ["not_assessed", "unable_to_assess", "not_implemented", "limited_progress", "substantially_implemented", "implemented", "regressed"];

const sourceTiers: [string, string][] = [
  ["Primary evidence", "Legislation, official gazettes, government administrative records, official statistics, budget allocation and execution, judicial decisions and formal implementation documents."],
  ["Independent institutional evidence", "United Nations bodies, treaty mechanisms, national human-rights institutions, ombudsman institutions and recognised international monitoring mechanisms."],
  ["Civil-society evidence", "NGO reports, watchdog reports and documented field research."],
  ["Secondary evidence", "Academic publications, reputable journalism and expert analysis."],
];

function Section({ overline, title, children }: { overline: string; title: string; children: React.ReactNode }) {
  return (
    <Box component="section" sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
      <Typography variant="overline" color="text.secondary">{overline}</Typography>
      <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.6 }}>{title}</Typography>
      <Stack spacing={1.6} sx={{ maxWidth: 860, "& p": { lineHeight: 1.8 } }}>{children}</Stack>
    </Box>
  );
}

export default function MethodologyPage() {
  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 } }}>
          <Typography variant="overline" color="primary.main">HRCT Methodology v1.0</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, maxWidth: 940, mt: 1.1 }}>Methodology and use of AI</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.8, maxWidth: 860, lineHeight: 1.75 }}>
            The Human Rights Commitment Tracker converts human-rights recommendations and commitments into structured, evidence-based and traceable public records. This page summarises how records are built, what the status labels are based on and where automation is used.
          </Typography>
        </Container>

        <Divider />

        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 6 } }}>
          <Stack spacing={5}>
            <Section overline="Scope" title="What a record is, and is not">
              <Typography>
                HRCT distinguishes legal obligations arising from binding instruments, formal commitments a State has explicitly accepted or announced, recommendations made by external bodies, and policy objectives set out in strategies or plans. A recommendation is not automatically a legal obligation, and each record shows whether Spain accepted or noted it.
              </Typography>
              <Typography>
                The current pilot covers recommendations 50.1 to 50.40 addressed to Spain in the fourth cycle of the Universal Periodic Review (UN document A/HRC/60/8), with Spain&apos;s response taken from A/HRC/60/8/Add.1. The authoritative United Nations text is always shown separately from Blue Human&apos;s assessment.
              </Typography>
            </Section>

            <Section overline="Assessment" title="Implementation status">
              <Typography>
                Each recommendation carries one of the following implementation statuses, together with a confidence level, a written rationale and the methodology version applied.
              </Typography>
              <Stack spacing={1} sx={{ py: .5 }}>
                {vocabulary.map((status) => <Box key={status}><StatusChip status={status} /></Box>)}
              </Stack>
              <Typography>
                No implementation finding is presented without evidence. A government statement is not treated as implementation, and the adoption of a plan is not treated as proof of an outcome: assessments distinguish outputs from outcomes wherever the evidence allows. Where the available evidence cannot support a responsible conclusion, the record says &ldquo;Insufficient evidence&rdquo; instead of forcing a finding. Evidence that contradicts progress is kept on the record, not removed.
              </Typography>
            </Section>

            <Section overline="Evidence" title="Source hierarchy">
              <Typography>
                Evidence is weighed according to the claim it is used for. A lower tier is not automatically weaker; relevance depends on what is being assessed.
              </Typography>
              <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
                {sourceTiers.map(([name, text]) => (
                  <Stack key={name} direction={{ xs: "column", sm: "row" }} spacing={{ xs: .5, sm: 2 }} sx={{ py: 1.8 }}>
                    <Typography variant="body2" color="primary.main" sx={{ minWidth: 250, fontWeight: 600 }}>{name}</Typography>
                    <Typography variant="body2">{text}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Section>

            <Section overline="Live monitoring" title="Automated discovery is kept apart from evidence">
              <Typography>
                HRCT continuously scans public sources for each recommendation, including news reporting, the Boletín Oficial del Estado and official institutional websites. What it finds is published in clearly separated channels: context showing that the underlying problem continues, and potential implementation or contrary developments awaiting review.
              </Typography>
              <Typography>
                Automated search is noisy. A news article can show that an incident occurred or that a measure was announced; it does not by itself prove effective implementation, national coverage or impact. For that reason automated items never change an assessment. They become evidence only after review, and each item is labelled as either auto-discovered or reviewed by Blue Human.
              </Typography>
            </Section>

            <Section overline="Artificial intelligence" title="How AI is used">
              <Typography>
                AI assists with source discovery, with sorting automatically discovered items into the monitoring channels above, and with drafting research. AI inference is never treated as a source: every finding must rest on a cited public document.
              </Typography>
              <Typography>
                During the current pilot some assessments were prepared with AI assistance from public sources. These say so in their rationale and remain subject to human validation before the tracker&apos;s external launch.
              </Typography>
            </Section>

            <Section overline="Integrity of the record" title="History and corrections">
              <Typography>
                Published assessments are not overwritten. When an assessment changes, the earlier assessment stays on the record, the new one becomes current, and the change is logged. Each recommendation page shows this history.
              </Typography>
            </Section>
          </Stack>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
