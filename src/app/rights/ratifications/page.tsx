import type { Metadata } from "next";
import Link from "next/link";
import { Box, Button, Container, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { Dot, SourceNote } from "@/components/atlas/Quote";
import { RecordDisclosure } from "@/components/RecordDisclosure";
import { getCountries, getInstruments, getMatrix, getParticipation } from "@/lib/atlas/data";
import { cellLabel, cellStatus, countryPath, instrumentPath, instrumentTitle, shortDate, statusNames, statusNotes, statusTones, systemNames } from "@/lib/atlas/labels";

export const metadata: Metadata = {
  title: "Mapa de ratificaciones | Human Rights Atlas",
  description: "Situación de cada Estado en un tratado de derechos humanos según el registro de su depositario, por regiones.",
};

export default async function RatificationsPage({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const { i } = await searchParams;
  const [instruments, countries, matrix] = await Promise.all([getInstruments(), getCountries(), getMatrix()]);
  const options = instruments.filter((x) => x.status && x.status.parties !== null && x.kind !== "amendment");
  const instrument = options.find((x) => x.id === i) || options.find((x) => x.id === "un-iccpr")!;
  const participation = await getParticipation(instrument.id);
  const scope = instrument.system === "un" ? countries : countries.filter((c) => c.systems.includes(instrument.system));
  const regions = [...new Set(scope.map((c) => c.region_es || "Otras zonas"))].sort((a, b) => a.localeCompare(b, "es"));
  const counts = new Map<string, number>();
  for (const c of scope) { const s = cellStatus(matrix.states[c.iso3]?.[instrument.id]); counts.set(s, (counts.get(s) || 0) + 1); }
  const outside = (participation?.participants || []).filter((p) => !p.iso3 && p.listed !== false);

  return (
    <AtlasShell crumbs={[{ label: "Países", href: "/rights/countries" }, { label: "Ratificaciones" }]}>
      <PageHead overline="Ratificaciones" title={instrumentTitle(instrument)}>
        <p>Situación de cada Estado según el registro del depositario. Cada recuadro es un Estado; la representación agrupa los Estados por regiones y no es cartográfica, de modo que no traza fronteras ni representa territorios.</p>
      </PageHead>
      <Container maxWidth="lg" sx={{ pb: 3 }}>
        <Box component="form" method="get" action="/rights/ratifications" sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
          <Box component="label" sx={{ display: "flex", flexDirection: "column", gap: .5, fontSize: ".8rem", color: "text.secondary", flex: "1 1 320px", maxWidth: 640 }}>
            Instrumento
            <Box component="select" name="i" defaultValue={instrument.id} sx={{ p: 1, border: `1px solid ${brand.border}`, bgcolor: "#fff", font: "inherit", fontSize: ".95rem", color: brand.ink, maxWidth: "100%" }}>
              {(["un", "oas", "au"] as const).map((system) => (
                <optgroup key={system} label={systemNames[system]}>
                  {options.filter((x) => x.system === system).map((x) => <option key={x.id} value={x.id}>{instrumentTitle(x)}</option>)}
                </optgroup>
              ))}
            </Box>
          </Box>
          <Button type="submit" variant="contained">Ver</Button>
        </Box>
      </Container>

      <Section title="Por regiones" id="mapa" note={<><Link href={instrumentPath(instrument.id)}>Ficha del instrumento</Link>{participation?.as_of ? ` · registro a ${shortDate(participation.as_of)}` : ""}</>}>
        <Box component="ul" aria-label="Leyenda" sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, listStyle: "none", m: 0, p: 0, mb: 3 }}>
          {[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([code, n]) => (
            <Box component="li" key={code} sx={{ display: "flex", alignItems: "center", gap: .75 }} title={statusNotes[code as keyof typeof statusNotes]}>
              <Dot color={statusTones[code as keyof typeof statusTones]} size={12} /><Typography variant="body2">{statusNames[code as keyof typeof statusNames]}: <strong>{n}</strong></Typography>
            </Box>
          ))}
        </Box>
        {regions.map((region) => (
          <Box key={region} sx={{ mb: 3 }}>
            <Typography component="h3" variant="overline" color="text.secondary">{region}</Typography>
            <Box component="ul" sx={{ listStyle: "none", m: 0, mt: .75, p: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(64px,1fr))", gap: "3px" }}>
              {scope.filter((c) => (c.region_es || "Otras zonas") === region).sort((a, b) => (a.name_es || a.name_en).localeCompare(b.name_es || b.name_en, "es")).map((c) => {
                const cell = matrix.states[c.iso3]?.[instrument.id];
                const code = cellStatus(cell);
                const dark = code === "consent" || code === "consent_boe" || code === "denounced";
                const label = `${c.name_es || c.name_en}: ${cellLabel(cell)}${cell?.d ? `, ${shortDate(cell.d)}` : ""}`;
                return (
                  <Box component="li" key={c.iso3}>
                    <Box component={Link} href={`${countryPath(c.iso3)}#${instrument.id}`} title={label} aria-label={label}
                      sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 40, bgcolor: statusTones[code], color: dark ? "#fff" : brand.navy, fontSize: ".72rem", fontWeight: 600, letterSpacing: ".03em", textDecoration: "none", "&:hover, &:focus-visible": { outline: `2px solid ${brand.navy}`, outlineOffset: 1 } }}>
                      {c.iso3}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        ))}
        {outside.length > 0 && <Typography variant="body2" color="text.secondary">También figuran en el registro, sin código de país en la norma M49: {outside.map((p) => p.name).join(", ")}.</Typography>}
        <Box sx={{ mt: 2 }}>
          <RecordDisclosure title="Tabla accesible">
            <Box sx={{ overflowX: "auto" }}>
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem", "& th, & td": { textAlign: "left", p: .6, borderBottom: "1px solid", borderColor: "divider" } }}>
                <thead><tr><th scope="col">Estado</th><th scope="col">Región</th><th scope="col">Situación</th><th scope="col">Fecha</th></tr></thead>
                <tbody>{scope.map((c) => { const cell = matrix.states[c.iso3]?.[instrument.id]; return <tr key={c.iso3}><th scope="row" style={{ fontWeight: 500 }}><Link href={countryPath(c.iso3)}>{c.name_es || c.name_en}</Link></th><td>{c.region_es}</td><td>{cellLabel(cell)}</td><td>{cell?.d ? shortDate(cell.d) : "—"}</td></tr>; })}</tbody>
              </Box>
            </Box>
          </RecordDisclosure>
        </Box>
        {participation && <Box sx={{ mt: 2 }}><SourceNote label="registro del depositario" href={participation.ref.url} retrieved={participation.ref.retrieved} /></Box>}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Nombres y regiones: norma M49 de la División de Estadística de las Naciones Unidas.</Typography>
      </Section>
    </AtlasShell>
  );
}
