"use client";

import Link from "next/link";
import { AppBar, Box, Button, Container, Divider, Stack, Toolbar, Typography } from "@mui/material";

export function SiteHeader() {
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: "rgba(255,255,255,.98)", borderTop: "4px solid", borderTopColor: "secondary.main", borderBottom: "1px solid", borderBottomColor: "divider" }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: 76, justifyContent: "space-between", gap: 3 }}>
          <Stack component={Link} href="/" direction="row" spacing={2} alignItems="center" sx={{ color: "inherit", textDecoration: "none", minWidth: 0 }}>
            <Box sx={{ pr: 2, borderRight: "1px solid", borderColor: "divider" }}>
              <Typography sx={{ fontSize: ".76rem", fontWeight: 700, letterSpacing: ".16em", color: "primary.main", whiteSpace: "nowrap" }}>BLUE HUMAN</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: ".04em" }}>Human rights & human security</Typography>
            </Box>
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Typography fontWeight={600} color="primary.main" lineHeight={1.15}>Human Rights Commitment Tracker</Typography>
              <Typography variant="caption" color="text.secondary">Independent public monitoring</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={.5} alignItems="center">
            <Button component={Link} href="/" color="primary">Data</Button>
            <Divider orientation="vertical" flexItem sx={{ mx: .5 }} />
            <Button component="a" href="https://bluehuman.org" target="_blank" color="primary">Blue Human</Button>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
