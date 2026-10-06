import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { Box, Breadcrumbs, Button, Container, Divider, Stack, Typography } from "@mui/material";
import { brand } from "@/brand";
import { DimensionIcon } from "@/components/DimensionIcon";
import { ChannelLabel, MonitoringCard, relatedCount, SourceIcon, sourceName } from "@/components/MonitoringCard";
import { PriorityTag } from "@/components/PriorityTag";
import { RecordDisclosure } from "@/components/RecordDisclosure";
import { SdgIcon } from "@/components/SdgIcon";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusChip } from "@/components/StatusChip";
import { acceptanceLabels, channelLabels, channelNotes, dimensionNames, formatDate, getAllHumanSecurityDimensions, getAllSdgLinks, getCommitments, getRecentMonitoringItems, groupByUrl, labelOf, monitoringChannel, reviewLabel, sourceTypeLabels, type Commitment, type DimensionCode } from "@/lib/hrct";
import { countBy, sdgGoal } from "@/lib/sdg";

type Params = { params: Promise<{ slug: string }> };

// Recommendations listed before the rest fold away.
const FIRST = 6;

async function getDevelopment(slug: string) {
  const developments = groupByUrl(await getRecentMonitoringItems());
  return { developments, item: developments.find((d) => d.slug === slug) };
}

// These pages point to someone else's publication and leave the site when the item does:
// search engines are sent to the source, not here.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { item } = await getDevelopment((await params).slug);
  if (!item) return { title: "Actualidad | Human Rights Commitment Tracker" };
  const title = item.title.length > 90 ? `${item.title.slice(0, 89).trimEnd()}…` : item.title;
  return {
    title: `${title} | Actualidad | Human Rights Commitment Tracker`,
    description: `${channelLabels[monitoringChannel(item)]}. ${sourceName(item)}${formatDate(item.published_at) ? `, ${formatDate(item.published_at)}` : ""}. ${relatedCount(item.public_ids.length)}.`,
    robots: { index: false, follow: true },
  };
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return <Box><Typography variant="overline" color="text.secondary">{label}</Typography><Typography variant="body2" color="primary.main" sx={{ mt: .35 }}>{children}</Typography></Box>;
}

function Recommendation({ c }: { c: Commitment }) {
  return (
    <Box component="li" sx={{ position: "relative", display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr) 24px", sm: "76px minmax(0,1fr) 24px" }, columnGap: 2, alignItems: "center", py: 2, borderBottom: "1px solid", borderColor: "divider", "&:hover .hrct-rec-title": { color: brand.accentInk }, "&:hover .hrct-rec-go": { color: brand.accentInk, transform: "translateX(3px)" }, "&:has(a:active)": { bgcolor: { xs: "rgba(0,163,224,.09)", md: "transparent" } } }}>
      <Typography color="primary.main" sx={{ display: { xs: "none", sm: "block" }, fontSize: "1.2rem", fontWeight: 500, fontVariantNumeric: "tabular-nums", alignSelf: "start" }}>{c.recommendation_number || c.public_id}</Typography>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: .5 }}>
          <Typography variant="caption" color="primary.main" sx={{ display: { sm: "none" }, fontWeight: 600 }}>Recomendación {c.recommendation_number || c.public_id}</Typography>
          {c.is_priority && <PriorityTag />}
          <StatusChip status={c.assessment_status} />
          <Typography variant="caption" color="text.secondary">{c.acceptance_status ? `${labelOf(acceptanceLabels, c.acceptance_status)} por España` : "Respuesta del Estado pendiente"}</Typography>
        </Stack>
        {/* The link stretches over the whole row. */}
        <Typography className="hrct-rec-title" component={Link} href={`/commitments/${encodeURIComponent(c.public_id)}`} color="primary.main" sx={{ display: "block", fontWeight: 500, lineHeight: 1.4, textDecoration: "none", transition: "color .15s", "&::after": { content: '""', position: "absolute", inset: 0 }, "&:focus-visible": { outline: "none" }, "&:focus-visible::after": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 2 } }}>
          {c.title}
        </Typography>
      </Box>
      <ArrowForwardRoundedIcon className="hrct-rec-go" aria-hidden sx={{ fontSize: 20, color: "text.secondary", transition: "color .15s, transform .15s" }} />
    </Box>
  );
}

export default async function DevelopmentPage({ params }: Params) {
  const { slug } = await params;
  const [{ developments, item }, commitments, dimensionLinks, sdgLinks] = await Promise.all([
    getDevelopment(slug),
    getCommitments(),
    getAllHumanSecurityDimensions().catch(() => []),
    getAllSdgLinks(),
  ]);
  if (!item) notFound();

  const channel = monitoringChannel(item);
  const byId = new Map(commitments.map((c) => [c.public_id, c]));
  const related = item.public_ids.map((id) => byId.get(id)).filter((c): c is Commitment => !!c);
  const ids = related.map((c) => c.public_id);

  // How the related recommendations are classified. These describe the recommendations, not the publication.
  const dimensionsById: Record<string, DimensionCode[]> = {};
  for (const d of dimensionLinks) (dimensionsById[d.public_id] ??= []).push(d.code);
  const dimensions = countBy(ids, dimensionsById);
  const goalsById: Record<string, string[]> = {};
  for (const link of sdgLinks || []) (goalsById[link.public_id] ??= []).push(String(link.goal));
  const goals = countBy(ids, goalsById).map(({ key, count }) => ({ goal: sdgGoal(Number(key)), count })).filter((g) => g.goal).sort((a, b) => a.goal!.number - b.goal!.number);

  // Other developments about the same recommendations: the more they share, the closer; then the most recent.
  const own = new Set(item.public_ids);
  const others = developments
    .filter((d) => d.slug !== item.slug)
    .map((d) => ({ d, shared: d.public_ids.filter((id) => own.has(id)).length }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared || (b.d.published_at || "").localeCompare(a.d.published_at || ""))
    .slice(0, 3)
    .map(({ d }) => d);

  const published = formatDate(item.published_at);
  const plural = (n: number) => `${n} ${n === 1 ? "recomendación" : "recomendaciones"}`;
  // Official titles of laws run to several lines: they get a smaller size than a headline.
  const titleSize = item.title.length > 220 ? { xs: "1.3rem", md: "1.6rem" } : item.title.length > 120 ? { xs: "1.6rem", md: "2.1rem" } : { xs: "1.9rem", md: "2.6rem" };

  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container component="article" maxWidth="lg" sx={{ pt: { xs: 3, md: 4 }, pb: { xs: 5, md: 7 } }}>
          <Breadcrumbs aria-label="Ruta de navegación" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ mb: { xs: 3, md: 4 }, "& a": { color: "text.secondary", textDecoration: "none", py: 1 }, "& a:hover": { color: "primary.main", textDecoration: "underline" } }}>
            <Link href="/monitoring">Actualidad</Link>
            <Typography component="span" color="text.primary" sx={{ fontSize: "inherit" }}>{channelLabels[channel]}</Typography>
          </Breadcrumbs>

          <Box sx={{ maxWidth: 900 }}>
            <ChannelLabel channel={channel} />
            <Typography variant="h1" color="primary.main" sx={{ fontSize: titleSize, lineHeight: 1.14, mt: 1.5 }}>{item.title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1, rowGap: .25, mt: 2.5 }}>
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: .75, color: "primary.main", fontWeight: 600 }}><SourceIcon type={item.source_type} size={18} />{sourceName(item)}</Box>
              {published && <><Box component="span" aria-hidden>·</Box><Box component="time" dateTime={item.published_at!.slice(0, 10)}>{published}</Box></>}
              <Box component="span" aria-hidden>·</Box>{reviewLabel(item)}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 2 }} alignItems={{ sm: "center" }} sx={{ mt: 3 }}>
              <Button component="a" href={item.url} target="_blank" rel="noreferrer" variant="contained" color="primary" endIcon={<OpenInNewRoundedIcon />} sx={{ px: 2.25 }}>Leer en la fuente original</Button>
              {item.source_domain && <Typography variant="caption" color="text.secondary">Se abre {item.source_domain} en una pestaña nueva</Typography>}
            </Stack>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,1fr) 300px" }, columnGap: 7, rowGap: 5, alignItems: "start", mt: { xs: 4, md: 5 }, pt: { xs: 4, md: 5 }, borderTop: "2px solid", borderColor: "secondary.main" }}>
            <Stack spacing={{ xs: 4, md: 5 }} sx={{ minWidth: 0 }}>
              {(item.summary || item.excerpt || (item.note && item.status !== "reviewed")) && (
                <Stack spacing={2.5} sx={{ maxWidth: 760 }}>
                  {item.summary && <Typography sx={{ fontSize: { xs: "1.0625rem", md: "1.15rem" }, lineHeight: 1.7 }}>{item.summary}</Typography>}
                  {item.excerpt && (
                    <Box component="figure" sx={{ m: 0, pl: 2.5, borderLeft: "3px solid", borderColor: "secondary.main" }}>
                      <Typography component="blockquote" sx={{ m: 0, fontSize: "1.0625rem", lineHeight: 1.7, color: "primary.main" }}>«{item.excerpt}»</Typography>
                      <Typography component="figcaption" variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>De la fuente · {sourceName(item)}</Typography>
                    </Box>
                  )}
                  {item.note && item.status !== "reviewed" && (
                    <Box>
                      <Typography variant="overline" color="text.secondary">Por qué aparece aquí</Typography>
                      <Typography sx={{ mt: .5, lineHeight: 1.7 }}>{item.note}</Typography>
                    </Box>
                  )}
                </Stack>
              )}

              <Box component="section" aria-labelledby="related-heading">
                <Typography variant="overline" color="text.secondary">EPU, cuarto ciclo</Typography>
                <Typography id="related-heading" variant="h4" color="primary.main" sx={{ mt: .45, mb: 2 }}>
                  {related.length === 1 ? "Recomendación relacionada" : "Recomendaciones relacionadas"}
                  {related.length > 1 && <Box component="span" sx={{ ml: 1.25, fontSize: "1rem", fontWeight: 400, color: "text.secondary" }}>{related.length}</Box>}
                </Typography>
                <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, borderTop: "1px solid", borderColor: "divider" }}>
                  {related.slice(0, FIRST).map((c) => <Recommendation key={c.public_id} c={c} />)}
                </Box>
                {related.length > FIRST && (
                  <Box sx={{ "& > details": { borderTop: 0 }, "& > details > div": { py: 0 }, borderBottom: "1px solid", borderColor: "divider" }}>
                    <RecordDisclosure title={`Ver las ${related.length - FIRST} restantes`}>
                      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, "& > li:last-of-type": { borderBottom: 0 } }}>
                        {related.slice(FIRST).map((c) => <Recommendation key={c.public_id} c={c} />)}
                      </Box>
                    </RecordDisclosure>
                  </Box>
                )}
                {!related.length && <Typography variant="body2" color="text.secondary" sx={{ py: 2.5 }}>No se ha podido cargar la recomendación relacionada.</Typography>}
              </Box>

              <Box sx={{ p: { xs: 2.25, md: 3 }, bgcolor: brand.soft, borderTop: `2px solid ${brand.accent}` }}>
                <Typography variant="overline" color="text.secondary">Cómo leer esta novedad</Typography>
                <Typography variant="body2" sx={{ mt: .75, maxWidth: 760, lineHeight: 1.75 }}>{channelNotes[channel]}</Typography>
              </Box>
            </Stack>

            <Box component="aside" aria-label="Datos de la novedad" sx={{ borderLeft: { lg: "1px solid" }, borderColor: { lg: "divider" }, pl: { lg: 4 } }}>
              <Stack spacing={2.3} divider={<Divider flexItem />}>
                <Meta label="Tipo de fuente">{labelOf(sourceTypeLabels, item.source_type)}</Meta>
                <Meta label="Incorporada al seguimiento">{formatDate(item.discovered_at) || "—"}</Meta>
              </Stack>

              {dimensions.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ display: "block", lineHeight: 1.6 }}>Seguridad humana de {related.length === 1 ? "la recomendación" : "las recomendaciones"}</Typography>
                  <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1.25, p: 0, borderTop: "1px solid", borderColor: "divider" }}>
                    {dimensions.map(({ key, count }) => (
                      <Box component="li" key={key} title={`${dimensionNames[key]}: ${plural(count)}`} sx={{ display: "grid", gridTemplateColumns: "22px minmax(0,1fr) auto", columnGap: 1.5, alignItems: "center", py: 1.1, borderBottom: "1px solid", borderColor: "divider", color: "primary.main" }}>
                        <DimensionIcon code={key} size={22} />
                        <Typography variant="body2">{dimensionNames[key]}</Typography>
                        {related.length > 1 && <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{count}</Typography>}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {goals.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ display: "block", lineHeight: 1.6 }}>ODS de {related.length === 1 ? "la recomendación" : "las recomendaciones"}</Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 56px)", gap: 1, mt: 1.5 }}>
                    {goals.map(({ goal, count }) => (
                      <Box key={goal!.number} component={Link} href={`/ods/${goal!.number}`} title={`ODS ${goal!.number} · ${goal!.name}: ${plural(count)}`} sx={{ display: "block", "&:focus-visible": { outline: `2px solid ${brand.accentInk}`, outlineOffset: 2 } }}>
                        <SdgIcon goal={goal!} sizes="56px" />
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Container>

        {others.length > 0 && (
          <Container component="section" aria-labelledby="others-heading" maxWidth="lg" sx={{ py: { xs: 5, md: 7 }, borderTop: "1px solid", borderColor: "divider" }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-end" }} spacing={1.5} sx={{ mb: 3 }}>
              <Box>
                <Typography variant="overline" color="text.secondary">Seguir leyendo</Typography>
                <Typography id="others-heading" variant="h4" color="primary.main" sx={{ mt: .45 }}>Más novedades sobre {related.length === 1 ? "esta recomendación" : "estas recomendaciones"}</Typography>
              </Box>
              <Button component={Link} href="/monitoring" endIcon={<ArrowForwardRoundedIcon />} sx={{ px: 0, flexShrink: 0, alignSelf: { xs: "flex-start", sm: "auto" } }}>Toda la actualidad</Button>
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(3,minmax(0,1fr))" }, gap: { xs: 1.5, md: 2.5 } }}>
              {others.map((d) => <MonitoringCard key={d.slug} item={d} />)}
            </Box>
          </Container>
        )}
      </Box>
      <SiteFooter />
    </>
  );
}
