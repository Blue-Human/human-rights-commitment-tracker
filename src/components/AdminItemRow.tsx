import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { moderateItem } from "@/app/admin/actions";
import type { AdminMonitoringItem } from "@/lib/admin/db";
import { formatDate } from "@/lib/hrct";

const relations: [string, string][] = [
  ["supports_need", "Context · continuing need"],
  ["context", "Context · official statement"],
  ["supports_progress", "Potential implementation development"],
  ["contradicts_progress", "Potential contrary development"],
];

// One monitoring item with its moderation form: publish with your own note, hide or reject.
export function AdminItemRow({ item, publicId, recommendation }: { item: AdminMonitoringItem; publicId: string; recommendation?: string | null }) {
  const state = item.status === "reviewed" ? "Reviewed" : item.is_public ? "Public · pending final confirmation" : "Not public";
  return (
    <Box sx={{ py: 2.2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems="flex-start">
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="text.secondary">
            {recommendation ? `Recommendation ${recommendation} · ` : ""}{state}
          </Typography>
          <Typography variant="h6" color="primary.main" sx={{ fontSize: "1.05rem" }}>{item.title}</Typography>
          <Typography variant="caption" color="text.secondary">{[item.publisher, formatDate(item.published_at)].filter(Boolean).join(" · ")}</Typography>
        </Box>
        <Button component="a" href={item.url} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} size="small" sx={{ px: 0, flexShrink: 0 }}>Open source</Button>
      </Stack>
      {item.classification_note && <Typography variant="body2" color="text.secondary" sx={{ mt: .8, lineHeight: 1.6, maxWidth: 860 }}>Suggested note: {item.classification_note}</Typography>}
      <form action={moderateItem}>
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="public_id" value={publicId} />
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ md: "flex-start" }} sx={{ mt: 1.4 }}>
          <TextField name="summary" label="Your note (shown on the site)" defaultValue={item.summary || ""} multiline minRows={1} sx={{ flex: 1 }} />
          <TextField name="relation" label="Listed under" select SelectProps={{ native: true }} defaultValue={item.relation} sx={{ minWidth: 250 }}>
            {relations.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </TextField>
          <Button type="submit" name="op" value="approve" variant="contained" size="small">{item.status === "reviewed" ? "Save" : "Approve"}</Button>
          {item.is_public && <Button type="submit" name="op" value="hide" variant="outlined" size="small">Hide</Button>}
          <Button type="submit" name="op" value="reject" variant="outlined" size="small">Reject</Button>
        </Stack>
      </form>
    </Box>
  );
}
