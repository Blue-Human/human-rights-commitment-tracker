import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { RelatedRecommendations } from "./RelatedRecommendations";
import { channelLabels, formatDate, monitoringChannel, reviewLabel, type Development } from "@/lib/hrct";

type Props = {
  items: Development[];
  // public_id → recommendation number, e.g. "ESP-UPR4-050.22" → "50.22"
  numbers: Record<string, string>;
  empty: string;
};

export function MonitoringList({ items, numbers, empty }: Props) {
  return (
    <Stack divider={<Divider flexItem />} sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
      {items.map((item) => (
        <Box key={`${item.id}`} sx={{ py: 2.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems="flex-start">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary">
                {channelLabels[monitoringChannel(item)]} · {reviewLabel(item)}
              </Typography>
              <Typography variant="h6" color="primary.main" sx={{ mt: .25 }}>{item.title}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .45 }}>
                {[item.publisher || item.source_domain, formatDate(item.published_at)].filter(Boolean).join(" · ")}
              </Typography>
            </Box>
            <Button component="a" href={item.url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} size="small" sx={{ px: 0, flexShrink: 0 }}>Abrir fuente</Button>
          </Stack>
          {item.summary && <Typography variant="body2" sx={{ mt: 1.2, lineHeight: 1.7, maxWidth: 860 }}>{item.summary}</Typography>}
          {!item.summary && item.excerpt && (
            <Typography variant="body2" sx={{ mt: 1.2, lineHeight: 1.7, maxWidth: 860 }}>
              <Box component="span" sx={{ fontWeight: 600 }}>De la fuente:</Box> «{item.excerpt}»
            </Typography>
          )}
          {item.note && item.status !== "reviewed" && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.2, lineHeight: 1.7, maxWidth: 860 }}>
              <Box component="span" sx={{ fontWeight: 600 }}>Por qué aparece aquí:</Box> {item.note}
            </Typography>
          )}
          {item.public_ids.length > 0 && <RelatedRecommendations related={item.public_ids.map((id) => ({ id, number: numbers[id] || id }))} />}
        </Box>
      ))}
      {!items.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.75 }}>{empty}</Typography>}
    </Stack>
  );
}
