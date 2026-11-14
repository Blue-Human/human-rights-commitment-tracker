import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import { createProgrammeDatabase } from './programmes-fixture.mjs';
import { encodePartnerSession,decodePartnerSession } from '../src/lib/partners/cookie.ts';
const hash=value=>createHash('sha256').update(value).digest('hex');
const write=(db,table,values,id=null)=>db.query('select hrct_programmes_write($1,$2::uuid,$3::jsonb,$4) id',[table,id,JSON.stringify(values),'TEST-admin']).then(r=>r.rows[0].id);
const rpc=(db,name,values)=>db.query(`select ${name}(${values.map((_,i)=>'$'+(i+1)).join(',')}) result`,values).then(r=>r.rows[0].result);
async function setup(db) {
 const programme=await write(db,'programmes',{code:'TEST',name:'Test programme',internal_notes:'SECRET PROGRAMME'});
 const project=await write(db,'projects',{programme_id:programme,project_code:'TEST-1',title:'Assigned project',country:'Spain',country_code:'ES',total_budget:1000,internal_notes:'SECRET PROJECT',context:'SECRET CONTEXT'});
 const otherProject=await write(db,'projects',{programme_id:programme,project_code:'TEST-2',title:'Other project',country:'Spain',country_code:'ES'});
 const partner=await write(db,'partners',{legal_name:'Test org',display_name:'Test org',partner_type:'NGO',country:'Spain',contact_email:'SECRET@test.invalid'});
 const otherPartner=await write(db,'partners',{legal_name:'Other org',display_name:'Other org',partner_type:'NGO',country:'Spain'});
 const assignment=await write(db,'project_partners',{project_id:project,partner_id:partner,role:'implementing'});
 await write(db,'project_partners',{project_id:project,partner_id:otherPartner,role:'research',portal_access:true});
 const activity=await write(db,'project_activities',{project_id:project,activity_code:'1',title:'My activity',country:'Spain',activity_type:'research',responsible_partner_id:partner,internal_notes:'SECRET ACTIVITY'});
 const otherActivity=await write(db,'project_activities',{project_id:project,activity_code:'2',title:'Other activity',country:'Spain',activity_type:'research',responsible_partner_id:otherPartner});
 const id=randomUUID(),otherId=randomUUID();
 await db.exec('reset role'); await db.query('insert into auth.users values($1,$2),($3,$4)',[id,'user@test.invalid',otherId,'other@test.invalid']); await db.exec('set role service_role');
 await rpc(db,'hrct_partner_invite',[id,partner,'user@test.invalid','Test user',hash('invitation'),'TEST-admin']);
 await rpc(db,'hrct_partner_invite',[otherId,otherPartner,'other@test.invalid','Other user',hash('otherinvite'),'TEST-admin']);
 return {programme,project,otherProject,partner,otherPartner,assignment,activity,otherActivity,id,otherId};
}
test('partner cookies are signed, expire and cannot become admin sessions',()=>{
 const id=randomUUID(),secret='test-session-secret',now=100000;
 const cookie=encodePartnerSession(id,3,secret,now);
 assert.deepEqual(decodePartnerSession(cookie,secret,now+1),{id,version:3});
 assert.equal(decodePartnerSession(cookie,secret,now+12*60*60*1000),null);
 assert.equal(decodePartnerSession(cookie.replace('.3.','.4.'),secret,now),null);
 assert.equal(decodePartnerSession(cookie,'wrong',now),null);
 assert.equal(decodePartnerSession('1234.admin-signature',secret,now),null);
 assert.equal(decodePartnerSession(cookie+'.extra',secret,now),null);
});
test('one-use invitation leases, expiry, account revocation and private grants',async()=>{
 const db=await createProgrammeDatabase(); try {
  const s=await setup(db),claim=hash('claim');
  assert.deepEqual(await rpc(db,'hrct_partner_projects',[s.id]),[],'Unactivated account has no data');
  await assert.rejects(rpc(db,'hrct_partner_activation',[hash('unknown'),claim,'claim']),/unavailable/);
  await rpc(db,'hrct_partner_activation',[hash('invitation'),claim,'claim']);
  await assert.rejects(rpc(db,'hrct_partner_activation',[hash('invitation'),hash('race'),'claim']),/busy/);
  await assert.rejects(rpc(db,'hrct_partner_activation',[hash('invitation'),hash('wrong'),'finish']),/Invalid invitation claim/);
  await rpc(db,'hrct_partner_activation',[hash('invitation'),claim,'release']);
  await rpc(db,'hrct_partner_activation',[hash('invitation'),claim,'claim']);
  const active=await rpc(db,'hrct_partner_activation',[hash('invitation'),claim,'finish']);assert.equal(active.session_version,1);
  await assert.rejects(rpc(db,'hrct_partner_activation',[hash('invitation'),claim,'claim']),/unavailable/);
  await write(db,'project_partners',{portal_access:true},s.assignment);
  assert.equal((await rpc(db,'hrct_partner_projects',[s.id])).length,1);
  await rpc(db,'hrct_partner_account_status',[s.id,s.partner,false,'TEST-admin']);
  assert.deepEqual(await rpc(db,'hrct_partner_projects',[s.id]),[]);
  assert.equal((await db.query('select session_version from partner_accounts where id=$1',[s.id])).rows[0].session_version,2);
  await rpc(db,'hrct_partner_account_status',[s.id,s.partner,true,'TEST-admin']);
  await rpc(db,'hrct_partner_invite',[s.id,s.partner,'user@test.invalid','Test user',hash('expired'),'TEST-admin']);
  await db.query("select set_config('hrct.programme_actor','TEST-admin',false)");
  await db.query("update partner_invitations set expires_at=now()-interval '1 day' where token_hash=$1",[hash('expired')]);
  await assert.rejects(rpc(db,'hrct_partner_activation',[hash('expired'),claim,'claim']),/unavailable/);
  for(const role of ['anon','authenticated']) {
   await db.exec(`reset role;set role ${role}`);
   for(const table of ['partner_accounts','partner_invitations','project_evidence']) await assert.rejects(db.query(`select * from ${table}`),/permission denied/);
   for(const [name,args] of [['hrct_partner_projects',[s.id]],['hrct_partner_submit_evidence',[s.id,s.project,'{}']]]) await assert.rejects(rpc(db,name,args),/permission denied/);
  }
 } finally {await db.close();}
});
test('partner projection and submission enforce sharing, organization scope and State isolation',async()=>{
 const db=await createProgrammeDatabase(); try {
  const s=await setup(db);
  await rpc(db,'hrct_partner_activation',[hash('invitation'),hash('claim'),'claim']);await rpc(db,'hrct_partner_activation',[hash('invitation'),hash('claim'),'finish']);
  await write(db,'project_partners',{portal_access:true},s.assignment);
  const indicator=await write(db,'project_indicators',{project_id:s.project,name:'Shared indicator',indicator_type:'process',unit:'reports',source_of_verification:'SECRET SOURCE',partner_visibility:true});
  const initial=await write(db,'project_indicator_measurements',{project_id:s.project,indicator_id:indicator,value:0,source:'SECRET MEASUREMENT',measurement_date:'2026-01-01'});
  await write(db,'project_indicator_measurements',{project_id:s.project,indicator_id:indicator,value:2,source:'SECRET CORRECTION',measurement_date:'2026-01-01',supersedes_id:initial});
  const evidence=await write(db,'project_evidence',{project_id:s.project,title:'Shared evidence',evidence_type:'report',source:'Shared source',evidence_date:'2026-01-01',verification_status:'verified',confidentiality:'partner',notes:'SECRET EVIDENCE',file_reference:'SECRET FILE'});
  await write(db,'project_outputs',{project_id:s.project,title:'Hidden output'});
  await write(db,'project_outputs',{project_id:s.project,title:'Shared output',partner_visibility:true});
  let data=await rpc(db,'hrct_partner_project',[s.id,s.project]);assert.equal(data.evidence.length,0);
  await write(db,'project_evidence',{partner_visibility:true},evidence);
  data=await rpc(db,'hrct_partner_project',[s.id,s.project]);
  assert.doesNotMatch(JSON.stringify(data),/SECRET|total_budget|contact_email|internal_notes|verified_by|file_reference|Other activity|Hidden output/);
  assert.deepEqual(data.activities.map(a=>a.id),[s.activity]);assert.equal(data.indicators[0].current_value,2);
  assert.equal(data.indicators[0].baseline_value,null);assert.equal(data.indicators[0].target_value,null);
  assert.equal(data.evidence.length,1);assert.equal(data.outputs.length,1);
  assert.equal(await rpc(db,'hrct_partner_project',[s.id,s.otherProject]),null);
  const values={title:'My submission',evidence_type:'report',source:'Test source',evidence_date:'2026-01-01',activity_id:s.activity};
  await assert.rejects(rpc(db,'hrct_partner_submit_evidence',[s.id,s.otherProject,JSON.stringify(values)]),/access denied/);
  await assert.rejects(rpc(db,'hrct_partner_submit_evidence',[s.id,s.project,JSON.stringify({...values,verification_status:'verified'})]),/Unsupported/);
  await assert.rejects(rpc(db,'hrct_partner_submit_evidence',[s.id,s.project,JSON.stringify({...values,activity_id:s.otherActivity})]),/Activity access denied/);
  const submitted=await rpc(db,'hrct_partner_submit_evidence',[s.id,s.project,JSON.stringify(values)]);
  const row=(await db.query('select * from project_evidence where id=$1',[submitted])).rows[0];
  assert.equal(row.submitted_by_partner_user,s.id);assert.equal(row.uploaded_by,`partner:${s.id}`);assert.equal(row.verification_status,'pending');assert.equal(row.partner_visibility,false);assert.equal(row.public_visibility,false);
  data=await rpc(db,'hrct_partner_project',[s.id,s.project]);assert.equal(data.submissions.length,1);
  await rpc(db,'hrct_partner_activation',[hash('otherinvite'),hash('otherclaim'),'claim']);await rpc(db,'hrct_partner_activation',[hash('otherinvite'),hash('otherclaim'),'finish']);
  const otherData=await rpc(db,'hrct_partner_project',[s.otherId,s.project]);assert.equal(otherData.submissions.length,0);assert.deepEqual(otherData.activities.map(a=>a.id),[s.otherActivity]);
  await write(db,'project_evidence',{submitted_by_partner_user:s.otherId},submitted);
  assert.equal((await db.query('select submitted_by_partner_user from project_evidence where id=$1',[submitted])).rows[0].submitted_by_partner_user,s.id,'Origin cannot be overwritten');
  await write(db,'project_partners',{end_date:'2020-01-01'},s.assignment);
  assert.equal(await rpc(db,'hrct_partner_project',[s.id,s.project]),null);
  await write(db,'project_partners',{end_date:null},s.assignment);
  await write(db,'project_evidence',{description:'Changed content'},evidence);
  data=await rpc(db,'hrct_partner_project',[s.id,s.project]);assert.equal(data.evidence.length,0);
  await write(db,'project_partners',{portal_access:false},s.assignment);
  assert.equal(await rpc(db,'hrct_partner_project',[s.id,s.project]),null);
  await assert.rejects(rpc(db,'hrct_partner_submit_evidence',[s.id,s.project,JSON.stringify(values)]),/access denied/);
  assert.equal((await db.query('select status from assessments')).rows[0].status,'not_assessed');
  assert.equal((await db.query('select count(*)::int n from evidence')).rows[0].n,0);
 } finally {await db.close();}
});
