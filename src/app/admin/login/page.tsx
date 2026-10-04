import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Box, Button, Container, Stack, TextField, Typography } from "@mui/material";
import { SiteHeader } from "@/components/SiteHeader";
import { adminConfigured, isAdmin } from "@/lib/admin/session";
import { login } from "../actions";

export const metadata: Metadata = { title: "Administración | Human Rights Commitment Tracker", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="xs" sx={{ py: { xs: 6, md: 9 } }}>
          <Typography variant="overline" color="text.secondary">Administración</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: "1.9rem", mt: .5 }}>Iniciar sesión</Typography>
          {!adminConfigured() && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              El panel de administración no está configurado. Define ADMIN_USER, ADMIN_PASSWORD, ADMIN_SESSION_SECRET y SUPABASE_SERVICE_ROLE_KEY en el entorno.
            </Typography>
          )}
          <form action={login}>
            <Stack spacing={2} sx={{ mt: 3 }}>
              <TextField name="user" label="Usuario" autoComplete="username" required fullWidth />
              <TextField name="password" label="Contraseña" type="password" autoComplete="current-password" required fullWidth />
              {error && <Typography variant="body2" color="error">Usuario o contraseña incorrectos.</Typography>}
              <Button type="submit" variant="contained">Entrar</Button>
            </Stack>
          </form>
        </Container>
      </Box>
    </>
  );
}
