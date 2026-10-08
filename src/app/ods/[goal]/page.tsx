import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Button, Container, Divider, Stack, Typography } from "@mui/material";
import { DimensionIcon } from "@/components/DimensionIcon";
import { PriorityTag } from "@/components/PriorityTag";
import { RecordDisclosure } from "@/components/RecordDisclosure";
import { SdgIcon } from "@/components/SdgIcon";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/StatusChip";
import { acceptanceLabels, dimensionNames, formatShare, getAllHumanSecurityDimensions, getAllSdgLinks, getCommitments, isAssessed, labelOf, type Commitment, type DimensionCode } from "@/lib/hrct";
import { countBy, isMeansOfImplementation, sdgGoal, sdgGoals, sdgGoalUrl, summarizeSdgs, UHRI_URL } from "@/lib/sdg";
import { brand } from "@/brand";

type Params = { params: Promise<{ goal: string }> };

const goalOf = (value: string) => (/^\d{1,2}$/.test(value) ? sdgGoal(Number(value)) : undefined);

export function generateStaticParams() {
  return sdgGoals.map((goal) => ({ goal: String(goal.number) }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const goal = goalOf((await params).goal);
  if (!goal) return {};
  return {
    title: `ODS ${goal.number}: ${goal.name} | Human Rights Commitment Institute`,
    description: `${goal.title}. Metas del objetivo y recomendaciones de derechos humanos a España relacionadas con él.`,
  };
}

const plural = (n: number) => `${n} ${n === 1 ? "recomendación" : "recomendaciones"}`;
const track = "rgba(0,163,224,.16)";

function Recommendations({ records }: { records: Commitment[] }) {
  return (
    <Stack component="ul" divider={<Divider component="li" flexItem />} sx={{ listStyle: "none", m: 0, p: 0, borderTop: "1px solid", borderColor: "divider" }}>
      {records.map((c) => (
        <Stack component="li" key={c.public_id} direction={{ xs: "column", sm: "row" }} spacing={{ xs: .5, sm: 2.5 }} sx={{ py: 1.6, position: "relative", "&:has(a:active)": { bgcolor: { xs: "rgba(0,163,224,.09)", md: "transparent" } } }}>
          <Typography variant="body2" color="text.secondary" sx={{ width: { sm: 64 }, flexShrink: 0 }}>{c.recommendation_number || c.public_id}</Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component={Link} href={`/commitments/${encodeURIComponent(c.public_id)}#ods`} color="primary.main" sx={{ fontWeight: 500, textDecoration: "none", transition: "color .15s", "&:hover": { color: "secondary.dark" }, "&::after": { content: '""', position: "absolute", inset: 0, display: { md: "none" } } }}>
              {c.title}
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: .5 }}>
              {c.is_priority && <PriorityTag />}
              <StatusChip status={c.assessment_status} />
              <Typography variant="caption" color="text.secondary">{labelOf(acceptanceLabels, c.acceptance_status, "Respuesta del Estado pendiente")}</Typography>
            </Stack>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

function Target({ code, text, share, children }: { code: string; text: string; share?: number; children?: React.ReactNode }) {
  return (
    <Box id={`meta-${code}`} sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "96px minmax(0,1fr)" }, columnGap: 3, rowGap: .5, py: 2.5, scrollMarginTop: { xs: 76, md: 100 } }}>
      <Box>
        <Typography color="primary.main" sx={{ fontSize: "1.35rem", fontWeight: 500, lineHeight: 1.2 }}>{code}</Typography>
        {isMeansOfImplementation(code) && <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3, mt: .25 }}>Medio de implementación</Typography>}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ lineHeight: 1.75, maxWidth: 820 }}>{text}</Typography>
        {share !== undefined && (
          <Box aria-hidden sx={{ height: 4, mt: 1.5, maxWidth: 820, bgcolor: track }}>
            <Box sx={{ height: 1, width: `${100 * share}%`, bgcolor: brand.accentInk }} />
          </Box>
        )}
        {children}
      </Box>
    </Box>
  );
}

export default async function SdgGoalPage({ params }: Params) {
  const goal = goalOf((await params).goal);
  if (!goal) notFound();

  const [commitments, links, dimensionLinks] = await Promise.all([getCommitments(), getAllSdgLinks(), getAllHumanSecurityDimensions().catch(() => [])]);
  const byId = new Map(commitments.map((c) => [c.public_id, c]));
  const summary = summarizeSdgs(commitments.map((c) => c.public_id), links || []).goals.find((g) => g.goal.number === goal.number)!;
  const records = (ids: string[]) => ids.map((id) => byId.get(id)!);
  const all = records(summary.public_ids);
  const total = all.length;
  const count = (test: (c: Commitment) => boolean) => all.filter(test).length;
  const response = [
    { label: "Aceptadas", value: count((c) => c.acceptance_status === "accepted"), color: brand.accentInk },
    { label: "Aceptadas parcialmente", value: count((c) => c.acceptance_status === "partially_accepted"), color: "#35b5e8" },
    { label: "Anotadas, sin aceptar", value: count((c) => c.acceptance_status === "noted"), color: "#6f7d89" },
  ];
  const linkedTargets = goal.targets.filter(([code]) => summary.byTarget[code]);
  const otherTargets = goal.targets.filter(([code]) => !summary.byTarget[code]);
  const facts: [string, string][] = [
    [String(count((c) => !!c.is_priority)), count((c) => !!c.is_priority) === 1 ? "prioritaria" : "prioritarias"],
    [String(count(isAssessed)), "con valoración"],
    [`${linkedTargets.length}/${goal.targets.length}`, "metas relacionadas"],
  ];
  const dimensionsById: Record<string, DimensionCode[]> = {};
  for (const d of dimensionLinks) (dimensionsById[d.public_id] ??= []).push(d.code);
  const dimensions = countBy(summary.public_ids, dimensionsById);
  const maxTarget = Math.max(1, ...linkedTargets.map(([code]) => summary.byTarget[code].length));
  const previous = sdgGoal(goal.number - 1), next = sdgGoal(goal.number + 1);

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ py: { xs: 4.5, md: 6 } }}>
          <Button component={Link} href="/ods" startIcon={<ArrowBackRoundedIcon />} sx={{ mb: 3, px: 0 }}>Volver a los ODS</Button>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "200px minmax(0,1fr)" }, columnGap: { sm: 4, md: 6 }, rowGap: 3, alignItems: "start" }}>
            <Box sx={{ width: { xs: 160, sm: "100%" } }}>
              <SdgIcon goal={goal} sizes="200px" priority />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="primary.main" sx={{ display: "block", borderLeft: `3px solid ${goal.color}`, pl: 1.5 }}>Objetivo {goal.number} · Agenda 2030</Typography>
              <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, mt: 1.1 }}>{goal.name}</Typography>
              <Typography color="primary.main" sx={{ mt: 1.8, maxWidth: 820, fontSize: "1.1rem", lineHeight: 1.6 }}>{goal.title}.</Typography>
              <Typography variant="overline" color="text.secondary" sx={{ display: "block", mt: 2.5 }}>Por qué importa para los derechos humanos</Typography>
              <Typography color="text.secondary" sx={{ mt: .5, maxWidth: 820, lineHeight: 1.75 }}>{goal.relevance}</Typography>
              <Button component="a" href={sdgGoalUrl(goal)} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />} sx={{ mt: 1.5, px: 0 }}>El objetivo en la web de las Naciones Unidas</Button>
            </Box>
          </Box>
        </Container>

        <Divider />

        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
          {links === null && <Typography color="text.secondary" sx={{ mb: 4 }}>No se ha podido cargar la relación entre las recomendaciones y este objetivo. Sus metas pueden consultarse igualmente.</Typography>}

          {links !== null && (
            <Box component="section" aria-labelledby="goal-figures-heading" sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(3,minmax(0,1fr))" }, columnGap: 6, rowGap: 4, alignItems: "start", p: { xs: 2.25, md: 4 }, mb: { xs: 4, md: 5 }, bgcolor: brand.soft, borderTop: `3px solid ${goal.color}` }}>
              <Box>
                <Typography id="goal-figures-heading" variant="overline" color="text.secondary">Recomendaciones a España</Typography>
                <Typography color="primary.main" sx={{ fontSize: { xs: "3.5rem", md: "4.5rem" }, fontWeight: 500, lineHeight: .95, letterSpacing: "-.03em", mt: 1 }}>{total}</Typography>
                <Typography color="primary.main" sx={{ mt: 1.25, fontWeight: 500 }}>
                  {total === 1 ? "recomendación relacionada" : "recomendaciones relacionadas"} con este objetivo
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: .5, lineHeight: 1.6 }}>
                  {total ? `${formatShare(total, commitments.length)} de las ${commitments.length} que recibió en el cuarto ciclo del Examen Periódico Universal.` : "Ninguna de las recomendaciones del cuarto ciclo del Examen Periódico Universal se relaciona con él."}
                </Typography>
              </Box>
              {total > 0 && (
                <Box>
                  <Typography variant="overline" color="text.secondary">Respuesta de España</Typography>
                  <Box role="img" aria-label={response.map((r) => `${r.label}: ${r.value}`).join(". ")} sx={{ display: "flex", gap: "2px", height: 12, mt: 1.25 }}>
                    {response.filter((r) => r.value > 0).map((r) => (
                      <Box key={r.label} title={`${r.label}: ${r.value} (${formatShare(r.value, total)})`} sx={{ flex: `${r.value} 0 0`, minWidth: 5, bgcolor: r.color }} />
                    ))}
                  </Box>
                  <Box sx={{ mt: 1.5 }}>
                    {response.map((r) => (
                      <Box key={r.label} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: .6 }}>
                        <Box aria-hidden sx={{ width: 10, height: 10, bgcolor: r.color, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ flex: 1 }}>{r.label}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>{formatShare(r.value, total)}</Typography>
                        <Typography variant="body2" color="primary.main" sx={{ width: 34, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", columnGap: 2, mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                    {facts.map(([value, label]) => (
                      <Box key={label}>
                        <Typography color="primary.main" sx={{ fontSize: "1.35rem", fontWeight: 500, lineHeight: 1 }}>{value}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: .5, lineHeight: 1.3 }}>{label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              {dimensions.length > 0 && (
                <Box>
                  <Typography variant="overline" color="text.secondary">Seguridad humana afectada</Typography>
                  <Box sx={{ mt: .75 }}>
                    {dimensions.map(({ key, count: n }) => (
                      <Box key={key} title={`${formatShare(n, total)} de las recomendaciones del objetivo`} sx={{ display: "grid", gridTemplateColumns: "20px minmax(0,1fr) 30px", alignItems: "center", columnGap: 1.25, py: .7, color: "primary.main" }}>
                        <DimensionIcon code={key} size={20} />
                        <Box>
                          <Typography variant="body2" color="text.primary" sx={{ mb: .5 }}>{dimensionNames[key]}</Typography>
                          <Box aria-hidden sx={{ height: 4, bgcolor: track }}><Box sx={{ height: 1, width: `${(100 * n) / total}%`, bgcolor: brand.accentInk }} /></Box>
                        </Box>
                        <Typography variant="body2" sx={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{n}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {summary.shared.length > 0 && (
            <Box component="section" aria-labelledby="shared-goals-heading" sx={{ mb: { xs: 5, md: 6 } }}>
              <Typography variant="overline" color="text.secondary">Relación con otros objetivos</Typography>
              <Typography id="shared-goals-heading" variant="h4" color="primary.main" sx={{ mt: .45, mb: 2 }}>Comparte recomendaciones con</Typography>
              {/* Icons in a single row, most shared first. */}
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                {summary.shared.map(({ goal: number, count: n }) => {
                  const other = sdgGoal(number)!;
                  return (
                    <Box component="li" key={number} sx={{ width: { xs: 88, sm: 104 } }}>
                      <Box component={Link} href={`/ods/${number}`} title={`${plural(n)} en común con el ODS ${number}`} sx={{ display: "block", p: 1, border: "1px solid", borderColor: "divider", color: "primary.main", textDecoration: "none", transition: "border-color .15s", "&:hover": { borderColor: brand.accentInk }, "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 3 } }}>
                        <SdgIcon goal={other} sizes="104px" />
                        <Typography component="span" sx={{ display: "block", mt: .75, px: .25, fontSize: "1.2rem", fontWeight: 500, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{n}</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          <Stack spacing={{ xs: 5, md: 6 }}>
            {linkedTargets.length > 0 && (
              <Box component="section" aria-labelledby="linked-targets-heading">
                <Typography variant="overline" color="text.secondary">Metas del objetivo {goal.number}</Typography>
                <Typography id="linked-targets-heading" variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.5 }}>Metas relacionadas con las recomendaciones</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 840, lineHeight: 1.7 }}>
                  Cada meta se muestra con su texto oficial y con las recomendaciones que contribuyen a alcanzarla. Una misma recomendación puede aparecer en varias metas.
                </Typography>
                <Stack divider={<Divider flexItem />} sx={{ borderTop: `2px solid ${brand.accent}`, borderBottom: "1px solid", borderColor: "divider" }}>
                  {linkedTargets.map(([code, text]) => {
                    const ids = summary.byTarget[code];
                    return (
                      <Target key={code} code={code} text={text} share={ids.length / maxTarget}>
                        <Box sx={{ mt: 1, "& > details": { borderTop: 0 } }}>
                          <RecordDisclosure title={plural(ids.length)} open={ids.length <= 3}>
                            <Recommendations records={records(ids)} />
                          </RecordDisclosure>
                        </Box>
                      </Target>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {summary.withoutTarget.length > 0 && (
              <Box component="section" aria-labelledby="whole-goal-heading">
                <Typography variant="overline" color="text.secondary">Sin una meta concreta</Typography>
                <Typography id="whole-goal-heading" variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.5 }}>Recomendaciones relacionadas con el objetivo en su conjunto</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 840, lineHeight: 1.7 }}>
                  Su asunto corresponde al objetivo {goal.number}, pero ninguna de sus metas lo concreta.
                </Typography>
                <RecordDisclosure title={plural(summary.withoutTarget.length)} open={summary.withoutTarget.length <= 3}>
                  <Recommendations records={records(summary.withoutTarget)} />
                </RecordDisclosure>
              </Box>
            )}

            {otherTargets.length > 0 && (
              <Box component="section" aria-labelledby="other-targets-heading">
                <Typography variant="overline" color="text.secondary">Metas del objetivo {goal.number}</Typography>
                <Typography id="other-targets-heading" variant="h4" color="primary.main" sx={{ mt: .45, mb: 1.5 }}>{linkedTargets.length ? "Resto de las metas" : "Metas del objetivo"}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 840, lineHeight: 1.7 }}>
                  {linkedTargets.length ? "Metas del objetivo con las que no se relaciona ninguna recomendación a España en este examen." : "Texto oficial de las metas que concretan el objetivo."}
                </Typography>
                <RecordDisclosure title={`${otherTargets.length} ${otherTargets.length === 1 ? "meta" : "metas"}`} open={!linkedTargets.length}>
                  <Stack divider={<Divider flexItem />}>
                    {otherTargets.map(([code, text]) => <Target key={code} code={code} text={text} />)}
                  </Stack>
                </RecordDisclosure>
              </Box>
            )}
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 4, maxWidth: 860, lineHeight: 1.6 }}>
            Relación entre recomendaciones y metas: clasificación de HRCT, con el <Box component="a" href={UHRI_URL} target="_blank" rel="noreferrer" sx={{ color: "inherit" }}>Índice Universal de los Derechos Humanos</Box> (ACNUDH) como referencia. Nombre del objetivo y texto de las metas: resolución A/RES/70/1 de la Asamblea General. La nota sobre su importancia es de Blue Human.
          </Typography>

          <Stack component="nav" aria-label="Otros objetivos" direction="row" justifyContent="space-between" spacing={2} sx={{ mt: 4, pt: 2.5, borderTop: "1px solid", borderColor: "divider" }}>
            {previous ? <Button component={Link} href={`/ods/${previous.number}`} startIcon={<ArrowBackRoundedIcon />} sx={{ px: 0, textAlign: "left" }}>ODS {previous.number} · {previous.name}</Button> : <span />}
            {next ? <Button component={Link} href={`/ods/${next.number}`} endIcon={<ArrowForwardRoundedIcon />} sx={{ px: 0, textAlign: "right" }}>ODS {next.number} · {next.name}</Button> : <span />}
          </Stack>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
