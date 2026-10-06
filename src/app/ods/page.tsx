import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Box, Container, Divider, Stack, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { brand } from "@/brand";
import { DimensionIcon } from "@/components/DimensionIcon";
import { Figure } from "@/components/Figure";
import { RecordDisclosure } from "@/components/RecordDisclosure";
import { SdgExplorer, type SdgExplorerGoal } from "@/components/SdgExplorer";
import { SdgIcon } from "@/components/SdgIcon";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { dimensionCodes, dimensionNames, formatDate, formatShare, getAllHumanSecurityDimensions, getAllSdgLinks, getCommitments, isAssessed, type DimensionCode } from "@/lib/hrct";
import { countBy, SDG_TARGET_COUNT, sdgGoal, summarizeSdgs, targetText, UHRI_URL, UN_SDG_GUIDELINES_URL, UN_SDG_URL } from "@/lib/sdg";

export const metadata: Metadata = {
  title: "ODS | Human Rights Commitment Institute",
  description: "Los Objetivos de Desarrollo Sostenible y las metas de la Agenda 2030 con los que se relacionan las recomendaciones de derechos humanos dirigidas a España.",
};

const track = "rgba(0,163,224,.16)";
const plural = (n: number) => `${n} ${n === 1 ? "recomendación" : "recomendaciones"}`;
// "Seguridad comunitaria" → "Comunitaria": the columns share the word "Seguridad" as a label.
const shortName = (code: DimensionCode) => dimensionNames[code].replace(/^Seguridad\s+/i, "").replace(/^./, (letter) => letter.toUpperCase());

// Magnitude in one hue, light to dark. The steps follow the square root of the count, so that
// the many small figures of the matrix stay distinguishable next to the few large ones.
const ramp = ["#e6f5fb", "#b5e0f2", "#74c4e6", "#2f9cc9", "#006c95"];
const step = (count: number, max: number) => Math.min(ramp.length - 1, Math.floor(ramp.length * Math.sqrt(count / max) - 1e-9));

function Heading({ id, overline, title, children }: { id: string; overline: string; title: string; children?: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="overline" color="text.secondary">{overline}</Typography>
      <Typography id={id} variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.8rem", md: "2.25rem" }, mt: .5 }}>{title}</Typography>
      {children && <Typography color="text.secondary" sx={{ maxWidth: 760, mt: 1.25, lineHeight: 1.7 }}>{children}</Typography>}
    </Box>
  );
}

// The goal column stays in view while the matrix scrolls sideways on a narrow screen.
const sticky = { position: "sticky", left: 0, zIndex: 1, bgcolor: "#fff" } as const;

const section = { py: { xs: 5, md: 7 }, borderTop: "1px solid", borderColor: "divider" };

const brief: [string, string][] = [
  ["Objetivos y metas", "Cada objetivo se concreta en metas. Las numeradas (1.1) fijan el resultado que se busca; las que llevan letra (1.a), los medios para lograrlo."],
  ["Basados en los derechos humanos", "La Agenda 2030 se funda en la Declaración Universal de Derechos Humanos y promete que «nadie se quedará atrás». Cumplir una recomendación acerca también sus metas."],
  ["Compromiso político", "Los ODS no son obligaciones jurídicas, a diferencia de los derechos humanos. Que una recomendación se relacione con un objetivo no dice nada sobre su grado de cumplimiento."],
];

export default async function SdgPage() {
  const [commitments, links, dimensionLinks] = await Promise.all([getCommitments(), getAllSdgLinks(), getAllHumanSecurityDimensions().catch(() => [])]);
  const total = commitments.length;
  const byId = new Map(commitments.map((c) => [c.public_id, c]));
  const { goals, linked } = summarizeSdgs(commitments.map((c) => c.public_id), links || []);
  const dimensionsById: Record<string, DimensionCode[]> = {};
  for (const d of dimensionLinks) (dimensionsById[d.public_id] ??= []).push(d.code);

  const explorer: SdgExplorerGoal[] = goals.map(({ goal, public_ids, byTarget }) => {
    const records = public_ids.map((id) => byId.get(id)!);
    const count = (status: string) => records.filter((c) => c.acceptance_status === status).length;
    return {
      number: goal.number, name: goal.name, title: goal.title, color: goal.color,
      total: records.length, accepted: count("accepted"), partiallyAccepted: count("partially_accepted"), noted: count("noted"),
      priority: records.filter((c) => c.is_priority).length, assessed: records.filter(isAssessed).length,
      targetCount: goal.targets.length, linkedTargets: Object.keys(byTarget).length,
      targets: Object.entries(byTarget).map(([code, ids]) => ({ code, text: targetText(code)!, count: ids.length })).sort((a, b) => b.count - a.count).slice(0, 4),
      dimensions: countBy(public_ids, dimensionsById).slice(0, 5).map(({ key, count: n }) => ({ code: key, name: dimensionNames[key], count: n })),
    };
  });

  const withLinks = goals.filter((g) => g.public_ids.length);
  const targets = goals.flatMap((g) => Object.entries(g.byTarget).map(([code, ids]) => ({ code, goal: g.goal, text: targetText(code)!, count: ids.length }))).sort((a, b) => b.count - a.count);
  const topTargets = targets.slice(0, 8);

  // Recommendations per goal and human-security dimension.
  const matrix = withLinks.map((g) => {
    const counts = Object.fromEntries(countBy(g.public_ids, dimensionsById).map(({ key, count }) => [key, count])) as Partial<Record<DimensionCode, number>>;
    return { goal: g.goal, total: g.public_ids.length, counts };
  });
  const matrixMax = Math.max(1, ...matrix.flatMap((row) => Object.values(row.counts)));

  // Recommendations related to the most goals.
  const goalsById = new Map<string, number[]>();
  for (const g of goals) for (const id of g.public_ids) goalsById.set(id, [...(goalsById.get(id) || []), g.goal.number]);
  const transversal = [...goalsById.entries()].filter(([, numbers]) => numbers.length >= 3).sort((a, b) => b[1].length - a[1].length).slice(0, 5);

  const reviewed = formatDate(links?.find((l) => l.reviewed_at)?.reviewed_at);

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ pt: { xs: 4.5, md: 6 }, pb: { xs: 4, md: 5 } }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,1fr) auto" }, columnGap: 8, rowGap: 3.5, alignItems: "center" }}>
            <Box>
              <Typography variant="overline" color="primary.main" sx={{ borderLeft: "3px solid", borderColor: "secondary.main", pl: 1.5 }}>Agenda 2030 · Naciones Unidas</Typography>
              <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2.2rem", md: "3rem" }, mt: 1 }}>Objetivos de Desarrollo Sostenible</Typography>
              <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 620, lineHeight: 1.7 }}>
                A qué objetivos y metas de la Agenda 2030 contribuye cada recomendación de derechos humanos que recibió España.
              </Typography>
            </Box>
            {/* Official colour wheel, over white and apart from any other logo. */}
            <Box sx={{ width: { xs: 120, md: 190 }, justifySelf: { md: "end" } }}>
              <Image src="/images/ods/SDG-Wheel_PRINT_Transparent.png" alt="Rueda de colores de los Objetivos de Desarrollo Sostenible" width={1500} height={1500} sizes="(min-width: 900px) 190px, 120px" priority unoptimized style={{ display: "block", width: "100%", height: "auto" }} />
            </Box>
          </Box>

          {links !== null && linked > 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, columnGap: 4, rowGap: 3, mt: { xs: 4, md: 5 }, pt: 3.5, borderTop: "2px solid", borderColor: "secondary.main" }}>
              <Figure value={String(linked)} of={`de ${total}`}>recomendaciones relacionadas con algún ODS</Figure>
              <Figure value={String(withLinks.length)} of="de 17">objetivos con recomendaciones a España</Figure>
              <Figure value={String(targets.length)} of={`de ${SDG_TARGET_COUNT}`}>metas con recomendaciones</Figure>
              {targets[0] && <Figure value={targets[0].code}>meta más citada, con {plural(targets[0].count)}</Figure>}
            </Box>
          )}
          {links === null && <Typography color="text.secondary" sx={{ mt: 4 }}>No se ha podido cargar la relación entre las recomendaciones y los ODS.</Typography>}
        </Container>

        <Container component="section" aria-labelledby="sdg-explorer-heading" maxWidth="lg" sx={section}>
          <Heading id="sdg-explorer-heading" overline="Recomendaciones por objetivo" title="Los 17 objetivos, uno a uno">
            Cada cifra es el número de recomendaciones relacionadas con el objetivo. Al seleccionar uno se ve cómo respondió España, qué metas concentran las recomendaciones y a qué seguridad humana afectan.
          </Heading>
          <SdgExplorer goals={explorer} total={total} />
        </Container>

        {matrix.length > 0 && dimensionLinks.length > 0 && (
          <Container component="section" aria-labelledby="sdg-matrix-heading" maxWidth="lg" sx={section}>
            <Heading id="sdg-matrix-heading" overline="Cruce de marcos" title="Objetivos y seguridad humana">
              Recomendaciones que comparten cada objetivo y cada dimensión de la seguridad humana. Cuanto más oscura la celda, más recomendaciones.
            </Heading>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "block", md: "none" }, mb: 1.5 }}>Desliza la tabla hacia los lados para ver las ocho dimensiones.</Typography>
            <Box sx={{ position: "relative", overflowX: "auto", mr: { xs: -2, sm: 0 } }}>
              <Box component="table" sx={{ width: "100%", minWidth: { xs: 740, sm: 820 }, borderCollapse: "separate", borderSpacing: 2, tableLayout: "fixed", "& th": { fontWeight: 500 } }}>
                <Box component="thead">
                  <Box component="tr">
                    <Box component="th" scope="col" sx={{ ...sticky, width: { xs: 148, sm: 250 }, textAlign: "left", verticalAlign: "bottom", pb: 1 }}>
                      <Typography variant="overline" color="text.secondary">Objetivo</Typography>
                    </Box>
                    {dimensionCodes.map((code) => (
                      <Box component="th" scope="col" key={code} sx={{ verticalAlign: "bottom", pb: 1, color: "primary.main" }}>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: .75 }}>
                          <DimensionIcon code={code} size={24} />
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: { xs: ".7rem", sm: ".75rem" }, lineHeight: 1.2 }}><Box component="span" sx={visuallyHidden}>Seguridad </Box>{shortName(code)}</Typography>
                        </Box>
                      </Box>
                    ))}
                    <Box component="th" scope="col" sx={{ width: 64, textAlign: "right", verticalAlign: "bottom", pb: 1 }}>
                      <Typography variant="overline" color="text.secondary">Total</Typography>
                    </Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {matrix.map(({ goal, total: rowTotal, counts }) => (
                    <Box component="tr" key={goal.number}>
                      <Box component="th" scope="row" sx={{ ...sticky, textAlign: "left", p: 0 }}>
                        <Box component={Link} href={`/ods/${goal.number}`} sx={{ display: "grid", gridTemplateColumns: { xs: "40px minmax(0,1fr)", sm: "48px minmax(0,1fr)" }, alignItems: "center", columnGap: { xs: 1, sm: 1.5 }, pr: 1.5, color: "primary.main", textDecoration: "none", "&:hover .sdg-name": { color: brand.accentInk }, "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 2 } }}>
                          <SdgIcon goal={goal} sizes="48px" />
                          <Typography className="sdg-name" component="span" variant="body2" sx={{ fontSize: { xs: ".8rem", sm: ".875rem" }, fontWeight: 500, lineHeight: 1.3, transition: "color .15s" }}>{goal.name}</Typography>
                        </Box>
                      </Box>
                      {dimensionCodes.map((code) => {
                        const count = counts[code] || 0;
                        const level = count ? step(count, matrixMax) : -1;
                        return (
                          <Box component="td" key={code} title={`ODS ${goal.number} · ${dimensionNames[code]}: ${plural(count)}`} sx={{ height: 48, textAlign: "center", bgcolor: count ? ramp[level] : brand.soft, color: level >= 4 ? "#fff" : "primary.main" }}>
                            <Typography component="span" variant="body2" sx={{ fontWeight: count ? 600 : 400, fontVariantNumeric: "tabular-nums", color: count ? "inherit" : "text.disabled" }}>{count || "·"}</Typography>
                          </Box>
                        );
                      })}
                      <Box component="td" sx={{ textAlign: "right" }}>
                        <Typography component="span" color="primary.main" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{rowTotal}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">Menos</Typography>
              <Box aria-hidden sx={{ display: "flex", gap: "2px" }}>{ramp.map((color) => <Box key={color} sx={{ width: 22, height: 10, bgcolor: color }} />)}</Box>
              <Typography variant="caption" color="text.secondary">Más recomendaciones</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ pl: { sm: 2 }, width: { xs: "100%", sm: "auto" } }}>Una recomendación puede figurar en varias celdas.</Typography>
            </Stack>
          </Container>
        )}

        {topTargets.length > 0 && (
          <Container maxWidth="lg" sx={section}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,7fr) minmax(0,5fr)" }, columnGap: 8, rowGap: 6 }}>
              <Box component="section" aria-labelledby="sdg-targets-heading">
                <Heading id="sdg-targets-heading" overline="Metas" title="Las metas más citadas" />
                <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, borderTop: "1px solid", borderColor: "divider" }}>
                  {topTargets.map((target) => (
                    <Box component="li" key={target.code} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                      <Box component={Link} href={`/ods/${target.goal.number}#meta-${target.code}`} sx={{ display: "grid", gridTemplateColumns: "56px minmax(0,1fr) 40px", columnGap: 2, alignItems: "start", py: 1.75, color: "primary.main", textDecoration: "none", "&:hover .sdg-code": { color: brand.accentInk }, "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 2 } }}>
                        <Typography className="sdg-code" component="span" sx={{ fontSize: "1.2rem", fontWeight: 500, lineHeight: 1.2, fontVariantNumeric: "tabular-nums", transition: "color .15s" }}>{target.code}</Typography>
                        <Box>
                          <Typography component="span" variant="body2" color="text.primary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 }}>{target.text}</Typography>
                          <Box aria-hidden sx={{ height: 4, mt: 1, bgcolor: track }}>
                            <Box sx={{ height: 1, width: `${(100 * target.count) / topTargets[0].count}%`, bgcolor: brand.accentInk }} />
                          </Box>
                        </Box>
                        <Typography component="span" title={plural(target.count)} sx={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{target.count}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              {transversal.length > 0 && (
                <Box component="section" aria-labelledby="sdg-transversal-heading">
                  <Heading id="sdg-transversal-heading" overline="Recomendaciones" title="Las más transversales" />
                  <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, borderTop: "1px solid", borderColor: "divider" }}>
                    {transversal.map(([id, numbers]) => {
                      const c = byId.get(id)!;
                      return (
                        <Box component="li" key={id} sx={{ py: 1.75, borderBottom: "1px solid", borderColor: "divider", position: "relative", "&:has(a:active)": { bgcolor: { xs: "rgba(0,163,224,.09)", md: "transparent" } } }}>
                          <Typography variant="caption" color="text.secondary">Recomendación {c.recommendation_number} · {numbers.length} objetivos</Typography>
                          <Typography component={Link} href={`/commitments/${encodeURIComponent(id)}#ods`} color="primary.main" sx={{ display: "block", mt: .25, fontWeight: 500, lineHeight: 1.4, textDecoration: "none", "&:hover": { color: "secondary.dark" }, "&::after": { content: '""', position: "absolute", inset: 0, display: { md: "none" } } }}>{c.title}</Typography>
                          {/* Icons in a single row, in their official order. */}
                          <Box sx={{ display: "flex", gap: .75, mt: 1.25 }}>
                            {numbers.map((number) => <Box key={number} sx={{ width: 52 }}><SdgIcon goal={sdgGoal(number)!} sizes="52px" /></Box>)}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          </Container>
        )}

        <Container component="section" aria-labelledby="sdg-about-heading" maxWidth="lg" sx={section}>
          <Heading id="sdg-about-heading" overline="La Agenda 2030" title="Los ODS en breve" />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, columnGap: 4, rowGap: 3, p: { xs: 2.25, md: 4 }, bgcolor: brand.soft, borderTop: `2px solid ${brand.accent}` }}>
            <Figure value="17">objetivos comunes a todos los países</Figure>
            <Figure value={String(SDG_TARGET_COUNT)}>metas que los concretan y permiten medirlos</Figure>
            <Figure value="193">Estados los aprobaron en la ONU en 2015</Figure>
            <Figure value="2030">año fijado para alcanzarlos</Figure>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(3,minmax(0,1fr))" }, columnGap: 6, rowGap: 3, mt: 4 }}>
            {brief.map(([title, text]) => (
              <Box key={title} sx={{ pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="h6" color="primary.main">{title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: .75, lineHeight: 1.7 }}>{text}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 5, "& a": { color: "inherit" } }}>
            <RecordDisclosure title="Fuente y método">
              <Stack spacing={1.4} sx={{ maxWidth: 860, "& p": { lineHeight: 1.75 } }}>
                <Typography variant="body2">
                  La relación entre recomendaciones, objetivos y metas es una clasificación propia de HRCT{reviewed ? ` (revisión del ${reviewed})` : ""}. Cada recomendación se ha analizado a partir de su texto oficial y se ha relacionado con las metas a las que su cumplimiento contribuiría de forma directa. Cada relación lleva una justificación, que se muestra en la ficha de la recomendación.
                </Typography>
                <Typography variant="body2">
                  Criterios: se atiende a la medida que se pide y no a las palabras que emplea; se elige la meta más específica y solo se añaden otras cuando la recomendación tiene componentes distintos; cuando un objetivo recoge el asunto pero ninguna de sus metas lo concreta, la recomendación se relaciona con el objetivo en su conjunto{links !== null && linked > 0 && total > linked ? `; ${total - linked} recomendaciones no se relacionan con ningún ODS porque la Agenda 2030 no contiene ninguna meta sobre su contenido` : ""}.
                </Typography>
                <Typography variant="body2">
                  Se ha tomado como referencia el etiquetado del <a href={UHRI_URL} target="_blank" rel="noreferrer">Índice Universal de los Derechos Humanos</a>, la base de datos de la Oficina del Alto Comisionado de las Naciones Unidas para los Derechos Humanos, que se ha revisado recomendación a recomendación. El nombre de los objetivos y el texto de las metas son los oficiales en español de la resolución A/RES/70/1 de la Asamblea General. Las dimensiones de la seguridad humana son también una clasificación propia de HRCT.
                </Typography>
              </Stack>
            </RecordDisclosure>
            <Divider />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2, maxWidth: 940, lineHeight: 1.7 }}>
              Rueda de colores e iconos de los ODS: materiales oficiales de las Naciones Unidas, utilizados con fines informativos conforme a sus <a href={UN_SDG_GUIDELINES_URL} target="_blank" rel="noreferrer">directrices de uso</a>. Su uso no implica el respaldo de las Naciones Unidas. El contenido de esta página no ha sido aprobado por las Naciones Unidas y no refleja las opiniones de las Naciones Unidas, de sus funcionarios ni de sus Estados Miembros. Más información en <a href={UN_SDG_URL} target="_blank" rel="noreferrer">un.org/sustainabledevelopment/es</a>.
            </Typography>
          </Box>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
