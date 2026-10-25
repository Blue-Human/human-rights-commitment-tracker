import {Suspense} from 'react';
import Link from 'next/link';
import {Box,Button,Container,Stack,Typography} from '@mui/material';
import {SiteHeader} from '@/components/SiteHeader';
import {SiteFooter} from '@/components/SiteFooter';
import {IndicatorOverview} from '@/components/IndicatorOverview';
import {IndicatorSkeleton} from '@/components/IndicatorSection';

export default async function IndicatorsPage({searchParams}:{searchParams:Promise<{history?:string}>}) {
  const allHistory=(await searchParams).history==='all';
  return <><SiteHeader/><Box component="main"><Container maxWidth="lg" sx={{py:{xs:4,md:6}}}>
    <Typography variant="overline" color="primary.main" sx={{borderLeft:'3px solid',borderColor:'secondary.main',pl:1.5}}>España · Series oficiales</Typography>
    <Typography variant="h1" color="primary.main" sx={{fontSize:{xs:'2.2rem',md:'3rem'},mt:1}}>Datos e históricos</Typography>
    <Typography color="text.secondary" sx={{mt:2,maxWidth:800}}>Valores, evolución y fuentes de los indicadores vinculados a las recomendaciones. Las mediciones aportan evidencia; no determinan por sí solas el cumplimiento.</Typography>
    <Stack direction="row" spacing={1} sx={{my:3}} aria-label="Periodo del histórico"><Button component={Link} href="/indicators" variant={allHistory?'outlined':'contained'}>Últimos 5 años</Button><Button component={Link} href="/indicators?history=all" variant={allHistory?'contained':'outlined'}>Todo el histórico</Button></Stack>
    <Suspense key={String(allHistory)} fallback={<IndicatorSkeleton/>}><IndicatorOverview allHistory={allHistory}/></Suspense>
  </Container></Box><SiteFooter/></>;
}
