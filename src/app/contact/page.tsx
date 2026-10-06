import type { Metadata } from "next";
import { Box, Container, Typography } from "@mui/material";
import { LinkBlocks, type LinkBlock } from "@/components/LinkBlocks";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Contacto | Human Rights Commitment Institute",
  description: "Cómo contactar con el Human Rights Commitment Institute y cómo enviar correcciones o nuevas evidencias sobre una recomendación.",
};

// The address Blue Human publishes on bluehuman.org.
const EMAIL = "info@bluehuman.org";

const blocks: LinkBlock[] = [
  {
    title: "Consultas generales",
    text: "Preguntas sobre el HRCI, sus datos o su método, peticiones de medios de comunicación y propuestas de colaboración.",
    links: [{ label: EMAIL, href: `mailto:${EMAIL}` }],
  },
  {
    title: "Correcciones y nuevas evidencias",
    text: "Las correcciones, las nuevas evidencias y los derechos de réplica se revisan antes de incorporarse al registro. Conviene indicar el número de la recomendación y la fuente pública en la que se basa la aportación.",
    links: [
      { label: "Enviar una aportación", href: `mailto:${EMAIL}?subject=${encodeURIComponent("Aportación al HRCI")}` },
      { label: "Cómo se tramitan las correcciones", href: "/methodology" },
    ],
  },
  {
    title: "Blue Human",
    text: "El HRCI es una iniciativa de Blue Human. El formulario de contacto de la organización y la información sobre su trabajo están en su sitio web.",
    links: [{ label: "Contacto en bluehuman.org", href: "https://bluehuman.org/contact" }],
  },
];

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <Box component="main">
        <Container maxWidth="lg" sx={{ pt: { xs: 4.5, md: 6 }, pb: { xs: 4, md: 5 } }}>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2.2rem", md: "3rem" } }}>Contacto</Typography>
          <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 680, lineHeight: 1.7 }}>
            Para consultar algo sobre el HRCI o aportar información sobre una recomendación.
          </Typography>
        </Container>
        <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 9 } }}>
          <LinkBlocks blocks={blocks} />
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
