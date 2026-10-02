"use client";

import { createTheme } from "@mui/material/styles";

export const brand = {
  navy: "#0a1e33",
  cyan: "#00a3e0",
  ink: "#15283b",
  muted: "#5f6f7d",
  mist: "#f5f7f8",
  border: "#d7dde2",
};

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: brand.navy, contrastText: "#ffffff" },
    secondary: { main: brand.cyan, contrastText: "#ffffff" },
    background: { default: "#f5f7f8", paper: "#ffffff" },
    text: { primary: brand.ink, secondary: brand.muted },
    divider: brand.border,
  },
  typography: {
    fontFamily: '"IBM Plex Sans", Arial, sans-serif',
    h1: { fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.08 },
    h2: { fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.12 },
    h3: { fontWeight: 600, letterSpacing: "-0.01em" },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    overline: { fontWeight: 600, letterSpacing: ".1em" },
    button: { fontWeight: 600, textTransform: "none" },
  },
  shape: { borderRadius: 3 },
  components: {
    MuiAppBar: { styleOverrides: { root: { boxShadow: "none" } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 40, borderRadius: 2, paddingInline: 14 } },
    },
    MuiCard: {
      styleOverrides: { root: { border: `1px solid ${brand.border}`, borderRadius: 2, boxShadow: "none" } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" }, outlined: { borderColor: brand.border } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 500, borderRadius: 2 } } },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 2, backgroundColor: "#fff" } } },
  },
});
