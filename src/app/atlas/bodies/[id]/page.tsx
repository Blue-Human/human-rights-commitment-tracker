import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { QuoteBlock, SourceNote } from "@/components/atlas/Quote";
import { getBodies, getBody, getProcedures } from "@/lib/atlas/data";
import { instrumentPath, instrumentTitle, natureNames, procedurePath, shortDate, systemNames } from "@/lib/atlas/labels";
import { instrumentMap } from "@/lib/atlas/relations";

export const dynamicParams = false;
export async function generateStaticParams() {
  return (await getBodies()).map((b) => ({ id: b.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const body = await getBody((await params).id);
  return body ? { title: `${body.name_es} | Atlas | Human Rights Commitment Institute`, description: `${natureNames[body.nature]} · ${systemNames[body.system]}: base jurídica, composición, competencias y procedimientos, con cita de su norma.` } : {};
}

export default async function BodyPage({ params }: { params: Promise<{ id: string }> }) {
  const body = await getBody((await params).id);
  if (!body) notFound();
  const [instruments, procedures] = await Promise.all([instrumentMap(), getProcedures()]);
  const own = procedures.filter((p) => p.body === body.id);
  const members = body.members;
  const rules = body.rules ? instruments.get(body.rules) : null;
  const statute = body.statute ? instruments.get(body.statute) : null;

  return (
    <AtlasShell crumbs={[{ label: "Protección", href: "/atlas/mechanisms" }, { label: "Órganos", href: "/atlas/bodies" }, { label: body.name_es }]}>
      <PageHead overline={`${systemNames[body.system]} · ${natureNames[body.nature] || body.nature}`} title={body.name_es}>
        {body.name_en && <p lang="en">{body.name_en}</p>}
        {body.name_note && <p>{body.name_note}</p>}
      </PageHead>

      <Section id="base" overline="Norma constitutiva" title="Base jurídica">
        {body.established_by ? <QuoteBlock q={body.established_by} instruments={instruments} /> : <Typography variant="body2" color="text.secondary">{body.established_by_note || "No se ha incorporado la disposición constitutiva."}</Typography>}
        {body.established_by && body.established_by_note && <Typography variant="body2" color="text.secondary">{body.established_by_note}</Typography>}
        {body.instruments.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="overline" color="text.secondary">Instrumentos que supervisa o aplica</Typography>
            {body.instruments.map((id) => instruments.get(id)).filter(Boolean).map((i) => <Typography key={i!.id} variant="body2"><Link href={instrumentPath(i!.id)}>{instrumentTitle(i!)}</Link></Typography>)}
          </Box>
        )}
      </Section>

      {body.composition.length > 0 && (
        <Section id="composicion" overline="Composición" title="Composición y mandatos" note="Lo que dispone la norma, citado de ella.">
          {body.composition.map((q, i) => <QuoteBlock key={i} q={q} instruments={instruments} compact />)}
        </Section>
      )}

      <Section id="miembros" overline="Composición actual" title="Miembros" note={members ? "Según la página oficial del órgano en la fecha indicada." : undefined}>
        {members && members.members.length ? (
          <>
            {members.officers && members.officers.length > 0 && (
              <Box sx={{ mb: 2 }}>
                {members.officers.map((o) => <Typography key={o.function} variant="body2"><strong>{o.function}:</strong> {o.name}</Typography>)}
              </Box>
            )}
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(3,minmax(0,1fr))" }, columnGap: 3 }}>
              {members.members.map((m) => (
                <Box component="li" key={m.name} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{m.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{[m.function, m.state, m.term_start && m.term_end ? `mandato ${shortDate(m.term_start)} – ${shortDate(m.term_end)}` : null].filter(Boolean).join(" · ")}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ mt: 1.5 }}><SourceNote label="página oficial del órgano" href={members.ref.url} retrieved={members.ref.retrieved}>{members.as_at ? ` · composición a ${shortDate(members.as_at)}` : ""}</SourceNote></Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">La composición actual no se ha incorporado: la página oficial con los miembros no es accesible de forma automatizada o no publica los datos en un formato que pueda leerse con fiabilidad. Consúltese en el sitio del órgano.</Typography>
        )}
      </Section>

      {body.competences.length > 0 && (
        <Section id="competencias" overline="Competencias" title="Competencias expresamente reconocidas" note="Cada competencia figura con la disposición que la atribuye. El encabezado resume el tema; lo que la norma establece es el texto citado.">
          {body.competences.map((q, i) => (
            <Box key={i} sx={{ py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="h6" component="h3" color="primary.main" sx={{ fontSize: "1rem" }}>{q.label}</Typography>
              <QuoteBlock q={q} instruments={instruments} compact />
            </Box>
          ))}
        </Section>
      )}

      {(own.length > 0 || rules || statute) && (
        <Section id="procedimientos" overline="Procedimientos" title="Procedimientos y reglas">
          {own.map((p) => <Typography key={p.id} variant="body2" sx={{ py: .5 }}><Link href={procedurePath(p.id)}>{p.name_es}</Link></Typography>)}
          {rules && <Typography variant="body2" sx={{ py: .5 }}>Reglamento: <Link href={instrumentPath(rules.id)}>{instrumentTitle(rules)}</Link>{rules.registry?.un_symbol ? ` (${rules.registry.un_symbol as string})` : ""}</Typography>}
          {statute && <Typography variant="body2" sx={{ py: .5 }}>Estatuto: <Link href={instrumentPath(statute.id)}>{instrumentTitle(statute)}</Link></Typography>}
          {body.interpretations > 0 && <Typography variant="body2" sx={{ py: .5 }}><Link href={`/atlas/case-law?body=${body.id}`}>{body.interpretations} observaciones o recomendaciones generales</Link></Typography>}
          {body.decisions > 0 && <Typography variant="body2" sx={{ py: .5 }}><Link href={`/atlas/case-law?body=${body.id}#decisiones`}>{body.decisions} decisiones sobre España</Link></Typography>}
        </Section>
      )}
    </AtlasShell>
  );
}

