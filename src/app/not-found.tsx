import Link from "next/link";
import { Box, Button, Container, Typography } from "@mui/material";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
          <Typography variant="overline" color="text.secondary">Error 404</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, mt: 1.1 }}>Página no encontrada</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.8, maxWidth: 720, lineHeight: 1.75 }}>
            La página que buscas no existe o la ficha ya no está publicada.
          </Typography>
          <Button component={Link} href="/" sx={{ mt: 2.5, px: 0 }}>Volver a las recomendaciones</Button>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
