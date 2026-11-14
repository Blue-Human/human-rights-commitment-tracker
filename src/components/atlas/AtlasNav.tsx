"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Box, Container, InputBase } from "@mui/material";
import { brand } from "@/brand";
import { areaOf, atlasAreas, pageOf } from "@/lib/atlas/sections";

// The navigation of the Atlas, under the site header: its home, its four areas and a search that
// is always at hand. Inside an area a second row shows the pages of that area. It carries the
// site's identity: no mark or name of its own.
export function AtlasNav() {
  const pathname = usePathname();
  const area = areaOf(pathname);
  const page = area ? pageOf(area, pathname) : null;
  const tab = {
    flexShrink: 0, display: "flex", alignItems: "center", textDecoration: "none", whiteSpace: "nowrap",
    "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: -2 },
  } as const;
  const items = [{ id: "home", label: "Inicio", href: "/atlas", current: pathname === "/atlas" ? "page" : undefined }, ...atlasAreas.map((a) => ({ id: a.id, label: a.label, href: a.href, current: area?.id === a.id ? (pathname === a.href ? "page" : "location") : undefined }))];

  return (
    <Box sx={{ bgcolor: "#fff", borderBottom: "1px solid", borderColor: "divider" }}>
      <Container maxWidth="lg" sx={{ display: "flex", alignItems: "center", gap: 3 }}>
        <Box component="nav" aria-label="Secciones del Atlas" sx={{ flex: 1, minWidth: 0, display: "flex", gap: { xs: 2.25, md: 3.5 }, overflowX: "auto", mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 }, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
          {items.map((item) => (
            <Box key={item.id} component={Link} href={item.href} aria-current={item.current as "page" | "location" | undefined}
              sx={{ ...tab, display: item.id === "home" ? { xs: "none", sm: "flex" } : "flex", minHeight: { xs: 48, md: 54 }, fontSize: { xs: ".9rem", md: ".95rem" }, fontWeight: 500, color: brand.muted, borderBottom: "2px solid transparent", pt: "2px", "&:hover": { color: brand.navy }, "&[aria-current]": { color: brand.navy, borderBottomColor: brand.accent } }}>
              {item.label}
            </Box>
          ))}
        </Box>
        <Box component="form" action="/atlas/search" method="get" role="search" sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", flexShrink: 0, width: 260, height: 38, border: `1px solid ${brand.border}`, "&:focus-within": { borderColor: brand.accentInk } }}>
          <Box component="button" type="submit" aria-label="Buscar en el Atlas" sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 36, flexShrink: 0, border: 0, bgcolor: "transparent", color: brand.muted, cursor: "pointer", "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: -2 } }}><SearchRoundedIcon fontSize="small" /></Box>
          <InputBase name="q" placeholder="Buscar en el Atlas" inputProps={{ "aria-label": "Buscar en el Atlas" }} sx={{ flex: 1, minWidth: 0, pr: 1, fontSize: ".9rem" }} />
        </Box>
      </Container>

      {area && area.pages.length > 1 && (
        <Box sx={{ bgcolor: brand.soft, borderTop: "1px solid", borderColor: "divider" }}>
          <Container maxWidth="lg">
            <Box component="nav" aria-label={`Páginas de ${area.label}`} sx={{ display: "flex", gap: { xs: 2, md: 3 }, overflowX: "auto", mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 }, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
              {area.pages.map((p) => (
                <Box key={p.href} component={Link} href={p.href} aria-current={page?.href === p.href ? (pathname === p.href ? "page" : "location") : undefined}
                  sx={{ ...tab, minHeight: 42, fontSize: ".85rem", color: brand.muted, "&:hover": { color: brand.navy }, "&[aria-current]": { color: brand.navy, fontWeight: 600 } }}>
                  {p.label}
                </Box>
              ))}
            </Box>
          </Container>
        </Box>
      )}
    </Box>
  );
}
