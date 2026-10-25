import Link from 'next/link';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { SiteHeader } from '@/components/SiteHeader';
import { logoutPartner } from '@/app/partners/actions';
export function PartnerFrame({ title, children, signedIn = true }: { title: string; children: React.ReactNode; signedIn?: boolean }) {
  return <><SiteHeader /><Container component="main" maxWidth={signedIn ? 'md' : 'xs'} sx={{ py: { xs: 4, md: 6 } }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
      <Typography variant="overline" color="text.secondary">Portal de partners</Typography>
      {signedIn && <form action={logoutPartner}><Button size="small" type="submit">Cerrar sesión</Button></form>}
    </Stack>
    {signedIn && title !== 'Mis proyectos' && <Button component={Link} href="/partners" size="small" sx={{ mb: 2 }}>Volver a mis proyectos</Button>}
    <Typography variant="h1" color="primary.main" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' }, overflowWrap: 'anywhere' }}>{title}</Typography>
    <Box sx={{ mt: 3 }}>{children}</Box>
  </Container></>;
}
