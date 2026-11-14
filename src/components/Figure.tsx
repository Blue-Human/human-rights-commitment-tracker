import { Box, Typography } from "@mui/material";

// A headline figure of a page: the value, what it is out of, and what it counts.
export function Figure({ value, of, children }: { value: string; of?: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography color="primary.main" sx={{ fontSize: { xs: "2rem", md: "2.6rem" }, fontWeight: 500, lineHeight: 1, letterSpacing: "-.02em" }}>
        {value}
        {of && <Box component="span" sx={{ ml: .75, fontSize: "1rem", fontWeight: 400, letterSpacing: 0, color: "text.secondary" }}>{of}</Box>}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.5 }}>{children}</Typography>
    </Box>
  );
}
