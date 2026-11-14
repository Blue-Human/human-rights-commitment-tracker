import { Typography } from "@mui/material";

// Marks a recommendation that Blue Human follows as a priority.
export function PriorityTag() {
  return (
    <Typography
      variant="caption"
      sx={{ display: "inline-block", px: .8, py: .2, bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 600, letterSpacing: ".04em", lineHeight: 1.6, whiteSpace: "nowrap" }}
    >
      Prioritaria
    </Typography>
  );
}
