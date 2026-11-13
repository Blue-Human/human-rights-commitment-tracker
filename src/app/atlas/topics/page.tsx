import type { Metadata } from "next";
import Link from "next/link";
import { Box, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { getRights } from "@/lib/atlas/data";
import { rightPath } from "@/lib/atlas/labels";

export const metadata: Metadata = {
  title: "Derechos | Human Rights Atlas",
  description: "Explorar el derecho internacional de los derechos humanos a partir de un derecho: artículos que lo reconocen, interpretaciones de los comités y mecanismos de protección.",
};

export default async function TopicsPage() {
  const rights = await getRights();
  return (
    <AtlasShell crumbs={[{ label: "Derechos" }]}>
      <PageHead overline="Explorador" title="Derechos">
        <p>Cada derecho reúne los artículos cuyo encabezamiento oficial lo nombra, los artículos que una observación o recomendación general vincula con él en su título oficial y los instrumentos dedicados a él según su título. No se establecen relaciones por semejanza de palabras ni por interpretación: cada vínculo muestra el texto oficial en que se basa.</p>
        <p>Por eso un tratado sin encabezamientos en sus artículos, como el Pacto Internacional de Derechos Civiles y Políticos, aparece solo a través de las observaciones generales que nombran sus artículos.</p>
      </PageHead>
      <Section title="Todos los derechos" id="derechos">
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))", md: "repeat(3,minmax(0,1fr))" }, gap: 2 }}>
          {rights.map((r) => {
            const articles = new Set(r.articles.map((a) => `${a.instrument}:${a.article}`)).size;
            return (
              <Box component="li" key={r.id}>
                <Box component={Link} href={rightPath(r.id)} sx={{ display: "block", height: "100%", p: 2.25, border: "1px solid", borderColor: "divider", borderTop: `3px solid ${brand.accent}`, color: "inherit", textDecoration: "none", "&:hover": { borderColor: brand.accentInk } }}>
                  <Typography component="h3" color="primary.main" sx={{ fontWeight: 500, fontSize: "1.05rem", lineHeight: 1.35 }}>{r.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    {[articles && `${articles} artículos`, r.instruments.length && `${r.instruments.length} instrumentos`, r.interpretations.length && `${r.interpretations.length} observaciones generales`].filter(Boolean).join(" · ") || "Sin vínculos documentados todavía"}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Section>
    </AtlasShell>
  );
}
