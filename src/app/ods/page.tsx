import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Box, Container, Divider, Stack, Typography } from "@mui/material";
import { SdgIcon } from "@/components/SdgIcon";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatDate, formatShare, getAllSdgLinks, getCommitments } from "@/lib/hrct";
import { SDG_TARGET_COUNT, summarizeSdgs, UHRI_URL, UN_SDG_GUIDELINES_URL, UN_SDG_URL } from "@/lib/sdg";
import { brand } from "@/brand";

export const metadata: Metadata = {
  title: "ODS | Human Rights Commitment Tracker",
  description: "Los Objetivos de Desarrollo Sostenible y las metas de la Agenda 2030 con los que se relacionan las recomendaciones de derechos humanos dirigidas a España.",
};

const link = { color: "primary.main", textDecorationColor: brand.accent, textUnderlineOffset: "4px", "&:hover": { color: "secondary.dark" } };

// One headline finding: a figure and what it refers to.
function Reading({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <Box sx={{ py: 2.5, px: { md: 3 }, borderTop: { xs: `1px solid ${brand.border}`, md: 0 }, borderLeft: { md: `1px solid ${brand.border}` }, "&:first-of-type": { pl: 0, borderLeft: 0, borderTop: 0 } }}>
      <Typography variant="overline" color="text.secondary">{label}</Typography>
      <Typography color="primary.main" sx={{ fontSize: "2rem", fontWeight: 500, lineHeight: 1.1, mt: .5 }}>{value}</Typography>
      <Typography variant="body2" color="primary.main" sx={{ mt: 1 }}>{children}</Typography>
    </Box>
  );
}

function Section({ id, overline, title, children }: { id: string; overline: string; title: string; children: React.ReactNode }) {
  return (
    <Container component="section" aria-labelledby={id} maxWidth="lg" sx={{ py: { xs: 5, md: 7 }, borderTop: "1px solid", borderColor: "divider" }}>
      <Typography variant="overline" color="text.secondary">{overline}</Typography>
      <Typography id={id} variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.8rem", md: "2.25rem" }, mt: .5, mb: 2.5 }}>{title}</Typography>
      {children}
    </Container>
  );
}

const keyFigures: [string, string][] = [
  ["17", "objetivos"],
  [String(SDG_TARGET_COUNT), "metas que los concretan"],
  ["193", "Estados Miembros de las Naciones Unidas los aprobaron en 2015"],
  ["2030", "año fijado para alcanzarlos"],
];

export default async function SdgPage() {
  const [commitments, links] = await Promise.all([getCommitments(), getAllSdgLinks()]);
  const total = commitments.length;
  const { goals, linked } = summarizeSdgs(commitments.map((c) => c.public_id), links || []);
  const ranked = [...goals].sort((a, b) => b.public_ids.length - a.public_ids.length);
  const leading = ranked[0];
  const topTarget = goals.flatMap((g) => Object.entries(g.byTarget).map(([code, ids]) => ({ code, count: ids.length }))).sort((a, b) => b.count - a.count)[0];
  const goalsWithLinks = goals.filter((g) => g.public_ids.length).length;
  const published = formatDate(links?.find((l) => l.source_published_at)?.source_published_at);
  const max = leading.public_ids.length;

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 } }}>
          <Typography variant="overline" color="primary.main" sx={{ borderLeft: "3px solid", borderColor: "secondary.main", pl: 1.5 }}>Agenda 2030 · Naciones Unidas</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2.2rem", md: "3rem" }, mt: 1 }}>Objetivos de Desarrollo Sostenible</Typography>
          <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 820, lineHeight: 1.75 }}>
            Los Objetivos de Desarrollo Sostenible (ODS) son el plan común que los Estados Miembros de las Naciones Unidas acordaron para erradicar la pobreza, reducir las desigualdades y proteger el planeta de aquí a 2030. Esta página muestra con qué objetivos y metas se relaciona cada una de las recomendaciones de derechos humanos que España recibió en el Examen Periódico Universal.
          </Typography>
          {/* Official logo for entities outside the United Nations system: colour version, on white. */}
          <Box sx={{ mt: 4, maxWidth: 460 }}>
            <Image src="/images/ods/S_SDG_logo_without_UN_emblem_horizontal_Transparent_WEB.png" alt="Objetivos de Desarrollo Sostenible" width={2559} height={336} sizes="(min-width: 600px) 460px, 100vw" priority style={{ display: "block", width: "100%", height: "auto" }} />
          </Box>
        </Container>

        <Divider />

        <Container component="section" aria-labelledby="sdg-goals-heading" maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
          <Typography variant="overline" color="text.secondary">Recomendaciones a España</Typography>
          <Typography id="sdg-goals-heading" variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.8rem", md: "2.25rem" }, mt: .5 }}>A qué objetivos contribuyen las recomendaciones</Typography>

          {links === null && <Typography color="text.secondary" sx={{ mt: 2 }}>No se ha podido cargar la relación entre las recomendaciones y los ODS. Los objetivos pueden consultarse igualmente.</Typography>}

          {links !== null && linked > 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(3,minmax(0,1fr))" }, borderBottom: "1px solid", borderColor: "divider", mt: 2 }}>
              <Reading label="Recomendaciones con algún ODS" value={`${linked} de ${total}`}>
                {formatShare(linked, total)} del examen, repartidas en {goalsWithLinks} de los 17 objetivos
              </Reading>
              <Reading label="Objetivo con más recomendaciones" value={formatShare(max, total)}>
                ODS {leading.goal.number} · {leading.goal.name} · {max} recomendaciones
              </Reading>
              {topTarget && (
                <Reading label="Meta más citada" value={`Meta ${topTarget.code}`}>
                  {topTarget.count} recomendaciones se relacionan con ella
                </Reading>
              )}
            </Box>
          )}

          {/* The 17 icons, whole and in their official order, aligned to the left. */}
          <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 4, p: 0, display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(3,minmax(0,1fr))", md: "repeat(6,minmax(0,1fr))" }, columnGap: 2, rowGap: 3.5 }}>
            {goals.map(({ goal, public_ids }, index) => {
              const count = public_ids.length;
              return (
                <Box component="li" key={goal.number} sx={{ minWidth: 0 }}>
                  <Box component={Link} href={`/ods/${goal.number}`} sx={{ display: "block", color: "primary.main", textDecoration: "none", "&:hover .sdg-count": { textDecoration: "underline", textDecorationColor: brand.accent, textUnderlineOffset: "4px" }, "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 4 } }}>
                    <SdgIcon goal={goal} sizes="(min-width: 900px) 180px, (min-width: 600px) 33vw, 50vw" priority={index < 6} />
                    {links !== null && (
                      <>
                        <Typography className="sdg-count" sx={{ mt: 1.25, fontWeight: 500, lineHeight: 1.3, color: count ? "primary.main" : "text.secondary" }}>
                          {count ? `${count} ${count === 1 ? "recomendación" : "recomendaciones"}` : "Sin recomendaciones"}
                        </Typography>
                        <Box aria-hidden sx={{ height: 4, mt: .9, bgcolor: "rgba(0,163,224,.16)" }}>
                          <Box sx={{ height: 1, width: `${max ? (100 * count) / max : 0}%`, bgcolor: brand.accentInk }} />
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3, maxWidth: 860, lineHeight: 1.6 }}>
            Cada icono lleva al objetivo, a sus metas y a las recomendaciones relacionadas. Una recomendación puede relacionarse con varios objetivos, por lo que las cifras suman más que el total de recomendaciones.
          </Typography>
        </Container>

        <Section id="sdg-about-heading" overline="La Agenda 2030" title="Qué son los ODS">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,7fr) minmax(0,4fr)" }, columnGap: 8, rowGap: 4 }}>
            <Stack spacing={1.6} sx={{ maxWidth: 780, "& p": { lineHeight: 1.8 } }}>
              <Typography>
                En septiembre de 2015, la Asamblea General de las Naciones Unidas aprobó la Agenda 2030 para el Desarrollo Sostenible (resolución A/RES/70/1). La Agenda fija 17 objetivos que abarcan desde el fin de la pobreza y la igualdad de género hasta la acción por el clima y el acceso a la justicia, y se aplica a todos los países, también a los desarrollados como España.
              </Typography>
              <Typography>
                Cada objetivo se concreta en metas. Las numeradas (1.1, 1.2…) describen el resultado que se quiere lograr; las que llevan una letra (1.a, 1.b…) se refieren a los medios para conseguirlo, como la financiación, las leyes o la cooperación. Las metas son las que permiten medir si se avanza.
              </Typography>
              <Typography>
                La Agenda promete «que nadie se quedará atrás» y se compromete a llegar primero a los más rezagados. Por eso sus objetivos y los derechos humanos se refuerzan mutuamente.
              </Typography>
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", columnGap: 3, rowGap: 3, alignContent: "start", p: { xs: 2.25, md: 3 }, bgcolor: brand.soft, borderTop: `2px solid ${brand.accent}` }}>
              {keyFigures.map(([value, label]) => (
                <Box key={label}>
                  <Typography color="primary.main" sx={{ fontSize: "2rem", fontWeight: 500, lineHeight: 1 }}>{value}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: .75, lineHeight: 1.5 }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Section>

        <Section id="sdg-rights-heading" overline="ODS y derechos humanos" title="Por qué se relacionan con las recomendaciones">
          <Stack spacing={1.6} sx={{ maxWidth: 860, "& p": { lineHeight: 1.8 } }}>
            <Typography>
              La propia Agenda 2030 declara que sus fundamentos son la Declaración Universal de Derechos Humanos y los tratados internacionales de derechos humanos. Muchas de sus metas recogen, con otras palabras, obligaciones que los Estados ya tienen: acabar con la discriminación, garantizar la educación y la salud o proteger frente a la violencia.
            </Typography>
            <Typography>
              Las recomendaciones del Examen Periódico Universal señalan qué debe mejorar un país en materia de derechos humanos. Cuando una recomendación se cumple, se avanza también en las metas de los ODS con las que está relacionada. Leer ambas cosas juntas ayuda a ver qué hay detrás de cada objetivo y qué medidas concretas se le piden a España.
            </Typography>
            <Typography>
              Hay una diferencia importante: los ODS son un compromiso político, mientras que los derechos humanos son obligaciones jurídicas. Que una recomendación se relacione con un objetivo no dice nada sobre su grado de cumplimiento, que se valora en la ficha de cada recomendación.
            </Typography>
          </Stack>
        </Section>

        <Section id="sdg-method-heading" overline="Fuente y método" title="Cómo se establece la relación">
          <Stack spacing={1.6} sx={{ maxWidth: 860, "& p": { lineHeight: 1.8 } }}>
            <Typography>
              La relación entre cada recomendación y los ODS procede del <Box component="a" href={UHRI_URL} target="_blank" rel="noreferrer" sx={link}>Índice Universal de los Derechos Humanos</Box>, la base de datos de la Oficina del Alto Comisionado de las Naciones Unidas para los Derechos Humanos (ACNUDH), que asigna objetivos y metas a las recomendaciones de los mecanismos de derechos humanos{published ? `. Los datos que se muestran se publicaron en el Índice el ${published}` : ""}. HRCT los reproduce tal como figuran en la fuente: no añade ni modifica relaciones.
            </Typography>
            <Typography>
              En cada recomendación se muestran solo las metas con las que se relaciona, no todas las del objetivo. En algunos casos la fuente relaciona una recomendación con un objetivo en su conjunto, sin una meta concreta{links !== null && linked > 0 && total > linked ? `, y ${total - linked} recomendaciones no tienen ningún ODS asignado` : ""}.
            </Typography>
            <Typography>
              El nombre de los objetivos y el texto de las metas son los oficiales en español de la resolución A/RES/70/1 de la Asamblea General.
            </Typography>
          </Stack>
        </Section>

        <Container maxWidth="lg" sx={{ py: 3.5, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: 940, lineHeight: 1.7 }}>
            El logotipo y los 17 iconos de los ODS son materiales oficiales de las Naciones Unidas y se utilizan aquí con fines informativos, conforme a sus <Box component="a" href={UN_SDG_GUIDELINES_URL} target="_blank" rel="noreferrer" sx={{ color: "inherit" }}>directrices de uso</Box>. Su uso no implica el respaldo de las Naciones Unidas a Blue Human ni a este sitio. El contenido de esta página no ha sido aprobado por las Naciones Unidas y no refleja las opiniones de las Naciones Unidas, de sus funcionarios ni de sus Estados Miembros. Más información en <Box component="a" href={UN_SDG_URL} target="_blank" rel="noreferrer" sx={{ color: "inherit" }}>un.org/sustainabledevelopment/es</Box>.
          </Typography>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
