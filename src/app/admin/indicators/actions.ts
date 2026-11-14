'use server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { adminPatch,adminRest,adminRpc,getRecommendation } from '@/lib/admin/db';
import { requireAdmin } from '@/lib/admin/session';
const text=(form:FormData,key:string)=>String(form.get(key)||'').trim();
const nullable=(form:FormData,key:string)=>text(form,key)||null;
const reviewer=()=>process.env.ADMIN_USER||'Blue Human';
const uuid=(s:string)=>{if(!/^[a-f0-9-]{36}$/i.test(s)) throw new Error('Identificador inválido');return s;};
function scope(form:FormData) {const parsed=JSON.parse(text(form,'scope')||'{}'); if(!parsed||Array.isArray(parsed)||typeof parsed!=='object'||Object.values(parsed).some(v=>typeof v!=='string')) throw new Error('Scope: usa un objeto JSON con claves y valores de texto');return parsed;}
function numeric(form:FormData,key:string) {const s=text(form,key);if(!s)return null;const n=Number(s);if(!Number.isFinite(n))throw new Error(`${key}: valor numérico inválido`);return n;}
function required(form:FormData,key:string) {const s=text(form,key);if(!s)throw new Error(`Completa ${key}`);return s;}
async function save(operation:()=>Promise<unknown>) {
  await requireAdmin();
  try {await operation();revalidateTag('indicators');revalidatePath('/admin','layout');revalidatePath('/commitments','layout');return {success:'Guardado. Los cambios en mediciones no modifican la valoración del cumplimiento.'};}
  catch(error) {const message=error instanceof Error?error.message:'';return {error:message.startsWith('Supabase')?'No se pudo guardar: comprueba el tipo, unidad, fuente, scope y requisitos de revisión. Las observaciones publicadas requieren una corrección nueva.':message||'No se pudo guardar'};}
}
export async function createIndicator(form:FormData) {return save(async()=>{
  const code=required(form,'code').toUpperCase(),name=required(form,'name'),description=required(form,'description');
  if(!/^[A-Z0-9]+-[A-Z0-9-]+$/.test(code))throw new Error('Usa un código estable como HEA-001');
  const existing=await adminRest<{code:string|null;name:string}[]>('indicators?select=code,name&limit=1000');
  if(existing.some(i=>i.code===code || i.name.localeCompare(name,'es',{sensitivity:'base'})===0))throw new Error('Ya existe un indicador con ese código o nombre. Reutilízalo.');
  await adminRest('indicators',{method:'POST',body:JSON.stringify({code,name,description,indicator_type:text(form,'indicator_type'),topic:nullable(form,'topic'),methodology:nullable(form,'methodology'),orientation:text(form,'orientation')||'neutral',preferred_sources:nullable(form,'preferred_sources'),editorial_status:'draft'})});
});}
export async function editIndicator(form:FormData) {return save(async()=>{
  const published=text(form,'editorial_status')==='published';
  await adminPatch('indicators',uuid(text(form,'id')),{name:required(form,'name'),description:required(form,'description'),topic:nullable(form,'topic'),indicator_type:required(form,'indicator_type'),methodology:nullable(form,'methodology'),orientation:text(form,'orientation'),preferred_sources:nullable(form,'preferred_sources'),recommended_disaggregation:nullable(form,'recommended_disaggregation'),active:text(form,'active')==='true',editorial_status:text(form,'editorial_status'),reviewed_by:published?reviewer():null,reviewed_at:published?new Date().toISOString():null,updated_at:new Date().toISOString()});
});}
export async function saveComponent(form:FormData) {return save(async()=>{
  const values={indicator_id:uuid(text(form,'indicator_id')),code:required(form,'code'),label:required(form,'label'),definition:required(form,'definition'),unit:required(form,'unit'),value_type:required(form,'value_type'),frequency:required(form,'frequency'),visualization:required(form,'visualization'),formula:nullable(form,'formula'),editorial_status:text(form,'editorial_status')==='published'?'published':'proposed'};
  if(text(form,'id'))await adminPatch('indicator_components',uuid(text(form,'id')),values);
  else await adminRest('indicator_components',{method:'POST',body:JSON.stringify(values)});
});}
export async function addObservations(form:FormData) {return save(async()=>{
  const batch=text(form,'observations_json');
  const raw=batch?JSON.parse(batch):[Object.fromEntries(form.entries())];
  if(!Array.isArray(raw)||!raw.length||raw.length>500)throw new Error('Importa un array JSON de 1 a 500 observaciones');
  const indicator=uuid(text(form,'indicator_id'));
  const rows=raw.map(item=>{
    const f=new FormData();for(const [key,value] of Object.entries(item))f.set(key,value==null?'':typeof value==='object'?JSON.stringify(value):String(value));
    const bool=text(f,'boolean_value');
    return {indicator_id:indicator,component_id:uuid(required(f,'component_id')),country_iso2:required(f,'country_iso2').toUpperCase(),scope:scope(f),period_start:required(f,'period_start'),period_end:required(f,'period_end'),numeric_value:numeric(f,'numeric_value'),boolean_value:bool==='true'?true:bool==='false'?false:null,text_value:nullable(f,'text_value'),missing_reason:nullable(f,'missing_reason'),unit:required(f,'unit'),source_url:required(f,'source_url'),source_title:required(f,'source_title'),citation:required(f,'citation'),evidence_id:nullable(f,'evidence_id'),publication_date:required(f,'publication_date'),retrieved_at:new Date(required(f,'retrieved_at').includes('T') && !/[Z+-]\d{0,2}:?\d{0,2}$/.test(required(f,'retrieved_at')) ? `${required(f,'retrieved_at')}Z` : required(f,'retrieved_at')).toISOString(),series_key:required(f,'series_key'),methodology_version:required(f,'methodology_version'),comparability_notes:nullable(f,'comparability_notes'),break_before:text(f,'break_before')==='true',quality_notes:nullable(f,'quality_notes'),supersedes_id:nullable(f,'supersedes_id'),authored_by:reviewer(),editorial_status:'draft',is_current:false};
  });
  await adminRest('indicator_values',{method:'POST',body:JSON.stringify(rows)});
});}
export async function publishObservation(form:FormData) {return save(()=>adminRpc('hrct_publish_indicator_value',{p_id:uuid(text(form,'id')),p_reviewer:reviewer(),p_reason:required(form,'selection_reason')}));}
export async function setApplicability(form:FormData) {return save(async()=>{
  const rec=await getRecommendation(required(form,'public_id'));if(!rec)throw new Error('Recomendación no encontrada');
  const published=text(form,'editorial_status')==='published';
  await adminRest('recommendation_indicator_requirements?on_conflict=commitment_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({commitment_id:rec.id,indicator_requirement:required(form,'indicator_requirement'),reason:required(form,'reason'),editorial_status:published?'published':'proposed',reviewed_by:published?reviewer():null,reviewed_at:published?new Date().toISOString():null,updated_at:new Date().toISOString()})});
});}
export async function saveLink(form:FormData) {return save(async()=>{
  const rec=await getRecommendation(required(form,'public_id'));if(!rec)throw new Error('Recomendación no encontrada');
  const published=text(form,'editorial_status')==='published';
  const values={commitment_id:rec.id,indicator_id:uuid(required(form,'indicator_id')),role:required(form,'role'),rationale:required(form,'rationale'),rationale_kind:text(form,'rationale_kind')||'specific',component_id:nullable(form,'component_id'),scope:scope(form),baseline_value_id:nullable(form,'baseline_value_id'),baseline_reason:nullable(form,'baseline_reason'),target_operator:nullable(form,'target_operator'),target_type:nullable(form,'target_type'),target_value:numeric(form,'target_value'),target_upper:numeric(form,'target_upper'),target_date:nullable(form,'target_date'),target_source_url:nullable(form,'target_source_url'),target_citation:nullable(form,'target_citation'),editorial_status:published?'published':'proposed',authored_by:reviewer(),reviewed_by:published?reviewer():null,reviewed_at:published?new Date().toISOString():null};
  if(text(form,'id')) {
    const id=uuid(text(form,'id'));
    const own=await adminRest<{id:string}[]>(`recommendation_indicators?id=eq.${id}&commitment_id=eq.${rec.id}&select=id`);if(!own.length)throw new Error('El vínculo no corresponde a esta recomendación');
    await adminPatch('recommendation_indicators',id,values);
  } else await adminRest('recommendation_indicators',{method:'POST',body:JSON.stringify(values)});
});}
export async function unlinkIndicator(form:FormData) {return save(async()=>{
  const rec=await getRecommendation(required(form,'public_id'));if(!rec)throw new Error('Recomendación no encontrada');
  await adminRest(`recommendation_indicators?id=eq.${uuid(text(form,'id'))}&commitment_id=eq.${rec.id}`,{method:'PATCH',body:JSON.stringify({editorial_status:'archived'})});
});}
