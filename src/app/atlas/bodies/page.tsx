import type { Metadata } from "next";
import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { getBodies } from "@/lib/atlas/data";
import { bodyPath, natureNames, systemNames, systemOrder } from "@/lib/atlas/labels";

export const metadata: Metadata = {
  title: "Órganos | Atlas | Human Rights Commitment Institute",
  description: "Tribunales, comités y comisiones de derechos humanos de las Naciones Unidas, el Consejo de Europa, la OEA y la Unión Africana: base jurídica, composición y competencias.",
};

export default async function BodiesPage() {
  const bodies = await getBodies();
  return (
    <AtlasShell crumbs={[{ label: "Protección", href: "/atlas/mechanisms" }, { label: "Órganos" }]}>
      <PageHead overline="Directorio" title="Órganos, tribunales e instituciones">
        <p>Cada ficha cita la disposición que crea el órgano y las que le atribuyen competencias. El tipo de órgano es el que nombra su norma constitutiva —tribunal, comité, comisión—, porque sus competencias y el valor de sus decisiones son distintos.</p>
      </PageHead>
      {systemOrder.map((system) => (
        <Section key={system} title={systemNames[system]} id={system}>
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2,minmax(0,1fr))" }, columnGap: 4 }}>
            {bodies.filter((b) => b.system === system).map((b) => (
              <Box component="li" key={b.id} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                <Box component={Link} href={bodyPath(b.id)} sx={{ display: "block", py: 1.6, color: "inherit", textDecoration: "none", "&:hover .n": { color: brand.accentInk } }}>
                  <Typography variant="caption" color="text.secondary">{natureNames[b.nature] || b.nature}</Typography>
                  <Typography className="n" color="primary.main" sx={{ fontWeight: 500, lineHeight: 1.4 }}>{b.name_es}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {[b.members?.members?.length ? `${b.members.members.length} miembros publicados` : null, b.interpretations ? `${b.interpretations} observaciones generales` : null, b.decisions ? `${b.decisions} decisiones sobre España` : null].filter(Boolean).join(" · ")}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Section>
      ))}
    </AtlasShell>
  );
}
