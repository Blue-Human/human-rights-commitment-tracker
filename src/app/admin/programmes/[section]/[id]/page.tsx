import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Box,Button,Typography } from '@mui/material';
import { requireAdmin } from '@/lib/admin/session';
import { getOperational,loadWorkspace,recordAudit } from '@/lib/admin/programmes';
import { entityFor,recordName,rootPath,validId,fieldLabel,valueLabel } from '@/lib/programmes/model';
import { ProgrammesFrame } from '@/components/programmes/ProgrammesFrame';
import { ProjectDetail } from '@/components/programmes/ProjectDetail';
import { RecordEditor,ArchiveControl,AuditHistory } from '@/components/programmes/RecordEditor';
import { EntityTable } from '@/components/programmes/EntityTable';
import { AdminSection } from '@/components/AdminFrame';
export default async function OperationalDetail({params,searchParams}:{params:Promise<{section:string;id:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
  await requireAdmin();const {section,id}=await params,search=await searchParams,entity=entityFor(section);
  if(!entity)notFound();const isNew=id==='new';const row=isNew?null:await getOperational(section,id);if(!isNew&&!row)notFound();
  const projectId=entity.projectScoped?String(row?.project_id||search.project||''):section==='projects'&&!isNew?id:undefined;
  if(projectId&&!validId(projectId))notFound();
  const [data,audit]=await Promise.all([loadWorkspace(projectId||undefined),!isNew?recordAudit(section,id):Promise.resolve([])]);
  if(entity.projectScoped&&projectId&&!data.projects.some(p=>p.id===projectId))notFound();
  if(section==='projects'&&row) return <ProjectDetail project={row} data={data} tab={search.tab} audit={audit}/>;
  const related=(target:string,key:string)=><EntityTable section={target} projectId={projectId} data={data} rows={(data[target]||[]).filter(r=>r[key]===id)}/>;
  const defaults=Object.fromEntries(Object.entries({project_id:projectId,activity_id:search.activity,output_id:search.output,indicator_id:search.indicator}).filter((entry):entry is [string,string]=>!!entry[1]&&validId(entry[1])));
  return <ProgrammesFrame title={isNew?`Crear ${entity.singular}`:recordName(row!)} section={section} intro={entity.description}>
    <Button component={Link} href={projectId?`${rootPath}/projects/${projectId}`:`${rootPath}/${section}`} size="small" sx={{mb:2}}>Volver {projectId?'al proyecto':'al listado'}</Button>
    {section==='measurements'&&!isNew?<AdminSection title="Medición registrada" note="Registro inmutable. Para corregirlo añade una medición con la misma fecha y el UUID de esta observación.">{entity.fields.map(f=><Typography key={f.name} sx={{py:.5}}>{fieldLabel(f.name)}: {valueLabel(f.name,row![f.name])}</Typography>)}<Typography sx={{mt:2}}>UUID: {id}</Typography><Button component={Link} href={`${rootPath}/indicators/${row!.indicator_id}`} sx={{mt:2}}>Abrir indicador y añadir medición</Button></AdminSection>:<RecordEditor section={section} data={data} row={row||undefined} projectId={projectId||undefined} defaults={defaults}/>}
    {row&&section==='programmes'&&<AdminSection title="Proyectos del programa">{related('projects','programme_id')}</AdminSection>}
    {row&&section==='partners'&&<AdminSection title="Proyectos y roles">{related('assignments','partner_id')}</AdminSection>}
    {row&&section==='activities'&&<>
      <AdminSection title="Compromisos de derechos humanos relacionados · Related Human Rights Commitments">{related('activity-commitments','activity_id')}</AdminSection>
      <AdminSection title="Productos generados">{related('outputs','activity_id')}</AdminSection>
      <AdminSection title="Evidencias de la actividad">{related('evidence','activity_id')}</AdminSection>
      <AdminSection title="Grupos objetivo">{related('activity-groups','activity_id')}</AdminSection>
    </>}
    {row&&section==='outputs'&&<><AdminSection title="Contribuciones a outcomes">{related('output-outcomes','output_id')}</AdminSection><AdminSection title="Compromisos de derechos humanos relacionados">{related('output-commitments','output_id')}</AdminSection><AdminSection title="Evidencias del producto">{related('evidence','output_id')}</AdminSection></>}
    {row&&section==='outcomes'&&<AdminSection title="Outputs que contribuyen a este cambio">{related('output-outcomes','outcome_id')}</AdminSection>}
    {row&&section==='indicators'&&<>
      <AdminSection title="Añadir medición" note="La fuente y la fecha son obligatorias. Una corrección debe conservar la fecha y referenciar el UUID anterior."><RecordEditor section="measurements" data={data} projectId={projectId} defaults={{indicator_id:id}}/></AdminSection>
      <AdminSection title="Histórico de mediciones"><EntityTable section="measurements" data={data} projectId={projectId} rows={data.measurements.filter(m=>m.indicator_id===id)} hideCreate/></AdminSection>
    </>}
    {row&&<><AuditHistory entries={audit}/>{section!=='measurements'&&<ArchiveControl section={section} row={row}/>}</>}
    {isNew&&<Box sx={{mt:3}}><Typography variant="caption" color="text.secondary">El registro se crea en el área interna. Los campos de publicación preparan contenido para una fase pública posterior.</Typography></Box>}
  </ProgrammesFrame>;
}
