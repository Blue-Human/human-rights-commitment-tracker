import Link from "next/link";
import { Box, Breadcrumbs, Container, Typography } from "@mui/material";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { AtlasNav } from "./AtlasNav";

export type Crumb = { label: string; href?: string };

// The frame of every page of the Atlas: the site header, the Atlas sections, the trail of the page
// and the site footer.
export function AtlasShell({ crumbs, children }: { crumbs?: Crumb[]; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <AtlasNav />
      <Box component="main">
        {crumbs && crumbs.length > 0 && (
          <Container maxWidth="lg" sx={{ pt: 2.5 }}>
            <Breadcrumbs aria-label="Ruta de la página" sx={{ "& a": { color: "text.secondary", textDecoration: "none", "&:hover": { color: "secondary.dark" } } }}>
              <Link href="/rights">Atlas</Link>
              {crumbs.map((crumb, i) => (crumb.href && i < crumbs.length - 1
                ? <Link key={crumb.href} href={crumb.href}>{crumb.label}</Link>
                : <Typography key={crumb.label} component="span" variant="body2" color="text.primary" sx={{ fontSize: "inherit" }} aria-current={i === crumbs.length - 1 ? "page" : undefined}>{crumb.label}</Typography>))}
            </Breadcrumbs>
          </Container>
        )}
        {children}
      </Box>
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
