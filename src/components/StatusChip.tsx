"use client";

import { Chip } from "@mui/material";

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

const tones: Record<string, { bg: string; fg: string; border: string }> = {
  not_assessed: { bg: "#f5f7f8", fg: "#536574", border: "#ccd5dc" },
  implemented: { bg: "#edf7f2", fg: "#176b46", border: "#b9dccb" },
  substantially_implemented: { bg: "#eef7fb", fg: "#056f96", border: "#beddea" },
  in_progress: { bg: "#f1f4f9", fg: "#355985", border: "#ccd7e4" },
  limited_progress: { bg: "#fff8e8", fg: "#7a5600", border: "#e8d6a5" },
  not_implemented: { bg: "#fff1ef", fg: "#963b34", border: "#e8c8c4" },
  unable_to_assess: { bg: "#f5f7f8", fg: "#536574", border: "#ccd5dc" },
  regressed: { bg: "#f9eef2", fg: "#8d2a47", border: "#e2c4ce" },
};

export function StatusChip({ status }: Props) {
  const key = status || "not_assessed";
  const tone = tones[key] || tones.not_assessed;
  return <Chip label={labels[key] || key.replaceAll("_", " ")} size="small" variant="outlined" sx={{ bgcolor: tone.bg, color: tone.fg, borderColor: tone.border }} />;
}
