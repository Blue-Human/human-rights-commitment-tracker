import type { Metadata } from "next";
import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { CountryFilter } from "@/components/atlas/CountryFilter";
import { getCountries, getInstruments, getMatrix } from "@/lib/atlas/data";
import { countryPath, systemShort } from "@/lib/atlas/labels";

export const metadata: Metadata = {
  title: "Países | Human Rights Atlas",
  description: "Ficha de cada Estado: tratados firmados, ratificados o a los que se ha adherido, reservas, declaraciones y procedimientos aceptados, según los registros oficiales.",
};

export default async function CountriesPage() {
  const [countries, matrix, instruments] = await Promise.all([getCountries(), getMatrix(), getInstruments()]);
  const core = instruments.filter((i) => i.category === "core" && i.kind !== "declaration" && i.kind !== "amendment").map((i) => i.id);
  const rows = countries.map((c) => {
    const cells = matrix.states[c.iso3] || {};
    return { iso3: c.iso3, name: c.name_es || c.name_en, region: c.region_es || "Otras zonas", subregion: c.subregion_es || "", systems: c.systems.map((s) => systemShort[s]).join(" · "),
      core: core.filter((id) => cells[id]?.s === "consent").length };
  }).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const regions = [...new Set(rows.map((r) => r.region))].sort((a, b) => a.localeCompare(b, "es"));

  return (
    <AtlasShell crumbs={[{ label: "Países" }]}>
      <PageHead overline="Estados" title="Países">
        <p>{rows.length} Estados que figuran en los registros de los depositarios. Para cada uno, los actos que esos registros recogen —firma, ratificación, adhesión, sucesión, denuncia—, sus reservas y declaraciones y los procedimientos que ha aceptado. La cifra junto a cada nombre cuenta los {core.length} tratados y protocolos fundamentales de las Naciones Unidas en los que consta su consentimiento; no es una puntuación.</p>
        <p><Link href="/rights/compare">Comparar Estados</Link> · <Link href="/rights/ratifications">Mapa de ratificaciones</Link></p>
      </PageHead>
      <Section title="Estados por región" id="regiones" note="Regiones de la norma M49 de la División de Estadística de las Naciones Unidas, que no prejuzga ninguna cuestión de soberanía.">
        <CountryFilter />
        {regions.map((region) => (
          <Box key={region} component="section" data-region sx={{ mt: 3 }}>
            <Typography component="h3" variant="overline" color="text.secondary">{region}</Typography>
            <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1, p: 0, display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(3,minmax(0,1fr))" }, columnGap: 3 }}>
              {rows.filter((r) => r.region === region).map((r) => (
                <Box component="li" key={r.iso3} data-country={r.name.toLowerCase()} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                  <Box component={Link} href={countryPath(r.iso3)} sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 1.1, color: "inherit", textDecoration: "none", "&:hover .n": { color: brand.accentInk } }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography className="n" color="primary.main" sx={{ fontWeight: 500 }}>{r.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.systems}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" title={`Consentimiento registrado en ${r.core} de ${core.length} tratados y protocolos fundamentales de la ONU`} sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{r.core}/{core.length}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Section>
    </AtlasShell>
  );
}
