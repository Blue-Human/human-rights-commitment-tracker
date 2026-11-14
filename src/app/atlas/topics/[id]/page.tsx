import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { ExternalLink } from "@/components/atlas/Quote";
import { getInterpretations, getProcedures, getRight, getRights, getText } from "@/lib/atlas/data";
import { articlePath, basisNames, instrumentPath, instrumentTitle, procedurePath, systemNames } from "@/lib/atlas/labels";
import { instrumentMap } from "@/lib/atlas/relations";
import { getCommitments } from "@/lib/hrct";
import { fold } from "@/lib/search";
import type { ArticleNode } from "@/lib/atlas/types";

export const revalidate = 3600;
export const dynamicParams = false;
export async function generateStaticParams() {
  return (await getRights()).map((r) => ({ id: r.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const r = await getRight((await params).id);
  return r ? { title: `${r.name} | Atlas | Human Rights Commitment Institute`, description: `Artículos que reconocen ${r.name.toLowerCase()}, interpretaciones de los comités y mecanismos de protección, con su fuente oficial.` } : {};
}

export default async function RightPage({ params }: { params: Promise<{ id: string }> }) {
  const right = await getRight((await params).id);
  if (!right) notFound();
  const [instruments, interpretations, procedures, commitments] = await Promise.all([instrumentMap(), getInterpretations(), getProcedures(), getCommitments().catch(() => [])]);
  // Group the article links by instrument; one article may be linked on several grounds.
  const grouped = new Map<string, Map<string, typeof right.articles>>();
  for (const a of right.articles) {
    const byArticle = grouped.get(a.instrument) ?? new Map();
    byArticle.set(a.article, [...(byArticle.get(a.article) || []), a]);
    grouped.set(a.instrument, byArticle);
  }
  const texts = new Map(await Promise.all([...grouped.keys()].map(async (id) => [id, await getText(id, "es") || await getText(id, "en")] as const)));
  const linked = new Set([...grouped.keys(), ...right.instruments.map((i) => i.instrument)]);
  const relevant = procedures.filter((p) => [...p.basis, ...p.requirements].some((q) => q.i && linked.has(q.i)));
  const comments = interpretations.filter((g) => right.interpretations.includes(g.id));
  const phrases = right.phrases.map(fold);
  const mentioning = commitments.filter((c) => phrases.some((p) => fold(c.original_text || "").includes(p)));

  return (
    <AtlasShell crumbs={[{ label: "Derechos", href: "/atlas/topics" }, { label: right.name }]}>
      <PageHead overline="Derecho" title={right.name}>
        <p>Expresiones que establecen los vínculos: {right.phrases.map((p) => `«${p}»`).join(", ")}.</p>
      </PageHead>

      <Section id="articulos" overline="Texto jurídico oficial" title="Artículos" note="Artículos cuyo encabezamiento oficial nombra el derecho, o que una observación o recomendación general vincula con él en su título oficial.">
        {grouped.size === 0 && <Typography variant="body2" color="text.secondary">Ningún artículo de los textos incorporados tiene un vínculo documentado con este derecho.</Typography>}
        {[...grouped.entries()].map(([id, byArticle]) => {
          const instrument = instruments.get(id);
          const text = texts.get(id);
          return (
            <Box key={id} sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary">{instrument ? systemNames[instrument.system] : ""}</Typography>
              <Typography component="h3" variant="h6" color="primary.main"><Link href={instrumentPath(id)}>{instrument ? instrumentTitle(instrument) : id}</Link></Typography>
              {[...byArticle.entries()].map(([number, links]) => {
                const node = text?.nodes.find((n): n is ArticleNode => n.kind === "article" && n.number === number);
                return (
                  <Box key={number} sx={{ mt: 1.25, pl: 1.75, borderLeft: "2px solid", borderColor: "secondary.main" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {node ? <Link href={articlePath(id, number)}>{node.label}{node.heading ? `. ${node.heading}` : ""}</Link> : `Artículo ${number} (texto no incorporado)`}
                    </Typography>
                    {node && <Typography variant="body2" color="text.secondary" sx={{ mt: .25, lineHeight: 1.6 }}>{(node.paragraphs[0]?.text || "").slice(0, 260)}{(node.paragraphs[0]?.text || "").length > 260 ? "…" : ""}</Typography>}
                    {links.map((l, i) => <Typography key={i} variant="caption" color="text.secondary" sx={{ display: "block" }}>{basisNames[l.basis]}: «{l.evidence}»{l.symbol ? ` (${l.symbol})` : ""}</Typography>)}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Section>

      {right.instruments.length > 0 && (
        <Section id="instrumentos" overline="Instrumentos" title="Instrumentos dedicados" note="Instrumentos cuyo título oficial nombra el derecho.">
          {right.instruments.map((i) => { const x = instruments.get(i.instrument); return x ? <Typography key={i.instrument} variant="body2" sx={{ py: .5 }}><Link href={instrumentPath(x.id)}>{instrumentTitle(x)}</Link> <Typography component="span" variant="caption" color="text.secondary">· {systemNames[x.system]}</Typography></Typography> : null; })}
        </Section>
      )}

      <Section id="interpretaciones" overline="Interpretación institucional" title="Observaciones y recomendaciones generales" note="Documentos de los comités cuyo título oficial contiene alguna de las expresiones del derecho.">
        {comments.length ? comments.map((g) => (
          <Box key={g.id} sx={{ py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{g.title}</Typography>
            <Typography variant="caption" color="text.secondary">{g.committee} · {g.symbol} · <ExternalLink href={g.links.es}>documento</ExternalLink></Typography>
          </Box>
        )) : <Typography variant="body2" color="text.secondary">Ninguna.</Typography>}
      </Section>

      <Section id="mecanismos" overline="Protección" title="Mecanismos" note="Procedimientos basados en los instrumentos anteriores. Si un procedimiento se aplica a un Estado depende de lo que este haya ratificado o aceptado: compruébese en el orientador.">
        {relevant.length ? relevant.map((p) => <Typography key={p.id} variant="body2" sx={{ py: .5 }}><Link href={procedurePath(p.id)}>{p.name_es}</Link></Typography>) : <Typography variant="body2" color="text.secondary">Ninguno documentado.</Typography>}
        <Typography variant="body2" sx={{ mt: 1.5 }}><Link href={`/atlas/mechanisms/guide?derecho=${right.id}`}>Abrir el orientador con este derecho</Link></Typography>
      </Section>

      <Section id="hrci" overline="Seguimiento del HRCI" title="Recomendaciones del EPU a España" note="Recomendaciones del cuarto ciclo del Examen Periódico Universal cuyo texto oficial contiene alguna de las expresiones de este derecho. Es una búsqueda literal en el texto, no una clasificación; la valoración del cumplimiento es del HRCI y se muestra en cada ficha.">
        {mentioning.length ? (
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
            {mentioning.slice(0, 15).map((c) => <Box component="li" key={c.public_id} sx={{ py: .75, borderBottom: "1px solid", borderColor: "divider" }}><Typography variant="body2"><Link href={`/commitments/${encodeURIComponent(c.public_id)}`}>Recomendación {c.recommendation_number}</Link> · {c.title}</Typography></Box>)}
          </Box>
        ) : <Typography variant="body2" color="text.secondary">Ninguna recomendación contiene estas expresiones.</Typography>}
        {mentioning.length > 15 && <Typography variant="body2" sx={{ mt: 1 }}><Link href={`/commitments`}>Ver todas las recomendaciones</Link> ({mentioning.length} contienen las expresiones)</Typography>}
      </Section>
    </AtlasShell>
  );
}
