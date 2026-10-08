import Link from 'next/link';
import { Box,Button,Stack,Typography } from '@mui/material';
import { requireAdmin } from '@/lib/admin/session';
import { loadOverview } from '@/lib/admin/programmes';
import { ProgrammesFrame } from '@/components/programmes/ProgrammesFrame';
import { AdminSection } from '@/components/AdminFrame';
import { rootPath,recordName,valueLabel,type OperationalRecord } from '@/lib/programmes/model';
export default async function ProgrammesOverview() {
  await requireAdmin(); const data=await loadOverview();
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date());
  const activeProjectIds=new Set(data.projects.map(p=>p.id));
  const activities=data.activities.filter(a=>activeProjectIds.has(String(a.project_id)));
  const recent=[...activities].sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).slice(0,8);
  const upcoming=activities.filter(a=>a.planned_start_date&&String(a.planned_start_date)>=today&&['planned','delayed'].includes(String(a.status))).sort((a,b)=>String(a.planned_start_date).localeCompare(String(b.planned_start_date))).slice(0,8);
  const group=(name:string)=>Object.entries(data.projects.reduce<Record<string,number>>((acc,p)=>{const value=String(p[name]);acc[value]=(acc[value]||0)+1;return acc;},{}));
  const activityList=(rows:OperationalRecord[])=>rows.map(a=><Box key={a.id} sx={{py:1.5,borderBottom:'1px solid',borderColor:'divider'}}><Button component={Link} href={`${rootPath}/activities/${a.id}`} sx={{px:0,textAlign:'left'}}>{recordName(a)}</Button><Typography variant="body2" color="text.secondary">{data.projects.find(p=>p.id===a.project_id)?.project_code} · {valueLabel('status',a.status)} · {valueLabel('planned_start_date',a.planned_start_date)}</Typography></Box>);
  return <ProgrammesFrame title="Programmes · Resumen" intro="Programas internacionales, ejecución de proyectos y Monitoring, Evaluation & Learning de Blue Human.">
    <Stack direction="row" flexWrap="wrap" spacing={4} useFlexGap>{[[data.programmes.filter(p=>p.status==='active').length,'Programas activos'],[data.projects.filter(p=>p.status==='active').length,'Proyectos activos'],[new Set(data.projects.map(p=>p.country_code)).size,'Países'],[data.partners.length,'Partners'],[activities.filter(a=>a.status==='in_progress').length,'Actividades en curso']].map(([n,label])=><Box key={String(label)}><Typography sx={{fontSize:'1.8rem',color:'primary.main'}}>{n}</Typography><Typography variant="body2" color="text.secondary">{label}</Typography></Box>)}</Stack>
    {!data.projects.length&&<AdminSection title="Empezar un programa"><Typography color="text.secondary">Crea un programa y su primer proyecto. Los listados muestran exclusivamente registros introducidos por el equipo.</Typography><Button component={Link} href={`${rootPath}/programmes/new`} variant="outlined" sx={{mt:2}}>Crear programa</Button></AdminSection>}
    <AdminSection title="Actividades recientes">{activityList(recent)}{!recent.length&&<Typography color="text.secondary">No hay actividades registradas.</Typography>}</AdminSection>
    <AdminSection title="Próximas actividades">{activityList(upcoming)}{!upcoming.length&&<Typography color="text.secondary">No hay actividades próximas con fecha prevista.</Typography>}</AdminSection>
    <Stack direction={{xs:'column',md:'row'}} spacing={8} sx={{mt:4}}>{[['status','Proyectos por estado'],['country','Proyectos por país']].map(([name,title])=><Box key={name} sx={{flex:1}}><Typography variant="h6" color="primary.main">{title}</Typography>{group(name).map(([value,count])=><Stack key={value} direction="row" justifyContent="space-between" sx={{py:1,borderBottom:'1px solid',borderColor:'divider'}}><Typography>{valueLabel(name,value)}</Typography><Typography>{count}</Typography></Stack>)}{!data.projects.length&&<Typography color="text.secondary" sx={{mt:2}}>Sin proyectos.</Typography>}</Box>)}</Stack>
  </ProgrammesFrame>;
}
