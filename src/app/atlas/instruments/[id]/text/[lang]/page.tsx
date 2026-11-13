import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { SourceNote } from "@/components/atlas/Quote";
import { ReaderSearch } from "@/components/atlas/ReaderSearch";
import { TextIndex, TextReader } from "@/components/atlas/TextReader";
import { getInstrument, getInstruments, getText } from "@/lib/atlas/data";
import { authorityNames, authorityNotes, instrumentPath, instrumentTitle } from "@/lib/atlas/labels";
import { articleContext } from "@/lib/atlas/relations";

export const dynamicParams = false;
const languages: Record<string, string> = { en: "inglés", fr: "francés", es: "español" };

export async function generateStaticParams() {
  return (await getInstruments()).flatMap((i) => i.texts.filter((t) => t.complete).map((t) => ({ id: i.id, lang: t.lang })));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; lang: string }> }): Promise<Metadata> {
  const { id, lang } = await params;
  const instrument = await getInstrument(id);
  return instrument ? { title: `${instrumentTitle(instrument)} (${languages[lang] || lang}) | Human Rights Atlas` } : {};
}

export default async function TextInLanguage({ params }: { params: Promise<{ id: string; lang: string }> }) {
  const { id, lang } = await params;
  const instrument = await getInstrument(id);
  const entry = instrument?.texts.find((t) => t.lang === lang && t.complete);
  const text = entry ? await getText(id, lang) : null;
  if (!instrument || !entry || !text) notFound();
  const context = await articleContext(id);
  const title = instrumentTitle(instrument);
  return (
    <AtlasShell crumbs={[{ label: "Instrumentos", href: "/rights/instruments" }, { label: title.length > 48 ? `${title.slice(0, 45)}…` : title, href: instrumentPath(id) }, { label: `Versión en ${languages[lang] || lang}` }]}>
      <PageHead overline={`Versión en ${languages[lang] || lang}`} title={title}>
        <p><Link href={instrumentPath(id)}>Volver a la ficha del instrumento</Link></p>
      </PageHead>
      <Section title="Texto" id="texto">
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "240px minmax(0,1fr)" }, columnGap: 5 }}>
          <Box sx={{ display: { xs: "none", md: "block" } }}>
            <Box sx={{ position: "sticky", top: 84, maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}>
              <ReaderSearch container="reader" />
              <TextIndex text={text} />
            </Box>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ p: 2, mb: 3, bgcolor: brand.soft, borderLeft: `3px solid ${brand.accent}` }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>{authorityNames[entry.authority]}</Typography>
              <Typography variant="body2" color="text.secondary">{authorityNotes[entry.authority]}</Typography>
              <SourceNote label={text.source.publisher} href={text.source.url} retrieved={text.source.retrieved} />
            </Box>
            <TextReader text={text} instrument={id} context={context} />
          </Box>
        </Box>
      </Section>
    </AtlasShell>
  );
}
