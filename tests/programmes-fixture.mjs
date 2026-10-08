import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
const migration=await readFile(new URL('../supabase/migrations/20261008173400_programmes_mel.sql',import.meta.url),'utf8');
export async function createProgrammeDatabase() {
  const db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    alter default privileges grant all on tables to anon,authenticated;
    alter default privileges grant all on sequences to anon,authenticated;
    create table commitments(id uuid primary key default gen_random_uuid(),public_id text,title text,original_text text,assessment_status text);
    create table assessments(id uuid primary key default gen_random_uuid(),commitment_id uuid references commitments,status text);
    create table evidence(id uuid primary key default gen_random_uuid(),commitment_id uuid references commitments,finding text);
    grant all on commitments,assessments,evidence to service_role;
    create view hrct_public_commitments as select * from commitments;
    grant select on hrct_public_commitments to anon,authenticated,service_role;
    insert into commitments(public_id,title,original_text,assessment_status) values('TEST-COL-UPR-043','Synthetic isolated commitment','Official text fixture','not_assessed');
    insert into assessments(commitment_id,status) select id,'not_assessed' from commitments;
  `);
  await db.exec(migration);
  await db.exec(await readFile(new URL('../supabase/migrations/20261008173727_programmes_fk_indexes.sql',import.meta.url),'utf8'));
  await db.exec('set role service_role');
  return db;
}
