'use client';
import { useState } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { Choice,Field } from '@/components/IndicatorAdminFields';
import { entityFor,recordName,type OperationalRecord } from '@/lib/programmes/model';
import type { WorkspaceData } from '@/lib/admin/programmes';
export function RecordFields({section,data,row,fixedProject,defaults={}}:{section:string;data:WorkspaceData;row?:OperationalRecord;fixedProject?:string;defaults?:Record<string,string>}) {
  const entity=entityFor(section)!;
  const [projectId,setProjectId]=useState(fixedProject||String(row?.project_id||defaults.project_id||''));
  const [commitmentSearch,setCommitmentSearch]=useState('');
  const [selectedCommitment,setSelectedCommitment]=useState(String(row?.commitment_id||''));
  return <Box onChange={event=>{
    const target=event.target as HTMLInputElement;
    if(target.name==='project_id') setProjectId(target.value);
    if(target.name==='commitment_id') setSelectedCommitment(target.value);
  }}><Stack spacing={2} sx={{maxWidth:850}}>
    {entity.fields.map(field=>{
      const value=row?.[field.name]??defaults[field.name]??field.default??'';
      if(field.name==='project_id'&&fixedProject) return <Box key={field.name}><input name="project_id" type="hidden" value={fixedProject}/><Typography variant="body2">Proyecto: {recordName(data.projects.find(p=>p.id===fixedProject)!)}</Typography></Box>;
      if(field.options) return <Choice key={field.name} name={field.name} label={field.label} value={String(value)} options={field.options}/>;
      if(field.type==='relation') {
        let rows=field.relation==='projectPartners' ? (data.assignments||[]).filter(r=>r.project_id===projectId).map(r=>data.partners.find(p=>p.id===r.partner_id)).filter((p):p is OperationalRecord=>!!p) : data[field.relation!]||[];
        if(['activities','outputs','outcomes','objectives','indicators','evidence'].includes(field.relation!)) rows=rows.filter(r=>r.project_id===projectId);
        if(field.relation==='commitments'&&commitmentSearch) rows=rows.filter(r=>r.id===selectedCommitment||`${r.public_id} ${r.title} ${r.original_text}`.toLocaleLowerCase().includes(commitmentSearch.toLocaleLowerCase()));
        const initial=field.name==='project_id'?projectId:row?.project_id&&row.project_id!==projectId?'':String(value);
        return <Box key={`${field.name}:${projectId}`}>
          {field.relation==='commitments'&&<TextField fullWidth label="Buscar compromiso por código o texto" value={commitmentSearch} onChange={e=>setCommitmentSearch(e.target.value)} sx={{mb:2}}/>}
          <Choice name={field.name} label={field.label} value={initial} options={{'':field.required?'Selecciona un registro':'Sin relación',...Object.fromEntries(rows.map(r=>[r.id,`${r.public_id||r.project_code||r.code||''} ${recordName(r)}`.trim()]))}}/>
          {field.required&&!rows.length&&<Typography variant="caption" color="text.secondary">Crea primero el registro relacionado en su sección.</Typography>}
        </Box>;
      }
      const numeric=field.type==='number'||field.type==='integer';
      if(numeric) return <TextField key={field.name} fullWidth name={field.name} label={field.label} defaultValue={value} required={field.required} type="number" slotProps={{htmlInput:{step:field.type==='integer'?1:'any',min:field.min}}}/>;
      return <Field key={field.name} name={field.name} label={field.label} value={typeof value==='boolean'?String(value):value} required={field.required} multiline={field.type==='long'} type={field.type==='date'?'date':field.type==='email'?'email':field.type==='url'?'url':'text'}/>;
    })}
  </Stack></Box>;
}
