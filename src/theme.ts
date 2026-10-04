"use client";

import { createTheme } from "@mui/material/styles";

export const brand = {
  navy: "#0a1e33",
  ink: "#15283b",
  muted: "#64717c",
  border: "#d8dde2",
  soft: "#f7f8f9",
  accent: "#00a3e0",
  accentInk: "#006c95",
  accentSoft: "rgba(0,163,224,.07)",
};

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
    h4: { fontWeight: 500 },
    h5: { fontWeight: 500 },
    h6: { fontWeight: 500 },
    overline: { fontWeight: 600, letterSpacing: ".09em", fontSize: ".7rem" },
    button: { fontWeight: 500, textTransform: "none" },
  },
  shape: { borderRadius: 0 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#ffffff" },
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
        root: { minHeight: 38, borderRadius: 0, paddingInline: 10, "&.Mui-focusVisible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 3 } },
      },
    },
    MuiCard: { styleOverrides: { root: { border: `1px solid ${brand.border}`, borderRadius: 0, boxShadow: "none" } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none", boxShadow: "none", borderRadius: 0 }, outlined: { borderColor: brand.border } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500, borderRadius: 0, height: 26 } } },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 0, backgroundColor: "#fff", "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: brand.accentInk } } } },
    MuiMenuItem: { styleOverrides: { root: { "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: "rgba(0,163,224,.12)" } } } },
  },
});
