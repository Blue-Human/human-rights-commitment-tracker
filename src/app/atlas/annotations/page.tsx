import type { Metadata } from "next";
import { Box, Typography } from "@mui/material";
import { brand } from "@/brand";
import { AnnotationList } from "@/components/atlas/Annotations";
import { AtlasShell, PageHead, Section } from "@/components/atlas/AtlasShell";
import { annotationKinds, getPublishedAnnotations } from "@/lib/atlas/annotations";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Anotaciones | Human Rights Atlas",
  description: "Notas firmadas del equipo de Blue Human sobre instrumentos y artículos, separadas del texto oficial y de las interpretaciones de los órganos.",
};

export default async function AnnotationsPage() {
  const annotations = await getPublishedAnnotations();
  return (
    <AtlasShell crumbs={[{ label: "Sobre el Atlas", href: "/atlas/sources" }, { label: "Anotaciones" }]}>
      <PageHead overline="Blue Human" title="Anotaciones">
        <p>Comentarios académicos y editoriales del equipo de Blue Human, firmados por su autor. Son una categoría aparte: no modifican el texto oficial y no son interpretaciones de ningún órgano. Cada nota indica sus fuentes.</p>
      </PageHead>
      <Section title="Cómo se publican" id="proceso">
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
          {["Borrador", "Pendiente de revisión", "Aprobada", "Publicada", "Archivada"].map((s, i) => (
            <Box key={s} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {i > 0 && <Typography color="text.secondary">→</Typography>}
              <Box sx={{ px: 1.25, py: .5, border: `1px solid ${brand.border}`, bgcolor: s === "Publicada" ? brand.accentSoft : "#fff" }}><Typography variant="body2">{s}</Typography></Box>
            </Box>
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, maxWidth: 820, lineHeight: 1.7 }}>
          Solo las personas autorizadas del equipo pueden redactar, revisar, aprobar, publicar o retirar una nota. Una nota se publica únicamente después de haber sido aprobada, y cada cambio queda en su historial de versiones. Los visitantes solo ven las notas publicadas. Tipos de nota: {Object.values(annotationKinds).join(", ")}.
        </Typography>
      </Section>
      <Section title={`Notas publicadas (${annotations.length})`} id="notas">
        <AnnotationList annotations={annotations} empty="Todavía no se ha publicado ninguna anotación." showTarget />
      </Section>
    </AtlasShell>
  );
}
