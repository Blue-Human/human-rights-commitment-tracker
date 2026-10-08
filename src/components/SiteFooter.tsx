import Link from "next/link";
import { Box, Container, Stack, Typography } from "@mui/material";

export function SiteFooter() {
  return (
    <Box component="footer" sx={{ borderTop: "1px solid", borderColor: "divider", bgcolor: "#fff", '& a': { textDecorationColor: 'secondary.main', textUnderlineOffset: '4px' }, '& a:hover': { color: 'secondary.dark' } }}>
      <Container maxWidth="lg" sx={{ pt: 3.5, pb: "calc(28px + env(safe-area-inset-bottom))" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Typography variant="body2" color="text.secondary">Blue Human · Human Rights Commitment Institute</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 3 }}>
            <Typography component={Link} href="/methodology" variant="body2" color="text.secondary" sx={{ alignSelf: { xs: "flex-start", sm: "center" }, py: { xs: 1.5, md: 0 } }}>Metodología</Typography>
            <Typography component={Link} href="/contact" variant="body2" color="text.secondary" sx={{ alignSelf: { xs: "flex-start", sm: "center" }, py: { xs: 1.5, md: 0 } }}>Contacto</Typography>
            <Typography component={Link} href="/open" variant="body2" color="text.secondary" sx={{ alignSelf: { xs: "flex-start", sm: "center" }, py: { xs: 1.5, md: 0 } }}>Open HRCI</Typography>
            <Typography variant="body2" color="text.secondary">Seguimiento independiente desde la sociedad civil</Typography>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
