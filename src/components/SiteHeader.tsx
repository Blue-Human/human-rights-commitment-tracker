"use client";

import Image from "next/image";
import Link from "next/link";
import { AppBar, Button, Container, Stack, Toolbar } from "@mui/material";

export function SiteHeader() {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "#0a1e33",
        color: "#ffffff",
        borderBottom: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: 68, justifyContent: "space-between", gap: 3 }}>
          <Stack
            component={Link}
            href="/"
            direction="row"
            alignItems="center"
            sx={{ color: "inherit", textDecoration: "none", minWidth: 0 }}
          >
            <Image
              src="/images/HRCT.png"
              alt="HRCT — Human Rights Commitment Tracker"
              width={439}
              height={203}
              priority
              style={{ width: "auto", height: 42, objectFit: "contain" }}
            />
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              component={Link}
              href="/"
              sx={{
                color: "#ffffff",
                "&:hover": { bgcolor: "rgba(255,255,255,.06)" },
              }}
            >
              Recommendations
            </Button>
            <Button
              component="a"
              href="https://bluehuman.org"
              target="_blank"
              rel="noreferrer"
              sx={{
                color: "#ffffff",
                "&:hover": { bgcolor: "rgba(255,255,255,.06)" },
              }}
            >
              About
            </Button>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
