import type { Metadata } from "next";
import Link from "next/link";
import { Box, Button, Container, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { getCountries, getInstruments, getInterpretations, getMatrix } from "@/lib/atlas/data";
import { consentTypes, instrumentPath, instrumentTitle, longDate, systemShort } from "@/lib/atlas/labels";

export const metadata: Metadata = {
  title: "Cronología | Human Rights Atlas",
  description: "Adopción y entrada en vigor de los instrumentos de derechos humanos, observaciones generales y actos de un Estado, por año.",
};

type Event = { date: string; label: string; href?: string; kind: string; system?: string };

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ pais?: string; tipo?: string }> }) {
  const { pais, tipo } = await searchParams;
  const [instruments, interpretations, matrix, countries] = await Promise.all([getInstruments(), getInterpretations(), getMatrix(), getCountries()]);
  const country = countries.find((c) => c.iso3 === (pais || "").toUpperCase());
  const events: Event[] = [];
  for (const i of instruments.filter((x) => x.category !== "procedural")) {
    if (i.concluded) events.push({ date: i.concluded, label: `Adopción o apertura a la firma: ${instrumentTitle(i)}`, href: instrumentPath(i.id), kind: "adopcion", system: i.system });
    if (i.entry_into_force?.date) events.push({ date: i.entry_into_force.date, label: `Entrada en vigor: ${instrumentTitle(i)}`, href: instrumentPath(i.id), kind: "vigor", system: i.system });
  }
  for (const g of interpretations) if (g.date) events.push({ date: g.date, label: `${g.committee} · ${g.title}`, href: g.links.es, kind: "interpretacion", system: "un" });
  if (country) {
    const byId = new Map(instruments.map((i) => [i.id, i]));
    for (const [id, cell] of Object.entries(matrix.states[country.iso3] || {})) {
      const i = byId.get(id);
      if (i && cell.d && (cell.s === "consent" || cell.s === "signature")) events.push({ date: cell.d, label: `${country.name_es}: ${cell.s === "signature" ? "firma" : (consentTypes[cell.t || ""] || "consentimiento").toLowerCase()} · ${instrumentTitle(i)}`, href: instrumentPath(id), kind: "estado", system: i.system });
    }
  }
  const shown = events.filter((e) => !tipo || e.kind === tipo).sort((a, b) => b.date.localeCompare(a.date));
  const years = [...new Set(shown.map((e) => e.date.slice(0, 4)))];
  const select = { p: 1, border: `1px solid ${brand.border}`, bgcolor: "#fff", font: "inherit", fontSize: ".95rem", color: brand.ink, minWidth: 200 };

  return (
    <AtlasShell crumbs={[{ label: "Instrumentos", href: "/atlas/instruments" }, { label: "Cronología" }]}>
      <PageHead overline="Cronología" title="Cronología jurídica">
        <p>Fechas tomadas de los registros de los depositarios, de la base de datos del ACNUDH y del BOE. Las fechas que la fuente da solo con mes y año se muestran así.</p>
      </PageHead>
      <Container maxWidth="lg" sx={{ pb: 3 }}>
        <Box component="form" method="get" action="/atlas/timeline" sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
          <Box component="label" sx={{ display: "flex", flexDirection: "column", gap: .5, fontSize: ".8rem", color: "text.secondary" }}>
            Tipo
            <Box component="select" name="tipo" defaultValue={tipo || ""} sx={select}>
              <option value="">Todo</option><option value="adopcion">Adopción de instrumentos</option><option value="vigor">Entrada en vigor</option><option value="interpretacion">Observaciones generales</option><option value="estado">Actos del Estado elegido</option>
            </Box>
          </Box>
          <Box component="label" sx={{ display: "flex", flexDirection: "column", gap: .5, fontSize: ".8rem", color: "text.secondary" }}>
            Añadir los actos de un Estado
            <Box component="select" name="pais" defaultValue={country?.iso3 || ""} sx={select}>
              <option value="">Ninguno</option>
              {[...countries].sort((a, b) => (a.name_es || a.name_en).localeCompare(b.name_es || b.name_en, "es")).map((c) => <option key={c.iso3} value={c.iso3}>{c.name_es || c.name_en}</option>)}
            </Box>
          </Box>
          <Button type="submit" variant="contained">Ver</Button>
        </Box>
      </Container>
      <Section title={`${shown.length} acontecimientos`} id="cronologia">
        {years.map((y) => (
          <Box key={y} sx={{ display: "grid", gridTemplateColumns: { xs: "56px minmax(0,1fr)", md: "80px minmax(0,1fr)" }, columnGap: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography component="h3" color="primary.main" sx={{ fontWeight: 600, fontSize: "1.1rem", fontVariantNumeric: "tabular-nums" }}>{y}</Typography>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
              {shown.filter((e) => e.date.startsWith(y)).map((e, i) => (
                <Box component="li" key={i} sx={{ py: .4 }}>
                  <Typography variant="body2"><Box component="span" sx={{ color: "text.secondary", mr: 1 }}>{longDate(e.date)}{e.system ? ` · ${systemShort[e.system as keyof typeof systemShort]}` : ""}</Box>{e.href ? (e.href.startsWith("/") ? <Link href={e.href}>{e.label}</Link> : <a href={e.href} target="_blank" rel="noreferrer">{e.label}</a>) : e.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Section>
    </AtlasShell>
  );
}
