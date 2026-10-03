import {Container,Typography,Box} from '@mui/material';
import {SiteHeader} from '@/components/SiteHeader';
import {SignalFeed} from '@/components/SignalFeed';
import {getSignals,getAllDimensions} from '@/lib/hrct';
import {DIMENSIONS,dimensionSignals,recent,uniqueEvents} from '@/lib/live';
export default async function Signals(){
 const [signals,dims]=await Promise.all([getSignals(),getAllDimensions()]);const rows=signals.filter(s=>recent(s,30));
 return <><SiteHeader/><Container component="main" maxWidth="lg" sx={{py:6}}><Typography variant="h1" sx={{fontSize:'2.8rem'}} color="primary.main">Current human-rights signals</Typography>
 <Typography sx={{my:3,maxWidth:850}}>Observed reporting in the last 30 days. Coverage, source availability and monitoring queries influence these counts. They do not independently establish deterioration, causality or a human-rights violation.</Typography>
 {DIMENSIONS.map(d=><Box key={d.code} sx={{py:1}}><Typography>{d.name}: {uniqueEvents(dimensionSignals(rows,dims,d.code)).length} distinct events</Typography></Box>)}
 <SignalFeed signals={rows} limit={50} showRecommendation/></Container></>;
}
