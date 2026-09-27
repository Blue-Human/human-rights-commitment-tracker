"use client";

import { createTheme } from "@mui/material/styles";

export const brand = {
  navy: "#0a1e33",
  cyan: "#00a3e0",
  ink: "#102a43",
  mist: "#f5f8fb",
  border: "#dce5ec",
};

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: brand.navy, contrastText: "#ffffff" },
    secondary: { main: brand.cyan, contrastText: "#ffffff" },
    background: { default: "#f7fafc", paper: "#ffffff" },
    text: { primary: brand.navy, secondary: "#52697a" },
    divider: brand.border,
  },
  typography: {
    fontFamily: '"IBM Plex Sans", Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.035em" },
    h2: { fontWeight: 700, letterSpacing: "-0.025em" },
    h3: { fontWeight: 650, letterSpacing: "-0.015em" },
    button: { fontWeight: 600, textTransform: "none" },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 44, borderRadius: 12, paddingInline: 18 } },
    },
    MuiCard: {
      styleOverrides: { root: { border: `1px solid ${brand.border}`, boxShadow: "0 10px 30px rgba(10,30,51,.05)" } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiSelect: { defaultProps: { size: "small" } },
  },
});
