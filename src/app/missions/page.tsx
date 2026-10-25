import type { Metadata } from "next";
import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Box, Button, Container, Divider, Stack, Typography } from "@mui/material";
import { LinkBlocks, type LinkBlock } from "@/components/LinkBlocks";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { brand } from "@/brand";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Nuevas misiones | Human Rights Commitment Institute",
  description: "Invitación a abrir una misión del Human Rights Commitment Institute en otro país, en cooperación con Blue Human: objetivo, principios rectores, reparto de funciones y proceso.",
};

// The contact form opens with the mission enquiry already chosen.
const PROPOSE = "/contact?tipo=mision";

// What a mission produces, each shown working in the mission of Spain.
const outputs: LinkBlock[] = [
  {
    title: "Un registro público",
    text: "Cada recomendación del último ciclo del Examen Periódico Universal dirigida al país, con su texto oficial, la respuesta del Estado y una ficha propia.",
    links: [{ label: "Ver el registro de España", href: "/commitments" }],
  },
  {
    title: "Valoraciones basadas en evidencias",
    text: "Un estado de cumplimiento para cada recomendación, con nivel de confianza, justificación y fuentes citadas, y un historial que no se sobrescribe.",
    links: [{ label: "Leer la metodología", href: "/methodology" }],
  },
  {
    title: "Seguridad humana y Agenda 2030",
    text: "La relación de cada recomendación con las dimensiones de la seguridad humana y con los ODS y sus metas, con la justificación de cada relación.",
    links: [{ label: "Ver los ODS", href: "/ods" }],
  },
  {
    title: "Seguimiento de la actualidad",
    text: "La consulta diaria de las fuentes públicas del país, publicada aparte de la evidencia y sin modificar por sí sola ninguna valoración.",
    links: [{ label: "Ver la actualidad", href: "/monitoring" }],
  },
];

const principles: [string, string][] = [
  ["Independencia", "Ni gobiernos, ni partidos, ni financiadores deciden qué se valora ni cómo. Ninguna aportación económica condiciona una conclusión."],
  ["Evidencia antes que opinión", "No se publica ninguna conclusión sobre el cumplimiento sin una fuente pública citada. Un anuncio no es cumplimiento, y la falta de evidencia no se presenta como incumplimiento."],
  ["Rigor y prudencia", "Cada recomendación se analiza a partir de su texto oficial, sin inferencias ni clasificaciones forzadas. Ante la duda, se prefiere no afirmar."],
  ["Transparencia", "Las fuentes, el método, los datos y el código son públicos. Cualquier persona puede comprobar una valoración y pedir que se corrija."],
  ["Integridad del registro", "Las valoraciones publicadas no se sobrescriben: cada cambio queda en el historial. El texto oficial de las Naciones Unidas se muestra siempre separado de la valoración."],
  ["Liderazgo nacional", "Cada misión la dirige una organización del país, que conoce su contexto, sus instituciones y sus fuentes. Blue Human acompaña y vela por la coherencia del método; no sustituye a la organización socia."],
  ["Diálogo y derecho de réplica", "El fin es que los compromisos se cumplan, no señalar. Las instituciones aludidas pueden aportar información y ejercer su derecho de réplica, que se revisa como cualquier otra aportación."],
  ["No causar daño", "La seguridad de quienes aportan información y de los equipos de la misión está por encima de la publicación. No se publica nada que pueda ponerlos en riesgo."],
];

const contributions: { party: string; items: string[] }[] = [
  {
    party: "Blue Human",
    items: [
      "La metodología del HRCI y sus actualizaciones.",
      "La plataforma pública del registro, los datos y el seguimiento de fuentes, y su mantenimiento.",
      "La formación del equipo y el acompañamiento durante la puesta en marcha.",
      "La revisión de calidad y la confirmación final de las valoraciones.",
      "El uso de la marca HRCI en las condiciones del acuerdo.",
    ],
  },
  {
    party: "Organización socia",
    items: [
      "Un equipo que conoce el país, su sistema institucional y sus fuentes oficiales.",
      "La identificación de las fuentes nacionales: boletines oficiales, estadísticas, presupuestos e informes institucionales.",
      "La elaboración de las fichas y las valoraciones conforme al método.",
      "La relación con la sociedad civil y las instituciones del país.",
      "La difusión de los resultados en el país y en su lengua.",
    ],
  },
];

const steps: [string, string][] = [
  ["Propuesta", "La organización presenta su propuesta por el formulario de contacto: quién es, en qué país trabaja y por qué quiere abrir la misión."],
  ["Conversación inicial", "Blue Human y la organización comprueban el encaje: independencia, experiencia, capacidad y motivación."],
  ["Estudio de viabilidad", "Se analizan el ciclo del Examen Periódico Universal vigente en el país, las fuentes disponibles, el contexto y los riesgos para el equipo."],
  ["Acuerdo de cooperación", "Un acuerdo escrito fija las funciones de cada parte, la gobernanza, la financiación, la protección de datos y el uso de la marca."],
  ["Puesta en marcha", "Se incorpora el catálogo oficial de recomendaciones, se forma al equipo y se publica el registro del país, que crece a medida que se completan las valoraciones."],
];

const number = (index: number) => String(index + 1).padStart(2, "0");

function Section({ id, overline, title, intro, children }: { id: string; overline: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <Box component="section" id={id} aria-labelledby={`${id}-heading`} sx={{ pt: 4, borderTop: "1px solid", borderColor: "divider", scrollMarginTop: { xs: 58, md: 72 } }}>
      <Typography variant="overline" color="text.secondary">{overline}</Typography>
      <Typography id={`${id}-heading`} variant="h4" component="h2" color="primary.main" sx={{ mt: .45 }}>{title}</Typography>
      {intro && <Typography color="text.secondary" sx={{ mt: 1.6, maxWidth: 860, lineHeight: 1.8 }}>{intro}</Typography>}
      <Box sx={{ mt: 3.5 }}>{children}</Box>
    </Box>
  );
}

export default function MissionsPage() {
  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,8fr) minmax(0,4fr)" }, columnGap: 8, rowGap: 4, alignItems: "end" }}>
            <Box>
              <Typography variant="overline" color="primary.main">Nuevas misiones</Typography>
              <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, mt: 1.1 }}>Abrir una misión del HRCI en otro país</Typography>
              <Typography color="text.secondary" sx={{ mt: 1.8, maxWidth: 760, lineHeight: 1.75 }}>
                El HRCI hace un seguimiento independiente, público y basado en evidencias de los compromisos de derechos humanos que asumen los Estados ante las Naciones Unidas. Blue Human invita a organizaciones de otros países a abrir con ella una misión del HRCI en el suyo, con el mismo método y el mismo nivel de exigencia.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2.5 }} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mt: 3 }}>
                <Button component={Link} href={PROPOSE} variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ px: 3 }}>Proponer una misión</Button>
                <Button component={Link} href="#proceso" sx={{ px: { sm: 0 } }}>Cómo se abre una misión</Button>
              </Stack>
            </Box>

            <Box component="aside" aria-label="Misión en curso" sx={{ p: { xs: 2.25, md: 3 }, bgcolor: brand.soft, borderTop: "2px solid", borderColor: "secondary.main" }}>
              <Typography variant="overline" color="text.secondary">Misión en curso</Typography>
              <Typography variant="h3" component="p" color="primary.main" sx={{ fontSize: { xs: "1.9rem", md: "2.2rem" }, mt: .25 }}>España</Typography>
              <Stack divider={<Divider flexItem />} sx={{ mt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                {[["Examen Periódico Universal", "Cuarto ciclo"], ["Recomendaciones", "324"], ["Documento", "A/HRC/60/8"]].map(([label, value]) => (
                  <Stack key={label} direction="row" justifyContent="space-between" spacing={2} sx={{ py: 1 }}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{value}</Typography>
                  </Stack>
                ))}
              </Stack>
              <Button component={Link} href="/commitments" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 1, px: 0, "& .MuiButton-endIcon svg": { fontSize: 18 } }}>Ver el registro</Button>
            </Box>
          </Box>
        </Container>

        <Divider />

        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 6 } }}>
          <Stack spacing={{ xs: 6, md: 7 }}>
            <Section
              id="objetivo"
              overline="Objetivo"
              title="Qué es una misión del HRCI"
              intro="Una misión es el seguimiento, en un país, de las recomendaciones de derechos humanos que ha recibido en el Examen Periódico Universal, con el mismo método y el mismo registro público que la misión de España. La lleva a cabo una organización del país en cooperación con Blue Human. Su finalidad es que los compromisos de un Estado puedan comprobarse con datos, que su cumplimiento se conozca y que la distancia entre lo aceptado y lo hecho sea visible para la ciudadanía y para las instituciones."
            >
              <LinkBlocks blocks={outputs} columns={2} />
            </Section>

            <Section
              id="principios"
              overline="Principios rectores"
              title="Lo que comparten todas las misiones"
              intro="Cada misión publica bajo el nombre del HRCI, y por eso todas se rigen por los mismos principios. No se adaptan a cada país: son la condición para que los resultados de distintos países sean fiables y comparables."
            >
              <Box component="ol" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2,minmax(0,1fr))" }, columnGap: 6, borderTop: "1px solid", borderColor: "divider" }}>
                {principles.map(([title, text], index) => (
                  <Box component="li" key={title} sx={{ display: "grid", gridTemplateColumns: "3.25rem minmax(0,1fr)", py: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
                    <Typography aria-hidden sx={{ color: "secondary.dark", fontWeight: 500, fontSize: "1.35rem", lineHeight: 1.3, fontVariantNumeric: "tabular-nums" }}>{number(index)}</Typography>
                    <Box>
                      <Typography variant="h6" component="h3" color="primary.main" sx={{ lineHeight: 1.35 }}>{title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: .75, lineHeight: 1.7 }}>{text}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Section>

            <Section
              id="cooperacion"
              overline="Cooperación"
              title="Qué aporta cada parte"
              intro="La misión es un trabajo conjunto: la organización socia aporta el conocimiento del país y Blue Human, el método, la plataforma y la garantía de calidad que comparten todas las misiones."
            >
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2,minmax(0,1fr))" }, columnGap: 6, rowGap: 5 }}>
                {contributions.map(({ party, items }) => (
                  <Box key={party} sx={{ pt: 2.5, borderTop: "2px solid", borderColor: "secondary.main" }}>
                    <Typography variant="h5" component="h3" color="primary.main">{party}</Typography>
                    <Box component="ul" sx={{ m: 0, mt: 1.5, p: 0, listStyle: "none" }}>
                      {items.map((item) => (
                        <Typography component="li" key={item} color="text.secondary" sx={{ position: "relative", pl: 2.25, py: .75, lineHeight: 1.65, "&::before": { content: '""', position: "absolute", left: 0, top: "1.15em", width: 8, height: 2, bgcolor: "secondary.main" } }}>
                          {item}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Section>

            <Section id="proceso" overline="Proceso" title="Cómo se abre una misión">
              <Box component="ol" sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: `repeat(${steps.length},minmax(0,1fr))` }, columnGap: 3 }}>
                {steps.map(([title, text], index) => (
                  <Box
                    component="li"
                    key={title}
                    sx={{
                      position: "relative",
                      // A line runs through the numbers: across on a wide screen, down on a narrow one.
                      pl: { xs: 6, md: 0 },
                      pb: { xs: index < steps.length - 1 ? 3 : 0, md: 0 },
                      "&::before": {
                        content: '""', position: "absolute", bgcolor: "divider",
                        ...(index < steps.length - 1 ? {} : { display: "none" }),
                        left: { xs: 17, md: 36 }, top: { xs: 36, md: 17 }, width: { xs: 2, md: "calc(100% - 12px)" }, height: { xs: "calc(100% - 36px)", md: 2 },
                      },
                    }}
                  >
                    <Box aria-hidden sx={{ position: { xs: "absolute", md: "static" }, left: 0, top: 0, width: 36, height: 36, display: "grid", placeItems: "center", bgcolor: "primary.main", color: "#fff", fontWeight: 600, fontSize: ".9rem", fontVariantNumeric: "tabular-nums" }}>
                      {index + 1}
                    </Box>
                    <Typography variant="h6" component="h3" color="primary.main" sx={{ mt: { xs: .5, md: 2 }, lineHeight: 1.35 }}>{title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: .75, lineHeight: 1.7 }}>{text}</Typography>
                  </Box>
                ))}
              </Box>
            </Section>

            <Section
              id="requisitos"
              overline="A quién se dirige"
              title="Quién puede proponer una misión"
              intro="Organizaciones de la sociedad civil, universidades y centros de investigación que trabajen en derechos humanos en el país, que puedan acreditar su independencia respecto del Gobierno y de los partidos políticos y que estén dispuestas a aplicar el método del HRCI y a publicar su trabajo conforme a sus principios."
            >
              <Box sx={{ p: { xs: 2.5, md: 4 }, bgcolor: "primary.main", color: "#fff", borderTop: "2px solid", borderColor: "secondary.main", display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,7fr) auto" }, columnGap: 6, rowGap: 2.5, alignItems: "center" }}>
                <Box>
                  <Typography variant="h5" component="h3">Proponer una misión</Typography>
                  <Typography sx={{ mt: 1, color: "rgba(255,255,255,.78)", lineHeight: 1.7, maxWidth: 640 }}>
                    La propuesta se envía por el formulario de contacto, con el tipo de consulta «Nueva misión del HRCI». Basta con presentar la organización, el país y el motivo de la propuesta. También puede escribirse a {CONTACT_EMAIL}.
                  </Typography>
                </Box>
                <Stack direction={{ xs: "column", sm: "row", md: "column" }} spacing={1} alignItems={{ xs: "stretch", sm: "center", md: "stretch" }}>
                  <Button component={Link} href={PROPOSE} variant="contained" color="secondary" endIcon={<ArrowForwardRoundedIcon />} sx={{ px: 3 }}>Proponer una misión</Button>
                  <Button component="a" href={`mailto:${CONTACT_EMAIL}`} sx={{ color: "#fff", "&:hover": { bgcolor: "rgba(0,163,224,.16)" }, "&.Mui-focusVisible": { outlineColor: "#fff" } }}>{CONTACT_EMAIL}</Button>
                </Stack>
              </Box>
            </Section>
          </Stack>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
