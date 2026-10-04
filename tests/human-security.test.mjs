import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { dimensionCodes, formatShare, summarizeDimensions } from '../src/lib/hrct.ts';

// Synthetic records for the calculations only.
const rec=(n,extra={})=>({public_id:`TEST-${n}`,acceptance_status:'accepted',assessment_status:'not_assessed',is_priority:false,...extra});
const link=(n,code,is_primary=false)=>({public_id:`TEST-${n}`,code,name:`Dimensión ${code}`,is_primary});

test('dimension summaries count each recommendation once per dimension and report overlaps',()=>{
  const commitments=[rec(1),rec(2,{acceptance_status:'noted',is_priority:true}),rec(3,{acceptance_status:'partially_accepted',assessment_status:'limited_progress'}),rec(4,{assessment_status:'unable_to_assess'})];
  const links=[link(1,'personal',true),link(1,'technological'),link(2,'personal',true),link(2,'political'),link(3,'technological',true),link(3,'personal'),link(4,'political',true),link(9,'personal')];
  const summary=summarizeDimensions(commitments,links,{technological:'Descripción de prueba.'},{'TEST-1':2,'TEST-4':1});
  assert.deepEqual(summary.map(d=>d.code),[...dimensionCodes]);
  const by=Object.fromEntries(summary.map(d=>[d.code,d]));
  // The link to an unpublished recommendation (TEST-9) is not counted.
  assert.deepEqual([by.personal.total,by.personal.primary,by.personal.accepted,by.personal.partiallyAccepted,by.personal.noted],[3,2,1,1,1]);
  assert.deepEqual([by.personal.priority,by.personal.assessed,by.personal.monitored],[1,1,1]);
  assert.deepEqual(by.personal.overlaps,[{code:'technological',count:2},{code:'political',count:1}]);
  assert.equal(by.political.assessed,0);
  assert.equal(by.technological.description,'Descripción de prueba.');
  assert.deepEqual([by.food.total,by.food.overlaps.length,by.food.name],[0,0,'Seguridad alimentaria']);
  assert.equal(formatShare(303,324),'93,5 %');
  assert.equal(formatShare(1,0),'—');
});

test('the technological-security migration adds one further dimension and is safe to run again',async()=>{
  const db=new PGlite();
  await db.exec(`
    create schema if not exists public;
    create table public.commitments(id uuid primary key default gen_random_uuid(),public_id text unique);
    create table public.human_security_dimensions(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,description text,sort_order integer not null default 0);
    create table public.commitment_human_security(commitment_id uuid not null references public.commitments(id),dimension_id uuid not null references public.human_security_dimensions(id),is_primary boolean not null default false,rationale text,primary key(commitment_id,dimension_id));
    insert into public.commitments(public_id) select 'ESP-UPR4-050.'||n from generate_series(1,324) n;
    insert into public.human_security_dimensions(code,name,sort_order) values ('personal','Seguridad personal',5);
    insert into public.commitment_human_security(commitment_id,dimension_id,is_primary) select c.id,d.id,true from public.commitments c, public.human_security_dimensions d;
  `);
  const sql=await readFile(new URL('../supabase/migrations/20261010_technological_security.sql',import.meta.url),'utf8');
  await db.exec(sql);await db.exec(sql);
  const {rows:[dimension]}=await db.query(`select name,sort_order from public.human_security_dimensions where code='technological'`);
  assert.deepEqual(dimension,{name:'Seguridad tecnológica',sort_order:8});
  const {rows:[links]}=await db.query(`select count(*)::int n, count(*) filter (where h.is_primary)::int primaries, count(*) filter (where coalesce(h.rationale,'')='')::int without_rationale from public.commitment_human_security h join public.human_security_dimensions d on d.id=h.dimension_id where d.code='technological'`);
  assert.deepEqual(links,{n:24,primaries:0,without_rationale:0});
  // Every recommendation keeps exactly one primary dimension.
  const {rows:[primaries]}=await db.query(`select count(*)::int n from public.commitment_human_security where is_primary`);
  assert.equal(primaries.n,324);
  await db.close();
});
