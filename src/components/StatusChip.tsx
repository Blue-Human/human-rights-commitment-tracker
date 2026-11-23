"use client";

import { Box, Typography } from "@mui/material";
import { labelOf, statusLabels } from "@/lib/hrct";

type Props = { status?: string | null };

const tones: Record<string, string> = {
  not_assessed: "#6c7882",
  implemented: "#176b46",
  substantially_implemented: "#056f96",
  in_progress: "#355985",
  limited_progress: "#7a5600",
  not_implemented: "#963b34",
  unable_to_assess: "#6c7882",
  regressed: "#8d2a47",
};

export function StatusChip({ status }: Props) {
  const key = status || "not_assessed";
  const color = tones[key] || tones.not_assessed;
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: .75 }}>
      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
        {labelOf(statusLabels, key)}
      </Typography>
    </Box>
  );
}
