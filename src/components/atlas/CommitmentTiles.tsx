import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { brand } from "@/brand";
import { countryPath } from "@/lib/atlas/labels";

export type CommitmentTile = { iso3: string; name: string; region: string; count: number };

// One hue, light to dark: how many of the core UN treaties and protocols a State has consented to.
const bins: { from: number; to: number; fill: string; ink: string }[] = [
  { from: 0, to: 6, fill: "#dceff7", ink: brand.navy },
  { from: 7, to: 9, fill: "#a9d8ec", ink: brand.navy },
  { from: 10, to: 12, fill: "#5fb3d8", ink: brand.navy },
  { from: 13, to: 15, fill: "#13759f", ink: "#fff" },
  { from: 16, to: 17, fill: "#0b5a80", ink: "#fff" },
  { from: 18, to: 99, fill: "#0a2f4d", ink: "#fff" },
];
const binOf = (n: number) => bins.find((b) => n >= b.from && n <= b.to) ?? bins[0];

// Every State as a square, grouped by region. Not a map: it draws no borders and no territories.
export function CommitmentTiles({ tiles, total, highlight }: { tiles: CommitmentTile[]; total: number; highlight?: string }) {
  const regions = [...new Set(tiles.map((t) => t.region))].sort((a, b) => a.localeCompare(b, "es"));
  const label = (b: (typeof bins)[number]) => (b.to >= total ? `${total}` : b.from === b.to ? `${b.from}` : `${b.from}–${Math.min(b.to, total)}`);
  return (
    <Box>
      <Box component="ul" aria-label="Leyenda: tratados y protocolos fundamentales con consentimiento registrado" sx={{ listStyle: "none", m: 0, p: 0, mb: 2.5, display: "flex", flexWrap: "wrap", gap: { xs: 1.25, md: 2 } }}>
        {bins.map((b) => (
          <Box component="li" key={b.from} sx={{ display: "flex", alignItems: "center", gap: .75 }}>
            <Box sx={{ width: 18, height: 14, bgcolor: b.fill, border: b.from === 0 ? `1px solid ${brand.border}` : 0 }} />
            <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>{label(b)} <Box component="span" sx={{ color: "text.secondary" }}>· {tiles.filter((t) => binOf(t.count) === b).length} Estados</Box></Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "grid", gap: { xs: 2, md: 1.25 } }}>
        {regions.map((region) => (
          <Box key={region} sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "96px minmax(0,1fr)" }, columnGap: 2, rowGap: .75, alignItems: "start" }}>
            <Typography component="h3" variant="overline" color="text.secondary" sx={{ lineHeight: { md: "30px" } }}>{region}</Typography>
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: { xs: "repeat(auto-fill,minmax(38px,1fr))", md: "repeat(auto-fill,minmax(40px,1fr))" }, gap: "2px" }}>
              {tiles.filter((t) => t.region === region).sort((a, b) => a.name.localeCompare(b.name, "es")).map((t) => {
                const b = binOf(t.count);
                const text = `${t.name}: ${t.count} de ${total}`;
                const mine = t.iso3 === highlight;
                return (
                  <li key={t.iso3}>
                    <Box component={Link} href={countryPath(t.iso3)} title={text} aria-label={text}
                      sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 30, bgcolor: b.fill, color: b.ink, fontSize: ".62rem", fontWeight: 600, letterSpacing: ".03em", textDecoration: "none",
                        outline: mine ? `2px solid ${brand.accent}` : "none", outlineOffset: mine ? 1 : 0, position: "relative", zIndex: mine ? 1 : 0,
                        "&:hover, &:focus-visible": { outline: `2px solid ${brand.navy}`, outlineOffset: 1, zIndex: 2 } }}>
                      {t.iso3}
                    </Box>
                  </li>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
