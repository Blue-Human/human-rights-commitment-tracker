import type { Metadata } from "next";
import Link from "next/link";
import { Box, Button, Container, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { Dot } from "@/components/atlas/Quote";
import { getAcceptance, getCountries, getInstruments, getMatrix } from "@/lib/atlas/data";
import { cellLabel, cellStatus, countryPath, instrumentPath, instrumentTitle, shortDate, statusTones, systemNames, systemOrder } from "@/lib/atlas/labels";

export const metadata: Metadata = {
  title: "Comparar Estados | Human Rights Atlas",
  description: "Comparación de la situación de varios Estados en los tratados de derechos humanos, sus protocolos y los procedimientos aceptados, según los registros oficiales.",
};

const MAX = 5;

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ c?: string | string[] }> }) {
  const { c } = await searchParams;
  const [countries, matrix, instruments, acceptance] = await Promise.all([getCountries(), getMatrix(), getInstruments(), getAcceptance()]);
  const byIso = new Map(countries.map((x) => [x.iso3, x]));
  const chosen = [...new Set((Array.isArray(c) ? c : (c || "").split(",")).map((x) => x.trim().toUpperCase()).filter((x) => byIso.has(x)))].slice(0, MAX);
  const sorted = [...countries].sort((a, b) => (a.name_es || a.name_en).localeCompare(b.name_es || b.name_en, "es"));
  const name = (iso: string) => byIso.get(iso)?.name_es || byIso.get(iso)?.name_en || iso;
  const groups = systemOrder.map((system) => ({ system, rows: instruments.filter((i) => i.system === system && i.category !== "procedural" && i.kind !== "declaration" && chosen.some((iso) => matrix.states[iso]?.[i.id] || i.status)) })).filter((g) => g.rows.length);
  const codes = [...new Set(chosen.flatMap((iso) => (acceptance[iso]?.procedures || []).map((p) => `${p.kind}|${p.code}|${p.name_es}`)))];
  const slots = [...chosen, ...Array(Math.max(0, Math.min(MAX, chosen.length + 1) - chosen.length)).fill("")].slice(0, MAX);
  if (slots.length < 2) slots.push("");

  return (
    <AtlasShell crumbs={[{ label: "Países", href: "/rights/countries" }, { label: "Comparar" }]}>
      <PageHead overline="Estados" title="Comparar Estados">
        <p>La situación de cada Estado en los mismos instrumentos y procedimientos, tal como la recogen los registros oficiales. La comparación no ordena ni puntúa a los Estados: muestra las diferencias de lo registrado.</p>
      </PageHead>
      <Container maxWidth="lg" sx={{ pb: 3 }}>
        <Box component="form" method="get" action="/rights/compare" sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
          {slots.map((value, i) => (
            <Box key={i} component="label" sx={{ display: "flex", flexDirection: "column", gap: .5, fontSize: ".8rem", color: "text.secondary" }}>
              Estado {i + 1}
              <Box component="select" name="c" defaultValue={value} sx={{ minWidth: 200, maxWidth: "100%", p: 1, border: `1px solid ${brand.border}`, bgcolor: "#fff", font: "inherit", fontSize: ".95rem", color: brand.ink }}>
                <option value="">—</option>
                {sorted.map((x) => <option key={x.iso3} value={x.iso3}>{x.name_es || x.name_en}</option>)}
              </Box>
            </Box>
          ))}
          <Button type="submit" variant="contained">Comparar</Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Hasta {MAX} Estados. Tras comparar aparece un selector más para añadir otro.</Typography>
      </Container>

      {chosen.length >= 1 && (
        <>
          {groups.map(({ system, rows }) => (
            <Section key={system} title={systemNames[system]} id={system}>
              {system === "coe" && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Solo se dispone de los datos de España (BOE): el registro del Consejo de Europa no es accesible de forma automatizada.</Typography>}
              <Box sx={{ overflowX: "auto" }}>
                <Box component="table" sx={{ width: "100%", minWidth: 220 + chosen.length * 170, borderCollapse: "collapse", fontSize: ".85rem", "& th, & td": { textAlign: "left", p: .9, borderBottom: "1px solid", borderColor: "divider", verticalAlign: "top" }, "& thead th": { fontSize: ".8rem" } }}>
                  <thead><tr><th scope="col">Instrumento</th>{chosen.map((iso) => <th key={iso} scope="col"><Link href={countryPath(iso)}>{name(iso)}</Link></th>)}</tr></thead>
                  <tbody>
                    {rows.map((i) => {
                      const values = chosen.map((iso) => cellStatus(matrix.states[iso]?.[i.id]));
                      const differs = new Set(values).size > 1;
                      return (
                        <tr key={i.id} style={{ background: differs ? "rgba(0,163,224,.05)" : undefined }}>
                          <th scope="row" style={{ fontWeight: 500 }}><Link href={instrumentPath(i.id)}>{instrumentTitle(i)}</Link>{differs && <Typography component="span" variant="caption" color="secondary.dark" sx={{ display: "block" }}>Situación distinta</Typography>}</th>
                          {chosen.map((iso) => {
                            const cell = matrix.states[iso]?.[i.id];
                            return <td key={iso}><Box sx={{ display: "flex", gap: .75, alignItems: "baseline" }}><Dot color={statusTones[cellStatus(cell)]} /><span>{cellLabel(cell)}{cell?.d ? ` · ${shortDate(cell.d)}` : ""}{cell?.r ? ` · ${cell.r} reserva${cell.r > 1 ? "s" : ""}` : ""}</span></Box></td>;
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </Box>
              </Box>
            </Section>
          ))}
          <Section title="Procedimientos de los órganos de tratados" id="procedimientos" note="Aceptación según la base de datos de órganos de tratados del ACNUDH.">
            <Box sx={{ overflowX: "auto" }}>
              <Box component="table" sx={{ width: "100%", minWidth: 220 + chosen.length * 140, borderCollapse: "collapse", fontSize: ".85rem", "& th, & td": { textAlign: "left", p: .9, borderBottom: "1px solid", borderColor: "divider" } }}>
                <thead><tr><th scope="col">Procedimiento</th>{chosen.map((iso) => <th key={iso} scope="col">{name(iso)}</th>)}</tr></thead>
                <tbody>
                  {codes.map((key) => {
                    const [kind, code, label] = key.split("|");
                    return (
                      <tr key={key}>
                        <th scope="row" style={{ fontWeight: 500 }}>{label} <Typography component="span" variant="caption" color="text.secondary">({code})</Typography></th>
                        {chosen.map((iso) => {
                          const p = acceptance[iso]?.procedures.find((x) => x.kind === kind && x.code === code);
                          return <td key={iso}>{!p ? "Sin dato" : p.accepted === true ? `Sí${p.date ? ` · ${shortDate(p.date)}` : ""}` : p.accepted === false ? "No" : p.raw || "Sin dato"}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </Box>
            </Box>
          </Section>
        </>
      )}
    </AtlasShell>
  );
}
