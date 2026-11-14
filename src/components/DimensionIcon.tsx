import { Box } from "@mui/material";
import type { DimensionCode } from "@/lib/hrct";

const iconFiles: Record<DimensionCode, string> = {
  economic: "sec_economica",
  food: "sec_alimentaria",
  health: "sec_sanitaria",
  environmental: "sec_ambiental",
  personal: "sec_personal",
  community: "sec_comunitaria",
  political: "sec_politica",
  technological: "sec_tecnológica",
};

// The pictograms are single-colour shapes: used as a mask, they take the colour of the text around them.
export function DimensionIcon({ code, size }: { code: DimensionCode; size: number }) {
  const mask = `url("/images/${encodeURIComponent(iconFiles[code])}.svg") center / contain no-repeat`;
  return <Box aria-hidden sx={{ width: size, height: size, flexShrink: 0, bgcolor: "currentColor", mask, WebkitMask: mask }} />;
}
