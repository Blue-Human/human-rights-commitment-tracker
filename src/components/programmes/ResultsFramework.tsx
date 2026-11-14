import Link from 'next/link';
import { Box,Button,Stack,Typography } from '@mui/material';
import { recordName,rootPath,type OperationalRecord } from '@/lib/programmes/model';
import type { WorkspaceData } from '@/lib/admin/programmes';
const href=(section:string,row:OperationalRecord)=>`${rootPath}/${section}/${row.id}`;
export function ResultsFramework({project,data}:{project:OperationalRecord;data:WorkspaceData}) {
  const rows=(section:string)=>(data[section]||[]).filter(r=>r.project_id===project.id);
  const outcomes=rows('outcomes'),outputs=rows('outputs'),activities=rows('activities'),indicators=rows('indicators'),links=rows('output-outcomes');
  const record=(section:string,row:OperationalRecord)=><Typography component={Link} href={href(section,row)} sx={{color:'primary.main',fontWeight:500,textDecoration:'none'}}>{recordName(row)}</Typography>;
  const indicatorList=(items:OperationalRecord[])=>items.length?<Box component="ul" sx={{my:1}}>{items.map(i=><Box component="li" key={i.id}>{record('indicators',i)} <Typography component="span" variant="caption">· Indicador · {String(i.unit)}</Typography></Box>)}</Box>:null;
  const output=(o:OperationalRecord)=><Box key={o.id} sx={{pl:3,py:2,borderLeft:'2px solid',borderColor:'divider'}}>
    <Typography variant="overline" color="text.secondary">Output · producto directo</Typography><Box>{record('outputs',o)}</Box>
    {o.description&&<Typography variant="body2" sx={{mt:.5}}>{String(o.description)}</Typography>}
    {o.activity_id&&<Box sx={{mt:1,pl:2}}><Typography variant="overline" color="text.secondary">Actividad generadora</Typography><Box>{activities.find(a=>a.id===o.activity_id)?record('activities',activities.find(a=>a.id===o.activity_id)!):'Actividad archivada'}</Box></Box>}
    {indicatorList(indicators.filter(i=>i.output_id===o.id))}
  </Box>;
  const outcome=(o:OperationalRecord)=><Box key={o.id} sx={{pl:3,py:2,borderLeft:'2px solid',borderColor:'primary.main'}}>
    <Typography variant="overline" color="text.secondary">Outcome · cambio al que contribuimos</Typography><Box>{record('outcomes',o)}</Box>
    {o.description&&<Typography variant="body2" sx={{mt:.5}}>{String(o.description)}</Typography>}
    {outputs.filter(p=>links.some(l=>l.outcome_id===o.id&&l.output_id===p.id)).map(output)}
    {indicatorList(indicators.filter(i=>i.outcome_id===o.id))}
  </Box>;
  const objectives=rows('objectives').sort((a,b)=>Number(a.position)-Number(b.position));
  return <Box>
    <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap sx={{mb:3}}>{[['objectives','Objetivo específico'],['outcomes','Outcome'],['outputs','Output'],['activities','Actividad'],['indicators','Indicador'],['output-outcomes','Contribución output → outcome']].map(([section,label])=><Button key={section} component={Link} href={`${rootPath}/${section}/new?project=${project.id}`} size="small" variant="outlined">Añadir {label}</Button>)}</Stack>
    <Typography variant="overline" color="text.secondary">Objetivo general</Typography><Typography variant="h5" color="primary.main">{String(project.overall_objective||'Objetivo general no disponible')}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{my:2}}>Objetivo general → objetivos específicos → outcomes → outputs → actividades → indicadores. La jerarquía documenta el marco lógico y sus contribuciones; no atribuye causalidad.</Typography>
    {objectives.map(o=><Box key={o.id} sx={{my:3}}><Typography variant="overline" color="text.secondary">Objetivo específico</Typography><Box>{record('objectives',o)}</Box>{outcomes.filter(r=>r.specific_objective_id===o.id).map(outcome)}</Box>)}
    {outcomes.filter(o=>!objectives.some(s=>s.id===o.specific_objective_id)).length>0&&<Box sx={{my:3}}><Typography variant="h6">Outcomes sin objetivo específico asociado</Typography>{outcomes.filter(o=>!objectives.some(s=>s.id===o.specific_objective_id)).map(outcome)}</Box>}
    {outputs.filter(o=>!links.some(l=>l.output_id===o.id&&outcomes.some(r=>r.id===l.outcome_id))).length>0&&<Box sx={{my:3}}><Typography variant="h6">Outputs sin outcome asociado</Typography>{outputs.filter(o=>!links.some(l=>l.output_id===o.id&&outcomes.some(r=>r.id===l.outcome_id))).map(output)}</Box>}
    {activities.filter(a=>!outputs.some(o=>o.activity_id===a.id)).length>0&&<Box sx={{my:3}}><Typography variant="h6">Actividades sin output asociado</Typography>{activities.filter(a=>!outputs.some(o=>o.activity_id===a.id)).map(a=><Box key={a.id} sx={{py:1}}>{record('activities',a)}</Box>)}</Box>}
    {indicators.filter(i=>!i.output_id&&!i.outcome_id).length>0&&<Box sx={{my:3}}><Typography variant="h6">Indicadores de proyecto / proceso</Typography>{indicatorList(indicators.filter(i=>!i.output_id&&!i.outcome_id))}</Box>}
    {!objectives.length&&!outcomes.length&&!outputs.length&&!activities.length&&!indicators.length&&<Typography color="text.secondary" sx={{py:3}}>El marco de resultados todavía no tiene registros. Añade los objetivos y resultados previstos.</Typography>}
  </Box>;
}
