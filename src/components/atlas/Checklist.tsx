"use client";

import { useState } from "react";
import { Box, Checkbox, FormControlLabel, Typography } from "@mui/material";

// A list the reader ticks for themselves while reading the requirements. Nothing is sent or kept:
// the ticks disappear when the page is left.
export function Checklist({ items }: { items: { id: string; label: string; detail?: string }[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  return (
    <Box>
      {items.map((item) => (
        <Box key={item.id} sx={{ py: .5 }}>
          <FormControlLabel control={<Checkbox size="small" checked={!!done[item.id]} onChange={(e) => setDone({ ...done, [item.id]: e.target.checked })} />} label={<Typography variant="body2">{item.label}</Typography>} />
          {item.detail && <Typography variant="caption" color="text.secondary" sx={{ display: "block", ml: 4, mt: -.5, whiteSpace: "pre-line", lineHeight: 1.55 }}>{item.detail}</Typography>}
        </Box>
      ))}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Las marcas son solo una ayuda de lectura: no se guardan ni se envían, y no indican que se cumpla un requisito.</Typography>
    </Box>
  );
}
