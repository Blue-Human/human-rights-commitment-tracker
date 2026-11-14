import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entities } from '../src/lib/programmes/model.ts';
import { createProgrammeDatabase as fixture } from './programmes-fixture.mjs';
const actor='TEST internal admin';

const write=(db,table,values,id=null,operation='save')=>db.query('select hrct_programmes_write($1,$2::uuid,$3::jsonb,$4,$5) id',[table,id,JSON.stringify(values),actor,operation]).then(r=>r.rows[0].id);
async function core(db) {
  const programme=await write(db,'programmes',{code:'DEMO-HRIP',name:'DEMO programme',status:'active',internal_notes:'SECRET PROGRAMME'});
  const project=await write(db,'projects',{programme_id:programme,project_code:'DEMO-COL-001',title:'DEMO Colombia pilot',country:'Colombia',country_code:'CO',status:'active',internal_notes:'SECRET PROJECT',total_budget:1200});
  const partner=await write(db,'partners',{legal_name:'DEMO NGO',display_name:'DEMO partner',partner_type:'NGO',country:'Colombia',contact_email:'private@example.test',internal_notes:'SECRET PARTNER'});
  const assignment=await write(db,'project_partners',{project_id:project,partner_id:partner,role:'implementing',lead_partner:true});
  const activity=await write(db,'project_activities',{project_id:project,activity_code:'DEMO-A-1',title:'DEMO workshop',activity_type:'workshop',country:'Colombia',responsible_partner_id:partner,actual_participants:50});
  const objective=await write(db,'project_specific_objectives',{project_id:project,title:'DEMO monitoring capacity',position:1});
  const output=await write(db,'project_outputs',{project_id:project,activity_id:activity,title:'DEMO workshop delivered',achieved_value:1,unit:'workshop'});
  const outcome=await write(db,'project_outcomes',{project_id:project,specific_objective_id:objective,title:'DEMO contribution to monitoring capacity',level:'immediate',risks:'PRIVATE RISK'});
  const resultLink=await write(db,'project_output_outcomes',{project_id:project,output_id:output,outcome_id:outcome});
  const indicator=await write(db,'project_indicators',{project_id:project,outcome_id:outcome,name:'DEMO capacity indicator',indicator_type:'outcome',unit:'organisations',baseline_value:0,target_value:10,progress_method:'linear',source_of_verification:'DEMO survey'});
  const evidence=await write(db,'project_evidence',{project_id:project,activity_id:activity,output_id:output,indicator_id:indicator,title:'DEMO survey evidence',evidence_type:'survey',source:'Isolated test fixture',evidence_date:'2026-01-01',confidentiality:'restricted',notes:'SECRET EVIDENCE'});
  const measurement=await write(db,'project_indicator_measurements',{project_id:project,indicator_id:indicator,value:0,measurement_date:'2026-01-01',source:'DEMO survey',evidence_id:evidence});
  return {programme,project,partner,assignment,activity,objective,output,outcome,resultLink,indicator,evidence,measurement};
}
test('cooperation CRUD, normalized results, commitment contributions and State assessment isolation',async()=>{
  const db=await fixture();try {
    const uncovered=(await db.query(`select c.conname from pg_constraint c where c.contype='f'
      and c.conrelid in (select oid from pg_class where relname=any($1)) and not exists(
        select 1 from pg_index i where i.indrelid=c.conrelid and i.indisvalid and i.indpred is null
        and c.conkey <@ (i.indkey::smallint[])[0:cardinality(c.conkey)-1])`,[Object.values(entities).map(e=>e.table)])).rows;
    assert.deepEqual(uncovered,[],'Every programme FK has a covering index');
    const before=(await db.query('select row_to_json(c) snapshot from commitments c')).rows;
    const ids=await core(db),commitment=(await db.query('select id from commitments')).rows[0].id;
    for(const [table,extra] of [['project_commitments',{}],['activity_commitments',{activity_id:ids.activity}],['output_commitments',{output_id:ids.output}]]) await write(db,table,{project_id:ids.project,commitment_id:commitment,contribution_description:'DEMO contribution, not causal attribution',...extra});
    await write(db,'project_activities',{status:'completed'},ids.activity);
    await write(db,'projects',{status:'paused'},ids.project);
    const group=await write(db,'programme_target_groups',{name:'DEMO civil society organisations'});
    await write(db,'project_target_groups',{project_id:ids.project,target_group_id:group});
    await write(db,'activity_target_groups',{project_id:ids.project,activity_id:ids.activity,target_group_id:group});
    assert.deepEqual((await db.query('select row_to_json(c) snapshot from commitments c')).rows,before);
    assert.equal((await db.query('select count(*)::int n from assessments')).rows[0].n,1);
    assert.equal((await db.query('select count(*)::int n from evidence')).rows[0].n,0);
    assert.ok((await db.query("select count(*)::int n from programme_audit where entity='projects'")).rows[0].n>=2);
    const record=(await db.query('select * from projects where id=$1',[ids.project])).rows[0];
    assert.equal(record.created_by,actor);assert.equal(record.updated_by,actor);assert.ok(record.created_at);assert.ok(record.updated_at);
    // Soft deletion keeps relationships and audit snapshots and permits a new active link.
    await write(db,'project_output_outcomes',{},ids.resultLink,'archive');
    assert.ok((await db.query('select archived_at from project_output_outcomes where id=$1',[ids.resultLink])).rows[0].archived_at);
    await write(db,'project_output_outcomes',{project_id:ids.project,output_id:ids.output,outcome_id:ids.outcome});
    await assert.rejects(db.query('delete from projects'),/permission denied|Archive records/);
    await assert.rejects(db.query('update programme_audit set recorded_by=\'tampered\''),/permission denied|immutable/);
    await assert.rejects(write(db,'assessments',{status:'implemented'}),/Unknown programme entity/);
    await assert.rejects(write(db,'projects',{created_by:'forged'},ids.project),/Unsupported field/);
    await assert.rejects(write(db,'projects',{status:'made_up'},ids.project),/check constraint/);
    await assert.rejects(write(db,'projects',{end_date:'2025-01-01',start_date:'2026-01-01'},ids.project),/check constraint/);
    await assert.rejects(write(db,'project_activities',{actual_participants:-1},ids.activity),/check constraint/);
    await assert.rejects(write(db,'project_outputs',{project_id:ids.project,title:'DEMO invalid no unit',achieved_value:0}),/check constraint/);
  } finally {await db.close();}
});
test('cross-project relationships and measurements are constrained; corrections and history remain immutable',async()=>{
  const db=await fixture();try {
    const ids=await core(db);
    const other=await write(db,'projects',{programme_id:ids.programme,project_code:'DEMO-OTHER',title:'DEMO other country',country:'France',country_code:'FR'});
    const otherOutput=await write(db,'project_outputs',{project_id:other,title:'DEMO other output'});
    const wrongPartner=await write(db,'partners',{legal_name:'DEMO other NGO',display_name:'DEMO other',partner_type:'NGO',country:'France'});
    await assert.rejects(write(db,'project_activities',{project_id:ids.project,activity_code:'DEMO-FAIL',title:'DEMO',activity_type:'training',country:'Colombia',responsible_partner_id:wrongPartner}),/foreign key/);
    for(const [table,values] of [
      ['project_outputs',{project_id:other,activity_id:ids.activity,title:'DEMO cross-project'}],
      ['project_outcomes',{project_id:other,specific_objective_id:ids.objective,title:'DEMO cross-project'}],
      ['project_output_outcomes',{project_id:other,output_id:otherOutput,outcome_id:ids.outcome}],
      ['project_indicators',{project_id:other,outcome_id:ids.outcome,name:'DEMO cross-project',unit:'n',indicator_type:'outcome',source_of_verification:'DEMO'}],
      ['project_evidence',{project_id:other,activity_id:ids.activity,title:'DEMO cross-project',evidence_type:'report',source:'DEMO',evidence_date:'2026-01-01'}],
      ['project_indicator_measurements',{project_id:other,indicator_id:ids.indicator,value:2,measurement_date:'2026-01-01',source:'DEMO'}],
    ]) await assert.rejects(write(db,table,values),/foreign key/);
    await assert.rejects(write(db,'project_indicator_measurements',{value:999},ids.measurement),/immutable/);
    await assert.rejects(write(db,'project_indicators',{unit:'percent'},ids.indicator),/immutable/);
    const correction=await write(db,'project_indicator_measurements',{project_id:ids.project,indicator_id:ids.indicator,value:2,measurement_date:'2026-01-01',source:'Corrected DEMO survey',supersedes_id:ids.measurement});
    assert.equal((await db.query('select count(*)::int n from project_indicator_measurements')).rows[0].n,2);
    assert.equal((await db.query('select value,recorded_by from project_indicator_measurements where id=$1',[ids.measurement])).rows[0].value,'0');
    await assert.rejects(write(db,'project_indicator_measurements',{project_id:ids.project,indicator_id:ids.indicator,value:3,measurement_date:'2026-01-01',source:'DEMO',supersedes_id:ids.measurement}),/unique constraint/);
    await assert.rejects(write(db,'project_indicator_measurements',{project_id:ids.project,indicator_id:ids.indicator,value:3,measurement_date:'2026-01-02',source:'DEMO',supersedes_id:correction}),/same indicator and measurement date/);
    await assert.rejects(write(db,'project_indicator_measurements',{project_id:ids.project,indicator_id:ids.indicator,value:3,measurement_date:'2099-01-01',source:'DEMO'}),/future/);
    await assert.rejects(write(db,'project_indicator_measurements',{project_id:ids.project,indicator_id:ids.indicator,value:'NaN',measurement_date:'2026-01-01',source:'DEMO'}),/check constraint/);
  } finally {await db.close();}
});
test('private-by-default evidence, review provenance, and no anon/authenticated access to any new table or write RPC',async()=>{
  const db=await fixture();try {
    const ids=await core(db);
    let ev=(await db.query('select * from project_evidence where id=$1',[ids.evidence])).rows[0];
    assert.equal(ev.public_visibility,false);assert.equal(ev.uploaded_by,actor);assert.equal(ev.verified_by,null);
    await assert.rejects(write(db,'project_evidence',{public_visibility:true},ids.evidence),/check constraint/);
    await write(db,'project_evidence',{confidentiality:'public',verification_status:'verified',public_visibility:true},ids.evidence);
    ev=(await db.query('select * from project_evidence where id=$1',[ids.evidence])).rows[0];
    assert.equal(ev.verified_by,actor);assert.ok(ev.verified_at);
    // Edits to verified content invalidate verification; visibility can never leak edited content.
    await write(db,'project_evidence',{description:'Edited DEMO description'},ids.evidence);
    ev=(await db.query('select * from project_evidence where id=$1',[ids.evidence])).rows[0];
    assert.equal(ev.verification_status,'requires_review');assert.equal(ev.public_visibility,false);
    await write(db,'project_evidence',{verification_status:'verified'},ids.evidence);
    for(const role of ['anon','authenticated']) {
      await db.exec(`reset role;set role ${role}`);
      for(const table of [...Object.values(entities).map(e=>e.table),'programme_audit']) {
        for(const sql of [`select * from ${table}`,table==='programme_audit'?`insert into ${table} default values`:`insert into ${table}(id) values(gen_random_uuid())`,table==='programme_audit'?`update ${table} set operation='DELETE'`:`update ${table} set id=gen_random_uuid()`,`delete from ${table}`]) await assert.rejects(db.query(sql),/permission denied/,`${role}: ${sql}`);
      }
      await assert.rejects(write(db,'programmes',{name:'PUBLIC attack'}),/permission denied/);
      const publicRows=(await db.query('select * from hrct_public_commitments')).rows;
      assert.doesNotMatch(JSON.stringify(publicRows),/SECRET|PRIVATE|private@example|DEMO workshop|total_budget|internal_notes/);
      await assert.rejects(db.query("select nextval('programme_audit_id_seq')"),/permission denied/);
    }
    // Even accidental SELECT grants cannot open the RLS tables: no public/partner policy exists.
    await db.exec('reset role;grant select on projects,project_evidence to anon;set role anon');
    assert.equal((await db.query('select * from projects')).rows.length,0);
    assert.equal((await db.query('select * from project_evidence')).rows.length,0);
  } finally {await db.close();}
});
