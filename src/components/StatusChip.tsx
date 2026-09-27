"use client";

import { Chip } from "@mui/material";

type Props = { status?: string | null };

const labels: Record<string, string> = {
  implemented: "Implemented",
  substantially_implemented: "Substantial progress",
  in_progress: "In progress",
  limited_progress: "Limited progress",
  not_implemented: "No implementation",
  unable_to_assess: "Insufficient evidence",
  regressed: "Regressed",
};

const tones: Record<string, { bg: string; fg: string; border: string }> = {
  implemented: { bg: "#e7f7ef", fg: "#176b46", border: "#b7e5cf" },
  substantially_implemented: { bg: "#e7f6fb", fg: "#056f96", border: "#b8e2ef" },
  in_progress: { bg: "#eef3ff", fg: "#3559a8", border: "#cfdbfb" },
  limited_progress: { bg: "#fff6df", fg: "#8a5b00", border: "#f0d79a" },
  not_implemented: { bg: "#fff0ef", fg: "#a33a32", border: "#f2c6c2" },
  unable_to_assess: { bg: "#f1f4f6", fg: "#52697a", border: "#d9e1e7" },
  regressed: { bg: "#fcecf1", fg: "#9b2447", border: "#efc0cf" },
};

export function StatusChip({ status }: Props) {
  const key = status || "unable_to_assess";
  const tone = tones[key] || tones.unable_to_assess;
  return (
    <Chip
      label={labels[key] || key.replaceAll("_", " ")}
      size="small"
      sx={{ bgcolor: tone.bg, color: tone.fg, border: `1px solid ${tone.border}` }}
    />
  );
}
