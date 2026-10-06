"use client";

import { createTheme } from "@mui/material/styles";
import { brand } from "./brand";

export { brand };

// Phones: below the `sm` breakpoint. Touch: fingers need larger targets than a cursor does.
// A size set here for phones wins over a plain `fontSize` in `sx`; a heading with its own size states it per breakpoint.
const phone = "@media (max-width:599.95px)";
const touch = "@media (pointer: coarse)";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: brand.navy, contrastText: "#ffffff" },
    secondary: { main: brand.accent, dark: brand.accentInk, light: "#eaf8fd", contrastText: brand.navy },
    background: { default: "#ffffff", paper: "#ffffff" },
    text: { primary: brand.ink, secondary: brand.muted },
    divider: brand.border,
  },
  typography: {
    fontFamily: '"IBM Plex Sans", Arial, sans-serif',
    h1: { fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.08 },
    h2: { fontWeight: 500, letterSpacing: "-0.018em", lineHeight: 1.12 },
    h3: { fontWeight: 500, letterSpacing: "-0.012em" },
    h4: { fontWeight: 500, [phone]: { fontSize: "1.5rem", lineHeight: 1.25 } },
    h5: { fontWeight: 500, [phone]: { fontSize: "1.25rem" } },
    h6: { fontWeight: 500, [phone]: { fontSize: "1.0625rem", lineHeight: 1.4 } },
    overline: { fontWeight: 600, letterSpacing: ".09em", fontSize: ".7rem" },
    button: { fontWeight: 500, textTransform: "none" },
  },
  shape: { borderRadius: 0 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Long words and URLs wrap instead of widening the page on a narrow screen.
        body: { backgroundColor: "#ffffff", overflowWrap: "break-word", WebkitTapHighlightColor: "rgba(0,163,224,.18)" },
        [touch]: { summary: { paddingBlock: 11 } },
        "::selection": { backgroundColor: "rgba(0,163,224,.22)" },
        "a:focus-visible, summary:focus-visible": { outline: "2px solid currentColor", outlineOffset: 3 },
      },
    },
    MuiAppBar: { styleOverrides: { root: { boxShadow: "none" } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        text: { "&:hover": { backgroundColor: brand.accentSoft } },
        outlined: { borderColor: brand.border, "&:hover": { borderColor: brand.accentInk, backgroundColor: brand.accentSoft } },
        root: { minHeight: 38, borderRadius: 0, paddingInline: 10, [touch]: { minHeight: 44 }, "&.Mui-focusVisible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 3 } },
      },
    },
    // With `viewport-fit=cover` the gutters also clear the notch of a phone held sideways.
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: "max(16px, env(safe-area-inset-left))",
          paddingRight: "max(16px, env(safe-area-inset-right))",
          "@media (min-width:600px)": { paddingLeft: "max(24px, env(safe-area-inset-left))", paddingRight: "max(24px, env(safe-area-inset-right))" },
        },
      },
    },
    MuiCard: { styleOverrides: { root: { border: `1px solid ${brand.border}`, borderRadius: 0, boxShadow: "none" } } },
    // A card that is a link: no ripple wash; the border and the title answer to the pointer instead.
    MuiCardActionArea: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: { "&.Mui-focusVisible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 2 } },
        focusHighlight: { display: "none" },
      },
    },
    // Tabs sit on a hairline and mark the current one with the brand accent, like the header.
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44, borderBottom: `1px solid ${brand.border}` },
        indicator: { height: 2, backgroundColor: brand.accent },
        scrollButtons: { "&.Mui-disabled": { opacity: .25 } },
      },
    },
    MuiTab: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          minHeight: 44, minWidth: 0, paddingInline: 0, marginRight: 28, fontSize: ".95rem", color: brand.muted,
          "&:hover": { color: brand.navy },
          "&.Mui-selected": { color: brand.navy },
          "&.Mui-focusVisible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: -2 },
          [touch]: { minHeight: 48 },
        },
      },
    },
    // Page numbers are squares like the buttons; the current one is filled with the brand navy.
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: 0, fontVariantNumeric: "tabular-nums", [touch]: { minWidth: 40, height: 40 },
          "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: brand.navy, color: "#fff" },
          "&:hover": { backgroundColor: brand.accentSoft },
          "&.Mui-focusVisible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 2, backgroundColor: "transparent" },
        },
        ellipsis: { display: "inline-flex", alignItems: "center", justifyContent: "center" },
      },
    },
    MuiTooltip: { styleOverrides: { tooltip: { backgroundColor: brand.navy, borderRadius: 0, fontSize: ".75rem", fontWeight: 500, padding: "6px 9px" }, arrow: { color: brand.navy } } },
    MuiBreadcrumbs: { styleOverrides: { root: { fontSize: ".8rem" }, separator: { marginInline: 6, color: brand.muted } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none", boxShadow: "none", borderRadius: 0 }, outlined: { borderColor: brand.border } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500, borderRadius: 0, height: 26 } } },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiNativeSelect: { styleOverrides: { select: { [touch]: { paddingTop: 10, paddingBottom: 11 } } } },
    MuiOutlinedInput: { styleOverrides: { input: { [touch]: { paddingTop: 10.5, paddingBottom: 10.5 } }, root: { borderRadius: 0, backgroundColor: "#fff", "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: brand.accentInk } } } },
    MuiMenuItem: { styleOverrides: { root: { "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: "rgba(0,163,224,.12)" } } } },
  },
});
