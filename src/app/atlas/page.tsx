import type { Metadata } from "next";
import Link from "next/link";
import type { SvgIconComponent } from "@mui/icons-material";
import AccountBalanceRounded from "@mui/icons-material/AccountBalanceRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import MenuBookRounded from "@mui/icons-material/MenuBookRounded";
import PublicRounded from "@mui/icons-material/PublicRounded";
import ShieldRounded from "@mui/icons-material/ShieldRounded";
import { Box, Button, Container, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell } from "@/components/atlas/AtlasShell";
import { AtlasSearchBox } from "@/components/atlas/AtlasSearchBox";
import { CommitmentTiles } from "@/components/atlas/CommitmentTiles";
import { CoreTreaties } from "@/components/atlas/CoreTreaties";
import { GuideForm } from "@/components/atlas/GuideForm";
import { RightTiles } from "@/components/atlas/RightTiles";
import { Figure } from "@/components/Figure";
import { getAcceptance, getBodies, getCountries, getDecisions, getInstruments, getMatrix, getProcedures, getReport, getRights } from "@/lib/atlas/data";
import { countryPath, instrumentPath, longDate, rightPath, systemNames, systemOrder } from "@/lib/atlas/labels";
import { atlasAreas, type AtlasArea } from "@/lib/atlas/sections";
import { getCommitments } from "@/lib/hrct";

export const metadata: Metadata = {
  title: "Human Rights Atlas | Human Rights Commitment Institute",
  description: "Qué reconoce cada tratado de derechos humanos, qué ha aceptado cada Estado y ante qué órganos se puede acudir. Con el texto oficial y la fuente de cada dato.",
};

const areaIcons: Record<AtlasArea["id"], SvgIconComponent> = { derechos: AccountBalanceRounded, instrumentos: MenuBookRounded, paises: PublicRounded, proteccion: ShieldRounded };

// Ways in for someone who does not know where to start: each one opens a real page of the Atlas.
const suggestions: [string, string][] = [
  ["Derecho a la vivienda", rightPath("vivienda")],
  ["España", countryPath("ESP")],
  ["Convención sobre los Derechos del Niño", instrumentPath("un-crc")],
  ["Prohibición de la tortura", rightPath("tortura")],
  ["Acudir a un comité de la ONU", "/atlas/mechanisms/guide?pais=ESP"],
];

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

  const figures: Record<AtlasArea["id"], string> = {
    derechos: `${rights.length} derechos`,
    instrumentos: `${legal.length} instrumentos · ${readable} textos legibles`,
    paises: `${countries.length} Estados`,
    proteccion: `${procedures.length} procedimientos · ${bodies.length} órganos`,
  };

  return (
    <AtlasShell>
      {/* Hero: what the Atlas answers, and a search that accepts anything. */}
      <Box sx={{ position: "relative", overflow: "hidden", bgcolor: brand.navy, color: "#fff" }}>
        <Graticule />
        <Container maxWidth="lg" sx={{ position: "relative", pt: { xs: 5, md: 8 }, pb: { xs: 9, md: 12 } }}>
          <Typography variant="overline" sx={{ color: "rgba(255,255,255,.72)", letterSpacing: ".16em" }}>Human Rights Atlas</Typography>
          <Typography variant="h1" sx={{ mt: 1, maxWidth: 820, fontFamily: "var(--font-serif), Georgia, serif", fontWeight: 400, fontSize: { xs: "2.2rem", sm: "2.8rem", md: "3.6rem" }, lineHeight: 1.08, letterSpacing: "-.01em" }}>
            Los derechos humanos, de la norma a la protección
          </Typography>
          <Typography sx={{ mt: 2.25, maxWidth: 640, lineHeight: 1.7, color: "rgba(255,255,255,.82)", fontSize: { md: "1.1rem" } }}>
            Qué reconoce cada tratado, a qué se ha comprometido cada Estado y ante quién se puede acudir. Con el texto oficial y la fuente de cada dato.
          </Typography>
          <Box sx={{ mt: 4, maxWidth: 720 }}><AtlasSearchBox /></Box>
          <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,.65)", mr: .5 }}>Por ejemplo:</Typography>
            {suggestions.map(([label, href]) => (
              <Box key={href} component={Link} href={href} sx={{ px: 1.5, py: .6, fontSize: ".82rem", color: "#fff", textDecoration: "none", border: "1px solid rgba(255,255,255,.28)", borderRadius: 99, "&:hover": { bgcolor: "rgba(0,163,224,.22)", borderColor: brand.accent }, "&:focus-visible": { outline: `2px solid ${brand.accent}`, outlineOffset: 2 } }}>{label}</Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* The four areas of the Atlas, as doors that overlap the hero. */}
      <Container maxWidth="lg" sx={{ position: "relative", mt: { xs: -6, md: -8 } }}>
        <Box component="nav" aria-label="Áreas del Atlas" sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, gap: "1px", bgcolor: "divider", border: "1px solid", borderColor: "divider", boxShadow: "0 18px 40px rgba(10,30,51,.12)" }}>
          {atlasAreas.map((area) => {
            const Icon = areaIcons[area.id];
            return (
              <Box key={area.id} sx={{ bgcolor: "#fff", p: { xs: 2.5, md: 3 }, display: "flex", flexDirection: "column", borderTop: `3px solid ${brand.accent}` }}>
                <Box component={Link} href={area.href} sx={{ color: "inherit", textDecoration: "none", "&:hover .t": { color: brand.accentInk }, "&:hover .go": { transform: "translateX(3px)" } }}>
                  <Icon aria-hidden sx={{ fontSize: 30, color: brand.accentInk }} />
                  <Box sx={{ display: "flex", alignItems: "center", gap: .75, mt: 1.25 }}>
                    <Typography className="t" component="h2" variant="h5" color="primary.main" sx={{ transition: "color .15s" }}>{area.label}</Typography>
                    <ArrowForwardRoundedIcon className="go" fontSize="small" sx={{ color: brand.accentInk, transition: "transform .15s" }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: .75, lineHeight: 1.55 }}>{area.question}</Typography>
                </Box>
                <Typography variant="caption" sx={{ mt: 1.5, color: brand.navy, fontWeight: 600 }}>{figures[area.id]}</Typography>
                {area.pages.length > 1 && (
                  <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1.5, p: 0, pt: 1.5, borderTop: "1px solid", borderColor: "divider", display: "grid", gap: .5 }}>
                    {area.pages.slice(1).map((p) => <li key={p.href}><Box component={Link} href={p.href} sx={{ fontSize: ".85rem", color: brand.accentInk, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{p.label}</Box></li>)}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Container>

      <Block id="derechos" overline="Empezar por un derecho" title="¿Qué derecho le interesa?" action={["Ver todos los derechos", "/atlas/topics"]}>
        <RightTiles rights={rights} compact />
      </Block>

      <Block id="compromisos" overline="Países" title="¿Quién se ha comprometido?" action={["Ver un tratado concreto", "/atlas/ratifications"]}
        note={`Cada recuadro es un Estado. El color indica en cuántos de los ${core.length} tratados y protocolos fundamentales de las Naciones Unidas consta su consentimiento —ratificación, adhesión o sucesión— en el registro del depositario. ${all} Estados los han aceptado todos. No es una puntuación ni un mapa: no traza fronteras.`}>
        <CommitmentTiles tiles={tiles} total={core.length} highlight="ESP" />
      </Block>

      <Block id="tratados" overline="Instrumentos" title="Los nueve tratados fundamentales de la ONU" action={["Abrir la biblioteca", "/atlas/instruments"]}
        note="Cuántos Estados son parte en cada tratado y en sus protocolos. Los protocolos facultativos son tratados distintos: ser parte en la convención no obliga a aceptarlos.">
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,1.4fr) minmax(0,1fr)" }, columnGap: 7, rowGap: 4 }}>
          <CoreTreaties instruments={instruments} />
          <Box sx={{ alignSelf: "start", p: { xs: 2.5, md: 3 }, bgcolor: brand.soft, borderLeft: `3px solid ${brand.accent}` }}>
            <Typography variant="overline" color="text.secondary">El sistema en cifras</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 3, mt: 1.5 }}>
              {systemOrder.map((s) => (
                <Box key={s}>
                  <Typography color="primary.main" sx={{ fontWeight: 600, fontSize: ".95rem" }}>{systemNames[s]}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: .5, lineHeight: 1.6 }}>
                    {legal.filter((i) => i.system === s).length} instrumentos<br />{bodies.filter((b) => b.system === s).length} órganos<br />{procedures.filter((p) => p.system === s).length} procedimientos
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Block>

      {/* Spain in focus: the readers of the site are in Spain, and the HRCI follows its commitments. */}
      <Box component="section" aria-labelledby="espana-heading" sx={{ bgcolor: brand.soft, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", mt: { xs: 2, md: 3 } }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,1fr) minmax(0,2fr)" }, columnGap: 6, rowGap: 3, alignItems: "center" }}>
            <Box>
              <Typography variant="overline" color="text.secondary">España en el sistema internacional</Typography>
              <Typography id="espana-heading" variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.6rem", md: "2rem" }, mt: .5 }}>Lo que España ha aceptado</Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 2.5 }}>
                <Button component={Link} href={countryPath("ESP")} variant="contained" disableElevation endIcon={<ArrowForwardRoundedIcon />}>Ficha de España</Button>
                <Button component={Link} href="/commitments" variant="outlined">Seguimiento del EPU</Button>
              </Box>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, columnGap: 3, rowGap: 3 }}>
              <Figure value={String(spain.core)} of={`de ${core.length}`}>tratados y protocolos fundamentales de la ONU con consentimiento registrado</Figure>
              <Figure value={String(spain.accepted)} of={spain.procedures ? `de ${spain.procedures}` : undefined}>procedimientos de los comités de la ONU aceptados</Figure>
              <Figure value={String(spain.decisions)}>decisiones de comités de la ONU sobre comunicaciones relativas a España</Figure>
              {commitments.length > 0 && <Figure value={String(commitments.length)}>recomendaciones del EPU a España en seguimiento por el HRCI</Figure>}
            </Box>
          </Box>
        </Container>
      </Box>

      <Block id="proteccion" overline="Protección" title="¿Ante quién se puede acudir?" action={["Ver todos los procedimientos", "/atlas/mechanisms"]}
        note="Elija un Estado y, si quiere, un derecho: el orientador muestra qué procedimientos internacionales constan en los registros para ese Estado y qué requisitos fija cada norma. No valora casos ni pide datos personales.">
        <GuideForm countries={countries} rights={rights} />
        <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 3, p: 0, display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, columnGap: 3 }}>
          {[["Órganos", "/atlas/bodies", "Tribunales, comités y comisiones, con su norma"], ["Jurisprudencia", "/atlas/case-law", "Observaciones generales y decisiones"], ["Tribunal Europeo", "/atlas/bodies/coe-ecthr", "Composición, competencias y demanda individual"], ["Comité de Derechos Humanos", "/atlas/bodies/un-ccpr", "El órgano del Pacto de Derechos Civiles y Políticos"]].map(([label, href, hint]) => (
            <Box component="li" key={href} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
              <Box component={Link} href={href} sx={{ display: "block", py: 1.5, color: "inherit", textDecoration: "none", "&:hover .t": { color: brand.accentInk } }}>
                <Typography className="t" color="primary.main" sx={{ fontWeight: 500, transition: "color .15s" }}>{label}</Typography>
                <Typography variant="caption" color="text.secondary">{hint}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Block>

      <Container maxWidth="lg" sx={{ pt: 1 }}>
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
    <Container id={id} component="section" aria-labelledby={`${id}-heading`} maxWidth="lg" sx={{ py: { xs: 4.5, md: 6.5 }, scrollMarginTop: { xs: 58, md: 72 } }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 2, mb: note ? 1.5 : 3 }}>
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

// Meridians and parallels behind the hero: the Atlas as a map of the law, drawn faintly.
function Graticule() {
  return (
    <Box component="svg" aria-hidden viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" sx={{ position: "absolute", right: { xs: -260, md: -120 }, top: { xs: -40, md: -90 }, width: { xs: 520, md: 760 }, height: { xs: 520, md: 760 }, opacity: { xs: .1, md: .16 }, pointerEvents: "none" }}>
      <g fill="none" stroke="#fff" strokeWidth="1.2">
        <circle cx="300" cy="300" r="290" />
        {[70, 140, 210].map((rx) => <ellipse key={rx} cx="300" cy="300" rx={rx} ry="290" />)}
        {[-210, -140, -70, 0, 70, 140, 210].map((y) => {
          const half = Math.sqrt(290 ** 2 - y ** 2);
          return <line key={y} x1={300 - half} x2={300 + half} y1={300 + y} y2={300 + y} />;
        })}
      </g>
      <line x1="10" x2="590" y1="300" y2="300" stroke={brand.accent} strokeWidth="2" />
    </Box>
  );
}
