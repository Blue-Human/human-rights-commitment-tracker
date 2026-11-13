import type { Metadata } from "next";
import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Box, Container, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell } from "@/components/atlas/AtlasShell";
import { AtlasSearchBox } from "@/components/atlas/AtlasSearchBox";
import { Figure } from "@/components/Figure";
import { getBodies, getCountries, getDecisions, getInstruments, getInterpretations, getProcedures, getReport, getRights } from "@/lib/atlas/data";
import { ATLAS, longDate } from "@/lib/atlas/labels";

export const metadata: Metadata = {
  title: "Human Rights Atlas | Human Rights Commitment Institute",
  description: "Tratados, artículos, ratificaciones, órganos y mecanismos internacionales de protección de los derechos humanos, con su texto oficial y la fuente de cada dato.",
};

const actions: [string, string, string][] = [
  ["Explorar derechos", "/rights/topics", "Empezar por un derecho y llegar a los artículos que lo reconocen, a las interpretaciones de los comités y a los mecanismos que lo protegen."],
  ["Consultar instrumentos", "/rights/instruments", "Leer los tratados, protocolos y declaraciones artículo por artículo, con sus Estados Partes, reservas y declaraciones."],
  ["Encontrar mecanismos de protección", "/rights/mechanisms", "Qué órgano puede examinar un caso, quién puede acudir y qué requisitos y plazos fija cada procedimiento, citados de su norma."],
];

export default async function AtlasHome() {
  const [instruments, countries, bodies, procedures, interpretations, decisions, rights, report] = await Promise.all([
    getInstruments(), getCountries(), getBodies(), getProcedures(), getInterpretations(), getDecisions(), getRights(), getReport(),
  ]);
  const readable = instruments.filter((i) => i.texts.some((t) => t.complete)).length;
  const treaties = instruments.filter((i) => i.category !== "procedural").length;
  const links: [string, string, string][] = [
    ["Países", "/rights/countries", `${countries.length} Estados y participantes en los registros`],
    ["Ratificaciones", "/rights/ratifications", "Estado de cada tratado, Estado por Estado"],
    ["Comparar Estados", "/rights/compare", "Ratificaciones, protocolos y procedimientos aceptados"],
    ["Jurisprudencia", "/rights/case-law", `${interpretations.length} observaciones generales · ${decisions.items.length} decisiones`],
    ["Organismos", "/rights/bodies", `${bodies.length} tribunales, comités y comisiones`],
    ["Cronología", "/rights/timeline", "Adopción, entrada en vigor y documentos, por año"],
    ["Anotaciones", "/rights/annotations", "Notas firmadas de Blue Human, separadas del texto oficial"],
    ["Fuentes y cobertura", "/rights/sources", "Qué se ha recopilado, de dónde y con qué límites"],
    ["Investigación y seguimiento", "/commitments", "El seguimiento del HRCI de los compromisos de España"],
  ];

  return (
    <AtlasShell>
      <Box sx={{ bgcolor: brand.navy, color: "#fff" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
          <Typography variant="overline" sx={{ color: "rgba(255,255,255,.75)", borderLeft: "3px solid", borderColor: "secondary.main", pl: 1.5 }}>HRCI · Blue Human</Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: "2.3rem", md: "3.4rem" }, mt: 1.25, fontFamily: "var(--font-serif), Georgia, serif", fontWeight: 400 }}>{ATLAS}</Typography>
          <Typography sx={{ mt: 2, maxWidth: 720, lineHeight: 1.7, color: "rgba(255,255,255,.85)", fontSize: { md: "1.1rem" } }}>
            El derecho internacional de los derechos humanos con su texto oficial: tratados, artículos, ratificaciones, reservas, órganos y mecanismos de protección. Cada dato enlaza con la fuente institucional de la que procede.
          </Typography>
          <Box sx={{ mt: 3.5, maxWidth: 720 }}><AtlasSearchBox /></Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5.5 } }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(3,minmax(0,1fr))" }, gap: { xs: 2, md: 3 } }}>
          {actions.map(([title, href, text]) => (
            <Box key={href} component={Link} href={href} sx={{ display: "flex", flexDirection: "column", p: { xs: 2.5, md: 3 }, border: "1px solid", borderColor: "divider", borderTop: `3px solid ${brand.accent}`, color: "inherit", textDecoration: "none", minHeight: 190, "&:hover": { borderColor: brand.accentInk, "& .go": { transform: "translateX(3px)" } }, "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 2 } }}>
              <Typography component="h2" variant="h5" color="primary.main">{title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.7, flex: 1 }}>{text}</Typography>
              <ArrowForwardRoundedIcon className="go" sx={{ mt: 2, color: brand.accentInk, transition: "transform .15s" }} />
            </Box>
          ))}
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, columnGap: 4, rowGap: 3, mt: { xs: 4.5, md: 6 }, pt: 3.5, borderTop: "2px solid", borderColor: "secondary.main" }}>
          <Figure value={String(treaties)}>instrumentos de los sistemas universal y regionales</Figure>
          <Figure value={String(readable)} of={`de ${instruments.length}`}>textos legibles artículo por artículo, verificados</Figure>
          <Figure value={String(procedures.length)}>procedimientos documentados con su norma citada</Figure>
          <Figure value={String(rights.length)}>derechos para empezar la consulta</Figure>
        </Box>
      </Container>

      <Container component="section" aria-labelledby="atlas-more" maxWidth="lg" sx={{ py: { xs: 4, md: 5 }, borderTop: "1px solid", borderColor: "divider" }}>
        <Typography id="atlas-more" variant="overline" color="text.secondary">Más accesos</Typography>
        <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1.5, p: 0, display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(3,minmax(0,1fr))" }, columnGap: 4 }}>
          {links.map(([title, href, text]) => (
            <Box component="li" key={href} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
              <Box component={Link} href={href} sx={{ display: "block", py: 1.75, color: "inherit", textDecoration: "none", "&:hover .t": { color: brand.accentInk } }}>
                <Typography className="t" color="primary.main" sx={{ fontWeight: 500, transition: "color .15s" }}>{title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: .25 }}>{text}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>

      <Container maxWidth="lg" sx={{ pb: 5 }}>
        <Box sx={{ p: { xs: 2.25, md: 3 }, bgcolor: brand.soft, borderLeft: `3px solid ${brand.accent}` }}>
          <Typography variant="body2" sx={{ lineHeight: 1.75, maxWidth: 940 }}>
            El Atlas distingue siempre el <strong>texto jurídico oficial</strong>, las <strong>interpretaciones y decisiones de los órganos</strong>, la <strong>información procedimental oficial</strong> y las <strong>anotaciones editoriales de Blue Human</strong>, que se identifican como tales. No interpreta las normas ni valora la admisibilidad de ningún caso: las solicitudes se presentan siempre por los canales oficiales de cada órgano.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Última actualización de los datos: {longDate(report.run_at.slice(0, 10))}. <Link href="/rights/sources">Fuentes, cobertura y límites</Link>.
          </Typography>
        </Box>
      </Container>
    </AtlasShell>
  );
}
