import Link from 'next/link';
import {Alert,Box,Button,Stack,Typography} from '@mui/material';
import {getIndicatorOverview} from '@/lib/indicators/data';
import {IndicatorCard} from './IndicatorSection';

export async function IndicatorOverview({featured=false,allHistory=false}:{featured?:boolean;allHistory?:boolean}) {
  let overview;
  try {overview=await getIndicatorOverview(allHistory);} catch {
    return <Alert severity="warning">No se pudieron cargar las series históricas. <Button component={Link} href="/indicators">Reintentar</Button></Alert>;
  }
  const code=(card:typeof overview.cards[number])=>card.bundle.indicators.find(i=>i.id===card.indicator_id)?.code||'';
  const preferred=['POV-001','EDU-001','RAC-001'];
  const cards=featured?preferred.flatMap(c=>overview.cards.filter(card=>code(card)===c)):overview.cards.toSorted((a,b)=>code(a).localeCompare(code(b)));
  return <Box>
    <Stack direction="row" spacing={{xs:2,sm:4}} useFlexGap flexWrap="wrap" sx={{mb:3}}>
      {[[overview.observation_count,'Mediciones históricas'],[overview.indicator_count,'Indicadores con datos'],[overview.recommendation_count,'Recomendaciones con datos']].map(([value,label])=><Box key={label}><Typography color="primary.main" sx={{fontSize:'1.8rem',fontWeight:600}}>{value}</Typography><Typography variant="body2" color="text.secondary">{label}</Typography></Box>)}
    </Stack>
    {overview.first_period&&overview.last_period&&<Typography variant="body2" color="text.secondary" sx={{mb:2}}>Datos de {overview.first_period.slice(0,4)} a {overview.last_period.slice(0,4)} · España · Fuentes oficiales. Cada serie muestra su periodo y población.</Typography>}
    {!cards.length&&<Typography color="text.secondary">No hay series históricas disponibles.</Typography>}
    <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:featured?'repeat(3,minmax(0,1fr))':'repeat(2,minmax(0,1fr))'},gap:2}}>
      {cards.map(card=>{
        const indicator=card.bundle.indicators.find(i=>i.id===card.indicator_id),link=card.bundle.links.find(l=>l.indicator_id===card.indicator_id);
        if(!indicator||!link)return null;
        const components=card.bundle.components.filter(c=>c.indicator_id===indicator.id&&card.bundle.latest.some(v=>v.component_id===c.id));
        const displayed=featured?components.filter(c=>indicator.code==='RAC-001'?c.code==='known-count':c.code==='default'):components;
        return <Box key={card.indicator_id} sx={{minWidth:0}}><IndicatorCard indicator={indicator} link={link} bundle={{...card.bundle,components:displayed}} allHistory={allHistory}/><Button component={Link} href={`/commitments/${encodeURIComponent(card.public_id)}#indicators-heading`} sx={{mt:1}}>Ver recomendación {card.public_id.split('-').at(-1)}</Button></Box>;
      })}
    </Box>
    {featured&&<Button component={Link} href="/indicators" variant="outlined" sx={{mt:3}}>Ver todos los datos e históricos</Button>}
  </Box>;
}
