import Link from 'next/link';
import { Box,Button,Chip,Stack,Typography } from '@mui/material';
import { AdminSection } from '@/components/AdminFrame';
import { EntityTable } from './EntityTable';
import { RecordEditor,ArchiveControl,AuditHistory } from './RecordEditor';
import { ProgrammesFrame } from './ProgrammesFrame';
import { ResultsFramework } from './ResultsFramework';
import { recordName,rootPath,valueLabel,type OperationalRecord } from '@/lib/programmes/model';
import type { WorkspaceData,AuditEntry } from '@/lib/admin/programmes';
const tabs={overview:'Resumen',framework:'Results Framework',activities:'Actividades',indicators:'Indicadores',partners:'Partners',commitments:'Compromisos de derechos humanos',evidence:'Evidencias',documents:'Documentos',edit:'Editar proyecto',history:'Historial'};
export function ProjectDetail({project,data,tab='overview',audit}:{project:OperationalRecord;data:WorkspaceData;tab?:string;audit:AuditEntry[]}) {
  if(!Object.hasOwn(tabs,tab)) tab='overview';
  const scoped=(section:string)=>(data[section]||[]).filter(r=>r.project_id===project.id);
  const table=(section:string,rows?:OperationalRecord[])=><EntityTable section={section} projectId={project.id} data={data} rows={rows}/>;
  const commitments=new Set(['project-commitments','activity-commitments','output-commitments'].flatMap(s=>scoped(s).map(r=>r.commitment_id)));
  const programme=data.programmes.find(r=>r.id===project.programme_id);
  return <ProgrammesFrame title={`${project.project_code} · ${project.title}`} section="projects" intro="Gestión operativa del proyecto, marco de resultados y evidencias de contribución.">
    <Stack component="nav" aria-label="Secciones del proyecto" direction="row" flexWrap="wrap" spacing={1} useFlexGap sx={{mb:4}}>{Object.entries(tabs).map(([key,label])=><Button key={key} component={Link} href={`${rootPath}/projects/${project.id}?tab=${key}`} size="small" variant={key===tab?'contained':'text'} aria-current={key===tab?'page':undefined}>{label}</Button>)}</Stack>
    {tab==='overview'&&<>
      <Stack direction="row" spacing={2} alignItems="center" sx={{mb:3}}><Chip label={valueLabel('status',project.status)} variant="outlined"/><Typography>{String(project.country)} · {String(project.country_code)}</Typography></Stack>
      <Box component="dl" sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'180px 1fr'},gap:1,'& dt':{color:'text.secondary'},'& dd':{m:0}}}>
        {[['Programa',programme?recordName(programme):'Programa archivado'],['Periodo',`${valueLabel('start_date',project.start_date)} — ${valueLabel('end_date',project.end_date)}`],['Responsable',valueLabel('project_manager',project.project_manager)],['Objetivo general',valueLabel('overall_objective',project.overall_objective)],['Financiación',valueLabel('funding_status',project.funding_status)],['Donante',valueLabel('donor',project.donor)],['Presupuesto interno',project.total_budget===null?'Datos no disponibles':`${project.total_budget} ${project.currency}`]].map(([label,value])=><Box key={String(label)} sx={{display:'contents'}}><Typography component="dt">{label}</Typography><Typography component="dd">{value}</Typography></Box>)}
      </Box>
      {project.description&&<Typography sx={{mt:3,maxWidth:850}}>{String(project.description)}</Typography>}
      <AdminSection title="Ejecución y resultados"><Stack direction="row" flexWrap="wrap" spacing={4} useFlexGap>{[['activities','Actividades'],['outputs','Outputs'],['outcomes','Outcomes'],['indicators','Indicadores'],['evidence','Evidencias'],['assignments','Partners']].map(([key,label])=><Box key={key}><Typography sx={{fontSize:'1.7rem',color:'primary.main'}}>{scoped(key).length}</Typography><Typography variant="body2">{label}{key==='activities'?` · ${scoped(key).filter(a=>a.status==='completed').length} completadas`:''}</Typography></Box>)}<Box><Typography sx={{fontSize:'1.7rem',color:'primary.main'}}>{commitments.size}</Typography><Typography variant="body2">Compromisos relacionados</Typography></Box></Stack></AdminSection>
      <AdminSection title="Partners del proyecto">{scoped('assignments').map(a=><Typography key={a.id} sx={{py:1}}>{data.partners.find(p=>p.id===a.partner_id)?.display_name||'Partner archivado'} · {valueLabel('role',a.role)} {a.lead_partner?'· Principal':''}</Typography>)}{!scoped('assignments').length&&<Typography color="text.secondary">Sin partners asignados.</Typography>}</AdminSection>
      <AdminSection title="Contexto y resumen"><Typography sx={{whiteSpace:'pre-wrap'}}>{String(project.context||'Contexto no disponible')}</Typography>{project.public_summary&&<Typography sx={{mt:2,whiteSpace:'pre-wrap'}}>{String(project.public_summary)}</Typography>}</AdminSection>
    </>}
    {tab==='framework'&&<ResultsFramework project={project} data={data}/>}
    {tab==='activities'&&table('activities')}
    {tab==='indicators'&&table('indicators')}
    {tab==='partners'&&table('assignments')}
    {tab==='commitments'&&['project-commitments','activity-commitments','output-commitments'].map(section=><AdminSection key={section} title={section==='project-commitments'?'Proyecto ↔ compromisos':section==='activity-commitments'?'Actividades ↔ compromisos':'Outputs ↔ compromisos'} note="Una relación documenta una contribución o pertinencia. La valoración del compromiso requiere evidencia estatal y revisión independiente.">{table(section)}</AdminSection>)}
    {tab==='evidence'&&table('evidence')}
    {tab==='documents'&&<><Typography color="text.secondary" sx={{mb:2}}>Los documentos se conservan como evidencia del proyecto, con su referencia privada o fuente y permisos de confidencialidad.</Typography>{table('evidence',scoped('evidence').filter(e=>e.file_reference||['report','publication','dataset','meeting_minutes','evaluation','training_material','official_document'].includes(String(e.evidence_type))))}</>}
    {tab==='edit'&&<><RecordEditor section="projects" data={data} row={project}/><AdminSection title="Grupos objetivo del proyecto">{table('project-groups')}</AdminSection><ArchiveControl section="projects" row={project}/></>}
    {tab==='history'&&<AuditHistory entries={audit}/>}
  </ProgrammesFrame>;
}
