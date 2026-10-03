"use client";

import Link from "next/link";
import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from "@mui/material";

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
        <Toolbar
          disableGutters
          sx={{
            minHeight: 72,
            justifyContent: "space-between",
            gap: { xs: .5, md: 3 },
            flexWrap: { xs: "wrap", md: "nowrap" },
            py: { xs: 1, md: 0 },
            overflow: "visible",
          }}
        >
          <Stack
            component={Link}
            href="/"
            spacing={0.35}
            sx={{
              color: "inherit",
              textDecoration: "none",
              minWidth: 0,
              flexShrink: 0,
              overflow: "visible",
            }}
          >
            <Box
              component="img"
              src="/images/HRCT.png"
              alt="HRCT"
              sx={{
                display: "block",
                height: { xs: 24, sm: 28 },
                width: "auto",
                maxWidth: { xs: 145, sm: 175 },
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontFamily: '"IBM Plex Sans", Arial, sans-serif',
                fontSize: { xs: ".62rem", sm: ".69rem" },
                fontWeight: 500,
                lineHeight: 1.15,
                letterSpacing: ".015em",
                color: "rgba(255,255,255,.82)",
                whiteSpace: "nowrap",
              }}
            >
              Human Rights Commitment Tracker
            </Typography>
          </Stack>

          <Stack direction="row" spacing={{ xs: 0, sm: 1 }} alignItems="center" flexWrap="wrap" useFlexGap>
            {[
              ["Recommendations", "/"],
              ["Live monitoring", "/monitoring"],
              ["Methodology", "/methodology"],
            ].map(([label, href]) => (
              <Button
                key={href}
                component={Link}
                href={href}
                sx={{
                  color: "#ffffff",
                  "&:hover": { bgcolor: "rgba(255,255,255,.06)" },
                }}
              >
                {label}
              </Button>
            ))}
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
