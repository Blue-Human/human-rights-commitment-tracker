import type { Metadata } from "next";
import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { Box, Button, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { getBodies, getProcedures } from "@/lib/atlas/data";
import { procedureKinds, procedurePath, startedByPeople, systemNames, systemOrder } from "@/lib/atlas/labels";

export const metadata: Metadata = {
  title: "Mecanismos de protección | Human Rights Atlas",
  description: "Cómo funcionan los procedimientos internacionales de protección de los derechos humanos: quién puede acudir, requisitos de admisibilidad, plazos y canales oficiales, con la cita de cada norma.",
};

export default async function MechanismsPage() {
  const [procedures, bodies] = await Promise.all([getProcedures(), getBodies()]);
  const bodyName = new Map(bodies.map((b) => [b.id, b.name_es]));
  return (
    <AtlasShell crumbs={[{ label: "Mecanismos" }]}>
      <PageHead overline="Mecanismos de protección" title="Procedimientos internacionales">
        <p>Para cada procedimiento: el órgano competente, su base jurídica, quién puede iniciarlo, los requisitos de admisibilidad, los plazos y los canales oficiales de presentación. Cada requisito se cita literalmente de la norma que lo establece.</p>
        <p>El Atlas es una herramienta informativa: no valora si un caso concreto es admisible ni recomienda una vía, y no recibe ni almacena casos. Las solicitudes se presentan siempre ante el órgano, por sus canales oficiales.</p>
      </PageHead>
      <Box sx={{ px: 0 }}>
        <Box sx={{ maxWidth: "lg", mx: "auto", px: { xs: 2, sm: 3 }, pb: 4 }}>
          <Box component={Link} href="/rights/mechanisms/guide" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: { xs: 2, md: 2.5 }, bgcolor: brand.navy, color: "#fff", textDecoration: "none", "&:hover .go": { transform: "translateX(3px)" } }}>
            <Box>
              <Typography variant="h6" component="h2">Orientador de mecanismos</Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,.8)", mt: .25 }}>Elija un país, un derecho y un tipo de mecanismo para ver qué procedimientos consta que se aplican y la lista de requisitos que deben comprobarse.</Typography>
            </Box>
            <ArrowForwardRoundedIcon className="go" sx={{ transition: "transform .15s", flexShrink: 0 }} />
          </Box>
        </Box>
      </Box>
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
        <Button component={Link} href="/rights/bodies">Ver los órganos</Button>
      </Box>
    </AtlasShell>
  );
}
