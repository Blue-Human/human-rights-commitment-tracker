"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Box, Container, InputBase } from "@mui/material";
import { brand } from "@/brand";
import { areaOf, atlasAreas, pageOf } from "@/lib/atlas/sections";
import { AtlasMark } from "./AtlasMark";

// The bar of the Atlas, under the site header: its own name, its four areas and a search that is
// always at hand. Inside an area, a second row shows the pages of that area.
export function AtlasNav() {
  const pathname = usePathname();
  const area = areaOf(pathname);
  const page = area ? pageOf(area, pathname) : null;
  const tab = {
    flexShrink: 0, display: "flex", alignItems: "center", textDecoration: "none", whiteSpace: "nowrap",
    "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: -2 },
  } as const;

  return (
    <Box component="header" sx={{ bgcolor: "#fff", borderBottom: "1px solid", borderColor: "divider" }}>
      <Container maxWidth="lg">
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: { xs: "wrap", md: "nowrap" }, columnGap: { md: 4 }, minHeight: { md: 64 } }}>
          <Box component={Link} href="/atlas" aria-current={pathname === "/atlas" ? "page" : undefined} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: { xs: 1.25, md: 0 }, color: brand.navy, textDecoration: "none", flexShrink: 0, "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 2 } }}>
            <AtlasMark size={30} />
            <Box sx={{ lineHeight: 1 }}>
              <Box component="span" sx={{ display: "block", fontSize: ".62rem", fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: brand.muted }}>Human Rights</Box>
              <Box component="span" sx={{ display: "block", fontFamily: "var(--font-serif), Georgia, serif", fontSize: "1.45rem", mt: "2px" }}>Atlas</Box>
            </Box>
          </Box>

          <Box component="form" action="/atlas/search" method="get" role="search" sx={{ order: { xs: 2, md: 3 }, ml: "auto", display: "flex", alignItems: "center", border: `1px solid ${brand.border}`, bgcolor: brand.soft, width: { xs: 44, sm: 220, lg: 260 }, height: 40, "&:focus-within": { borderColor: brand.accentInk, bgcolor: "#fff" } }}>
            <Box component="button" type="submit" aria-label="Buscar en el Atlas" sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 38, flexShrink: 0, border: 0, bgcolor: "transparent", color: brand.muted, cursor: "pointer", "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: -2 } }}><SearchRoundedIcon fontSize="small" /></Box>
            <InputBase name="q" placeholder="Buscar en el Atlas" inputProps={{ "aria-label": "Buscar en el Atlas" }} sx={{ display: { xs: "none", sm: "flex" }, flex: 1, minWidth: 0, pr: 1, fontSize: ".9rem" }} />
          </Box>

          <Box component="nav" aria-label="Áreas del Atlas" sx={{ order: { xs: 3, md: 2 }, width: { xs: "100%", md: "auto" }, display: "flex", gap: { xs: 2, sm: 2.5, md: 3.5 }, alignSelf: "stretch", overflowX: "auto", mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 }, borderTop: { xs: "1px solid", md: 0 }, borderColor: "divider", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
            {atlasAreas.map((a) => (
              <Box key={a.id} component={Link} href={a.href} aria-current={area?.id === a.id ? (pathname === a.href ? "page" : "location") : undefined}
                sx={{ ...tab, minHeight: { xs: 46, md: 64 }, fontSize: { xs: ".9rem", sm: ".95rem" }, fontWeight: 500, color: brand.muted, borderBottom: "3px solid transparent", pt: "3px", "&:hover": { color: brand.navy }, "&[aria-current]": { color: brand.navy, borderBottomColor: brand.accent } }}>
                {a.label}
              </Box>
            ))}
          </Box>
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
