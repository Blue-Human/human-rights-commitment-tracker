"use client";

import Link from "next/link";
import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";

export function SiteHeader() {
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "rgba(255,255,255,.96)", backdropFilter: "blur(10px)" }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: 72, justifyContent: "space-between" }}>
          <Stack component={Link} href="/" direction="row" spacing={1.4} alignItems="center" sx={{ color: "inherit", textDecoration: "none" }}>
            <Box sx={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 2.5, bgcolor: "primary.main", color: "white" }}>
              <PublicIcon fontSize="small" />
            </Box>
            <Box>
              <Typography fontWeight={700} lineHeight={1.05}>Blue Human</Typography>
              <Typography variant="caption" color="text.secondary">Human Rights Commitment Tracker</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button component={Link} href="/" color="primary">Explore</Button>
            <Button component="a" href="https://bluehuman.org" target="_blank" variant="outlined">About Blue Human</Button>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
