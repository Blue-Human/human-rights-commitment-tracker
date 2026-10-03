import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Box, Button, Container, Stack, TextField, Typography } from "@mui/material";
import { SiteHeader } from "@/components/SiteHeader";
import { adminConfigured, isAdmin } from "@/lib/admin/session";
import { login } from "../actions";

export const metadata: Metadata = { title: "Administration | Human Rights Commitment Tracker", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="xs" sx={{ py: { xs: 6, md: 9 } }}>
          <Typography variant="overline" color="text.secondary">Administration</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: "1.9rem", mt: .5 }}>Sign in</Typography>
          {!adminConfigured() && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              The admin panel is not configured. Set ADMIN_USER, ADMIN_PASSWORD, ADMIN_SESSION_SECRET and SUPABASE_SERVICE_ROLE_KEY in the environment.
            </Typography>
          )}
          <form action={login}>
            <Stack spacing={2} sx={{ mt: 3 }}>
              <TextField name="user" label="User" autoComplete="username" required fullWidth />
              <TextField name="password" label="Password" type="password" autoComplete="current-password" required fullWidth />
              {error && <Typography variant="body2" color="error">User or password not recognised.</Typography>}
              <Button type="submit" variant="contained">Sign in</Button>
            </Stack>
          </form>
        </Container>
      </Box>
    </>
  );
}
