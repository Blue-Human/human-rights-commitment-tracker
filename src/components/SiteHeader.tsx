"use client";

import Link from "next/link";
import { AppBar, Button, Container, Stack, Toolbar, Typography } from "@mui/material";

export function SiteHeader() {
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: "rgba(255,255,255,.99)", borderBottom: "1px solid", borderBottomColor: "divider" }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: 64, justifyContent: "space-between", gap: 3 }}>
          <Stack component={Link} href="/" spacing={0} sx={{ color: "inherit", textDecoration: "none", minWidth: 0 }}>
            <Typography sx={{ fontSize: ".8rem", fontWeight: 700, letterSpacing: ".14em", color: "primary.main", lineHeight: 1.1 }}>BLUE HUMAN</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: .35 }}>Human Rights Commitment Tracker</Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button component={Link} href="/" color="primary">Recommendations</Button>
            <Button component="a" href="https://bluehuman.org" target="_blank" color="primary">About</Button>
          </Stack>
        </Toolbar>
      </Container>
      <Typography component="div" sx={{ height: 3, bgcolor: "secondary.main", width: "100%" }} />
    </AppBar>
  );
}
