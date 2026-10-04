import Link from "next/link";
import { Box, Container, Stack, Typography } from "@mui/material";

export function SiteFooter() {
  return (
    <Box component="footer" sx={{ borderTop: "1px solid", borderColor: "divider", bgcolor: "#fff" }}>
      <Container maxWidth="lg" sx={{ py: 3.5 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Typography variant="body2" color="text.secondary">Blue Human · Human Rights Commitment Tracker</Typography>
          <Stack direction="row" spacing={3}>
            <Typography component={Link} href="/methodology" variant="body2" color="text.secondary">Metodología</Typography>
            <Typography variant="body2" color="text.secondary">Seguimiento independiente desde la sociedad civil</Typography>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
