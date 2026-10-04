import { notFound } from 'next/navigation';
import { Box,Stack,Typography } from '@mui/material';
import { AdminFrame,AdminSection } from '@/components/AdminFrame';
import { IndicatorAdminForm } from '@/components/IndicatorAdminForm';
import { Choice,Field,IndicatorFields } from '@/components/IndicatorAdminFields';
import { getIndicator,listComponents,listValues } from '@/lib/admin/indicators';
import { requireAdmin } from '@/lib/admin/session';
import { valueLabel,scopeLabel,periodLabel } from '@/lib/indicators/series';
import type { Component } from '@/lib/indicators/types';
import { addObservations,editIndicator,publishObservation,saveComponent } from '../actions';
const componentFields=(c?:Component)=><Stack spacing={2}>
  <Field name="code" label="Código estable del componente" value={c?.code} required/><Field name="label" label="Nombre del componente" value={c?.label} required/>
  <Field name="unit" label="Unidad inequívoca (una sola métrica)" value={c?.unit} required/><Field name="definition" label="Definición propia y alcance" value={c?.definition} multiline required/><Field name="formula" label="Fórmula y denominadores" value={c?.formula} multiline/>
  <Choice name="value_type" label="Tipo de valor" value={c?.value_type} options={{numeric:'Número',boolean:'Sí / No / Desconocido',category:'Categoría',text:'Texto'}}/>
  <Choice name="frequency" label="Frecuencia esperada" value={c?.frequency} options={{annual:'Anual',biennial:'Bienal',quarterly:'Trimestral',monthly:'Mensual',irregular:'Irregular'}}/>
  <Choice name="visualization" label="Visualización" value={c?.visualization} options={{line:'Línea temporal',bar:'Barras con origen cero',timeline:'Hitos o cronología'}}/>
  <Choice name="editorial_status" label="Revisión de la definición" value={c?.editorial_status} options={{proposed:'Propuesta pendiente',published:'Revisada y publicada'}}/>
</Stack>;
export const metadata={title:'Gestionar indicador | HRCT',robots:{index:false,follow:false}};
export default async function ManageIndicator({params}:{params:Promise<{id:string}>}) {
  await requireAdmin();const {id}=await params;const indicator=await getIndicator(id);if(!indicator)notFound();
  const [components,values]=await Promise.all([listComponents(id),listValues(id)]);
  return <AdminFrame title={`${indicator.code||'Indicador heredado'} · ${indicator.name}`} intro="Las mediciones se comparten entre recomendaciones. Publicar un dato exige revisar su fuente y seleccionar explícitamente la observación vigente para ese periodo. Una corrección se añade como borrador nuevo.">
    <AdminSection title="Definición y publicación del catálogo"><IndicatorAdminForm action={editIndicator} label="Guardar catálogo"><input type="hidden" name="id" value={id}/><Stack spacing={2} sx={{maxWidth:850}}><IndicatorFields values={indicator}/><Choice name="active" label="Actividad" value={String(indicator.active)} options={{true:'Activo',false:'Archivado'}}/><Choice name="editorial_status" label="Estado editorial" value={indicator.editorial_status} options={{draft:'Borrador',proposed:'Propuesto',published:'Revisado y publicado',archived:'Archivado'}}/></Stack></IndicatorAdminForm>
      <Box component="details"><summary>Metadatos originales de importación</summary><Box component="pre" sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12}}>{JSON.stringify(indicator.import_metadata,null,2)}</Box></Box>
    </AdminSection>
    <AdminSection title="Componentes de medición" note="Revisa las unidades y definiciones ambiguas del anexo. No mezcles presupuesto, plantilla, tasas o recuentos. Para cambiar una definición con datos publicados, crea un componente nuevo.">
      {components.map(c=><Box component="details" key={c.id} sx={{my:2}}><summary>{c.code} · {c.label} · {c.editorial_status}</summary><IndicatorAdminForm action={saveComponent} label="Guardar componente"><input type="hidden" name="id" value={c.id}/><input type="hidden" name="indicator_id" value={id}/>{componentFields(c)}</IndicatorAdminForm></Box>)}
      <Box component="details"><summary>Añadir componente</summary><IndicatorAdminForm action={saveComponent} label="Crear componente"><input type="hidden" name="indicator_id" value={id}/>{componentFields()}</IndicatorAdminForm></Box>
    </AdminSection>
    <AdminSection title="Añadir medición" note="Introduce un solo tipo de valor. Para un dato desconocido usa motivo de ausencia; cero es una medición real. No se publica hasta revisar."><IndicatorAdminForm action={addObservations} label="Guardar observación en borrador"><input type="hidden" name="indicator_id" value={id}/><Stack spacing={2} sx={{maxWidth:850}}>
      <Choice name="component_id" label="Componente" options={Object.fromEntries(components.map(c=>[c.id,`${c.label} · ${c.unit}`]))}/><Field name="country_iso2" label="País ISO2" value="ES" required/>
      <Field name="scope" label="Scope JSON: claves estables de territorio y población" value={'{"territory":"national","population":"all"}'} required/>
      <Stack direction={{xs:'column',sm:'row'}} spacing={2}><Field name="period_start" label="Inicio del periodo medido" type="date" required/><Field name="period_end" label="Fin del periodo medido" type="date" required/></Stack>
      <Field name="numeric_value" label="Valor numérico (opcional)"/><Choice name="boolean_value" label="Valor booleano (opcional)" options={{'':'Sin valor booleano',true:'Sí',false:'No'}}/>
      <Field name="text_value" label="Texto o categoría (opcional)"/><Field name="missing_reason" label="Motivo de dato desconocido/no disponible (sin valores)"/>
      <Field name="unit" label="Unidad exacta del componente" required/><Field name="source_title" label="Título de la fuente" required/><Field name="source_url" label="URL verificable de la fuente" type="url" required/><Field name="citation" label="Cita: tabla, página, definición o referencia de Jira" multiline required/>
      <Field name="publication_date" label="Fecha de publicación de la fuente" type="date" required/><Field name="retrieved_at" label="Fecha de recuperación (UTC)" type="datetime-local" required/>
      <Field name="series_key" label="Clave de serie comparable" required/><Field name="methodology_version" label="Versión metodológica" required/>
      <Field name="comparability_notes" label="Evaluación de comparabilidad (incluye cambio de fuente)" multiline/><Choice name="break_before" label="Ruptura respecto al punto previo" options={{false:'No',true:'Sí'}}/><Field name="quality_notes" label="Limitaciones de calidad" multiline/>
      <Field name="supersedes_id" label="UUID de observación corregida (opcional)"/><Field name="evidence_id" label="UUID de evidencia relacionada (opcional)"/>
    </Stack></IndicatorAdminForm></AdminSection>
    <AdminSection title="Importar mediciones" note="Array JSON con los mismos campos del formulario; máximo 500 filas. Toda la importación se guarda como borrador, de forma atómica. Consulta docs/indicators.md para el contrato."><IndicatorAdminForm action={addObservations} label="Importar borradores"><input type="hidden" name="indicator_id" value={id}/><Field name="observations_json" label="Array JSON de observaciones" multiline required/></IndicatorAdminForm></AdminSection>
    <AdminSection title="Revisión de observaciones y fuentes alternativas" note="Se conservan las observaciones contradictorias, revisiones y correcciones. La observación seleccionada sustituye la vigente para el mismo scope y periodo sin borrar el registro anterior.">
      {values.map(v=><Box key={v.id} sx={{py:2,borderBottom:'1px solid',borderColor:'divider'}}>
        <Typography color="primary.main">{periodLabel(v,components.find(c=>c.id===v.component_id)?.frequency||'irregular')} · {valueLabel(v)} · {v.editorial_status} {v.is_current?'· Vigente':''}</Typography>
        <Typography variant="body2">{scopeLabel(v.scope)} · <a href={v.source_url} target="_blank" rel="noreferrer">{v.source_title}</a> · {v.citation}</Typography>
        <Typography variant="caption">UUID {v.id} · Publicación {v.publication_date} · Recuperación {v.retrieved_at} · {v.series_key} / {v.methodology_version} · {v.supersedes_id?`Corrige ${v.supersedes_id}`:''}</Typography>
        <Typography variant="body2">{v.comparability_notes} {v.quality_notes} {v.selection_reason}</Typography>
        {v.editorial_status==='draft'&&<IndicatorAdminForm action={publishObservation} label="Revisar, publicar y seleccionar como vigente"><input type="hidden" name="id" value={v.id}/><Field name="selection_reason" label="Por qué se selecciona esta fuente/observación" required multiline/></IndicatorAdminForm>}
      </Box>)}{!values.length&&<Typography color="text.secondary">Sin observaciones registradas.</Typography>}
    </AdminSection>
  </AdminFrame>;
}
