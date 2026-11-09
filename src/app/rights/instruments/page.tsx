import type { Metadata } from "next";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { LibraryList, type LibraryRow } from "@/components/atlas/LibraryList";
import { getInstruments } from "@/lib/atlas/data";
import { categoryNames, instrumentPath, instrumentTitle, kindNames, partiesLine, systemNames, year } from "@/lib/atlas/labels";

export const metadata: Metadata = {
  title: "Instrumentos | Human Rights Atlas",
  description: "Biblioteca de tratados, protocolos, declaraciones y reglamentos de derechos humanos de las Naciones Unidas, el Consejo de Europa, la OEA y la Unión Africana.",
};

export default async function InstrumentsPage() {
  const instruments = await getInstruments();
  const rows: LibraryRow[] = instruments.map((i) => {
    const title = instrumentTitle(i);
    const failing = i.texts.find((t) => !t.complete);
    return {
      id: i.id, href: instrumentPath(i.id), title, popular: i.popular_name_es, system: i.system, systemName: systemNames[i.system],
      kind: i.kind, kindName: kindNames[i.kind], category: i.category === "core" && i.kind === "amendment" ? "related" : i.category,
      categoryName: categoryNames[i.category === "core" && i.kind === "amendment" ? "related" : i.category], parent: i.parent ?? undefined,
      date: year(i.concluded), parties: partiesLine(i), readable: i.texts.some((t) => t.complete),
      lacks: failing ? "Texto no verificado" : null,
    };
  });
  return (
    <AtlasShell crumbs={[{ label: "Instrumentos" }]}>
      <PageHead overline="Biblioteca" title="Instrumentos de derechos humanos">
        <p>Tratados, protocolos, declaraciones y reglamentos de los órganos. Los textos se leen por artículos cuando existe una versión oficial digital que supera los controles de integridad; en los demás casos se ofrecen los metadatos, el estado de ratificación y el enlace al original.</p>
      </PageHead>
      <Section title="Catálogo" id="catalogo">
        <LibraryList rows={rows} />
      </Section>
    </AtlasShell>
  );
}
