import type { Metadata } from "next";
import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Box, Button, Container, Typography } from "@mui/material";
import { brand, displayFont } from "@/brand";
import { AtlasShell } from "@/components/atlas/AtlasShell";
import { AtlasSearchBox } from "@/components/atlas/AtlasSearchBox";
import { CommitmentTiles } from "@/components/atlas/CommitmentTiles";
import { CoreTreaties } from "@/components/atlas/CoreTreaties";
import { GuideForm } from "@/components/atlas/GuideForm";
import { RightTiles } from "@/components/atlas/RightTiles";
import { Figure } from "@/components/Figure";
import { getAcceptance, getBodies, getCountries, getDecisions, getInstruments, getMatrix, getProcedures, getReport, getRights } from "@/lib/atlas/data";
import { countryPath, instrumentPath, longDate, rightPath } from "@/lib/atlas/labels";
import { atlasAreas, type AtlasArea } from "@/lib/atlas/sections";
import { getCommitments } from "@/lib/hrct";

export const metadata: Metadata = {
  title: "Atlas | Human Rights Commitment Institute",
  description: "Qué reconoce cada tratado de derechos humanos, qué ha aceptado cada Estado y ante qué órganos se puede acudir. Con el texto oficial y la fuente de cada dato.",
};

// Ways in for someone who does not know where to start: each one opens a real page of the Atlas.
const suggestions: [string, string][] = [
  ["Derecho a la vivienda", rightPath("vivienda")],
  ["España", countryPath("ESP")],
  ["Convención sobre los Derechos del Niño", instrumentPath("un-crc")],
  ["Acudir a un comité de la ONU", "/atlas/mechanisms/guide?pais=ESP"],
];

const hairline = "rgba(255,255,255,.16)";
const quiet = "rgba(255,255,255,.72)";

export default async function AtlasHome() {
  const [instruments, countries, matrix, bodies, procedures, decisions, rights, acceptance, report, commitments] = await Promise.all([
    getInstruments(), getCountries(), getMatrix(), getBodies(), getProcedures(), getDecisions(), getRights(), getAcceptance(), getReport(), getCommitments().catch(() => []),
  ]);
  const legal = instruments.filter((i) => i.category !== "procedural");
  const readable = instruments.filter((i) => i.texts.some((t) => t.complete)).length;
  const core = instruments.filter((i) => i.category === "core" && i.kind !== "declaration" && i.kind !== "amendment").map((i) => i.id);
  const consented = (iso3: string) => core.filter((id) => matrix.states[iso3]?.[id]?.s === "consent").length;
  const tiles = countries.map((c) => ({ iso3: c.iso3, name: c.name_es || c.name_en, region: c.region_es || "Otras zonas", count: consented(c.iso3) }));
  const all = tiles.filter((t) => t.count === core.length).length;

  const spain = {
    core: consented("ESP"),
    accepted: (acceptance.ESP?.procedures || []).filter((p) => p.accepted === true).length,
    procedures: (acceptance.ESP?.procedures || []).length,
    decisions: decisions.items.filter((d) => d.source === "tbinternet" && d.states.includes("ESP")).length,
  };

  const heroFigures: [string, string, string?][] = [
    [String(legal.length), "instrumentos", `${readable} con texto legible por artículos`],
    [String(countries.length), "Estados", "con su participación en cada tratado"],
    [String(procedures.length), "procedimientos", `ante ${bodies.length} órganos`],
  ];
  const areaFigures: Record<AtlasArea["id"], string> = {
    derechos: `${rights.length} derechos`,
    instrumentos: `${legal.length} instrumentos`,
    paises: `${countries.length} Estados`,
    proteccion: `${procedures.length} procedimientos`,
  };

  return (
    <AtlasShell>
      {/* The opening of the Atlas, built like the opening of the site: the question on the left, the data on the right. */}
      <Box component="section" aria-labelledby="atlas-heading" sx={{
        position: "relative", overflow: "hidden", isolation: "isolate", bgcolor: "primary.main", color: "#fff",
        backgroundImage: 'url("/images/ods/Untitled%20design%20-%202026-10-06T193326.870.png")', backgroundSize: "cover", backgroundPosition: "right center", backgroundRepeat: "no-repeat",
      }}>
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, pt: { xs: 4.5, md: 6 }, pb: { xs: 4.5, md: 6 } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,6fr) minmax(0,5fr)" }, columnGap: 8, rowGap: 6 }}>
            <Box sx={{ display: "flex", flexDirection: "column", maxWidth: { xs: 720, lg: "none" } }}>
              <Typography variant="overline" sx={{ color: quiet }}>Atlas de los derechos humanos</Typography>
              <Typography id="atlas-heading" variant="h1" sx={{ mt: .75, fontWeight: 400, fontSize: { xs: "2.25rem", sm: "2.85rem", lg: "3.15rem" }, lineHeight: 1.08, letterSpacing: "-.03em", textWrap: "balance" }}>
                Los derechos humanos, de la norma a la protección
              </Typography>
              <Typography sx={{ mt: { xs: 2, md: 2.5 }, fontSize: { xs: "1.02rem", md: "1.1rem" }, lineHeight: 1.65, color: "rgba(255,255,255,.86)" }}>
                Qué reconoce cada tratado, a qué se ha comprometido cada Estado y ante quién se puede acudir, con el texto oficial y la fuente de cada dato.
              </Typography>
              <Box sx={{ mt: 3.5 }}><AtlasSearchBox /></Box>
              <Typography variant="body2" sx={{ mt: 1.75, color: quiet, lineHeight: 1.9 }}>
                Por ejemplo: {suggestions.map(([label, href], i) => <span key={href}>{i ? " · " : ""}<Box component={Link} href={href} sx={{ color: "#fff", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,.45)", textUnderlineOffset: "3px", "&:hover": { textDecorationColor: "#fff" }, "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 } }}>{label}</Box></span>)}
              </Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: { xs: 2, sm: 3 }, mt: { xs: 4.5, lg: "auto" }, pt: { xs: 3, lg: 4 }, borderTop: `1px solid ${hairline}` }}>
                {heroFigures.map(([value, label, note]) => (
                  <Box key={label}>
                    <Typography sx={{ fontFamily: displayFont, fontSize: { xs: "1.7rem", md: "2rem" }, fontWeight: 500, lineHeight: 1, letterSpacing: "-.01em" }}>{value}</Typography>
                    <Typography variant="body2" sx={{ mt: .75, lineHeight: 1.35 }}>{label}</Typography>
                    {note && <Typography variant="caption" sx={{ color: quiet, display: "block", lineHeight: 1.4, mt: .25 }}>{note}</Typography>}
                  </Box>
                ))}
              </Box>
            </Box>

            <Box>
              <Typography component="h2" sx={{ fontFamily: displayFont, fontWeight: 500, fontSize: "1.25rem", lineHeight: 1.3 }}>Los nueve tratados fundamentales de la ONU</Typography>
              <Typography variant="body2" sx={{ color: quiet, mt: .5 }}>Estados Partes en cada uno, según el registro del depositario.</Typography>
              <Box sx={{ mt: 2.5, pt: 2.5, borderTop: `1px solid ${hairline}` }}>
                <CoreTreaties instruments={instruments} dark withProtocols={false} />
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* The four areas: where each kind of question is answered. */}
      <Container component="section" aria-labelledby="areas-heading" maxWidth="lg" sx={{ pt: { xs: 4.5, md: 6 }, pb: { xs: 2, md: 3 } }}>
        <Typography id="areas-heading" variant="overline" color="text.secondary">Por dónde empezar</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, columnGap: 4, rowGap: 4, mt: 1.5, pt: 3, borderTop: "2px solid", borderColor: "secondary.main" }}>
          {atlasAreas.map((area) => (
            <Box key={area.id} sx={{ display: "flex", flexDirection: "column" }}>
              <Box component={Link} href={area.href} sx={{ display: "flex", alignItems: "center", gap: .75, color: "primary.main", textDecoration: "none", "&:hover": { color: brand.accentInk }, "&:hover .go": { transform: "translateX(3px)" } }}>
                <Typography component="h3" variant="h4" sx={{ fontSize: { xs: "1.45rem", md: "1.6rem" }, color: "inherit" }}>{area.label}</Typography>
                <ArrowForwardRoundedIcon className="go" sx={{ color: brand.accentInk, transition: "transform .15s" }} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: .75, lineHeight: 1.6 }}>{area.question}</Typography>
              <Typography variant="caption" sx={{ mt: 1, color: brand.navy, fontWeight: 600 }}>{areaFigures[area.id]}</Typography>
              {area.pages.length > 1 && (
                <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1.5, p: 0, display: "grid", gap: .5 }}>
                  {area.pages.slice(1).map((p) => <li key={p.href}><Box component={Link} href={p.href} sx={{ fontSize: ".875rem", color: "secondary.dark", textDecoration: "none", "&:hover": { textDecoration: "underline", textUnderlineOffset: "3px" } }}>{p.label}</Box></li>)}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Container>

      <Block id="derechos" overline="Derechos" title="Empezar por un derecho" action={["Ver los derechos", "/atlas/topics"]}
        note="Los artículos que lo reconocen, las interpretaciones de los comités y los mecanismos que permiten reclamarlo.">
        <RightTiles rights={rights} />
      </Block>

      <Block id="compromisos" overline="Países" title="¿Quién se ha comprometido?" action={["Mapa de un tratado", "/atlas/ratifications"]}
        note={`Cada recuadro es un Estado; el color indica en cuántos de los ${core.length} tratados y protocolos fundamentales de las Naciones Unidas consta su consentimiento en el registro del depositario. ${all} Estados los han aceptado todos. No es una puntuación ni un mapa: no traza fronteras.`}>
        <CommitmentTiles tiles={tiles} total={core.length} highlight="ESP" />
      </Block>

      {/* Spain in focus: the readers of the site are in Spain, and the HRCI follows its commitments. */}
      <Box component="section" aria-labelledby="espana-heading" sx={{ bgcolor: brand.soft, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", my: { xs: 2, md: 3 } }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 } }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 2 }}>
            <Box>
              <Typography variant="overline" color="text.secondary">España</Typography>
              <Typography id="espana-heading" variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.6rem", md: "2rem" }, mt: .5 }}>Lo que España ha aceptado</Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              <Button component={Link} href={countryPath("ESP")} variant="contained" disableElevation endIcon={<ArrowForwardRoundedIcon />}>Ficha de España</Button>
              <Button component={Link} href="/commitments" variant="outlined">Recomendaciones del EPU</Button>
            </Box>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, columnGap: 4, rowGap: 3, mt: 3, pt: 3, borderTop: "2px solid", borderColor: "secondary.main" }}>
            <Figure value={String(spain.core)} of={`de ${core.length}`}>tratados y protocolos fundamentales de la ONU con consentimiento registrado</Figure>
            <Figure value={String(spain.accepted)} of={spain.procedures ? `de ${spain.procedures}` : undefined}>procedimientos de los comités de la ONU aceptados</Figure>
            <Figure value={String(spain.decisions)}>decisiones de comités de la ONU sobre comunicaciones relativas a España</Figure>
            {commitments.length > 0 && <Figure value={String(commitments.length)}>recomendaciones del EPU a España en seguimiento por el HRCI</Figure>}
          </Box>
        </Container>
      </Box>

      <Block id="proteccion" overline="Protección" title="¿Ante quién se puede acudir?" action={["Ver los procedimientos", "/atlas/mechanisms"]}
        note="Elija un Estado y, si quiere, un derecho: el orientador muestra qué procedimientos internacionales constan en los registros para ese Estado y qué requisitos fija cada norma. No valora casos ni pide datos personales.">
        <GuideForm countries={countries} rights={rights} />
      </Block>

      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 900, lineHeight: 1.7, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
          El Atlas separa siempre el texto jurídico oficial, las interpretaciones y decisiones de los órganos, la información procedimental oficial y las anotaciones de Blue Human. No interpreta las normas ni valora la admisibilidad de ningún caso. Datos actualizados el {longDate(report.run_at.slice(0, 10))} · <Link href="/atlas/sources">Fuentes, cobertura y límites</Link>
        </Typography>
      </Container>
    </AtlasShell>
  );
}

// A section of the home page: overline, title, an optional short note and a link to go further.
function Block({ id, overline, title, note, action, children }: { id: string; overline: string; title: string; note?: string; action?: [string, string]; children: React.ReactNode }) {
  return (
    <Container id={id} component="section" aria-labelledby={`${id}-heading`} maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 }, scrollMarginTop: { xs: 58, md: 72 } }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 2, mb: note ? 1.25 : 3 }}>
        <Box>
          <Typography variant="overline" color="text.secondary">{overline}</Typography>
          <Typography id={`${id}-heading`} variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.6rem", md: "2rem" }, mt: .5 }}>{title}</Typography>
        </Box>
        {action && <Button component={Link} href={action[1]} endIcon={<ArrowForwardRoundedIcon />} sx={{ px: 0 }}>{action[0]}</Button>}
      </Box>
      {note && <Typography color="text.secondary" sx={{ maxWidth: 820, lineHeight: 1.7, mb: 3, fontSize: ".95rem" }}>{note}</Typography>}
      {children}
    </Container>
  );
}
