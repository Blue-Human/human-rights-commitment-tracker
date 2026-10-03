import Link from 'next/link';
import {Box,Button,Container,Divider,Typography} from '@mui/material';
import {SiteHeader} from '@/components/SiteHeader';
import {getAllDimensions} from '@/lib/hrct';
import {DIMENSIONS} from '@/lib/live';
export default async function HumanSecurity(){
 const dimensions=await getAllDimensions();
 return <><SiteHeader/><Container component="main" maxWidth="lg" sx={{py:6}}>
 <Typography variant="h1" sx={{fontSize:'2.8rem'}} color="primary.main">Human security</Typography>
 <Typography sx={{my:3,maxWidth:850}}>Explore Spain’s tracked recommendations through the seven dimensions of human security. Classifications describe how people may be affected; they are not country scores or findings of violations.</Typography>
 {DIMENSIONS.map(d=><Box key={d.code} sx={{py:3,borderTop:'1px solid',borderColor:'divider'}}><Typography variant="h4" color="primary.main">{d.name}</Typography>
 <Typography sx={{my:1}}>{new Set(dimensions.filter(x=>x.code===d.code).map(x=>x.public_id)).size} published recommendations</Typography>
 <Button component={Link} href={`/human-security/${d.code}`}>Explore dimension</Button></Box>)}<Divider/>
 <Typography variant="caption" sx={{display:'block',mt:3}}>Framework: UNDP, Human Development Report 1994. Proposed classifications are identified on individual records.</Typography>
 </Container></>;
}
