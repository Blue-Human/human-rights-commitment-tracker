import {Box,Button,Divider,Stack,Typography} from '@mui/material';
import Link from 'next/link';
import type {Signal} from '@/lib/hrct';
import {uniqueEvents} from '@/lib/live';
export function SignalFeed({signals,limit=12,showRecommendation=false}:{signals:Signal[];limit?:number;showRecommendation?:boolean}){
 const events=uniqueEvents(signals).slice(0,limit);
 return <Stack divider={<Divider/>}>{events.map(s=><Box key={s.cluster_id||s.id} sx={{py:2.5}}>
 <Typography variant="overline" color="text.secondary">{s.source_type.replaceAll('_',' ')} · {s.publication_status==='reviewed'?'Reviewed':'Automatically matched'}</Typography>
 <Typography variant="h6" color="primary.main" sx={{mt:.5}}>{s.title}</Typography>
 <Typography variant="caption" color="text.secondary">{s.source_domain} · {s.published_at?`Published ${new Date(s.published_at).toLocaleDateString('en-GB')}`:s.observed_at?`Observed ${new Date(s.observed_at).toLocaleDateString('en-GB')}`:`Discovered ${new Date(s.discovered_at).toLocaleDateString('en-GB')}`} · {Number(s.source_count)||1} source(s)</Typography>
 {s.summary&&<Typography variant="body2" sx={{mt:1}}>{s.summary}</Typography>}
 <Typography variant="body2" color="text.secondary" sx={{mt:1}}>Why linked: {s.rationale}</Typography>
 <Stack direction="row" spacing={2} sx={{mt:1}}><Button component="a" href={s.url} target="_blank" rel="noreferrer" size="small">Open source</Button>
 {s.original_source_url&&<Button component="a" href={s.original_source_url} target="_blank" rel="noreferrer" size="small">Institutional reference</Button>}
 {showRecommendation&&<Button component={Link} href={`/commitments/${encodeURIComponent(s.public_id)}`} size="small">Recommendation {s.public_id}</Button>}</Stack>
 </Box>)}{!events.length&&<Typography color="text.secondary" sx={{py:3}}>No published signals in this period. Absence of reporting is not evidence of implementation.</Typography>}</Stack>;
}
