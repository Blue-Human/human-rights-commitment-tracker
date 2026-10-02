"use client";

import { Box, Typography } from "@mui/material";

type Props = { status?: string | null };

const labels: Record<string, string> = {
  not_assessed: "Assessment pending",
  implemented: "Implemented",
  substantially_implemented: "Substantial progress",
  in_progress: "In progress",
  limited_progress: "Limited progress",
  not_implemented: "No implementation",
  unable_to_assess: "Insufficient evidence",
  regressed: "Regressed",
};

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
        {labels[key] || key.replaceAll("_", " ")}
      </Typography>
    </Box>
  );
}
