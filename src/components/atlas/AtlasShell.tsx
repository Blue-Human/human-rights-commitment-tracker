import Link from "next/link";
import { Box, Breadcrumbs, Container, Typography } from "@mui/material";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { brand } from "@/brand";
import { atlasAbout, atlasAreas } from "@/lib/atlas/sections";
import { AtlasMark } from "./AtlasMark";
import { AtlasNav } from "./AtlasNav";

export type Crumb = { label: string; href?: string };

// The frame of every page of the Atlas: the site header, the bar of the Atlas, the trail of the
// page, the map of the Atlas and the site footer. The Atlas is a space of its own inside the site.
export function AtlasShell({ crumbs, children }: { crumbs?: Crumb[]; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <AtlasNav />
      <Box component="main" sx={{ "& a:not([class*=Mui])": { color: "secondary.dark", textDecorationColor: "rgba(0,108,149,.35)", textUnderlineOffset: "3px" }, "& a:not([class*=Mui]):hover": { color: "primary.main" } }}>
        {crumbs && crumbs.length > 0 && (
          <Container maxWidth="lg" sx={{ pt: 2.5 }}>
            <Breadcrumbs aria-label="Ruta de la página" sx={{ "& a": { color: "text.secondary", textDecoration: "none", "&:hover": { color: "secondary.dark" } } }}>
              <Link href="/atlas">Atlas</Link>
              {crumbs.map((crumb, i) => (crumb.href && i < crumbs.length - 1
                ? <Link key={crumb.href} href={crumb.href}>{crumb.label}</Link>
                : <Typography key={crumb.label} component="span" variant="body2" color="text.primary" sx={{ fontSize: "inherit" }} aria-current={i === crumbs.length - 1 ? "page" : undefined}>{crumb.label}</Typography>))}
            </Breadcrumbs>
          </Container>
        )}
        {children}
      </Box>
      <AtlasFooter />
      <SiteFooter />
    </>
  );
}

// Title block of a page: overline, heading and a short introduction.
export function PageHead({ overline, title, children, aside }: { overline: string; title: string; children?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 3, md: 4.5 }, pb: { xs: 3, md: 4 } }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: aside ? "minmax(0,1fr) 300px" : "minmax(0,1fr)" }, columnGap: 6, rowGap: 3 }}>
        <Box>
          <Typography variant="overline" color="primary.main" sx={{ borderLeft: "3px solid", borderColor: "secondary.main", pl: 1.5 }}>{overline}</Typography>
          <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: "1.9rem", md: "2.6rem" }, mt: 1, maxWidth: 900, overflowWrap: "anywhere" }}>{title}</Typography>
          {children && <Box sx={{ mt: 1.75, maxWidth: 820, color: "text.secondary", lineHeight: 1.7, "& p": { m: 0 }, "& p + p": { mt: 1 } }}>{children}</Box>}
        </Box>
        {aside}
      </Box>
    </Container>
  );
}

export function Section({ id, overline, title, children, note }: { id?: string; overline?: string; title: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <Container id={id} component="section" aria-labelledby={id ? `${id}-heading` : undefined} maxWidth="lg" sx={{ py: { xs: 4, md: 5.5 }, borderTop: "1px solid", borderColor: "divider", scrollMarginTop: { xs: 58, md: 72 } }}>
      {overline && <Typography variant="overline" color="text.secondary">{overline}</Typography>}
      <Typography id={id ? `${id}-heading` : undefined} variant="h2" color="primary.main" sx={{ fontSize: { xs: "1.5rem", md: "1.9rem" }, mt: overline ? .5 : 0 }}>{title}</Typography>
      {note && <Typography component="div" color="text.secondary" sx={{ mt: 1, maxWidth: 820, lineHeight: 1.7, fontSize: ".95rem" }}>{note}</Typography>}
      <Box sx={{ mt: 3 }}>{children}</Box>
    </Container>
  );
}

// The map of the Atlas at the foot of every page: its four areas with their pages, and how it works.
function AtlasFooter() {
  const link = { color: "rgba(255,255,255,.78)", textDecoration: "none", fontSize: ".875rem", lineHeight: 1.5, "&:hover": { color: "#fff", textDecoration: "underline" }, "&:focus-visible": { outline: `2px solid ${brand.accent}`, outlineOffset: 2 } } as const;
  return (
    <Box component="nav" aria-label="Mapa del Atlas" sx={{ bgcolor: brand.navy, color: "#fff", mt: { xs: 4, md: 6 } }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5.5 } }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "1.3fr repeat(5,minmax(0,1fr))" }, columnGap: 3, rowGap: 3.5 }}>
          <Box sx={{ gridColumn: { xs: "1 / -1", md: "auto" } }}>
            <Box component={Link} href="/atlas" sx={{ display: "inline-flex", alignItems: "center", gap: 1.25, color: "#fff", textDecoration: "none" }}>
              <AtlasMark size={30} color="#fff" />
              <Box component="span" sx={{ fontFamily: "var(--font-serif), Georgia, serif", fontSize: "1.35rem" }}>Human Rights Atlas</Box>
            </Box>
            <Typography variant="body2" sx={{ mt: 1.5, color: "rgba(255,255,255,.7)", lineHeight: 1.65, maxWidth: 300 }}>
              Texto oficial, registros de los depositarios y normas de procedimiento. Cada dato enlaza con su fuente.
            </Typography>
          </Box>
          {atlasAreas.map((area) => (
            <Box key={area.id}>
              <Box component={Link} href={area.href} sx={{ ...link, color: "#fff", fontWeight: 600, fontSize: ".95rem" }}>{area.label}</Box>
              <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1.25, p: 0, display: "grid", gap: .75 }}>
                {area.pages.map((p) => <li key={p.href}><Box component={Link} href={p.href} sx={link}>{p.label}</Box></li>)}
              </Box>
            </Box>
          ))}
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: ".95rem" }}>Sobre el Atlas</Typography>
            <Box component="ul" sx={{ listStyle: "none", m: 0, mt: 1.25, p: 0, display: "grid", gap: .75 }}>
              {atlasAbout.map((p) => <li key={p.href}><Box component={Link} href={p.href} sx={link}>{p.label}</Box></li>)}
              <li><Box component={Link} href="/commitments" sx={link}>Seguimiento del HRCI</Box></li>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
