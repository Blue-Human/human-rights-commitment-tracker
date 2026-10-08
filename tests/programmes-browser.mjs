import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cp,mkdtemp,symlink,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { chromium } from 'playwright';
import { createProgrammeDatabase } from './programmes-fixture.mjs';
import { entities } from '../src/lib/programmes/model.ts';

// Real migrated PostgreSQL semantics behind an isolated PostgREST test adapter; no production data or keys.
const db=await createProgrammeDatabase();
const allowedTables=new Set([...Object.values(entities).map(e=>e.table),'programme_audit','commitments','partner_accounts']);
const dateFields=new Set(Object.values(entities).flatMap(e=>e.fields.filter(f=>f.type==='date').map(f=>f.name)));
const numericFields=new Set(Object.values(entities).flatMap(e=>e.fields.filter(f=>['number','integer'].includes(f.type)).map(f=>f.name)));
const authUsers=new Map();
const portalRpcs={hrct_partner_invite:['p_id','p_partner','p_email','p_name','p_hash','p_actor'],hrct_partner_activation:['p_hash','p_claim','p_operation'],hrct_partner_account_status:['p_id','p_partner','p_active','p_actor'],hrct_partner_projects:['p_account'],hrct_partner_project:['p_account','p_project'],hrct_partner_submit_evidence:['p_account','p_project','p_values']};
let privateRequests=0;
const api=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://127.0.0.1'),table=url.pathname.split('/').pop();
    let body='';for await(const chunk of req)body+=chunk;
    let result=[];
    if(url.pathname.startsWith('/auth/v1/')) {
      const a=JSON.parse(body);
      if(table==='token') {
        assert.equal(req.headers.apikey,'TEST-public-key');
        const user=[...authUsers.values()].find(u=>u.email===a.email&&u.password===a.password);
        if(!user)throw Error('Invalid credentials');result={user:{id:user.id}};
      } else {
        assert.equal(req.headers.apikey,'TEST-server-service-key');
        if(table==='users') {
          const id=randomUUID();authUsers.set(id,{id,...a});
          await db.exec('reset role');await db.query('insert into auth.users values($1,$2)',[id,a.email]);await db.exec('set role service_role');result={id};
        } else {const user=authUsers.get(table);assert.ok(user);user.password=a.password;result={id:table};}
      }
    } else if(portalRpcs[table]) {
      assert.equal(req.headers.apikey,'TEST-server-service-key');privateRequests++;
      const a=JSON.parse(body),args=portalRpcs[table].map(key=>key==='p_values'?JSON.stringify(a[key]):a[key]);
      result=(await db.query(`select ${table}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)).rows[0].result;
    } else if(table==='hrct_programmes_write') {
      assert.equal(req.headers.apikey,'TEST-server-service-key');privateRequests++;
      const a=JSON.parse(body);
      result=(await db.query('select hrct_programmes_write($1,$2::uuid,$3::jsonb,$4,$5) id',[a.p_entity,a.p_id,JSON.stringify(a.p_values),a.p_actor,a.p_operation])).rows[0].id;
    } else if(allowedTables.has(table)) {
      assert.equal(req.headers.apikey,'TEST-server-service-key');privateRequests++;
      const clauses=[],values=[];
      for(const [key,value] of url.searchParams) {
        if(['select','order','offset','limit'].includes(key))continue;
        assert.match(key,/^[a-z_]+$/);
        if(value==='is.null') clauses.push(`${key} is null`);
        else if(value.startsWith('eq.')) {values.push(value.slice(3));clauses.push(`${key}=$${values.length}`);}
        else throw Error(`Unsupported mock filter: ${value}`);
      }
      let sql=`select * from ${table}${clauses.length?` where ${clauses.join(' and ')}`:''}`;
      const order=url.searchParams.get('order')||'id.asc';
      sql+=` order by ${order.split(',').map(o=>{const [c,d]=o.split('.');assert.match(c,/^[a-z_]+$/);return `${c} ${d==='desc'?'desc':'asc'}`;}).join(',')}`;
      sql+=` limit ${Number(url.searchParams.get('limit')||500)} offset ${Number(url.searchParams.get('offset')||0)}`;
      result=(await db.query(sql,values)).rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,numericFields.has(k)&&v!==null?Number(v):dateFields.has(k)&&v!==null?(v instanceof Date?v.toISOString():String(v)).slice(0,10):v])));
      if(['project_commitments','activity_commitments','output_commitments'].includes(table)) {
        for(const row of result) {
          row.projects=(await db.query('select id,title,project_code from projects where id=$1',[row.project_id])).rows[0];
          if(row.activity_id)row.project_activities=(await db.query('select id,title from project_activities where id=$1',[row.activity_id])).rows[0];
          if(row.output_id)row.project_outputs=(await db.query('select id,title from project_outputs where id=$1',[row.output_id])).rows[0];
        }
      }
    } else if(table==='hrct_public_commitments') {
      result=(await db.query('select * from hrct_public_commitments')).rows.map(r=>({...r,country_iso2:'CO',country_name:'Colombia',country_slug:'colombia',mechanism_code:'UPR',recommendation_number:'TEST-043',acceptance_status:'accepted'}));
    } else if(table==='hrct_public_indicator_overview') result={cards:[],indicator_count:0,observation_count:0,recommendation_count:0};
    else if(table==='hrct_public_indicators') result={requirement:'not_required',links:[],indicators:[],components:[],values:[],latest:[],baselines:[],has_older:false};
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result));
  } catch(error) {res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({message:error.message,code:error.code}));}
});
const project=resolve('.'),sandbox=await mkdtemp(join(tmpdir(),'hrct-programmes-browser-'));
let next,browser,logs='';
try {
  await Promise.all(['src','public','package.json','tsconfig.json','next.config.ts','next-env.d.ts','eslint.config.mjs'].map(file=>cp(join(project,file),join(sandbox,file),{recursive:true})));
  await symlink(join(project,'node_modules'),join(sandbox,'node_modules'),'dir');
  await new Promise(r=>api.listen(0,'127.0.0.1',r));
  const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
  const env={PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${api.address().port}`,NEXT_PUBLIC_SUPABASE_ANON_KEY:'TEST-public-key',SUPABASE_SERVICE_ROLE_KEY:'TEST-server-service-key',ADMIN_USER:'TEST-admin',ADMIN_PASSWORD:'TEST-password',ADMIN_SESSION_SECRET:'TEST-isolated-long-session-secret'};
  const build=spawn(process.execPath,[join(project,'node_modules/next/dist/bin/next'),'build'],{cwd:sandbox,env,stdio:['ignore','pipe','pipe']});
  build.stdout.on('data',c=>logs+=c);build.stderr.on('data',c=>logs+=c);
  assert.equal(await new Promise(r=>build.on('exit',r)),0,logs);
  next=spawn(process.execPath,[join(project,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{cwd:sandbox,env,stdio:['ignore','pipe','pipe']});
  next.stdout.on('data',c=>logs+=c);next.stderr.on('data',c=>logs+=c);
  const base=`http://127.0.0.1:${port}`,root=`${base}/admin/programmes`;
  for(let n=0;n<100;n++){try{await fetch(`${base}/admin/login`);break;}catch{await new Promise(r=>setTimeout(r,200));}if(n===99)throw Error(logs);}
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const before=privateRequests;
  await page.goto(root);assert.match(page.url(),/\/admin\/login$/);assert.equal(privateRequests,before);
  await page.locator('[name="user"]').fill('TEST-admin');await page.locator('[name="password"]').fill('TEST-password');
  await Promise.all([page.waitForURL(`${base}/admin`),page.getByRole('button',{name:'Entrar',exact:true}).click()]);
  const selectForm=label=>page.locator('form').filter({has:page.getByRole('button',{name:label,exact:true})});
  async function fill(form,values) {
    for(const [key,value] of Object.entries(values)) {
      const input=form.locator(`[name="${key}"]`);assert.equal(await input.count(),1,`${key} field`);
      if(await input.evaluate(n=>n.tagName)==='SELECT')await input.selectOption(String(value));
      else await input.fill(String(value));
    }
  }
  async function create(section,label,values,query='') {
    console.log(`UI: create ${section}`);
    await page.goto(`${root}/${section}/new${query}`);
    const form=selectForm(`Crear ${label}`);await fill(form,values);
    await Promise.all([page.waitForURL(url=>url.pathname.startsWith(`/admin/programmes/${section}/`)&&!url.pathname.endsWith('/new')),form.getByRole('button',{name:`Crear ${label}`,exact:true}).click()]);
    return page.url().split('?')[0].split('/').pop();
  }
  const programme=await create('programmes','programa',{code:'DEMO-BH-HRIP',name:'DEMO Human Rights Implementation Programme',status:'active',internal_notes:'SECRET PROGRAMME NOTES'});
  const countryProject=await create('projects','proyecto',{programme_id:programme,project_code:'DEMO-BH-HRCT-COL-001',title:'DEMO Colombia UPR Pilot',country:'Colombia',country_code:'CO',status:'active',overall_objective:'DEMO independent monitoring',total_budget:2500,internal_notes:'SECRET BUDGET NOTES'});
  const q=`?project=${countryProject}`;
  const partner=await create('partners','partner',{legal_name:'DEMO legal NGO',display_name:'DEMO partner',partner_type:'NGO',country:'Colombia',contact_email:'SECRET@example.test'});
  await create('assignments','asignación de partner',{partner_id:partner,role:'implementing',lead_partner:'true',portal_access:'true'},q);
  const activity=await create('activities','actividad',{activity_code:'DEMO-A-001',title:'DEMO defenders workshop',activity_type:'workshop',country:'Colombia',responsible_partner_id:partner,actual_participants:50,planned_start_date:'2026-01-01'},q);
  const commitment=(await db.query('select id from commitments')).rows[0].id;
  await create('activity-commitments','relación con compromiso',{activity_id:activity,commitment_id:commitment,contribution_description:'DEMO contribution to independent monitoring'},q);
  const objective=await create('objectives','objetivo específico',{title:'DEMO strengthen monitoring'},q);
  const outcome=await create('outcomes','outcome',{title:'DEMO improved monitoring capacity',specific_objective_id:objective},q);
  const output=await create('outputs','producto',{title:'DEMO workshop delivered',activity_id:activity,achieved_value:1,unit:'workshop',partner_visibility:'true'},q);
  await create('output-outcomes','contribución',{output_id:output,outcome_id:outcome},q);
  const indicator=await create('indicators','indicador',{name:'DEMO organisations monitoring',indicator_type:'outcome',outcome_id:outcome,unit:'organisations',baseline_value:0,target_value:10,progress_method:'linear',source_of_verification:'DEMO survey',partner_visibility:'true'},q);
  // The existing indicator page contains an add-measurement form; zero is a real observation.
  const measureForm=selectForm('Crear medición');
  await fill(measureForm,{indicator_id:indicator,value:0,measurement_date:'2026-01-01',source:'DEMO initial survey'});
  await Promise.all([page.waitForURL(/\/measurements\//),measureForm.getByRole('button',{name:'Crear medición',exact:true}).click()]);
  const measurement=page.url().split('/').pop();
  await create('measurements','medición',{indicator_id:indicator,value:5,measurement_date:'2026-01-01',source:'DEMO corrected survey',supersedes_id:measurement},q);
  const ev=await create('evidence','evidencia',{title:'DEMO confidential evaluation',activity_id:activity,indicator_id:indicator,evidence_type:'evaluation',source:'DEMO partner evaluation',evidence_date:'2026-01-01',confidentiality:'restricted',notes:'SECRET EVIDENCE NOTES'},q);
  const privateEvidence=(await db.query('select * from project_evidence where id=$1',[ev])).rows[0];
  assert.equal(privateEvidence.public_visibility,false);assert.equal(privateEvidence.verified_by,null);
  const edit=selectForm('Guardar cambios');await fill(edit,{public_visibility:'true'});await edit.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await page.getByText('La selección pública requiere evidencia pública y verificada.',{exact:true}).waitFor();
  await fill(edit,{public_visibility:'false',verification_status:'verified'});await edit.getByRole('button',{name:'Guardar cambios',exact:true}).click();
  await page.getByText('Cambios guardados. Se ha conservado el historial.',{exact:true}).waitFor();
  assert.equal((await db.query('select verified_by from project_evidence where id=$1',[ev])).rows[0].verified_by,'TEST-admin');
  await page.goto(`${root}/projects/${countryProject}?tab=framework`);
  for(const name of ['DEMO strengthen monitoring','DEMO improved monitoring capacity','DEMO workshop delivered','DEMO defenders workshop','DEMO organisations monitoring']) assert.equal(await page.getByRole('link',{name,exact:true}).isVisible(),true,name);
  await page.screenshot({path:'/tmp/hrct-programmes-framework-desktop.png',fullPage:true});
  await page.goto(`${root}/projects/${countryProject}?tab=indicators`);
  const table=page.getByRole('table',{name:'Indicadores de proyecto'});assert.match(await table.innerText(),/50%/);assert.match(await table.innerText(),/DEMO organisations monitoring/);
  await page.goto(`${base}/admin/recommendations/TEST-COL-UPR-043`);
  assert.equal(await page.getByRole('link',{name:'DEMO defenders workshop',exact:true}).isVisible(),true);
  assert.equal((await db.query('select assessment_status from commitments')).rows[0].assessment_status,'not_assessed');
  await page.goto(`${root}/projects/${countryProject}?tab=evidence`);
  await page.getByLabel('Confidencialidad',{exact:true}).selectOption('restricted');
  assert.equal(await page.getByRole('table').getByText('DEMO confidential evaluation',{exact:true}).isVisible(),true);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'/tmp/hrct-programmes-evidence-mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Responsive page width');
  // An anonymous public view and search response never contain operational details or private contacts.
  const publicContext=await browser.newContext(),publicPage=await publicContext.newPage();
  for(const path of ['/commitments/TEST-COL-UPR-043','/api/search']) {
    const response=await publicPage.goto(`${base}${path}`);
    assert.doesNotMatch(await response.text(),/SECRET|DEMO-BH|DEMO partner|DEMO confidential|TEST-server-service-key/);
  }
  await publicPage.goto(`${root}/projects/${countryProject}`);assert.match(publicPage.url(),/\/admin\/login$/);
  await publicContext.close();
  console.log('UI: partner invitation, activation, submission and revocation');
  await page.goto(`${root}/partners/${partner}`);
  const invite=selectForm('Crear invitación');await fill(invite,{display_name:'DEMO invited person',email:'partner@example.test'});
  await invite.getByRole('button',{name:'Crear invitación',exact:true}).click();
  await page.getByText(/Invitación creada/).waitFor();
  const link=await page.getByLabel('Enlace de invitación').inputValue();assert.match(link,/partners\/activate\?token=[a-f0-9]{64}$/);
  const partnerContext=await browser.newContext({viewport:{width:390,height:844}}),partnerPage=await partnerContext.newPage();
  partnerPage.on('pageerror',e=>errors.push(e.message));
  await partnerPage.goto(`${base}/partners`);assert.match(partnerPage.url(),/partners\/login$/);
  await partnerPage.goto(link);
  await partnerPage.locator('[name="password"]').fill('TEST-partner-password');await partnerPage.locator('[name="confirmation"]').fill('TEST-partner-password');
  await Promise.all([partnerPage.waitForURL(`${base}/partners`),partnerPage.getByRole('button',{name:'Activar y entrar',exact:true}).click()]);
  await partnerPage.getByRole('heading',{name:'Mis proyectos'}).waitFor();
  await Promise.all([partnerPage.waitForURL(`${base}/partners/projects/${countryProject}`),partnerPage.getByRole('link',{name:'Abrir proyecto',exact:true}).click()]);
  await partnerPage.getByRole('heading',{name:'Tus actividades',exact:true}).waitFor();
  await partnerPage.getByRole('heading',{name:'DEMO Colombia UPR Pilot'}).waitFor();
  assert.doesNotMatch(await partnerPage.content(),/SECRET|total_budget|internal_notes|TEST-server-service-key|DEMO confidential evaluation|DEMO improved monitoring capacity/);
  assert.match(await partnerPage.locator('main').innerText(),/Valor actual: 5/);
  assert.equal(await partnerPage.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Portal responsive width');
  await partnerPage.screenshot({path:'/tmp/hrct-partners-project-mobile.png',fullPage:true});
  await partnerPage.locator('[name="title"]').fill('DEMO partner submission');await partnerPage.locator('[name="source"]').fill('DEMO partner report');
  await partnerPage.locator('[name="activity_id"]').selectOption(activity);await partnerPage.locator('[name="evidence_date"]').fill('2026-01-01');
  await partnerPage.getByRole('button',{name:'Enviar evidencia',exact:true}).click();await partnerPage.getByText(/Evidencia enviada/).waitFor();
  const submission=(await db.query("select * from project_evidence where title='DEMO partner submission'")).rows[0];
  assert.equal(submission.verification_status,'pending');assert.equal(submission.partner_visibility,false);assert.equal(submission.public_visibility,false);
  await page.goto(`${root}/evidence/${submission.id}`);
  const review=selectForm('Guardar cambios');await fill(review,{verification_status:'verified',partner_visibility:'true'});
  await review.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByText('Cambios guardados. Se ha conservado el historial.',{exact:true}).waitFor();
  await partnerPage.reload();assert.equal(await partnerPage.getByText('DEMO partner submission',{exact:true}).count(),2);
  await partnerPage.goto(`${root}/projects/${countryProject}`);assert.match(partnerPage.url(),/admin\/login$/);
  await partnerPage.goto(`${base}/partners/projects/00000000-0000-4000-8000-000000000000`);assert.equal(await partnerPage.getByRole('heading',{name:'Proyecto no disponible',exact:true}).count(),1);
  const replayContext=await browser.newContext(),replayPage=await replayContext.newPage();await replayPage.goto(link);
  await replayPage.locator('[name="password"]').fill('TEST-replayed-password');await replayPage.locator('[name="confirmation"]').fill('TEST-replayed-password');
  await replayPage.getByRole('button',{name:'Activar y entrar',exact:true}).click();await replayPage.getByText(/No se pudo activar/).waitFor();await replayContext.close();
  await partnerPage.goto(`${base}/partners`);await partnerPage.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await partnerPage.waitForURL(`${base}/partners/login`);
  await partnerPage.locator('[name="email"]').fill('partner@example.test');await partnerPage.locator('[name="password"]').fill('wrong-password');
  await partnerPage.getByRole('button',{name:'Entrar',exact:true}).click();await partnerPage.getByText(/Email o contraseña incorrectos/).waitFor();
  assert.equal(await partnerPage.locator('[name="email"]').inputValue(),'partner@example.test','Email persists after a failed login');
  await partnerPage.locator('[name="password"]').fill('TEST-partner-password');
  await Promise.all([partnerPage.waitForURL(`${base}/partners`),partnerPage.getByRole('button',{name:'Entrar',exact:true}).click()]);
  await page.goto(`${root}/partners/${partner}`);await page.getByRole('button',{name:'Desactivar acceso',exact:true}).click();await page.getByText(/Acceso desactivado\. Las sesiones/).waitFor();
  await partnerPage.reload();assert.match(partnerPage.url(),/partners\/login$/);await partnerContext.close();
  assert.deepEqual(errors,[]);console.log('Programmes browser: private access, programme/project CRUD, partner assignment, activities, results framework, commitments, measurement corrections, evidence verification, partner invitation/activation/submission/review/revocation and responsive UI passed.');
} catch(error) {console.error(logs.slice(-5000));throw error;}
finally {if(browser)await browser.close();if(next)next.kill('SIGTERM');await new Promise(r=>api.close(r));await db.close();await rm(sandbox,{recursive:true,force:true});}
