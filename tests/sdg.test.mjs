import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { countBy, crossWithGoals, SDG_TARGET_COUNT, sdgGoals, summarizeSdgs, targetText } from '../src/lib/sdg.ts';
import { sdgIcon } from '../src/lib/sdg-icon.ts';
import { compareTargets, parseSdgs, recommendationNumber, snapshotRows } from '../scripts/import-uhri-sdg.mjs';
import { reviewRows } from '../scripts/sdg-review.mjs';

const snapshot=JSON.parse(await readFile(new URL('../data/sdg/uhri-spain-upr4.json',import.meta.url),'utf8'));
const review=JSON.parse(await readFile(new URL('../data/sdg/hrct-review-spain-upr4.json',import.meta.url),'utf8'));

test('the catalogue holds the 17 goals and 169 targets of the 2030 Agenda, each with its official icon',async()=>{
  assert.deepEqual(sdgGoals.map(g=>g.number),Array.from({length:17},(_,i)=>i+1));
  // Targets per goal in A/RES/70/1.
  assert.deepEqual(sdgGoals.map(g=>g.targets.length),[7,8,13,10,9,8,5,12,8,10,10,11,5,10,12,12,19]);
  const codes=sdgGoals.flatMap(g=>g.targets.map(([code])=>code));
  assert.equal(codes.length,SDG_TARGET_COUNT);
  assert.equal(new Set(codes).size,SDG_TARGET_COUNT);
  for(const goal of sdgGoals) {
    assert.match(goal.color,/^#[0-9A-F]{6}$/);
    assert.ok(goal.name&&goal.title&&goal.relevance&&goal.slug);
    assert.deepEqual(goal.targets.map(([code])=>code),goal.targets.map(([code])=>code).sort(compareTargets));
    for(const [code,text] of goal.targets) {
      assert.equal(Number(code.split('.')[0]),goal.number);
      // No doubled spaces or footnote marks left over from the source document.
      assert.ok(text.length>30&&!/\s{2}|\p{L}\d+$/u.test(text),code);
    }
    for(const variant of ['inverse','filled']) await access(new URL(`../public${sdgIcon(goal.number,variant)}`,import.meta.url));
  }
  assert.equal(new Set(sdgGoals.map(g=>g.color)).size,17);
  assert.equal(targetText('16.b'),'Promover y aplicar leyes y políticas no discriminatorias en favor del desarrollo sostenible');
  assert.equal(targetText('16.z'),null);
});

test('UHRI labels are read as goals and targets, and a target brings its goal',()=>{
  assert.deepEqual(parseSdgs(['8 - Trabajo Descente y Crecimiento Económico','16.b - Promover y aplicar leyes no discriminatorias','16.10 - Libertades','16.3 - Justicia']),{goals:[8,16],targets:['16.3','16.10','16.b']});
  assert.deepEqual(parseSdgs([]),{goals:[],targets:[]});
  assert.throws(()=>parseSdgs(['Sin código']));
  assert.equal(recommendationNumber('50.12 Texto'),'50.12');
  assert.equal(recommendationNumber('<p>50.80 Texto con <span>marcado</span></p>'),'50.80');
});

test('the snapshot covers the whole catalogue and only uses goals and targets that exist',()=>{
  assert.equal(snapshot.symbol,'A/HRC/60/8');
  assert.deepEqual(snapshot.records.map(r=>r.number),Array.from({length:324},(_,i)=>`50.${i+1}`));
  for(const record of snapshot.records) {
    for(const code of record.targets) {
      assert.ok(targetText(code),`${record.number}: ${code}`);
      assert.ok(record.goals.includes(Number(code.split('.')[0])),`${record.number}: ${code}`);
    }
    for(const goal of record.goals) assert.ok(goal>=1&&goal<=17);
  }
});

test('summaries count recommendations per goal and per target, published ones only',()=>{
  const links=[
    {public_id:'T-2',goal:16,targets:['16.3','16.b']},{public_id:'T-1',goal:16,targets:['16.b']},{public_id:'T-1',goal:5,targets:[]},
    {public_id:'T-3',goal:16,targets:[]},{public_id:'T-9',goal:16,targets:['16.3']},
  ];
  const {goals,linked}=summarizeSdgs(['T-1','T-2','T-3','T-4'],links);
  assert.equal(goals.length,17);
  assert.equal(linked,3);
  const by=Object.fromEntries(goals.map(g=>[g.goal.number,g]));
  // The link to an unpublished recommendation (T-9) is not counted.
  assert.deepEqual(by[16].public_ids,['T-1','T-2','T-3']);
  assert.deepEqual(by[16].byTarget,{'16.3':['T-2'],'16.b':['T-1','T-2']});
  assert.deepEqual(by[16].withoutTarget,['T-3']);
  assert.deepEqual([by[5].public_ids,by[5].withoutTarget,by[5].byTarget],[['T-1'],['T-1'],{}]);
  assert.deepEqual(by[1].public_ids,[]);
  // Goals 16 and 5 share one recommendation (T-1).
  assert.deepEqual([by[16].shared,by[5].shared,by[1].shared],[[{goal:5,count:1}],[{goal:16,count:1}],[]]);
});

test('recommendations are counted under each key they carry, most frequent first',()=>{
  assert.deepEqual(countBy(['T-1','T-2','T-3'],{'T-1':['personal','political'],'T-2':['political'],'T-9':['economic']}),[{key:'political',count:2},{key:'personal',count:1}]);
  assert.deepEqual(countBy([],{}),[]);
});

test('dimensions and goals are crossed by the recommendations they share, published ones only',()=>{
  const link=(public_id,goal)=>({public_id,goal,targets:[]});
  const crossing=crossWithGoals(['T-1','T-2','T-3','T-4'],{'T-1':['personal','political'],'T-2':['personal'],'T-3':['economic'],'T-9':['economic']},[link('T-1',16),link('T-1',5),link('T-2',16),link('T-4',10),link('T-9',1)]);
  // T-1 counts in each of its four pairs; T-3 has no goal and T-4 no dimension; T-9 is not published.
  assert.deepEqual(crossing.pairs,[{key:'personal',goal:16,count:2},{key:'personal',goal:5,count:1},{key:'political',goal:5,count:1},{key:'political',goal:16,count:1}]);
  assert.deepEqual(crossing.keys,[{key:'personal',total:2},{key:'political',total:1}]);
  assert.deepEqual(crossing.goals,[{goal:5,total:1},{goal:16,total:2}]);
  assert.equal(crossing.both,2);
  assert.deepEqual(crossWithGoals(['T-1'],{},[]),{keys:[],goals:[],pairs:[],both:0});
});

test('the SDG migration publishes exactly the snapshot and is safe to run again',async()=>{
  const db=new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create table public.commitments(id uuid primary key default gen_random_uuid(),public_id text unique,publication_status text not null default 'published');
    insert into public.commitments(public_id) select 'ESP-UPR4-050.'||n from generate_series(1,324) n;
    update public.commitments set publication_status='draft' where public_id='ESP-UPR4-050.1';
  `);
  const sql=await readFile(new URL('../supabase/migrations/20261011_sdg_links.sql',import.meta.url),'utf8');
  await db.exec(sql);await db.exec(sql);
  const {rows}=await db.query(`select split_part(c.public_id,'.',2)::int n,s.goal,s.targets,s.source,s.source_published_at::text published from public.commitment_sdgs s join public.commitments c on c.id=s.commitment_id order by 1,2`);
  assert.deepEqual(rows.map(r=>({n:r.n,goal:r.goal,targets:r.targets})),snapshotRows(snapshot));
  assert.ok(rows.every(r=>r.source==='uhri'&&r.published===snapshot.published_on_uhri));
  // The public view leaves out recommendations that are not published.
  const {rows:[view]}=await db.query(`select count(*)::int n,count(*) filter (where public_id='ESP-UPR4-050.1')::int draft from public.hrct_public_sdgs`);
  assert.deepEqual(view,{n:rows.length-1,draft:0});
  // A target must belong to the goal of its row.
  await assert.rejects(db.query(`update public.commitment_sdgs set targets='{16.3,5.1}' where goal=16`));
  await assert.rejects(db.query(`update public.commitment_sdgs set targets='{16.33x}' where goal=16`));
  const {rows:grants}=await db.query(`select distinct privilege_type from information_schema.role_table_grants where grantee in ('anon','authenticated') and table_name in ('commitment_sdgs','hrct_public_sdgs')`);
  assert.deepEqual(grants.map(g=>g.privilege_type),['SELECT']);
  await db.close();
});

test('the HRCT review covers every recommendation, with existing targets and a reason for each link',()=>{
  assert.deepEqual(review.records.map(r=>r.number),Array.from({length:324},(_,i)=>`50.${i+1}`));
  for(const record of review.records) {
    // A recommendation without links says why.
    assert.ok(record.links.length||record.note,record.number);
    assert.deepEqual(record.links.map(l=>l.goal),[...new Set(record.links.map(l=>l.goal))].sort((a,b)=>a-b),record.number);
    for(const link of record.links) {
      assert.ok(link.goal>=1&&link.goal<=17&&/\S.*\.$/.test(link.rationale),`${record.number}: ${link.goal}`);
      assert.deepEqual(link.targets,[...new Set(link.targets)].sort(compareTargets),record.number);
      for(const code of link.targets) {
        assert.ok(targetText(code),`${record.number}: ${code}`);
        assert.equal(Number(code.split('.')[0]),link.goal,`${record.number}: ${code}`);
      }
    }
  }
  // Trafficking in persons is never linked to the target on trafficking in protected species.
  assert.ok(!review.records.some(r=>r.links.some(l=>l.targets.includes('15.7'))));
});

test('the review migration replaces the UHRI tagging with the review and is safe to run again',async()=>{
  const db=new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create table public.commitments(id uuid primary key default gen_random_uuid(),public_id text unique,publication_status text not null default 'published');
    insert into public.commitments(public_id) select 'ESP-UPR4-050.'||n from generate_series(1,324) n;
    insert into public.commitments(public_id) values ('OTHER-1');
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261011_sdg_links.sql',import.meta.url),'utf8'));
  // A link of another catalogue is left alone.
  await db.exec(`insert into public.commitment_sdgs(commitment_id,goal,targets) select id,15,'{15.7}' from public.commitments where public_id='OTHER-1'`);
  const sql=await readFile(new URL('../supabase/migrations/20261012_sdg_review.sql',import.meta.url),'utf8');
  await db.exec(sql);await db.exec(sql);
  const {rows}=await db.query(`select split_part(public_id,'.',2)::int n,goal,targets,rationale,source,reviewed_at::text reviewed from public.hrct_public_sdgs where public_id like 'ESP-UPR4-050.%' order by 1,2`);
  assert.deepEqual(rows.map(r=>({n:r.n,goal:r.goal,targets:r.targets,rationale:r.rationale})),reviewRows(review));
  assert.ok(rows.every(r=>r.source==='hrct'&&r.reviewed===review.reviewed_at));
  const {rows:[other]}=await db.query(`select count(*)::int n from public.hrct_public_sdgs where public_id='OTHER-1'`);
  assert.equal(other.n,1);
  await db.close();
});
