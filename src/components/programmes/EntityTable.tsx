'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Box,Button,Chip,Stack,Table,TableBody,TableCell,TableContainer,TableHead,TableRow,TablePagination,TextField,Typography } from '@mui/material';
import { entityFor,fieldLabel,valueLabel,recordName,rootPath,currentMeasurement,indicatorProgress,type Measurement,type ProjectIndicator,type OperationalRecord } from '@/lib/programmes/model';
import type { WorkspaceData } from '@/lib/admin/programmes';
const relationSections:Record<string,string>={programme_id:'programmes',project_id:'projects',partner_id:'partners',responsible_partner_id:'partners',activity_id:'activities',output_id:'outputs',outcome_id:'outcomes',indicator_id:'indicators',specific_objective_id:'objectives',target_group_id:'target-groups',commitment_id:'commitments'};
export function EntityTable({section,data,projectId,rows:inputRows,hideCreate=false}:{section:string;data:WorkspaceData;projectId?:string;rows?:OperationalRecord[];hideCreate?:boolean}) {
  const entity=entityFor(section)!;
  const [query,setQuery]=useState(''),[filters,setFilters]=useState<Record<string,string>>({}),[page,setPage]=useState(0),[pageSize,setPageSize]=useState(25);
  const source=inputRows||data[section]||[];
  const rows=source.filter(r=>!projectId||!entity.projectScoped||r.project_id===projectId).map(r=>{
    if(section==='activities') return {...r,evidence_count:(data.evidence||[]).filter(e=>e.activity_id===r.id).length};
    if(section==='indicators') {
      const current=currentMeasurement((data.measurements||[]) as Measurement[],r.id);
      const progress=indicatorProgress(r as ProjectIndicator,current?.value??null);
      return {...r,current_value:current?.value??null,progress:progress===null?null:`${progress.toLocaleString('es-ES',{maximumFractionDigits:1})}%`,last_updated_at:current?.created_at??null};
    }
    return r;
  });
  const renderValue=(row:OperationalRecord,name:string)=>{
    const value=row[name];
    if(name in relationSections&&value) {
      const related=(data[relationSections[name]]||[]).find(r=>r.id===value);
      return related ? `${related.public_id||related.project_code||''} ${recordName(related)}`.trim() : 'Registro relacionado no activo';
    }
    return valueLabel(name,value);
  };
  const filterNames=entity.fields.filter(f=>f.options&& !['public_visibility','lead_partner','progress_method'].includes(f.name)).map(f=>f.name);
  if(entity.projectScoped&&!projectId) filterNames.unshift('project_id');
  if(section==='evidence') filterNames.push('activity_id');
  if(section==='activities') filterNames.push('responsible_partner_id');
  const filtered=rows.filter(row=>(!query||`${Object.values(row).join(' ')} ${entity.columns.map(c=>renderValue(row,c)).join(' ')}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))&&Object.entries(filters).every(([key,value])=>!value||(key==='date_from'?String(row.evidence_date||'')>=value:key==='date_to'?String(row.evidence_date||'')<=value:String(row[key])===value)));
  const visiblePage=Math.min(page,Math.max(0,Math.ceil(filtered.length/pageSize)-1));
  return <Box>
    <Stack direction={{xs:'column',sm:'row'}} spacing={2} sx={{mb:2}}>
      <TextField label={`Buscar en ${entity.title.toLocaleLowerCase()}`} size="small" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} fullWidth/>
      {!hideCreate&&<Button component={Link} href={`${rootPath}/${section}/new${projectId?`?project=${projectId}`:''}`} variant="outlined" sx={{flexShrink:0}}>Crear {entity.singular}</Button>}
    </Stack>
    <Stack direction="row" flexWrap="wrap" spacing={1.5} useFlexGap sx={{mb:2}}>
      {filterNames.map(name=>{
        const field=entity.fields.find(f=>f.name===name);
        const options=field?.options||Object.fromEntries([...new Set(rows.map(r=>String(r[name]||'')).filter(Boolean))].map(value=>[value,renderValue(rows.find(r=>String(r[name])===value)!,name)]));
        return <TextField key={name} select label={fieldLabel(name)} size="small" value={filters[name]||''} onChange={e=>{setFilters({...filters,[name]:e.target.value});setPage(0);}} slotProps={{select:{native:true},inputLabel:{shrink:true}}} sx={{minWidth:170,maxWidth:280}}><option value="">Todos</option>{Object.entries(options).map(([value,label])=><option key={value} value={value}>{label}</option>)}</TextField>;
      })}
      {section==='evidence'&&['date_from','date_to'].map(name=><TextField key={name} label={name==='date_from'?'Desde':'Hasta'} type="date" size="small" slotProps={{inputLabel:{shrink:true}}} value={filters[name]||''} onChange={e=>{setFilters({...filters,[name]:e.target.value});setPage(0);}}/>)}
    </Stack>
    <TableContainer sx={{borderTop:'1px solid',borderBottom:'1px solid',borderColor:'divider'}}><Table size="small" aria-label={entity.title} sx={{minWidth:Math.max(700,entity.columns.length*130)}}>
      <TableHead><TableRow>{entity.columns.map(name=><TableCell key={name} sx={{whiteSpace:'nowrap'}}>{fieldLabel(name)}</TableCell>)}<TableCell>Gestión</TableCell></TableRow></TableHead>
      <TableBody>{filtered.slice(visiblePage*pageSize,(visiblePage+1)*pageSize).map(row=><TableRow key={row.id}>
        {entity.columns.map(name=><TableCell key={name} sx={{maxWidth:340,minWidth:['title','name','description','contribution_description'].includes(name)?220:name.endsWith('_id')?170:100,overflowWrap:'break-word',py:1.8}}>{name==='status'||name==='verification_status'?<Chip size="small" variant="outlined" label={renderValue(row,name)}/>:renderValue(row,name)}</TableCell>)}
        <TableCell><Button component={Link} href={`${rootPath}/${section}/${row.id}`} size="small">{section==='measurements'?'Consultar':'Abrir'}</Button></TableCell>
      </TableRow>)}{!filtered.length&&<TableRow><TableCell colSpan={entity.columns.length+1}><Typography variant="body2" color="text.secondary" sx={{py:3}}>No hay registros para esta selección.</Typography></TableCell></TableRow>}</TableBody>
    </Table></TableContainer>
    <TablePagination component="div" count={filtered.length} page={visiblePage} onPageChange={(_,p)=>setPage(p)} rowsPerPage={pageSize} onRowsPerPageChange={e=>{setPageSize(Number(e.target.value));setPage(0);}} rowsPerPageOptions={[25,50,100]} sx={{'.MuiTablePagination-selectLabel':{display:{xs:'none',sm:'block'}},'.MuiTablePagination-toolbar':{pl:{xs:0,sm:2}}}} labelRowsPerPage="Filas por página" labelDisplayedRows={({from,to,count})=>`${from}–${to} de ${count}`}/>
    {section==='indicators'&&<Typography variant="caption" color="text.secondary">Progreso lineal = (actual − base) / (meta − base) × 100, solo con método lineal explícito. Puede ser negativo o superar 100%; no es una atribución de impacto. Sin medición: datos no disponibles.</Typography>}
  </Box>;
}
