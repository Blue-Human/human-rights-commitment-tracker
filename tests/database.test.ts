import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const legacy=await readFile(new URL('../supabase/migrations/20261003_live_tracker_and_human_security.sql',import.meta.url),'utf8');
const upgrade=await readFile(new URL('../supabase/migrations/20261003112506_normalized_live_monitoring.sql',import.meta.url),'utf8');
const fixture=`
create role anon;create role authenticated;create role service_role bypassrls;
create table commitments(id uuid primary key default gen_random_uuid(),public_id text,publication_status text);
create table evidence(id uuid primary key default gen_random_uuid(),commitment_id uuid references commitments(id),is_public boolean,evidence_date date);
create table assessments(id uuid primary key default gen_random_uuid(),commitment_id uuid references commitments(id),methodology_version_id uuid,status text,confidence text,rationale text,assessment_date date,is_current boolean,is_public boolean);
alter table commitments enable row level security;create policy published on commitments for select using(publication_status='published');
alter table evidence enable row level security;create policy published on evidence for select using(is_public);
alter table assessments enable row level security;create policy published on assessments for select using(is_public);
grant select on commitments,evidence,assessments to anon,authenticated;
create view hrct_public_assessment_history as select id,commitment_id,status from assessments where is_public;
`;
const c1='10000000-0000-0000-0000-000000000001',c2='10000000-0000-0000-0000-000000000002',c3='10000000-0000-0000-0000-000000000003';
test('Migration, RLS, deduplication, event links, review separation and assessment immutability',async()=>{
 const db=new PGlite();try{
 await db.exec(fixture);await db.exec(legacy);
 await db.exec(`insert into commitments(id,public_id,publication_status) values('${c1}','ESP-1','published'),('${c2}','ESP-2','published'),('${c3}','PRIVATE','draft');
 insert into monitoring_profiles(commitment_id,news_query) values('${c1}','racismo'),('${c2}','racismo'),('${c3}','racismo');
 insert into monitoring_items(commitment_id,kind,relation,title,url,is_public) values('${c1}','need_context','context','Racismo','https://rtve.es/a',true),('${c2}','need_context','context','Racismo','https://rtve.es/a',true);`);
 await db.exec(upgrade);
 assert.equal((await db.query<Record<string,any>>('select * from signals')).rows.length,1,'Legacy article imported once');
 assert.equal((await db.query<Record<string,any>>('select * from signal_commitments')).rows.length,2,'Legacy many-to-many relationships preserved');
 const s={url:'https://interior.gob.es/report',title:'Racismo',event_key:'one',source_domain:'interior.gob.es',source_type:'official',source_tier:1,provider:'fixture'};
 const link=(id:string,kind='context',publication_status='published')=>({commitment_id:id,score:1,rationale:'Fixture',kind,publication_status});
 const store=(signal:any,l:any)=>db.query<Record<string,any>>('select hrct_store_signal($1::jsonb,$2::jsonb,$3::text[]) as result',[JSON.stringify(signal),JSON.stringify(l),['community','personal']]);
 await store(s,link(c1));await store(s,link(c1));await store(s,link(c2));
 assert.equal((await db.query<Record<string,any>>('select * from signals')).rows.length,2,'Retries do not duplicate sources');
 assert.equal((await db.query<Record<string,any>>('select * from signal_human_security')).rows.length,2,'Multiple security dimensions');
 await store({...s,url:'https://rtve.es/second'},link(c1));
 assert.equal((await db.query<Record<string,any>>('select * from signal_clusters')).rows.length,1,'Same event has multiple source URLs');
 await store(s,link(c1,'implementation_candidate','candidate'));
 assert.equal((await db.query<Record<string,any>>('select hrct_assessment_watch() as n')).rows[0].n,1,'Institutional implementation query qualifies for review');
 assert.equal((await db.query<Record<string,any>>('select hrct_assessment_watch() as n')).rows[0].n,0,'Review watch is idempotent');
 assert.equal((await db.query<Record<string,any>>('select * from assessments')).rows.length,0,'No assessment created by monitoring');
 assert.equal((await db.query<Record<string,any>>('select * from evidence')).rows.length,0,'No evidence created by monitoring');
 await db.exec(`update signal_commitments set publication_status='rejected' where commitment_id='${c2}';`);
 await store(s,link(c2));assert.equal((await db.query<Record<string,any>>(`select publication_status from signal_commitments where signal_id=(select id from signals where canonical_url='${s.url}') and commitment_id='${c2}'`)).rows[0].publication_status,'rejected');
 await db.exec(`update monitoring_profiles set enabled=false where commitment_id='${c1}';`);
 await store({...s,url:'https://interior.gob.es/disabled'},link(c1));assert.equal((await db.query<Record<string,any>>("select * from signals where canonical_url like '%disabled'")).rows.length,0,'Disabled profile cannot store');
 await store({...s,url:'https://interior.gob.es/private'},link(c3));assert.equal((await db.query<Record<string,any>>("select * from signals where canonical_url like '%private'")).rows.length,0,'Draft recommendation cannot publish');
 await db.exec(`insert into assessments(commitment_id,status,confidence,rationale,assessment_date,is_public,is_current) values('${c1}','unable_to_assess','low','Insufficient evidence',current_date,true,true);`);
 await assert.rejects(()=>db.exec("update assessments set status='implemented'"),/revision/);
 await assert.rejects(()=>db.exec('delete from assessments'),/retained/);
 const lease=await db.query<Record<string,any>>("select hrct_start_monitoring('discover') as id");assert.ok(lease.rows[0].id);assert.equal((await db.query<Record<string,any>>("select hrct_start_monitoring('watch') as id")).rows[0].id,null);
 // Simulate extension APIs locally to execute the activation SQL and verify token wiring.
 // Extension installation and live HTTP execution require the actual Supabase deployment.
 await db.exec(`create schema vault;create schema cron;create schema net;
 create table vault.secrets(id uuid primary key default gen_random_uuid(),name text unique,secret text);
 create view vault.decrypted_secrets as select name,secret as decrypted_secret from vault.secrets;
 create function vault.create_secret(value text,name text,description text) returns uuid language plpgsql as $$
 declare id uuid;begin insert into vault.secrets(name,secret) values(name,value) returning vault.secrets.id into id;return id;end $$;
 create table cron.job(jobname text primary key,schedule text,command text);
 create function cron.schedule(name text,schedule text,command text) returns bigint language sql as $$
 insert into cron.job values(name,schedule,command) on conflict(jobname) do update set schedule=excluded.schedule,command=excluded.command returning 1::bigint;$$;`);
 const scheduler=(await readFile(new URL('../supabase/migrations/20261003113506_monitoring_scheduler.sql',import.meta.url),'utf8')).replace(/^create extension.*;$/gm,'');
 await db.exec(scheduler);await db.exec(scheduler);
 assert.equal((await db.query<Record<string,any>>('select * from cron.job')).rows.length,3,'Three jobs, no duplicates on scheduler rerun');
 const token=(await db.query<Record<string,any>>('select secret from vault.secrets where name=\'hrct_monitoring_token\'')).rows[0].secret;
 assert.equal((await db.query<Record<string,any>>('select hrct_valid_monitoring_token($1) as valid',[token])).rows[0].valid,true);
 assert.equal((await db.query<Record<string,any>>('select hrct_valid_monitoring_token($1) as valid',['bad'])).rows[0].valid,false);
 await db.exec('set role anon');
 assert.ok((await db.query<Record<string,any>>('select * from hrct_public_signals')).rows.length>=1);
 await assert.rejects(()=>db.query<Record<string,any>>('select * from monitoring_review_candidates'),/permission denied/);
 await assert.rejects(()=>db.query<Record<string,any>>('select * from hrct_monitoring_tokens'),/permission denied/);
 await assert.rejects(()=>db.query<Record<string,any>>('select news_query from monitoring_profiles'),/permission denied/);
 await assert.rejects(()=>db.query<Record<string,any>>("select hrct_assessment_watch()"),/permission denied/);
 await assert.rejects(()=>db.exec('truncate signals'),/permission denied/);
 const fresh=await db.query<Record<string,any>>('select * from hrct_public_freshness');assert.equal(fresh.rows.length,2,'Draft freshness is hidden');
 }finally{await db.close();}
});
