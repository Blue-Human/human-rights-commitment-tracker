import type { Metadata } from "next";
import { Box, Container, Typography } from "@mui/material";
import { ContactForm } from "@/components/ContactForm";
import { LinkBlocks, type LinkBlock } from "@/components/LinkBlocks";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contacto | Human Rights Commitment Institute",
  description: "Formulario de contacto del Human Rights Commitment Institute para consultas, correcciones y nuevas evidencias sobre una recomendación.",
};

const blocks: LinkBlock[] = [
  {
    title: "Correo electrónico",
    links: [{ label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` }],
  },
  {
    title: "Correcciones y nuevas evidencias",
    text: "Se revisan antes de incorporarse al registro.",
    links: [{ label: "Cómo se tramitan las correcciones", href: "/methodology" }],
  },
  {
    title: "Blue Human",
    text: "El HRCI es una iniciativa de Blue Human.",
    links: [{ label: "Contacto en bluehuman.org", href: "https://bluehuman.org/contact" }],
  },
];

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <Box component="main">
        {/* Tighter than the other pages: the whole page, form included, should fit on one screen. */}
        <Container maxWidth="lg" sx={{ pt: 3, pb: 2.5 }}>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "2rem", md: "2.4rem" } }}>Contacto</Typography>
          <Typography color="text.secondary" sx={{ mt: .75, maxWidth: 680, lineHeight: 1.6 }}>
            Para consultar algo sobre el HRCI o aportar información sobre una recomendación.
          </Typography>
        </Container>
        <Container maxWidth="lg" sx={{ pb: 4 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "minmax(0,7fr) minmax(0,4fr)" }, columnGap: 8, rowGap: 5, alignItems: "start" }}>
            <ContactForm />
            <Box component="aside">
              <LinkBlocks blocks={blocks} columns={1} dense />
            </Box>
          </Box>
        </Container>
      </Box>
      <SiteFooter />
    </>
  );
}
