import Link from "next/link";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { logout } from "@/app/admin/actions";
import { SiteHeader } from "@/components/SiteHeader";

// Shared shell of the admin pages: site header, admin navigation and page title.
export function AdminFrame({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <Box sx={{ bgcolor: "#f7f8f9", borderBottom: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ py: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ mr: 1.5 }}>Administración</Typography>
            <Button component={Link} href="/admin" size="small">Resumen</Button>
            <Button component={Link} href="/admin/monitoring" size="small">Novedades de seguimiento</Button>
            <Button component={Link} href="/admin/feeds" size="small">Fuentes</Button>
            <Button component={Link} href="/admin/indicators" size="small">Indicadores</Button>
            <Box sx={{ flex: 1 }} />
            <form action={logout}><Button type="submit" size="small">Cerrar sesión</Button></form>
          </Stack>
        </Container>
      </Box>
      <Box component="main">
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "1.8rem", md: "2.2rem" } }}>{title}</Typography>
          {intro && <Typography color="text.secondary" sx={{ mt: 1.2, maxWidth: 860, lineHeight: 1.7 }}>{intro}</Typography>}
          <Box sx={{ mt: 4 }}>{children}</Box>
        </Container>
      </Box>
    </>
  );
}

export function AdminSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <Box component="section" sx={{ pt: 3.5, mt: 4, borderTop: "1px solid", borderColor: "divider", "&:first-of-type": { mt: 0 } }}>
      <Typography variant="h4" color="primary.main" sx={{ fontSize: "1.35rem" }}>{title}</Typography>
      {note && <Typography variant="body2" color="text.secondary" sx={{ mt: .6, maxWidth: 820, lineHeight: 1.7 }}>{note}</Typography>}
      <Box sx={{ mt: 2 }}>{children}</Box>
    </Box>
  );
}
