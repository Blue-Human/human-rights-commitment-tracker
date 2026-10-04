import { test,after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { normalizeSeed } from '../scripts/import-indicators.mjs';

// Isolated synthetic schema fixture reflecting inspected production column types. Never deployed.
const db = new PGlite();
after(()=>db.close());
const seed = normalizeSeed(JSON.parse(await readFile(new URL('../data/indicators/spain-upr4.v1.json',import.meta.url)))).payload;
const q=(sql,params=[])=>db.query(sql,params);
const id = '10000000-0000-0000-0000-000000000001';
let indicator,component,value,legacy;
test('migrations, seed, RLS, shared observations, revisions and scoped targets',async()=>{
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create table countries(id uuid primary key default gen_random_uuid(),iso2 text unique);
    create table mechanisms(id uuid primary key default gen_random_uuid(),code text);
    create table sources(id uuid primary key default gen_random_uuid(),document_reference text);
    create table commitments(id uuid primary key default gen_random_uuid(),public_id text, country_id uuid references countries,mechanism_id uuid references mechanisms,source_id uuid references sources,recommendation_number text,publication_status text);
    create table evidence(id uuid primary key);
    create table actions(id uuid primary key);
    create table indicators(id uuid primary key default gen_random_uuid(),action_id uuid references actions,commitment_id uuid not null references commitments,name text not null,description text,indicator_type text,unit text,target_value text,target_date date,created_at timestamptz not null default now());
    alter table commitments enable row level security;
    create policy commitments_public_read on commitments for select to anon,authenticated using(publication_status='published');
    alter table indicators enable row level security;
    create policy indicators_public_read on indicators for select to anon,authenticated using(true);
    grant select on countries,commitments to anon,authenticated;
    grant all on countries,mechanisms,sources,commitments to service_role;
    insert into countries(iso2) values('ES'),('FR');insert into mechanisms(code) values('UPR');
    insert into sources(document_reference) values('A/HRC/60/8'),('OTHER');
    insert into commitments(id,public_id,country_id,mechanism_id,source_id,recommendation_number,publication_status)
      select case when n=10 then '${id}'::uuid else gen_random_uuid() end,'FIXTURE-ES-UPR4-50.'||n,co.id,m.id,s.id,'50.'||n,'published' from generate_series(1,324) n,countries co,mechanisms m,sources s where co.iso2='ES' and s.document_reference='A/HRC/60/8';
    insert into commitments(public_id,country_id,mechanism_id,source_id,recommendation_number,publication_status)
      select 'TEST-50.10',co.id,m.id,s.id,'50.10','published' from countries co,mechanisms m,sources s where co.iso2='ES' and s.document_reference='A/HRC/60/8';
    insert into indicators(commitment_id,name,description,target_value) values('${id}','Legacy fixture','Pending legacy review','100');
  `);
  for(const filename of ['20261004093520_visual_indicators.sql','20261004093818_indicator_import_review.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${filename}`,import.meta.url),'utf8'));
  await db.exec('set role service_role');
  const rpc=async(write)=> (await q('select hrct_import_indicators($1::jsonb,$2) as result',[JSON.stringify(seed),write])).rows[0].result;
  assert.equal((await rpc(false)).validated,true);
  assert.equal((await q('select count(*)::int n from indicators')).rows[0].n,1);
  assert.equal((await rpc(true)).inserted_indicators,98);
  assert.equal((await rpc(true)).inserted_indicators,0);
  assert.equal((await q('select count(*)::int n from recommendation_indicators')).rows[0].n,429);
  assert.equal((await q('select count(*)::int n from recommendation_indicator_requirements')).rows[0].n,324);
  assert.equal((await q("select count(*)::int n from recommendation_indicators l join commitments c on c.id=l.commitment_id where c.public_id like 'TEST%'")).rows[0].n,0);
  // A published human decision and rationale survive reimport.
  await q("update recommendation_indicator_requirements set reason='Human decision',editorial_status='published',reviewed_by='Reviewer',reviewed_at=now() where commitment_id=$1",[id]);
  await rpc(true);
  assert.equal((await q('select reason from recommendation_indicator_requirements where commitment_id=$1',[id])).rows[0].reason,'Human decision');
  await db.exec('reset role;set role anon');
  const publicBundle=async(publicId='FIXTURE-ES-UPR4-50.10',all=false)=>(await q('select hrct_public_indicators($1,$2) as result',[publicId,all])).rows[0].result;
  assert.equal((await publicBundle()).links.length,0);
  assert.equal((await publicBundle()).requirement,'required');
  await assert.rejects(q('select import_metadata from indicators'),/permission denied/);
  await assert.rejects(q('select * from indicator_audit'),/permission denied/);
  await assert.rejects(q('delete from indicator_values'),/permission denied/);
  await assert.rejects(rpc(true),/permission denied/);
  await db.exec('reset role;set role authenticated');
  assert.equal((await publicBundle()).links.length,0);
  await assert.rejects(q('insert into indicator_components(indicator_id,code,label,unit,value_type,definition) values(gen_random_uuid(),\'TEST\',\'TEST\',\'%\',\'numeric\',\'TEST\')'),/permission denied/);
  await assert.rejects(q('select reviewed_by from recommendation_indicators'),/permission denied/);
  await db.exec('reset role;set role service_role');
  assert.equal((await q("select hrct_import_indicators('{}',true) as result")).rows[0].result.written,false);
  indicator=(await q("select id from indicators where code='INST-001'")).rows[0].id;
  component=(await q("select id from indicator_components where indicator_id=$1 and unit='EUR'",[indicator])).rows[0].id;
  await q("update indicators set editorial_status='published',reviewed_by='Reviewer',reviewed_at=now() where id=$1",[indicator]);
  await q("update indicator_components set editorial_status='published' where id=$1",[component]);
  await q("update recommendation_indicators set editorial_status='published',reviewed_by='Reviewer',reviewed_at=now() where indicator_id=$1",[indicator]);
  await q("insert into recommendation_indicators(commitment_id,indicator_id,role,rationale,editorial_status,reviewed_by,reviewed_at) select id,$1,'supporting','Synthetic shared-series fixture','published','Reviewer',now() from commitments where public_id='FIXTURE-ES-UPR4-50.11'",[indicator]);
  const year=new Date().getUTCFullYear();
  async function add(year,valueNumber=0,scope={territory:'national',population:'all'},unit='EUR',country='ES') {
    return (await q(`insert into indicator_values(indicator_id,component_id,country_iso2,scope,period_start,period_end,numeric_value,unit,source_url,source_title,citation,publication_date,retrieved_at,series_key,methodology_version,authored_by)
      values($1,$2,$3,$4::jsonb,$5,$6,$7,$8,'https://example.test/synthetic','Synthetic TEST source','Isolated fixture, never production',$6,now(),'test-series','v1','Test author') returning id`,[indicator,component,country,JSON.stringify(scope),`${year}-01-01`,`${year}-12-31`,valueNumber,unit])).rows[0].id;
  }
  value=await add(year-1);
  await assert.rejects(add(year-2,1,undefined,'FTE'),/unit differs/);
  await assert.rejects(q("update indicator_values set numeric_value=null,boolean_value=false where id=$1",[value]),/type differs/);
  await db.exec('reset role;set role anon');assert.equal((await publicBundle()).values.length,0);
  await db.exec('reset role;set role service_role');
  await q('select hrct_publish_indicator_value($1,$2,$3)',[value,'Reviewer','Explicit fixture source selection']);
  const old=await add(year-7,100),foreign=await add(year-1,20,undefined,'EUR','FR');
  await q('select hrct_publish_indicator_value($1,$2,$3)',[old,'Reviewer','Old fixture']);await q('select hrct_publish_indicator_value($1,$2,$3)',[foreign,'Reviewer','Foreign fixture']);
  await db.exec('reset role;set role anon');
  let bundle=await publicBundle();assert.equal(bundle.values.length,1);assert.equal(bundle.values[0].numeric_value,0);assert.equal(bundle.has_older,true);
  assert.equal((await publicBundle(undefined,true)).values.length,2);
  assert.equal((await publicBundle('FIXTURE-ES-UPR4-50.11')).values[0].id,value);
  assert.equal((await publicBundle('TEST-50.10')).values.length,0);
  await db.exec('reset role;set role service_role');
  await assert.rejects(q('update indicator_values set numeric_value=12 where id=$1',[value]),/immutable/);
  const correction=await add(year-1,12,{population:'all',territory:'national'});
  await q('update indicator_values set supersedes_id=$1 where id=$2',[value,correction]);
  await q('select hrct_publish_indicator_value($1,$2,$3)',[correction,'Reviewer','Corrected synthetic source']);
  assert.equal((await q('select count(*)::int n from indicator_values where component_id=$1 and country_iso2=\'ES\' and is_current',[component])).rows[0].n,2);
  await assert.rejects(q("update recommendation_indicators set target_value=1,target_type='absolute',target_operator='>=' where indicator_id=$1",[indicator]),/check constraint|Numeric target requires/);
  await assert.rejects(q("update recommendation_indicators set baseline_value_id=$1,baseline_reason='fixture',component_id=$2,scope='{\"territory\":\"national\",\"population\":\"other\"}' where indicator_id=$3",[correction,component,indicator]),/exact scope/);
  await q("update recommendation_indicators set component_id=$1,scope='{\"territory\":\"national\",\"population\":\"all\"}',baseline_value_id=$2,baseline_reason='Documented fixture choice',target_value=20,target_operator='>=',target_type='absolute',target_date=$3,target_source_url='https://example.test/target',target_citation='Synthetic target' where indicator_id=$4 and commitment_id=$5",[component,correction,`${year}-12-31`,indicator,id]);
  await assert.rejects(q("update indicator_components set unit='FTE' where id=$1",[component]),/immutable/);
  await db.exec('reset role;set role anon');
  bundle=await publicBundle();assert.equal(bundle.latest[0].numeric_value,12);assert.equal(bundle.baselines[0].id,correction);
  await db.exec('reset role;set role service_role');
  assert.ok((await q('select count(*)::int n from indicator_audit')).rows[0].n>500);
  await q("update recommendation_indicators set editorial_status='archived' where commitment_id=$1",[id]);await rpc(true);
  assert.equal((await q("select count(*)::int n from recommendation_indicators where commitment_id=$1 and editorial_status='published'",[id])).rows[0].n,0);
  // Missing recommendation aborts BEFORE writes.
  const broken=structuredClone(seed);broken.recommendations[0].recommendation_number='50.999';
  const report=(await q('select hrct_import_indicators($1,true) as result',[JSON.stringify(broken)])).rows[0].result;assert.equal(report.written,false);assert.ok(report.errors.length);
});
