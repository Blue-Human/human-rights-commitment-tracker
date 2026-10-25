import 'server-only';
import { adminRest } from './db';
import { requireAdmin } from './session';
import { entities, entityFor, validId, type OperationalRecord } from '../programmes/model';
export type WorkspaceData = Record<string, OperationalRecord[]>;
export type AuditEntry = { id: number; operation: string; recorded_by: string; recorded_at: string; before_record: OperationalRecord | null; after_record: OperationalRecord | null };

// Stable pagination prevents the Supabase row cap from silently truncating dashboards or selectors.
async function allRows(path: string): Promise<OperationalRecord[]> {
  const rows: OperationalRecord[]=[];
  for(let offset=0;;) {
    const page=await adminRest<OperationalRecord[]>(`${path}&order=id.asc&limit=500&offset=${offset}`);
    rows.push(...page); if(!page.length) return rows; offset+=page.length;
  }
}
export async function listOperational(section: string, projectId?: string) {
  await requireAdmin();
  const entity=entityFor(section); if(!entity) throw new Error('Unknown programme section');
  if(projectId&&!validId(projectId)) throw new Error('Invalid project ID');
  return allRows(`${entity.table}?select=*&archived_at=is.null${entity.projectScoped&&projectId?`&project_id=eq.${projectId}`:''}`);
}
export async function getOperational(section: string, id: string) {
  await requireAdmin(); const entity=entityFor(section);
  if(!entity||!validId(id)) return null;
  return (await adminRest<OperationalRecord[]>(`${entity.table}?select=*&id=eq.${id}&archived_at=is.null&limit=1`))[0]||null;
}
export async function loadWorkspace(projectId?: string): Promise<WorkspaceData> {
  await requireAdmin();
  const entries=await Promise.all(Object.keys(entities).map(async section=>[section,await listOperational(section,projectId)] as const));
  const commitments=await allRows('commitments?select=id,public_id,title,original_text');
  return {...Object.fromEntries(entries),commitments};
}
export async function loadOverview() {
  await requireAdmin();
  return Object.fromEntries(await Promise.all(['programmes','projects','partners','activities','assignments'].map(async section=>[section,await listOperational(section)] as const)));
}
export async function recordAudit(section: string, id: string) {
  await requireAdmin(); const entity=entityFor(section); if(!entity||!validId(id)) return [];
  return adminRest<AuditEntry[]>(`programme_audit?select=id,operation,recorded_by,recorded_at,before_record,after_record&entity=eq.${entity.table}&entity_id=eq.${id}&order=recorded_at.desc&limit=100`);
}
export async function commitmentContributions(commitmentId: string) {
  await requireAdmin(); if(!validId(commitmentId)) return [];
  const results=await Promise.all(['project_commitments','activity_commitments','output_commitments'].map(table=>
    adminRest<(OperationalRecord & {projects:{id:string;title:string;project_code:string}|null;project_activities?:{id:string;title:string}|null;project_outputs?:{id:string;title:string}|null})[]>(`${table}?select=*,projects(id,title,project_code)${table==='activity_commitments'?',project_activities(id,title)':table==='output_commitments'?',project_outputs(id,title)':''}&commitment_id=eq.${commitmentId}&archived_at=is.null`)));
  return results.flat();
}
