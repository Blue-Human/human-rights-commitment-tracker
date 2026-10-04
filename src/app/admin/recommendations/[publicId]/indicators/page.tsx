import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Box,Button,Stack,Typography } from '@mui/material';
import { AdminFrame,AdminSection } from '@/components/AdminFrame';
import { IndicatorAdminForm } from '@/components/IndicatorAdminForm';
import { Choice,Field } from '@/components/IndicatorAdminFields';
import { getRecommendation,adminRest } from '@/lib/admin/db';
import { getApplicability,listIndicators,listLinks } from '@/lib/admin/indicators';
import { requireAdmin } from '@/lib/admin/session';
import type { Component,IndicatorLink } from '@/lib/indicators/types';
import { saveLink,setApplicability,unlinkIndicator } from '../../../indicators/actions';
export const metadata={title:'Indicadores de la recomendación | HRCT',robots:{index:false,follow:false}};
export default async function RecommendationIndicatorAdmin({params}:{params:Promise<{publicId:string}>}) {
  await requireAdmin();const publicId=decodeURIComponent((await params).publicId),rec=await getRecommendation(publicId);if(!rec)notFound();
  let data;try {data=await Promise.all([listIndicators(),listLinks(rec.id),getApplicability(rec.id),adminRest<Component[]>('indicator_components?select=*&order=code.asc&limit=1000')]);}catch{return <AdminFrame title="Indicadores de la recomendación"><Typography>No se pudo cargar la gestión. Comprueba la conexión y las migraciones de indicadores.</Typography></AdminFrame>;}
  const [catalogue,links,applicability,components]=data;
  const fields=(link?:IndicatorLink)=><Stack spacing={2}>
    <input type="hidden" name="public_id" value={publicId}/>{link&&<input type="hidden" name="id" value={link.id}/>}
    <Choice name="indicator_id" label="Indicador reutilizable" value={link?.indicator_id} options={Object.fromEntries(catalogue.map(i=>[i.id,`${i.code||'Heredado'} · ${i.name} · ${i.editorial_status}`]))}/>
    <Choice name="role" label="Rol" value={link?.role} options={{primary:'Principal',supporting:'Apoyo',contextual:'Contextual'}}/>
    <Field name="rationale" label="Por qué este indicador para esta recomendación" value={link?.rationale} required multiline/>
    <Choice name="rationale_kind" label="Alcance de la justificación" value={link?.rationale_kind} options={{specific:'Específica de este vínculo',general:'General del expediente'}}/>
    <Choice name="component_id" label="Componente (obligatorio si hay meta o baseline)" value={link?.component_id||''} options={{'':'Todos los componentes publicados',...Object.fromEntries(components.filter(c=>!link||c.indicator_id===link.indicator_id).map(c=>[c.id,`${catalogue.find(i=>i.id===c.indicator_id)?.code} · ${c.code} · ${c.label}`]))}}/>
    <Field name="scope" label="Scope JSON: {} para todos; población/territorio exactos para metas" value={JSON.stringify(link?.scope||{})} required/>
    <Field name="baseline_value_id" label="UUID de observación baseline publicada y comparable" value={link?.baseline_value_id}/><Field name="baseline_reason" label="Justificación y fuente de elección de baseline" value={link?.baseline_reason} multiline/>
    <Choice name="target_operator" label="Operador de meta" value={link?.target_operator||''} options={{'':'Sin meta','>=':'Mayor o igual','<=':'Menor o igual','=':'Igual',range:'Rango'}}/>
    <Choice name="target_type" label="Tipo de meta" value={link?.target_type||''} options={{'':'Sin meta',absolute:'Absoluta, en la unidad del componente',relative:'Relativa, variación % desde baseline'}}/>
    <Field name="target_value" label="Valor de meta (no deducir de las reglas del anexo)" value={link?.target_value}/><Field name="target_upper" label="Límite superior si es rango" value={link?.target_upper}/>
    <Field name="target_date" label="Plazo documentado" type="date" value={link?.target_date}/><Field name="target_source_url" label="URL de fuente justificativa de meta" type="url" value={link?.target_source_url}/><Field name="target_citation" label="Cita y contexto de meta" multiline value={link?.target_citation}/>
    <Choice name="editorial_status" label="Revisión y publicación del vínculo" value={link?'editorial_status' in link?String(link.editorial_status):'proposed':'proposed'} options={{proposed:'Propuesta pendiente de revisión',published:'Revisado y publicado',archived:'Archivado / desvinculado'}}/>
  </Stack>;
  return <AdminFrame title={`Indicadores · recomendación ${rec.recommendation_number}`} intro={rec.title}>
    <Stack direction="row" spacing={2}><Button component={Link} href={`/admin/recommendations/${encodeURIComponent(publicId)}`}>Volver al expediente</Button><Button component={Link} href="/admin/indicators">Buscar en el catálogo</Button></Stack>
    <AdminSection title="Aplicabilidad" note="No se deduce de la ausencia de vínculos. El anexo original se muestra en la ficha como propuesta sin validar. Los cambios de investigación permanecen privados hasta la revisión."><IndicatorAdminForm action={setApplicability} label="Guardar aplicabilidad"><input type="hidden" name="public_id" value={publicId}/><Stack spacing={2}><Choice name="indicator_requirement" label="Necesidad de indicadores" value={applicability?.indicator_requirement||'pending_review'} options={{pending_review:'Pendiente de revisión',not_required:'No necesarios (evidencia documental)',recommended:'Recomendados',required:'Necesarios'}}/><Field name="reason" label="Razón metodológica y referencia del expediente" value={applicability?.reason} required multiline/><Choice name="editorial_status" label="Revisión de aplicabilidad" value={applicability?.editorial_status||'proposed'} options={{proposed:'Propuesta',published:'Revisada y publicada'}}/></Stack></IndicatorAdminForm></AdminSection>
    <AdminSection title="Indicadores vinculados" note="Desvincular conserva el catálogo y todas sus observaciones; archiva solo esta relación. Las metas y baseline pertenecen al scope de esta recomendación.">
      {links.map(link=><Box component="details" key={link.id} sx={{my:2}}><summary>{catalogue.find(i=>i.id===link.indicator_id)?.code} · {catalogue.find(i=>i.id===link.indicator_id)?.name} · {link.editorial_status}</summary>
        <Button component={Link} href={`/admin/indicators/${link.indicator_id}`} size="small">Gestionar datos compartidos</Button>
        <IndicatorAdminForm action={saveLink} label="Guardar relación">{fields(link)}</IndicatorAdminForm>
        <IndicatorAdminForm action={unlinkIndicator} label="Desvincular y conservar mediciones"><input type="hidden" name="id" value={link.id}/><input type="hidden" name="public_id" value={publicId}/></IndicatorAdminForm>
        <Box component="details"><summary>Reglas originales del anexo (no son valores)</summary><Box component="pre" sx={{whiteSpace:'pre-wrap',fontSize:12}}>{JSON.stringify(link.import_metadata,null,2)}</Box></Box>
      </Box>)}{!links.length&&<Typography>Sin vínculos registrados.</Typography>}
    </AdminSection>
    <AdminSection title="Vincular indicador existente"><IndicatorAdminForm action={saveLink} label="Añadir vínculo">{fields()}</IndicatorAdminForm></AdminSection>
  </AdminFrame>;
}
