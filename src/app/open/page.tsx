import type { Metadata } from "next";
import { Box, Container, Typography } from "@mui/material";
import { LinkBlocks, type LinkBlock } from "@/components/LinkBlocks";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Open HRCI | Human Rights Commitment Institute",
  description: "Las fuentes, el método, los datos y el código del Human Rights Commitment Institute, abiertos a consulta.",
};

const REPOSITORY = "https://github.com/Blue-Human/human-rights-commitment-tracker";
const data = (path: string) => `${REPOSITORY}/blob/main/data/${path}`;

const blocks: LinkBlock[] = [
  {
    title: "Fuentes",
    text: "Cada ficha parte del texto oficial de Naciones Unidas y enlaza las evidencias y las publicaciones en las que se apoya, de modo que cualquier afirmación puede comprobarse en su origen.",
    links: [{ label: "Ver las recomendaciones", href: "/commitments" }],
  },
  {
    title: "Método",
    text: "Los criterios de valoración, la jerarquía de fuentes y las reglas de clasificación son públicos. Las valoraciones no se sobrescriben: cada cambio queda en el historial de la ficha.",
    links: [{ label: "Leer la metodología", href: "/methodology" }],
  },
  {
    title: "Datos",
    text: "Las clasificaciones de seguridad humana y de ODS, con la justificación de cada relación, y el catálogo de indicadores están publicados como archivos de datos.",
    links: [
      { label: "Clasificación de seguridad humana", href: data("human-security/hrct-review-spain-upr4.json") },
      { label: "Clasificación de ODS y metas", href: data("sdg/hrct-review-spain-upr4.json") },
      { label: "Catálogo de indicadores", href: data("indicators/spain-upr4.v1.json") },
    ],
  },
  {
    title: "Código",
    text: "El código de este sitio y del seguimiento diario de fuentes es público. Quien encuentre un error en los datos o en su presentación puede comunicarlo.",
    links: [
      { label: "Repositorio en GitHub", href: REPOSITORY },
      { label: "Enviar una corrección", href: "/contact" },
    ],
  },
];

export default function OpenPage() {
  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ pt: { xs: 4.5, md: 6 }, pb: { xs: 4, md: 5 } }}>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2.2rem", md: "3rem" } }}>Open HRCI</Typography>
          <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 700, lineHeight: 1.7 }}>
            El HRCI publica sus fuentes, su método, sus datos y su código, para que cualquiera pueda comprobar su trabajo y ayudar a corregirlo.
          </Typography>
        </Container>
        <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 9 } }}>
          <LinkBlocks blocks={blocks} columns={2} />
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
