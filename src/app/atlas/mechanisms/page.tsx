import type { Metadata } from "next";
import Link from "next/link";
import { Box, Button, Container, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { GuideForm } from "@/components/atlas/GuideForm";
import { getBodies, getCountries, getProcedures, getRights } from "@/lib/atlas/data";
import { procedureKinds, procedurePath, startedByPeople, systemNames, systemOrder } from "@/lib/atlas/labels";

export const metadata: Metadata = {
  title: "Mecanismos de protección | Atlas | Human Rights Commitment Institute",
  description: "Cómo funcionan los procedimientos internacionales de protección de los derechos humanos: quién puede acudir, requisitos de admisibilidad, plazos y canales oficiales, con la cita de cada norma.",
};

export default async function MechanismsPage() {
  const [procedures, bodies, countries, rights] = await Promise.all([getProcedures(), getBodies(), getCountries(), getRights()]);
  const bodyName = new Map(bodies.map((b) => [b.id, b.name_es]));
  return (
    <AtlasShell crumbs={[{ label: "Protección" }]}>
      <PageHead overline="Protección" title="¿Ante quién se puede acudir?">
        <p>Para cada procedimiento: el órgano competente, su base jurídica, quién puede iniciarlo, los requisitos de admisibilidad, los plazos y los canales oficiales de presentación. Cada requisito se cita literalmente de la norma que lo establece.</p>
        <p>El Atlas es una herramienta informativa: no valora si un caso concreto es admisible ni recomienda una vía, y no recibe ni almacena casos. Las solicitudes se presentan siempre ante el órgano, por sus canales oficiales.</p>
      </PageHead>
      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Typography variant="overline" color="text.secondary" component="h2">Orientador · qué vías constan para un Estado</Typography>
        <Box sx={{ mt: 1 }}><GuideForm countries={countries} rights={rights} /></Box>
      </Container>
      {systemOrder.map((system) => {
        const list = procedures.filter((p) => p.system === system);
        if (!list.length) return null;
        return (
          <Section key={system} id={system} title={systemNames[system]}>
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, borderTop: "1px solid", borderColor: "divider" }}>
              {list.map((p) => (
                <Box component="li" key={p.id} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                  <Box component={Link} href={procedurePath(p.id)} sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,1fr) 220px 160px" }, columnGap: 3, rowGap: .25, py: 1.5, color: "inherit", textDecoration: "none", "&:hover .n": { color: brand.accentInk } }}>
                    <Box>
                      <Typography className="n" color="primary.main" sx={{ fontWeight: 500 }}>{p.name_es}</Typography>
                      {p.body && <Typography variant="caption" color="text.secondary">{bodyName.get(p.body)}</Typography>}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>{procedureKinds[p.kind] || p.kind}{startedByPeople.has(p.kind) ? " · a instancia de personas u organizaciones" : ""}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>{p.quoted ? `${p.quoted} disposiciones citadas` : "Solo referencias"}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Section>
        );
      })}
      <Box sx={{ maxWidth: "lg", mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        <Button component={Link} href="/atlas/bodies">Ver los órganos</Button>
      </Box>
    </AtlasShell>
  );
}
