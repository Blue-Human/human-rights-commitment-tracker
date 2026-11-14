import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Box, Button, Container, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AnnotationList } from "@/components/atlas/Annotations";
import { AtlasShell, Section } from "@/components/atlas/AtlasShell";
import { CiteTools } from "@/components/atlas/CiteTools";
import { ExternalLink, SourceNote } from "@/components/atlas/Quote";
import { getDecisions, getInstrument, getInterpretations, getParticipation, getRights, getText } from "@/lib/atlas/data";
import { articlePath, authorityNames, basisNames, bodyPath, countryPath, instrumentPath, instrumentTitle, longDate, procedurePath, systemNames } from "@/lib/atlas/labels";
import { getPublishedAnnotations } from "@/lib/atlas/annotations";
import { amendedArticles, amendmentNotice, bodiesOf, proceduresCiting } from "@/lib/atlas/relations";
import { getInstruments } from "@/lib/atlas/data";
import type { ArticleNode } from "@/lib/atlas/types";

// Rendered the first time each article is asked for, then kept like a static page.
export const dynamicParams = true;
export const revalidate = false;
export function generateStaticParams() {
  return [];
}

const slug = (number: string) => number.replace(/\s+/g, "-");

async function load(id: string, article: string) {
  const instrument = await getInstrument(id);
  if (!instrument) return null;
  const readable = instrument.texts.find((t) => t.complete && t.lang === "es") || instrument.texts.find((t) => t.complete);
  if (!readable) return null;
  const text = await getText(id, readable.lang);
  if (!text) return null;
  const articles = text.nodes.filter((n): n is ArticleNode => n.kind === "article");
  const index = articles.findIndex((n) => slug(n.number) === decodeURIComponent(article));
  if (index < 0) return null;
  return { instrument, readable, text, articles, index, node: articles[index] };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; article: string }> }): Promise<Metadata> {
  const { id, article } = await params;
  const data = await load(id, article);
  if (!data) return {};
  return {
    title: `${data.node.label}${data.node.heading ? `. ${data.node.heading}` : ""} · ${instrumentTitle(data.instrument)} | Atlas | Human Rights Commitment Institute`,
    description: (data.node.paragraphs.map((p) => p.text).join(" ").slice(0, 200) || data.node.label),
  };
}

const mentions = (text: string, number: string) => new RegExp(`\\b(?:article|art\\.|artículo)s?\\s+(?:\\d+\\s*(?:\\(\\d+\\))?\\s*(?:,|and|y)\\s*)*${number}\\b`, "i").test(text);

export default async function ArticlePage({ params }: { params: Promise<{ id: string; article: string }> }) {
  const { id, article } = await params;
  const data = await load(id, article);
  if (!data) notFound();
  const { instrument, readable, text, articles, index, node } = data;
  const [interpretations, decisions, rights, procedures, bodies, participation, instruments, annotations] = await Promise.all([
    getInterpretations(), getDecisions(), getRights(), proceduresCiting(id, node.number), bodiesOf(id), getParticipation(id), getInstruments(),
    getPublishedAnnotations({ instrument: id, article: node.number }),
  ]);
  const comments = interpretations.filter((g) => g.articles.some((a) => a.instrument === id && a.article === node.number));
  const judged = decisions.items.filter((d) => d.articles.some((a) => a.instrument === id && a.article === node.number));
  const topics = rights.map((r) => ({ r, links: r.articles.filter((a) => a.instrument === id && a.article === node.number) })).filter((x) => x.links.length);
  const amendment = instruments.find((i) => i.kind === "amendment" && i.parent === id && amendedArticles(i).includes(node.number));
  const statements = (participation?.participants || []).flatMap((p) => p.statements
    .filter((s) => ["reservation", "declaration", "reservation_and_declaration", "unlabelled"].includes(s.kind) && mentions(s.text, node.number))
    .map((s) => ({ p, s })));
  const title = instrumentTitle(instrument);
  const previous = articles[index - 1], next = articles[index + 1];
  const reference = `${node.label}${node.heading ? ` (${node.heading})` : ""}, ${title}`;

  return (
    <AtlasShell crumbs={[{ label: "Instrumentos", href: "/atlas/instruments" }, { label: title.length > 48 ? `${title.slice(0, 45)}…` : title, href: instrumentPath(id) }, { label: node.label }]}>
      <Container maxWidth="lg" sx={{ pt: { xs: 3, md: 4 }, pb: 3 }}>
        <Typography variant="overline" color="primary.main" sx={{ borderLeft: "3px solid", borderColor: "secondary.main", pl: 1.5 }}>{systemNames[instrument.system]}</Typography>
        <Typography component="p" color="text.secondary" sx={{ mt: 1 }}><Link href={`${instrumentPath(id)}#${node.id}`}>{title}</Link></Typography>
        <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "1.9rem", md: "2.5rem" }, mt: .5 }}>{node.label}{node.heading && <Box component="span" sx={{ display: "block", fontSize: { xs: "1.25rem", md: "1.5rem" }, mt: .5 }}>{node.heading}</Box>}</Typography>
      </Container>

      <Container maxWidth="lg" sx={{ pb: 5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,1fr) 300px" }, columnGap: 6, rowGap: 4 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary">Texto oficial · {authorityNames[readable.authority]}</Typography>
            {amendment && <Typography variant="body2" sx={{ mt: 1, p: 1.25, bgcolor: "#fff8e6", borderLeft: "3px solid #a87b2a", lineHeight: 1.6 }}>{amendmentNotice(amendment)} <Link href={instrumentPath(amendment.id)}>Ver la enmienda</Link>.</Typography>}
            <Box lang={text.lang} sx={{ mt: 1, pl: 2, borderLeft: `2px solid ${brand.accent}` }}>
              {node.paragraphs.map((p) => p.text && <Typography key={p.id} id={p.id} sx={{ my: 1.25, lineHeight: 1.8, whiteSpace: "pre-line", fontSize: "1.02rem" }}>{p.text}</Typography>)}
            </Box>
            <Box sx={{ mt: 1.5 }}><SourceNote label={`${text.source.publisher}${text.source.identifier ? ` · ${text.source.identifier}` : ""}`} href={text.source.url} retrieved={text.source.retrieved} /></Box>
            {node.version && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Versión publicada el {longDate(node.version.published)} ({node.version.norm}){node.version.in_force ? `, vigente desde el ${longDate(node.version.in_force)}` : ""}.</Typography>}
            {node.notes && node.notes.length > 0 && (
              <Box component="aside" aria-label="Notas del BOE" sx={{ mt: 2, p: 1.5, bgcolor: brand.soft }}>
                <Typography variant="overline" color="text.secondary">Notas del BOE (no forman parte del texto)</Typography>
                {node.notes.map((n, i) => <Typography key={i} variant="body2" color="text.secondary" sx={{ mt: .5, lineHeight: 1.6, whiteSpace: "pre-line" }}>{n}</Typography>)}
              </Box>
            )}
            {node.history && node.history.length > 0 && (
              <Box component="details" sx={{ mt: 2, "& > summary": { cursor: "pointer", color: "secondary.dark" } }}>
                <summary>Versiones anteriores ({node.history.length})</summary>
                {node.history.map((v) => (
                  <Box key={v.norm + v.published} sx={{ mt: 1.5, pl: 1.5, borderLeft: `2px solid ${brand.border}` }}>
                    <Typography variant="caption" color="text.secondary">Publicada el {longDate(v.published)} ({v.norm})</Typography>
                    {v.paragraphs.map((t, i) => <Typography key={i} variant="body2" color="text.secondary" sx={{ my: .5, lineHeight: 1.65 }}>{t}</Typography>)}
                  </Box>
                ))}
              </Box>
            )}
            <Box sx={{ mt: 3 }}>
              <CiteTools data={{ citation: `${reference}.`, permalink: articlePath(id, node.number) }} />
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mt: 3, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
              {previous ? <Button component={Link} href={articlePath(id, previous.number)} startIcon={<ArrowBackRoundedIcon />}>{previous.label}</Button> : <span />}
              {next ? <Button component={Link} href={articlePath(id, next.number)} endIcon={<ArrowForwardRoundedIcon />}>{next.label}</Button> : <span />}
            </Box>
          </Box>

          <Box component="aside" aria-label="Contexto del artículo">
            {bodies.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary">Órganos de supervisión</Typography>
                {bodies.map((b) => <Typography key={b.id} variant="body2" sx={{ mt: .5 }}><Link href={bodyPath(b.id)}>{b.name_es}</Link></Typography>)}
              </Box>
            )}
            {participation && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary">Estados</Typography>
                <Typography variant="body2" sx={{ mt: .5 }}><Link href={`${instrumentPath(id)}#participacion`}>Participación en el instrumento</Link></Typography>
                <Typography variant="body2"><Link href={`/atlas/ratifications?i=${id}`}>Mapa de ratificaciones</Link></Typography>
              </Box>
            )}
            {topics.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary">Derechos</Typography>
                {topics.map(({ r, links }) => (
                  <Box key={r.id} sx={{ mt: .75 }}>
                    <Typography variant="body2"><Link href={`/atlas/topics/${r.id}`}>{r.name}</Link></Typography>
                    <Typography variant="caption" color="text.secondary">{basisNames[links[0].basis]}</Typography>
                  </Box>
                ))}
              </Box>
            )}
            {procedures.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="overline" color="text.secondary">Procedimientos que citan este artículo</Typography>
                {procedures.map((p) => <Typography key={p.id} variant="body2" sx={{ mt: .5 }}><Link href={procedurePath(p.id)}>{p.name_es}</Link></Typography>)}
              </Box>
            )}
          </Box>
        </Box>
      </Container>

      <Section id="interpretaciones" overline="Interpretación institucional" title="Observaciones y recomendaciones generales" note="Documentos de los comités cuyo título oficial nombra este artículo. El vínculo se basa en ese título; el contenido debe leerse en el documento.">
        {comments.length ? (
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", borderTop: "1px solid", borderColor: "divider" }}>
            {comments.map((g) => (
              <Box component="li" key={g.id} sx={{ py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{g.title}</Typography>
                <Typography variant="caption" color="text.secondary">{g.committee} · {g.symbol}{g.date ? ` · ${longDate(g.date)}` : ""} · <ExternalLink href={g.links.es}>español</ExternalLink> · <ExternalLink href={g.links.en}>inglés</ExternalLink></Typography>
              </Box>
            ))}
          </Box>
        ) : <Typography variant="body2" color="text.secondary">Ningún documento incorporado nombra este artículo en su título.</Typography>}
      </Section>

      <Section id="decisiones" overline="Jurisprudencia" title="Decisiones" note="Solo se vinculan las decisiones cuyos metadatos oficiales declaran expresamente una violación o la ausencia de violación de este artículo.">
        {judged.length ? (
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
            {judged.map((d) => {
              const relation = d.articles.find((a) => a.instrument === id && a.article === node.number)!;
              return <Box component="li" key={d.id} sx={{ py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}><Typography variant="body2"><ExternalLink href={d.links.hudoc || d.links.es}>{d.title}</ExternalLink> · {basisNames[relation.relation]}</Typography></Box>;
            })}
          </Box>
        ) : <Typography variant="body2" color="text.secondary">No hay decisiones incorporadas con esta relación expresa.</Typography>}
      </Section>

      {statements.length > 0 && (
        <Section id="reservas" overline="Registro del depositario" title="Reservas y declaraciones que mencionan este artículo" note="Búsqueda literal del número del artículo en el texto de las reservas y declaraciones del registro (en inglés). Una mención no implica que la reserva se refiera a esta disposición: léase el texto completo.">
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
            {statements.slice(0, 40).map(({ p, s }, i) => (
              <Box component="li" key={i} sx={{ py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{p.iso3 ? <Link href={`${countryPath(p.iso3)}#${id}`}>{p.name}</Link> : p.name}{s.label ? ` · ${s.label}` : ""}</Typography>
                <Typography variant="body2" color="text.secondary" lang="en" sx={{ mt: .25, lineHeight: 1.6 }}>{s.text.length > 420 ? `${s.text.slice(0, 417)}…` : s.text}</Typography>
              </Box>
            ))}
          </Box>
        </Section>
      )}

      <Section id="anotaciones" overline="Blue Human" title="Anotaciones" note="Comentarios firmados del equipo de Blue Human. No son texto oficial ni interpretación de ningún órgano.">
        <AnnotationList annotations={annotations} empty="No hay anotaciones publicadas sobre este artículo." />
      </Section>
    </AtlasShell>
  );
}
