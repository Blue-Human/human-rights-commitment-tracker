import type { Metadata } from "next";
import { Box, Typography } from "@mui/material";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { RightTiles } from "@/components/atlas/RightTiles";
import { RecordDisclosure } from "@/components/RecordDisclosure";
import { getRights } from "@/lib/atlas/data";

export const metadata: Metadata = {
  title: "Derechos | Human Rights Atlas",
  description: "Explorar el derecho internacional de los derechos humanos a partir de un derecho: artículos que lo reconocen, interpretaciones de los comités y mecanismos de protección.",
};

export default async function TopicsPage() {
  const rights = await getRights();
  return (
    <AtlasShell crumbs={[{ label: "Derechos" }]}>
      <PageHead overline="Derechos" title="¿Qué derecho quiere consultar?">
        <p>Cada derecho reúne los artículos que lo reconocen, las interpretaciones de los comités y los mecanismos que permiten reclamarlo.</p>
      </PageHead>
      <Section title={`${rights.length} derechos`} id="derechos">
        <RightTiles rights={rights} />
        <Box sx={{ mt: 3, maxWidth: 820 }}>
          <RecordDisclosure title="Cómo se establecen los vínculos">
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>Cada derecho reúne los artículos cuyo encabezamiento oficial lo nombra, los artículos que una observación o recomendación general vincula con él en su título oficial y los instrumentos dedicados a él según su título. No se establecen relaciones por semejanza de palabras ni por interpretación: cada vínculo muestra el texto oficial en que se basa.</Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.7, mt: 1 }}>Por eso un tratado sin encabezamientos en sus artículos, como el Pacto Internacional de Derechos Civiles y Políticos, aparece solo a través de las observaciones generales que nombran sus artículos.</Typography>
          </RecordDisclosure>
        </Box>
      </Section>
    </AtlasShell>
  );
}
