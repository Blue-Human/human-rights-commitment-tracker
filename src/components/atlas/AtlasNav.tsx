"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Container } from "@mui/material";
import { brand } from "@/brand";

// The sections of the Atlas, under the site header. On a phone the row scrolls sideways.
const items: [string, string][] = [
  ["Inicio", "/rights"],
  ["Derechos", "/rights/topics"],
  ["Instrumentos", "/rights/instruments"],
  ["Mecanismos", "/rights/mechanisms"],
  ["Países", "/rights/countries"],
  ["Órganos", "/rights/bodies"],
  ["Jurisprudencia", "/rights/case-law"],
  ["Buscar", "/rights/search"],
];

export function AtlasNav() {
  const pathname = usePathname();
  const current = (href: string) => (href === "/rights" ? (pathname === "/rights" ? "page" : undefined) : pathname.startsWith(href) ? (pathname === href ? "page" : "location") : undefined);
  return (
    <Box sx={{ bgcolor: brand.soft, borderBottom: "1px solid", borderColor: "divider" }}>
      <Container maxWidth="lg">
        <Box component="nav" aria-label="Secciones del Atlas" sx={{ display: "flex", gap: { xs: 2.5, md: 3.5 }, overflowX: "auto", mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 }, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
          {items.map(([label, href]) => (
            <Box
              key={href}
              component={Link}
              href={href}
              aria-current={current(href)}
              sx={{
                flexShrink: 0, display: "flex", alignItems: "center", minHeight: 46, fontSize: ".9rem", fontWeight: 500, color: brand.muted, textDecoration: "none",
                borderBottom: "2px solid transparent", "&:hover": { color: brand.navy }, "&[aria-current]": { color: brand.navy, borderBottomColor: brand.accent },
                "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: -2 },
              }}
            >
              {label}
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
