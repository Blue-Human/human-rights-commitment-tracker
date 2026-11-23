import { Box,Checkbox,FormControlLabel,Typography } from '@mui/material';
import { AdminSection } from '@/components/AdminFrame';
import { IndicatorAdminForm } from '@/components/IndicatorAdminForm';
import { RecordFields } from './RecordFields';
import { saveRecord,archiveRecord } from '@/app/admin/programmes/actions';
import { entityFor,type OperationalRecord } from '@/lib/programmes/model';
import type { WorkspaceData,AuditEntry } from '@/lib/admin/programmes';
export function RecordEditor({section,data,row,projectId,defaults={}}:{section:string;data:WorkspaceData;row?:OperationalRecord;projectId?:string;defaults?:Record<string,string>}) {
  const entity=entityFor(section)!;
  return <Box>{entity.description&&<Typography color="text.secondary" variant="body2" sx={{mb:2}}>{entity.description}</Typography>}
    <IndicatorAdminForm action={saveRecord} label={row?'Guardar cambios':`Crear ${entity.singular}`}>
      <input type="hidden" name="section" value={section}/>{row&&<input type="hidden" name="id" value={row.id}/>}
      <RecordFields key={row?.updated_at||'new'} section={section} data={data} row={row} fixedProject={projectId} defaults={defaults}/>
    </IndicatorAdminForm>
  </Box>;
}
export function ArchiveControl({section,row}:{section:string;row:OperationalRecord}) {
  return <AdminSection title="Archivar registro" note="El registro sale de los listados activos. Sus evidencias, relaciones e historial se conservan."><IndicatorAdminForm action={archiveRecord} label="Archivar"><input type="hidden" name="section" value={section}/><input type="hidden" name="id" value={row.id}/><FormControlLabel control={<Checkbox name="confirm" value="archive"/>} label="Confirmo que quiero archivar este registro"/></IndicatorAdminForm></AdminSection>;
}
export function AuditHistory({entries}:{entries:AuditEntry[]}) {
  return <AdminSection title="Historial de cambios" note="Instantáneas privadas de creación, edición, revisión y archivo. Se muestran las últimas 100 operaciones del registro.">
    {entries.map(e=><Box component="details" key={e.id} sx={{py:1,borderBottom:'1px solid',borderColor:'divider'}}><summary>{new Date(e.recorded_at).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})} · {e.recorded_by} · {e.operation==='INSERT'?'Creación':'Modificación'}</summary><Typography variant="body2" sx={{mt:1}}>Antes</Typography><Box component="pre" sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12}}>{JSON.stringify(e.before_record,null,2)}</Box><Typography variant="body2">Después</Typography><Box component="pre" sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12}}>{JSON.stringify(e.after_record,null,2)}</Box></Box>)}
    {!entries.length&&<Typography color="text.secondary">Sin operaciones registradas.</Typography>}
  </AdminSection>;
}
