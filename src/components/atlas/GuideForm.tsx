import { Box, Button } from "@mui/material";
import { brand } from "@/brand";
import type { Country, Right } from "@/lib/atlas/types";

// The first step of the guide, wherever the Atlas offers it: a State and, optionally, a right.
// A plain form, so it works before any script has loaded.
export function GuideForm({ countries, rights, country = "ESP" }: { countries: Country[]; rights: Right[]; country?: string }) {
  const sorted = [...countries].sort((a, b) => (a.name_es || a.name_en).localeCompare(b.name_es || b.name_en, "es"));
  const select = { p: 1.1, border: `1px solid ${brand.border}`, bgcolor: "#fff", font: "inherit", fontSize: ".95rem", color: brand.ink, width: "100%", minWidth: 0 };
  const label = { display: "flex", flexDirection: "column", gap: .5, fontSize: ".8rem", color: "text.secondary" } as const;
  return (
    <Box component="form" method="get" action="/atlas/mechanisms/guide" sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,1fr) minmax(0,1fr) auto" }, gap: 1.5, alignItems: "end", p: { xs: 2, md: 2.5 }, border: "1px solid", borderColor: "divider", borderTop: `3px solid ${brand.navy}`, bgcolor: "#fff" }}>
      <Box component="label" sx={label}>
        Estado
        <Box component="select" name="pais" defaultValue={country} sx={select}>
          {sorted.map((c) => <option key={c.iso3} value={c.iso3}>{c.name_es || c.name_en}</option>)}
        </Box>
      </Box>
      <Box component="label" sx={label}>
        Derecho
        <Box component="select" name="derecho" defaultValue="" sx={select}>
          <option value="">Cualquiera</option>
          {rights.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Box>
      </Box>
      <Button type="submit" variant="contained" disableElevation sx={{ height: 44, px: 3 }}>Ver las vías</Button>
    </Box>
  );
}
