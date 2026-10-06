"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { AppBar, Box, Button, Container, Drawer, IconButton, Menu, MenuItem, Stack, Toolbar, Typography } from "@mui/material";

const sections = [
  ["Recomendaciones", "/commitments"],
  ["Datos", "/indicators"],
  ["ODS", "/ods"],
  ["Actualidad", "/monitoring"],
];
// What the institute is and how it works, behind one item of the bar. The first entry leaves the site.
const ABOUT = "Sobre el HRCI";
const about: { label: string; href: string; external?: boolean }[] = [
  { label: "Sobre nosotros", href: "https://bluehuman.org", external: true },
  { label: "Metodología", href: "/methodology" },
  { label: "Contacto", href: "/contact" },
  { label: "Open HRCI", href: "/open" },
];
const MENU_ID = "site-menu";
const ABOUT_BUTTON_ID = "site-about-button";
const ABOUT_MENU_ID = "site-about-menu";

const navy = "#0a1e33";
const hairline = "rgba(255,255,255,.16)";
const wash = "rgba(0,163,224,.12)";
const barButton = {
  color: "#ffffff",
  borderBottom: "2px solid transparent",
  "&[aria-current]": { borderBottomColor: "secondary.main" },
  "&.Mui-focusVisible": { outlineColor: "secondary.main" },
  "&:hover": { bgcolor: wash },
};

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [aboutAnchor, setAboutAnchor] = useState<HTMLElement | null>(null);
  // "page" on the section's own page, "location" on a page inside it.
  const current = (href: string) => (pathname.startsWith(href) ? (pathname === href ? "page" : "location") : undefined);
  const inAbout = about.some((item) => !item.external && pathname.startsWith(item.href));

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: navy,
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
              src="/images/HRCI_logo.png"
              alt="HRCI"
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
              Human Rights Commitment Institute
            </Typography>
          </Stack>

          <Stack component="nav" aria-label="Principal" direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>
            {sections.map(([label, href]) => (
              <Button key={href} component={Link} href={href} aria-current={current(href)} sx={barButton}>
                {label}
              </Button>
            ))}
            <Button
              id={ABOUT_BUTTON_ID}
              aria-haspopup="menu"
              aria-expanded={aboutAnchor ? true : undefined}
              aria-controls={aboutAnchor ? ABOUT_MENU_ID : undefined}
              aria-current={inAbout ? "location" : undefined}
              onClick={(event) => setAboutAnchor(event.currentTarget)}
              endIcon={<ExpandMoreRoundedIcon sx={{ transition: "transform .15s", transform: aboutAnchor ? "rotate(180deg)" : "none" }} />}
              sx={{ ...barButton, "& .MuiButton-endIcon": { ml: .25 } }}
            >
              {ABOUT}
            </Button>
            {/* The menu hangs from the bar and keeps its colours. */}
            <Menu
              id={ABOUT_MENU_ID}
              anchorEl={aboutAnchor}
              open={!!aboutAnchor}
              onClose={() => setAboutAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              sx={{ display: { xs: "none", md: "block" } }}
              slotProps={{
                list: { "aria-labelledby": ABOUT_BUTTON_ID, sx: { py: 0 } },
                paper: { sx: { mt: "14px", minWidth: 230, bgcolor: navy, color: "#ffffff", borderTop: "2px solid", borderColor: "secondary.main", boxShadow: "0 12px 28px rgba(10,30,51,.28)" } },
              }}
            >
              {about.map((item) => (
                <MenuItem
                  key={item.href}
                  component={item.external ? "a" : Link}
                  href={item.href}
                  {...(item.external ? { target: "_blank", rel: "noreferrer" } : { "aria-current": current(item.href) })}
                  onClick={() => setAboutAnchor(null)}
                  sx={{
                    justifyContent: "space-between", gap: 2, minHeight: 46, px: 2, fontWeight: 500, fontSize: ".9rem",
                    borderBottom: `1px solid ${hairline}`, "&:last-of-type": { borderBottom: 0 },
                    "&:hover, &.Mui-focusVisible": { bgcolor: wash },
                    "&[aria-current]": { boxShadow: "inset 3px 0 0 #00a3e0" },
                  }}
                >
                  {item.label}
                  {item.external && <OpenInNewRoundedIcon sx={{ fontSize: 16, color: "rgba(255,255,255,.72)" }} />}
                </MenuItem>
              ))}
            </Menu>
          </Stack>

          {/* Below the desktop width the sections live in a side menu, so the bar stays one row high. */}
          <IconButton
            aria-label="Abrir el menú"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? MENU_ID : undefined}
            onClick={() => setOpen(true)}
            edge="end"
            sx={{ display: { md: "none" }, width: 48, height: 48, color: "#ffffff", borderRadius: 0, "&:hover": { bgcolor: wash }, "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "secondary.main" } }}
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
        slotProps={{ paper: { id: MENU_ID, role: "dialog", "aria-modal": true, "aria-label": "Menú", sx: { width: "min(86vw, 320px)", bgcolor: navy, color: "#ffffff", pt: "env(safe-area-inset-top)", pb: "env(safe-area-inset-bottom)", pr: "env(safe-area-inset-right)" } } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 56, pl: 2.5, pr: 1, borderBottom: "2px solid", borderColor: "secondary.main" }}>
          <Typography variant="overline" sx={{ color: "rgba(255,255,255,.72)" }}>Menú</Typography>
          <IconButton aria-label="Cerrar el menú" onClick={() => setOpen(false)} sx={{ width: 48, height: 48, color: "#ffffff", borderRadius: 0, "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: -2 } }}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>
        <Box component="nav" aria-label="Principal" sx={{ "& a": { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, minHeight: 56, px: 2.5, color: "#ffffff", fontSize: "1.05rem", fontWeight: 500, textDecoration: "none", borderBottom: `1px solid ${hairline}`, "&:hover": { bgcolor: wash }, "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.main", outlineOffset: -2 }, "&[aria-current]": { bgcolor: wash, boxShadow: "inset 3px 0 0 #00a3e0" } } }}>
          {sections.map(([label, href]) => (
            <Link key={href} href={href} aria-current={current(href)} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          {/* In the side menu the group is always open: its entries follow its name, set in. */}
          <Typography id="site-about-group" variant="overline" sx={{ display: "block", px: 2.5, pt: 2.5, pb: 1, color: "rgba(255,255,255,.72)", borderBottom: `1px solid ${hairline}` }}>{ABOUT}</Typography>
          <Box role="group" aria-labelledby="site-about-group" sx={{ "& a": { pl: 4, minHeight: 52, fontSize: "1rem" } }}>
            {about.map((item) => item.external ? (
              <a key={item.href} href={item.href} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
                {item.label}
                <OpenInNewRoundedIcon fontSize="small" sx={{ color: "rgba(255,255,255,.72)" }} />
              </a>
            ) : (
              <Link key={item.href} href={item.href} aria-current={current(item.href)} onClick={() => setOpen(false)}>{item.label}</Link>
            ))}
          </Box>
        </Box>
      </Drawer>
    </AppBar>
  );
}
