'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminRpc } from '@/lib/admin/db';
import { requireAdmin } from '@/lib/admin/session';
import { entityFor, parseValues, rootPath, validId } from '@/lib/programmes/model';

const text=(form:FormData,key:string)=>String(form.get(key)||'').trim();
function errorMessage(error:unknown) {
  const message=error instanceof Error?error.message:'';
  if(!message.startsWith('Supabase ')) return message || 'No se pudo guardar el registro.';
  if(/23505/.test(message)) return 'Ya existe un registro con ese código o esa relación.';
  if(/23503/.test(message)) return 'Comprueba las relaciones: todos los registros deben pertenecer al mismo proyecto. Asigna primero el partner al proyecto.';
  if(/23514|23502/.test(message)) return 'Revisa los campos obligatorios, los valores, las fechas y las condiciones de publicación.';
  if(/Indicator unit and type are immutable/.test(message)) return 'La unidad y el tipo se conservan con sus mediciones; crea un indicador nuevo.';
  if(/Measurements are immutable/.test(message)) return 'Las mediciones se conservan: registra una corrección en el histórico.';
  if(/Correction must/.test(message)) return 'La corrección debe referirse al mismo indicador y fecha de medición.';
  if(/Measurement date/.test(message)) return 'La fecha de medición no puede estar en el futuro.';
  return 'No se pudo guardar. Comprueba que la migración de Programmes está aplicada y que el registro sigue activo.';
}
export async function saveRecord(form:FormData):Promise<{error?:string;success?:string}> {
  await requireAdmin();
  const section=text(form,'section'),entity=entityFor(section),id=text(form,'id');
  if(!entity || id&&!validId(id)) return {error:'Registro inválido.'};
  let savedId:string;
  try {
    savedId=await adminRpc<string>('hrct_programmes_write',{
      p_entity:entity.table,p_id:id||null,p_values:parseValues(section,form),p_actor:process.env.ADMIN_USER!,p_operation:'save',
    });
  } catch(error) { return {error:errorMessage(error)}; }
  revalidatePath(rootPath,'layout');
  revalidatePath('/admin/recommendations','layout');
  if(!id) redirect(`${rootPath}/${section}/${savedId}`);
  return {success:'Cambios guardados. Se ha conservado el historial.'};
}
export async function archiveRecord(form:FormData):Promise<{error?:string;success?:string}> {
  await requireAdmin();
  const section=text(form,'section'),entity=entityFor(section),id=text(form,'id');
  if(!entity||!validId(id)||section==='measurements') return {error:'Registro inválido.'};
  if(text(form,'confirm')!=='archive') return {error:'Marca la confirmación de archivo.'};
  try {
    await adminRpc('hrct_programmes_write',{p_entity:entity.table,p_id:id,p_values:{},p_actor:process.env.ADMIN_USER!,p_operation:'archive'});
  } catch(error) { return {error:errorMessage(error)}; }
  revalidatePath(rootPath,'layout'); revalidatePath('/admin/recommendations','layout');
  redirect(`${rootPath}/${section}`);
}
