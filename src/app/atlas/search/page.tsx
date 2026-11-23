import type { Metadata } from "next";
import { AtlasSearch } from "@/components/atlas/AtlasSearch";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { getBodies, getCountries } from "@/lib/atlas/data";
import { systemNames, systemOrder } from "@/lib/atlas/labels";

export const metadata: Metadata = {
  title: "Buscar | Atlas | Human Rights Commitment Institute",
  description: "Búsqueda en los instrumentos, artículos, países, órganos, procedimientos, interpretaciones, decisiones y anotaciones del Atlas.",
};

type Params = { q?: string; type?: string; system?: string; country?: string; body?: string; from?: string; to?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [countries, bodies] = await Promise.all([getCountries(), getBodies()]);
  const initial = { q: params.q || "", type: params.type || "", system: params.system || "", country: params.country || "", body: params.body || "", from: params.from || "", to: params.to || "" };
  return (
    <AtlasShell crumbs={[{ label: "Buscar" }]}>
      <PageHead overline="Búsqueda" title="Buscar en el Atlas" />
      <Section title="Resultados" id="buscar">
        <AtlasSearch
          initial={initial}
          options={{
            countries: countries.map((c) => ({ iso3: c.iso3, name: c.name_es || c.name_en })).sort((a, b) => a.name.localeCompare(b.name, "es")),
            systems: systemOrder.map((s) => ({ code: s, name: systemNames[s] })),
            bodies: bodies.map((b) => ({ id: b.id, name: b.name_es })),
          }}
        />
      </Section>
    </AtlasShell>
  );
}
