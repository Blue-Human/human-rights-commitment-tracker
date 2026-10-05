"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { AppBar, Box, Button, Container, Drawer, IconButton, Stack, Toolbar, Typography } from "@mui/material";

const sections = [
  ["Recomendaciones", "/"],
  ["Datos", "/indicators"],
  ["ODS", "/ods"],
  ["Actualidad", "/monitoring"],
  ["Metodología", "/methodology"],
];
const ABOUT_URL = "https://bluehuman.org";
const MENU_ID = "site-menu";

const hairline = "rgba(255,255,255,.16)";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // "page" on the section's own page, "location" on a page inside it.
  const current = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/commitments/") : pathname.startsWith(href)) ? (pathname === href ? "page" : "location") : undefined;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "#0a1e33",
        color: "#ffffff",
        borderBottom: "2px solid",
        borderColor: "secondary.main",
        pt: "env(safe-area-inset-top)",
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            minHeight: { xs: 56, md: 64 },
            justifyContent: "space-between",
            gap: { xs: 1, md: 3 },
            overflow: "visible",
          }}
        >
          <Stack
            component={Link}
            href="/"
            spacing={0.35}
            alignItems="flex-start"
            justifyContent="center"
            sx={{
              minHeight: 44,
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
                fontSize: { xs: ".66rem", sm: ".69rem" },
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

          <Stack component="nav" aria-label="Principal" direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>
            {sections.map(([label, href]) => (
              <Button
                key={href}
                component={Link}
                href={href}
                aria-current={current(href)}
                sx={{
                  color: "#ffffff",
                  borderBottom: '2px solid transparent',
                  '&[aria-current]': { borderBottomColor: 'secondary.main' },
                  '&.Mui-focusVisible': { outlineColor: 'secondary.main' },
                  "&:hover": { bgcolor: "rgba(0,163,224,.12)" },
                }}
              >
                {label}
              </Button>
            ))}
            <Button
              component="a"
              href={ABOUT_URL}
              target="_blank"
              rel="noreferrer"
              sx={{
                color: "#ffffff",
                '&.Mui-focusVisible': { outlineColor: 'secondary.main' },
                "&:hover": { bgcolor: "rgba(0,163,224,.12)" },
              }}
            >
              Quiénes somos
            </Button>
          </Stack>

          {/* Below the desktop width the sections live in a side menu, so the bar stays one row high. */}
          <IconButton
            aria-label="Abrir el menú"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? MENU_ID : undefined}
            onClick={() => setOpen(true)}
            edge="end"
            sx={{ display: { md: "none" }, width: 48, height: 48, color: "#ffffff", borderRadius: 0, "&:hover": { bgcolor: "rgba(0,163,224,.12)" }, "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "secondary.main" } }}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Toolbar>
      </Container>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        sx={{ display: { md: "none" } }}
        slotProps={{ paper: { id: MENU_ID, role: "dialog", "aria-modal": true, "aria-label": "Menú", sx: { width: "min(86vw, 320px)", bgcolor: "#0a1e33", color: "#ffffff", pt: "env(safe-area-inset-top)", pb: "env(safe-area-inset-bottom)", pr: "env(safe-area-inset-right)" } } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 56, pl: 2.5, pr: 1, borderBottom: "2px solid", borderColor: "secondary.main" }}>
          <Typography variant="overline" sx={{ color: "rgba(255,255,255,.72)" }}>Menú</Typography>
          <IconButton aria-label="Cerrar el menú" onClick={() => setOpen(false)} sx={{ width: 48, height: 48, color: "#ffffff", borderRadius: 0, "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: -2 } }}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>
        <Box component="nav" aria-label="Principal" sx={{ "& a": { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, minHeight: 56, px: 2.5, color: "#ffffff", fontSize: "1.05rem", fontWeight: 500, textDecoration: "none", borderBottom: `1px solid ${hairline}`, "&:hover": { bgcolor: "rgba(0,163,224,.12)" }, "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: -2 }, "&[aria-current]": { bgcolor: "rgba(0,163,224,.12)", boxShadow: "inset 3px 0 0 #00a3e0" } } }}>
          {sections.map(([label, href]) => (
            <Link key={href} href={href} aria-current={current(href)} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <a href={ABOUT_URL} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            Quiénes somos
            <OpenInNewRoundedIcon fontSize="small" sx={{ color: "rgba(255,255,255,.72)" }} />
          </a>
        </Box>
      </Drawer>
    </AppBar>
  );
}
