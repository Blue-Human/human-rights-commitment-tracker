import {notFound} from 'next/navigation';
import {Container,Typography,Stack,Chip,Box} from '@mui/material';
import {SiteHeader} from '@/components/SiteHeader';
import {CommitmentExplorer} from '@/components/CommitmentExplorer';
import {SignalFeed} from '@/components/SignalFeed';
import {getCommitments,getAllDimensions,getSignals} from '@/lib/hrct';
import {DIMENSIONS,dimensionSignals,recent} from '@/lib/live';
export default async function DimensionPage({params}:{params:Promise<{dimension:string}>}){
 const {dimension}=await params;const d=DIMENSIONS.find(x=>x.code===dimension);if(!d)notFound();
 const [commitments,dims,signals]=await Promise.all([getCommitments(),getAllDimensions(),getSignals()]);
 const ids=new Set(dims.filter(x=>x.code===d.code).map(x=>x.public_id));const rows=commitments.filter(c=>ids.has(c.public_id));
 const statuses=new Map<string,number>();for(const c of rows){const s=c.assessment_status||'not_assessed';statuses.set(s,(statuses.get(s)||0)+1);}
 return <><SiteHeader/><Container component="main" maxWidth="lg" sx={{py:6}}>
 <Typography variant="overline">Human security · Spain</Typography><Typography variant="h1" sx={{fontSize:'2.8rem'}} color="primary.main">{d.name}</Typography>
 <Typography sx={{my:3}}>{rows.length} published recommendations. Recommendations may affect several dimensions and are counted in each applicable view.</Typography>
 <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{mb:4}}>{[...statuses].map(([s,n])=><Chip key={s} label={`${s.replaceAll('_',' ')}: ${n}`}/>)}</Stack>
 <CommitmentExplorer commitments={rows}/><Box sx={{mt:5}}><Typography variant="h4" color="primary.main">Recent context signals</Typography>
 <SignalFeed signals={dimensionSignals(signals,dims,d.code).filter(s=>recent(s))} showRecommendation/></Box>
 </Container></>;
}
