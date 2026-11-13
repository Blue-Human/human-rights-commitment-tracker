import type { Metadata } from "next";
import Link from "next/link";
import { Box, Button, Container, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { ExternalLink } from "@/components/atlas/Quote";
import { getBodies, getDecisions, getInterpretations } from "@/lib/atlas/data";
import { articlePath, bodyPath, longDate, shortDate } from "@/lib/atlas/labels";

export const metadata: Metadata = {
  title: "Jurisprudencia e interpretaciones | Human Rights Atlas",
  description: "Observaciones y recomendaciones generales de los comités de las Naciones Unidas y decisiones sobre comunicaciones relativas a España, con su símbolo oficial.",
};

type Params = { committee?: string; body?: string; year?: string };

export default async function CaseLawPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [interpretations, decisions, bodies] = await Promise.all([getInterpretations(), getDecisions(), getBodies()]);
  const bodyName = new Map(bodies.map((b) => [b.id, b.name_es]));
  const committees = [...new Set(interpretations.map((g) => g.committee))].sort();
  const committee = params.committee || (params.body ? interpretations.find((g) => g.body === params.body)?.committee : undefined);
  const gcs = interpretations.filter((g) => !committee || g.committee === committee);
  const tb = decisions.items.filter((d) => (!committee || d.committee === committee) && (!params.year || (d.date || "").startsWith(params.year)));
  const years = [...new Set(decisions.items.map((d) => d.date?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse();
  const select = { p: 1, border: `1px solid ${brand.border}`, bgcolor: "#fff", font: "inherit", fontSize: ".95rem", color: brand.ink, minWidth: 180 };

  return (
    <AtlasShell crumbs={[{ label: "Jurisprudencia" }]}>
      <PageHead overline="Interpretaciones y decisiones" title="Jurisprudencia e interpretaciones institucionales">
        <p>Las observaciones y recomendaciones generales son interpretaciones de los comités de las Naciones Unidas; las decisiones sobre comunicaciones individuales resuelven casos concretos. Unas y otras son distintas de las sentencias de un tribunal. Cada documento enlaza con su texto oficial.</p>
      </PageHead>
      <Container maxWidth="lg" sx={{ pb: 3 }}>
        <Box component="form" method="get" action="/rights/case-law" sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end" }}>
          <Box component="label" sx={{ display: "flex", flexDirection: "column", gap: .5, fontSize: ".8rem", color: "text.secondary" }}>
            Comité
            <Box component="select" name="committee" defaultValue={committee || ""} sx={select}><option value="">Todos</option>{committees.map((c) => <option key={c} value={c}>{c}</option>)}</Box>
          </Box>
          <Box component="label" sx={{ display: "flex", flexDirection: "column", gap: .5, fontSize: ".8rem", color: "text.secondary" }}>
            Año de la decisión
            <Box component="select" name="year" defaultValue={params.year || ""} sx={select}><option value="">Todos</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</Box>
          </Box>
          <Button type="submit" variant="contained">Filtrar</Button>
        </Box>
      </Container>

      <Section id="observaciones" overline="Interpretación institucional" title={`Observaciones y recomendaciones generales (${gcs.length})`} note="Base de datos de órganos de tratados del ACNUDH. El título es el que publica la base de datos, en el idioma en que lo publica. Cuando el título nombra un artículo, el documento queda vinculado a él.">
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", borderTop: "1px solid", borderColor: "divider" }}>
          {gcs.map((g) => (
            <Box component="li" key={g.id} sx={{ py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{g.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                <Link href={bodyPath(g.body)}>{g.committee}</Link> · {g.type === "general_recommendation" ? "Recomendación general" : "Observación general"} · {g.symbol}{g.date ? ` · ${longDate(g.date)}` : ""}
                {g.version_note ? ` · ${g.version_note}` : ""} · <ExternalLink href={g.links.es}>español</ExternalLink> · <ExternalLink href={g.links.en}>inglés</ExternalLink>
              </Typography>
              {g.articles.length > 0 && (
                <Typography variant="caption" sx={{ display: "block" }}>
                  Artículos nombrados en el título: {g.articles.map((a, i) => <span key={i}>{i ? ", " : ""}{a.in_reader ? <Link href={articlePath(a.instrument, a.article)}>art. {a.article}</Link> : `art. ${a.article}`}</span>)}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Section>

      <Section id="decisiones" overline="Comunicaciones individuales" title={`Decisiones sobre España (${tb.length})`} note="Decisiones de los comités de las Naciones Unidas sobre comunicaciones relativas a España, según la base de datos de órganos de tratados del ACNUDH. La base de datos no indica en esta vista el resultado ni los artículos examinados, por lo que el Atlas no los vincula a ninguna disposición: consúltese cada documento.">
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", borderTop: "1px solid", borderColor: "divider", columns: { md: 2 }, columnGap: 4 }}>
          {tb.filter((d) => d.source === "tbinternet").map((d) => (
            <Box component="li" key={d.id} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider", breakInside: "avoid" }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{d.communication ? `Comunicación n.º ${d.communication}` : d.symbol}</Typography>
              <Typography variant="caption" color="text.secondary">{bodyName.get(d.body) || d.committee} · {d.symbol}{d.date ? ` · ${shortDate(d.date)}` : ""} · <ExternalLink href={d.links.es}>documento</ExternalLink></Typography>
            </Box>
          ))}
        </Box>
      </Section>

      <Section id="tedh" overline="Tribunal Europeo de Derechos Humanos" title="Sentencias del Tribunal Europeo">
        {decisions.items.some((d) => d.source === "hudoc") ? (
          decisions.items.filter((d) => d.source === "hudoc").map((d) => (
            <Box key={d.id} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}><ExternalLink href={d.links.hudoc}>{d.title}</ExternalLink></Typography>
              <Typography variant="caption" color="text.secondary">{d.application} · {d.date ? shortDate(d.date) : ""} · {d.conclusion}</Typography>
            </Box>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 820, lineHeight: 1.7 }}>
            El Atlas incorpora las sentencias desde HUDOC, la base de datos del Tribunal, que publica para cada sentencia los artículos en los que el Tribunal declaró o descartó una violación. En la última actualización HUDOC respondió con un control de acceso automatizado y no se ha podido leer; el proceso lo intenta de nuevo en cada ejecución. Mientras tanto, consúltese <ExternalLink href="https://hudoc.echr.coe.int/">HUDOC</ExternalLink>.
          </Typography>
        )}
      </Section>
    </AtlasShell>
  );
}
