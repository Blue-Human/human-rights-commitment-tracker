import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cp,mkdtemp,symlink,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { chromium } from 'playwright';
import { previewBundle,manyPreviewBundle } from './indicator-preview-fixtures.mjs';

// A copied application, mock public API and fresh build cache. No .env or production keys.
const project=resolve('.'),sandbox=await mkdtemp(join(tmpdir(),'hrct-browser-'));
let next,browser;
const api=createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  const url=new URL(req.url,'http://127.0.0.1');let result=[];
  if(url.pathname.includes('rpc/hrct_public_indicators')) {
    const args=JSON.parse(body),id=args.p_public_id,b=previewBundle();
    if(id==='FIXTURE-NOT-REQUIRED')result={...b,requirement:'not_required',links:[],values:[],latest:[]};
    else if(id==='FIXTURE-PENDING')result={...b,requirement:'pending_review',links:[],values:[],latest:[]};
    else if(id.startsWith('FIXTURE-PROPOSAL'))result={...b,requirement:'pending_review',links:[],indicators:[],components:[],values:[],latest:[],baselines:[],has_older:false,annex:{origin:'TEST-synthetic-annex.xlsx',version:'TEST-v1',requirement:id==='FIXTURE-PROPOSAL-NONE'?'not_required':'required',reason:'Justificación sintética del anexo, nunca producción.',indicators:id==='FIXTURE-PROPOSAL-NONE'?[]:Array.from({length:id==='FIXTURE-PROPOSAL-MANY'?5:1},(_,i)=>({code:`TEST-PROP-${i}`,name:`Propuesta sintética ${i}`,description:'Definición sintética propuesta.',indicator_type:'process',role:'primary',unit:'EUR / FTE',frequency:'annual',preferred_sources:'Fuente candidata TEST',recommended_disaggregation:'Población sintética'}))}};
    else if(id==='FIXTURE-NODATA')result={...b,values:[],latest:[],has_older:false};
    else if(id==='FIXTURE-MANY'){result=manyPreviewBundle();if(!args.p_all_history)result.values=result.values.filter(v=>Number(v.period_start.slice(0,4))>=new Date().getUTCFullYear()-4);}
    else if(id==='FIXTURE-UNDEFINED')result={...b,requirement:'required',links:[],values:[],latest:[],has_older:false};
    else if(id==='FIXTURE-BOOLEAN')result={...b,components:b.components.map(c=>({...c,value_type:'boolean',visualization:'timeline'})),values:b.values.slice(1,4).map((v,i)=>({...v,numeric_value:null,boolean_value:i===0?true:i===1?false:null,missing_reason:i===2?'Desconocido':null})),latest:[]};
    else if(id==='FIXTURE-ERROR'){res.writeHead(503);return res.end('{}');}
    else {result=b;if(!args.p_all_history)result.values=result.values.filter(v=>Number(v.period_start.slice(0,4))>=new Date().getUTCFullYear()-4);}
  } else if(url.pathname.includes('hrct_public_commitments')) result=[{id:'fixture-rec',public_id:url.searchParams.get('public_id')?.slice(3)||'FIXTURE-MULTI',title:'PRUEBA AISLADA · Datos sintéticos',original_text:'Fixture sintética, nunca producción.',country_iso2:'ES',country_name:'España',country_slug:'spain',mechanism_code:'UPR',mechanism_name:'EPU, cuarto ciclo',recommendation_number:'TEST',assessment_status:'not_assessed',acceptance_status:'accepted',published_at:'2026-01-01'}];
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result));
});
try {
  await Promise.all(['src','public','package.json','tsconfig.json','next.config.ts','next-env.d.ts'].map(file=>cp(join(project,file),join(sandbox,file),{recursive:true})));
  await symlink(join(project,'node_modules'),join(sandbox,'node_modules'),'dir');
  await new Promise(r=>api.listen(0,'127.0.0.1',r));
  const apiPort=api.address().port;
  const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const webPort=socket.address().port;await new Promise(r=>socket.close(r));
  let logs='';
  next=spawn(process.execPath,[join(project,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(webPort)],{cwd:sandbox,env:{PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${apiPort}`,NEXT_PUBLIC_SUPABASE_ANON_KEY:'TEST-synthetic-key',ADMIN_USER:'',ADMIN_PASSWORD:'',SUPABASE_SERVICE_ROLE_KEY:''},stdio:['ignore','pipe','pipe']});
  next.stdout.on('data',chunk=>logs+=chunk);next.stderr.on('data',chunk=>logs+=chunk);
  const base=`http://127.0.0.1:${webPort}`;
  for(let n=0;n<100;n++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,300));}if(n===99)throw new Error(logs);}
  browser=await chromium.launch({headless:true,args:['--disable-gpu']});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(`${base}/commitments/FIXTURE-MULTI`);
  const section=page.locator('section[aria-labelledby="indicators-heading"]');
  await section.getByText('Indicador sintético de prueba',{exact:true}).waitFor();
  assert.equal(await section.locator('svg circle').count(),3);
  const circle=section.locator('svg circle').first();await circle.focus();
  await section.locator('figcaption').filter({hasText:'Fuente sintética aislada'}).waitFor();
  assert.match(await section.locator('figcaption').textContent(),/Fuente sintética aislada/);
  await section.locator('summary').filter({hasText:'Ver datos y metodología'}).click();
  assert.match(await section.locator('table').textContent(),/Sin observación para este periodo esperado/);
  await section.getByLabel('Población y territorio').selectOption({label:'Mujeres · Nacional'});
  assert.match(await section.textContent(),/Una observación disponible/);assert.match(await section.textContent(),/0 %/);
  await section.getByLabel('Histórico',{exact:true}).selectOption('all');
  await section.getByLabel('Histórico',{exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('section[aria-labelledby="indicators-heading"] select')?.value==='all');
  await section.getByLabel('Población y territorio').selectOption({label:'Toda la población · Nacional'});
  assert.equal(await section.locator('svg circle').count(),4);
  await section.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/hrct-indicators-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await section.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/hrct-indicators-mobile.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.close();
  async function scenario(id) {
    const view=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    view.on('pageerror',error=>pageErrors.push(error.message));
    await view.goto(`${base}/commitments/${id}`);
    return {view,section:view.locator('section[aria-labelledby="indicators-heading"]')};
  }
  for(const [id,message] of [['FIXTURE-NOT-REQUIRED','Esta recomendación se verifica mediante acciones y evidencia documental'],['FIXTURE-UNDEFINED','No hay indicadores publicados para esta recomendación.'],['FIXTURE-PENDING','No hay indicadores publicados para esta recomendación.'],['FIXTURE-NODATA','Sin mediciones publicadas'],['FIXTURE-ERROR','No se pudieron cargar los indicadores.']]) {
    const {view,section:state}=await scenario(id);await state.getByText(message,{exact:false}).first().waitFor();
    if(id==='FIXTURE-ERROR'){await state.getByRole('button',{name:'Reintentar'}).click();await state.getByText(message,{exact:false}).waitFor();}
    await view.close();
  }
  const many=await scenario('FIXTURE-MANY');await many.section.getByRole('button',{name:'Ver los 1 indicadores restantes'}).click();await many.section.getByText('Indicador sintético 4',{exact:true}).waitFor();assert.equal(await many.section.locator('figure svg').count(),5);await many.view.close();
  const boolean=await scenario('FIXTURE-BOOLEAN');await boolean.section.getByText(/Dato no disponible: Desconocido/).first().waitFor();assert.equal(await boolean.section.locator('figure svg').count(),0);await boolean.view.close();
  const approved=await scenario('FIXTURE-NODATA');
  await approved.section.getByText('Indicador sintético de prueba',{exact:true}).waitFor();
  assert.doesNotMatch(await approved.section.innerText(),/pendiente|sin validar|propuest[oa]/i);
  assert.equal(await approved.section.getByLabel('Histórico',{exact:true}).count(),0);
  await approved.section.locator('summary').filter({hasText:'Ver datos y metodología'}).click();
  assert.doesNotMatch(await approved.section.innerText(),/pendiente|sin validar|propuest[oa]/i);
  assert.equal(await approved.section.locator('figure svg').count(),0);
  assert.equal(await approved.view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await approved.section.scrollIntoViewIfNeeded();await approved.view.screenshot({path:'/tmp/hrct-approved-indicator-mobile.png'});
  await approved.view.setViewportSize({width:1280,height:900});await approved.view.screenshot({path:'/tmp/hrct-approved-indicator-desktop.png'});
  await approved.view.close();
  // Unpublished annex data is no longer rendered by the public UI.
  const draft=await scenario('FIXTURE-PROPOSAL');await draft.section.getByText('No hay indicadores publicados para esta recomendación.',{exact:true}).waitFor();assert.equal(await draft.section.getByText('Propuesta sintética 0',{exact:true}).count(),0);await draft.view.close();
  const admin=await browser.newPage();await admin.goto(`${base}/admin/indicators`,{waitUntil:'commit'});await admin.waitForURL('**/admin/login');assert.match(admin.url(),/\/admin\/login$/);await admin.close();
  assert.deepEqual(pageErrors,[]);
  console.log('Chromium: desktop/mobile, keyboard points, data table, scopes, history, empty states, errors and protected admin verified.');
} finally {
  await browser?.close();next?.kill('SIGTERM');
  await new Promise(r=>api.close(r));await rm(sandbox,{recursive:true,force:true});
}
