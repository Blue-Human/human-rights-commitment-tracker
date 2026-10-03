import type { Metadata } from "next";
import { Box, Container, Divider, Stack, Typography } from "@mui/material";
import { MonitoringList } from "@/components/MonitoringList";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatDate, getCommitments, getMonitoringStatus, getRecentMonitoringItems, groupByUrl, monitoringChannel, type MonitoringChannel } from "@/lib/hrct";

export const metadata: Metadata = {
  title: "Live monitoring | Human Rights Commitment Tracker",
  description: "Recent public reporting, official publications and legal changes matched to Spain's UPR recommendations.",
};

const sections: { channel: MonitoringChannel; overline: string; title: string; intro: string; empty: string }[] = [
  {
    channel: "need",
    overline: "Live context monitoring",
    title: "Why these recommendations remain relevant",
    intro: "Reporting, official statistics and public statements indicating that the problem addressed by a recommendation persists. These items are context. They are not proof of implementation or non-implementation.",
    empty: "No public context items have been recorded yet.",
  },
  {
    channel: "implementation",
    overline: "Automated research queue",
    title: "Potential implementation developments",
    intro: "Laws, official gazette publications, plans and official actions matched to a recommendation. They remain candidates until a researcher reviews them and promotes them into the evidence record.",
    empty: "No potential implementation developments are currently public.",
  },
  {
    channel: "contradiction",
    overline: "Automated research queue",
    title: "Potential contrary developments",
    intro: "Developments that may run against a recommendation. Like all automated items, they do not change an assessment until reviewed.",
    empty: "No potential contrary developments are currently public.",
  },
];

export default async function MonitoringPage() {
  const [commitments, items, status] = await Promise.all([getCommitments(), getRecentMonitoringItems(), getMonitoringStatus()]);
  const numbers = Object.fromEntries(commitments.map((c) => [c.public_id, c.recommendation_number || c.public_id]));
  const developments = groupByUrl(items);
  const lastScan = formatDate(status?.last_successful_run_at);

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 } }}>
          <Typography variant="overline" color="primary.main">Spain · UPR fourth cycle · Live monitoring</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, maxWidth: 940, mt: 1.1 }}>Live monitoring</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.8, maxWidth: 860, lineHeight: 1.75 }}>
            HRCT scans public sources for material related to each recommendation: national media, institutional and civil-society feeds, news search and the Boletín Oficial del Estado. Automated discovery keeps the record current; it never changes a Blue Human assessment on its own.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 2, sm: 5 }} sx={{ mt: 3, pt: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
            <Box><Typography variant="overline" color="text.secondary">Recommendations monitored</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{status?.recommendations_monitored ?? commitments.length}</Typography></Box>
            <Box><Typography variant="overline" color="text.secondary">Public monitoring items</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{developments.length}</Typography></Box>
            {!!status?.feeds_monitored && <Box><Typography variant="overline" color="text.secondary">Sources scanned</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{status.feeds_monitored} news, institutional and civil-society feeds, Google News and the BOE</Typography></Box>}
            {lastScan && <Box><Typography variant="overline" color="text.secondary">Last source scan</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{lastScan}</Typography></Box>}
          </Stack>
        </Container>

        <Divider />

        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 6 } }}>
          <Stack spacing={6}>
            {sections.filter((section) => section.channel !== "contradiction" || developments.some((d) => monitoringChannel(d) === "contradiction")).map((section) => (
              <Box component="section" key={section.channel}>
                <Typography variant="overline" color="text.secondary">{section.overline}</Typography>
                <Typography variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.2 }}>{section.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 840, lineHeight: 1.75, mb: 2.2 }}>{section.intro}</Typography>
                <MonitoringList items={developments.filter((d) => monitoringChannel(d) === section.channel)} numbers={numbers} empty={section.empty} />
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
