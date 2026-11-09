import { Box, Typography } from "@mui/material";

export type Fact = { label: string; value: React.ReactNode; note?: React.ReactNode };

// Key facts of a record as a description list: label, value and, under it, where it comes from.
export function Facts({ facts, columns = 2 }: { facts: Fact[]; columns?: 1 | 2 | 3 }) {
  return (
    <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: columns > 1 ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)", md: `repeat(${columns},minmax(0,1fr))` }, columnGap: 4, borderTop: "1px solid", borderColor: "divider" }}>
      {facts.map((f) => (
        <Box key={f.label} sx={{ py: 1.5, borderBottom: "1px solid", borderColor: "divider", minWidth: 0 }}>
          <Typography component="dt" variant="overline" color="text.secondary" sx={{ display: "block", lineHeight: 1.6 }}>{f.label}</Typography>
          <Typography component="dd" sx={{ m: 0, mt: .25, color: "primary.main", fontWeight: 500, lineHeight: 1.45, overflowWrap: "anywhere" }}>{f.value}</Typography>
          {f.note && <Box sx={{ mt: .5 }}>{f.note}</Box>}
        </Box>
      ))}
    </Box>
  );
}
