import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cp,mkdtemp,symlink,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { chromium } from 'playwright';
import { previewBundle,manyPreviewBundle } from './indicator-preview-fixtures.mjs';
import { loadHistory } from '../scripts/historical-indicators.mjs';

// Published source values, isolated identities and mocked API; never writes production.
const housing=await loadHistory(new URL('../data/indicators/history-housing-2026-10-04/',import.meta.url));
function housingBundle(allHistory) {
  const b=previewBundle(),base=b.values[0];
  b.indicators=housing.manifest.components.map(c=>({...b.indicators[0],id:c.indicator_code,code:c.indicator_code,name:c.indicator_code==='HOU-001'?'Parque de vivienda social/pública':'Producción/entrega de vivienda asequible'}));
  b.links=b.indicators.map((i,n)=>({...b.links[0],id:`test-housing-link-${n}`,indicator_id:i.id,role:n===0?'primary':'supporting'}));
  b.components=housing.manifest.components.map(c=>({...b.components[0],...c,id:`${c.indicator_code}-${c.component_code}`,code:c.component_code,indicator_id:c.indicator_code}));
  b.components.push({...b.components[0],id:'test-stock-percentage',code:'component-1',unit:'% stock',label:'Parque público · porcentaje del parque residencial'});
  b.values=housing.values.map((v,n)=>({...base,...v,id:`test-housing-point-${n}`,indicator_id:v.indicator_code,component_id:`${v.indicator_code}-${v.component_code}`}));
  b.latest=b.components.flatMap(c=>b.values.filter(v=>v.component_id===c.id).slice(-1));
  if(!allHistory)b.values=b.values.filter(v=>Number(v.period_start.slice(0,4))>=new Date().getUTCFullYear()-4);
  return b;
}

// A copied application, mock public API and fresh build cache. No .env or production keys.
const project=resolve('.'),sandbox=await mkdtemp(join(tmpdir(),'hrct-browser-'));
let next,browser;
const api=createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  const url=new URL(req.url,'http://127.0.0.1');let result=[];
  if(url.pathname.includes('rpc/hrct_public_indicator_overview')) {
    const b=previewBundle(),args=JSON.parse(body);
    b.indicators=b.indicators.map(i=>({...i,code:'POV-001'}));
    if(!args.p_all_history)b.values=b.values.filter(v=>Number(v.period_start.slice(0,4))>=new Date().getUTCFullYear()-4);
    result={observation_count:5,indicator_count:1,recommendation_count:1,first_period:'2015-01-01',last_period:'2025-12-31',cards:[{indicator_id:b.indicators[0].id,public_id:'FIXTURE-DATA',bundle:b}]};
  } else if(url.pathname.includes('rpc/hrct_public_indicators')) {
    const args=JSON.parse(body),id=args.p_public_id,b=previewBundle();
    if(id==='FIXTURE-NOT-REQUIRED')result={...b,requirement:'not_required',links:[],values:[],latest:[]};
    else if(id==='FIXTURE-PENDING')result={...b,requirement:'pending_review',links:[],values:[],latest:[]};
    else if(id.startsWith('FIXTURE-PROPOSAL'))result={...b,requirement:'pending_review',links:[],indicators:[],components:[],values:[],latest:[],baselines:[],has_older:false,annex:{origin:'TEST-synthetic-annex.xlsx',version:'TEST-v1',requirement:id==='FIXTURE-PROPOSAL-NONE'?'not_required':'required',reason:'Justificación sintética del anexo, nunca producción.',indicators:id==='FIXTURE-PROPOSAL-NONE'?[]:Array.from({length:id==='FIXTURE-PROPOSAL-MANY'?5:1},(_,i)=>({code:`TEST-PROP-${i}`,name:`Propuesta sintética ${i}`,description:'Definición sintética propuesta.',indicator_type:'process',role:'primary',unit:'EUR / FTE',frequency:'annual',preferred_sources:'Fuente candidata TEST',recommended_disaggregation:'Población sintética'}))}};
    else if(id==='FIXTURE-HOUSING')result=housingBundle(args.p_all_history);
    else if(id==='FIXTURE-NODATA')result={...b,values:[],latest:[],has_older:false};
    else if(id==='FIXTURE-MANY'){result=manyPreviewBundle();if(!args.p_all_history)result.values=result.values.filter(v=>Number(v.period_start.slice(0,4))>=new Date().getUTCFullYear()-4);}
    else if(id==='FIXTURE-UNDEFINED')result={...b,requirement:'required',links:[],values:[],latest:[],has_older:false};
    else if(id==='FIXTURE-BOOLEAN')result={...b,components:b.components.map(c=>({...c,value_type:'boolean',visualization:'timeline'})),values:b.values.slice(1,4).map((v,i)=>({...v,numeric_value:null,boolean_value:i===0?true:i===1?false:null,missing_reason:i===2?'Desconocido':null})),latest:[]};
    else if(id==='FIXTURE-ERROR'){res.writeHead(503);return res.end('{}');}
    else {result=b;if(!args.p_all_history)result.values=result.values.filter(v=>Number(v.period_start.slice(0,4))>=new Date().getUTCFullYear()-4);}
  } else if(url.pathname.includes('hrct_public_commitments')) result=[{id:'fixture-rec',public_id:url.searchParams.get('public_id')?.slice(3)||'FIXTURE-MULTI',title:'PRUEBA AISLADA · Datos sintéticos',original_text:'Fixture sintética, nunca producción.',country_iso2:'ES',country_name:'España',country_slug:'spain',mechanism_code:'UPR',mechanism_name:'EPU, cuarto ciclo',recommendation_number:'TEST',assessment_status:'not_assessed',acceptance_status:'accepted',published_at:'2026-01-01'}];
  // Synthetic SDG links: one goal with a target and one linked as a whole.
  else if(url.pathname.includes('hrct_public_sdgs')) result=['eq.FIXTURE-MULTI',null].includes(url.searchParams.get('public_id'))?[{public_id:'FIXTURE-MULTI',goal:5,targets:[],rationale:'Justificación sintética del objetivo 5.',reviewed_at:'2026-01-01'},{public_id:'FIXTURE-MULTI',goal:16,targets:['16.3'],rationale:'Justificación sintética del objetivo 16.',reviewed_at:'2026-01-01'}]:[];
  else if(url.searchParams.get('public_id')==='eq.FIXTURE-MULTI') {
    if(url.pathname.includes('hrct_public_evidence'))result=[{id:'test-evidence',evidence_type:'official_report',source_title:'Fuente documental sintética',source_url:'https://example.test/evidence',finding:'Conclusión documental de prueba.',reviewed_at:'2026-01-01'}];
    else if(url.pathname.includes('hrct_public_human_security'))result=[{code:'economic',name:'Seguridad económica',is_primary:true,rationale:'Justificación de seguridad humana sintética.'}];
    else if(url.pathname.includes('hrct_public_assessment_history'))result=[{id:'test-assessment-old',status:'limited_progress',is_current:false,rationale:'Valoración anterior sintética.',published_at:'2024-01-01'}, {id:'test-assessment-current',status:'not_assessed',is_current:true,published_at:'2026-01-01'}];
    else if(url.pathname.includes('hrct_public_monitoring'))result=['supports_need','supports_progress','contradicts_progress'].map((relation,n)=>({id:`test-monitoring-${n}`,public_id:'FIXTURE-MULTI',title:`Seguimiento sintético ${n}`,kind:'news',relation,url:'https://example.test/news',summary:'Resumen sintético.',status:'reviewed',published_at:'2026-01-01'}));
  }
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result));
});
try {
  await Promise.all(['src','public','package.json','tsconfig.json','next.config.ts','next-env.d.ts'].map(file=>cp(join(project,file),join(sandbox,file),{recursive:true})));
  await symlink(join(project,'node_modules'),join(sandbox,'node_modules'),'dir');
  await new Promise(r=>api.listen(0,'127.0.0.1',r));
  const apiPort=api.address().port;
  const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const webPort=socket.address().port;await new Promise(r=>socket.close(r));
  let logs='';
  const environment={PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${apiPort}`,NEXT_PUBLIC_SUPABASE_ANON_KEY:'TEST-synthetic-key',ADMIN_USER:'',ADMIN_PASSWORD:'',SUPABASE_SERVICE_ROLE_KEY:''};
  // Compile once, then test the deployed rendering mode without keeping a dev compiler in memory.
  const build=spawn(process.execPath,[join(project,'node_modules/next/dist/bin/next'),'build'],{cwd:sandbox,env:environment,stdio:['ignore','pipe','pipe']});
  build.stdout.on('data',chunk=>logs+=chunk);build.stderr.on('data',chunk=>logs+=chunk);
  assert.equal(await new Promise(r=>build.on('exit',r)),0,logs);
  next=spawn(process.execPath,[join(project,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(webPort)],{cwd:sandbox,env:environment,stdio:['ignore','pipe','pipe']});
  next.stdout.on('data',chunk=>logs+=chunk);next.stderr.on('data',chunk=>logs+=chunk);
  const base=`http://127.0.0.1:${webPort}`;
  for(let n=0;n<100;n++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,300));}if(n===99)throw new Error(logs);}
  browser=await chromium.launch({headless:true,args:['--disable-gpu']});
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(`${base}/commitments/FIXTURE-MULTI`);
  const section=page.locator('section[aria-labelledby="indicators-heading"]');
  await section.getByText('Indicador sintético de prueba',{exact:true}).waitFor();
  await section.getByText('Lectura de los datos',{exact:true}).waitFor();
  assert.equal(await section.getByText('Lectura de los datos',{exact:true}).isVisible(),true);
  assert.equal(await page.evaluate(()=>{
    const indicators=document.querySelector('section[aria-labelledby="indicators-heading"]');
    const assessment=[...document.querySelectorAll('h4')].find(h=>h.textContent==='Valoración del cumplimiento');
    return !!(assessment.compareDocumentPosition(indicators)&Node.DOCUMENT_POSITION_FOLLOWING);
  }),true);
  const recordNavigation=page.getByRole('navigation',{name:'Secciones de la recomendación'});
  assert.equal(await recordNavigation.getByRole('link').count(),4);
  assert.equal(await recordNavigation.getByRole('link',{name:'ODS y metas',exact:true}).getAttribute('href'),'#ods');
  // Related goals carry their official icon and only the related targets.
  const sdgs=page.locator('#ods');
  assert.equal(await sdgs.getByRole('img').count(),2);
  assert.equal(await sdgs.getByRole('img',{name:'ODS 16: Paz, justicia e instituciones sólidas'}).evaluate(async img=>{await img.decode();return img.naturalWidth===img.naturalHeight&&img.naturalWidth>0;}),true);
  assert.equal(await sdgs.getByText('Meta 16.3',{exact:true}).isVisible(),true);
  assert.equal(await sdgs.getByText('Promover el estado de derecho en los planos nacional e internacional y garantizar la igualdad de acceso a la justicia para todos',{exact:true}).isVisible(),true);
  assert.equal(await sdgs.getByText(/^Meta /).count(),1);
  assert.equal(await sdgs.getByText('Justificación sintética del objetivo 16.',{exact:true}).isVisible(),true);
  assert.equal(await sdgs.getByText('Relacionada con el objetivo en su conjunto, sin una meta concreta.',{exact:true}).count(),1);
  assert.equal(await recordNavigation.getByRole('link',{name:'Indicadores',exact:true}).getAttribute('href'),'#indicadores');
  const official=page.locator('summary').filter({hasText:'Texto oficial de Naciones Unidas'});
  await official.focus();await page.keyboard.press('Enter');
  assert.equal(await official.locator('..').getByText('Fixture sintética, nunca producción.',{exact:true}).isVisible(),true);
  await page.keyboard.press('Enter');
  assert.equal(await official.locator('..').getByText('Fixture sintética, nunca producción.',{exact:true}).isVisible(),false);
  assert.equal(await page.locator('#valoracion').isVisible(),true);
  assert.equal(await page.getByText('Fuente documental sintética',{exact:true}).isVisible(),true);
  const dimensions=page.locator('summary').filter({hasText:'Dimensiones de seguridad humana'});
  await dimensions.click();assert.equal(await page.getByText('Justificación de seguridad humana sintética.',{exact:true}).isVisible(),true);
  const followup=page.locator('summary').filter({hasText:'Actualidad y contexto'});
  await followup.click();
  for(const title of ['Por qué sigue siendo pertinente','Posibles avances en el cumplimiento','Novedades en sentido contrario'])assert.equal(await page.getByRole('heading',{name:title,exact:true}).isVisible(),true);
  const history=page.locator('summary').filter({hasText:'Historial de valoraciones'});
  await history.click();assert.equal(await page.getByText('Valoración anterior sintética.',{exact:true}).isVisible(),true);
  const header=page.locator('header');
  assert.equal(await header.evaluate(node=>getComputedStyle(node).borderBottomColor),'rgb(0, 163, 224)');
  assert.equal(await header.getByRole('link',{name:'Recomendaciones',exact:true}).getAttribute('aria-current'),'location');
  assert.equal(await section.locator('svg circle').count(),3);
  assert.equal(await section.locator('svg circle').first().evaluate(node=>getComputedStyle(node).fill),'rgb(0, 163, 224)');
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
  // On a phone the bar stays one row high and the sections live in a side menu.
  assert.equal(await header.getByRole('link',{name:'Recomendaciones',exact:true}).count(),0);
  assert.ok((await header.boundingBox()).height<=64);
  await header.getByRole('button',{name:'Abrir el menú'}).click();
  const menu=page.getByRole('dialog',{name:'Menú'});
  // Four sections and the four entries of «Sobre el HRCI», which the side menu shows open.
  assert.equal(await menu.getByRole('link').count(),8);
  assert.equal(await menu.getByRole('group',{name:'Sobre el HRCI'}).getByRole('link').count(),4);
  assert.equal(await menu.getByRole('link',{name:'Recomendaciones',exact:true}).getAttribute('aria-current'),'location');
  await page.keyboard.press('Escape');await menu.waitFor({state:'detached'});
  // The chart is drawn at the width of the phone, so its text keeps its size, and a point answers to the band around it.
  const drawing=section.locator('figure svg').first();
  await page.waitForFunction(()=>Number(document.querySelector('section[aria-labelledby="indicators-heading"] figure svg').getAttribute('viewBox').split(' ')[2])<=390);
  const scale=await drawing.evaluate(node=>node.getBoundingClientRect().width/Number(node.getAttribute('viewBox').split(' ')[2]));
  assert.ok(scale>.94&&scale<1.06,String(scale));
  await drawing.locator('rect.reach').last().click();
  assert.match(await section.locator('figcaption').first().textContent(),/Fuente sintética aislada/);
  assert.equal(await drawing.locator('circle.active').count(),1);
  // The observations table becomes one block per observation, each cell under the name of its column.
  await section.locator('summary').filter({hasText:'Ver datos y metodología'}).first().click();
  const table=section.getByRole('table').first();
  assert.equal(await table.getByRole('row').nth(1).evaluate(node=>getComputedStyle(node).display),'block');
  assert.equal(await table.locator('td[data-label]').first().evaluate(node=>getComputedStyle(node,'::before').content),'"Valor"');
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
  const housingView=await scenario('FIXTURE-HOUSING');
  await housingView.section.getByText('Parque de vivienda social/pública',{exact:true}).waitFor();
  assert.equal(await housingView.section.getByLabel('Histórico',{exact:true}).inputValue(),'all');
  assert.equal(await housingView.section.locator('figure svg').count(),2);
  assert.equal(await housingView.section.locator('figure svg circle').count(),11);
  assert.equal(await housingView.section.getByText('Lectura de los datos',{exact:true}).count(),2);
  assert.match(await housingView.section.innerText(),/290.000 viviendas/);
  assert.match(await housingView.section.innerText(),/no equivale a nuevas viviendas públicas/);
  assert.doesNotMatch(await housingView.section.innerText(),/Sin mediciones publicadas\./);
  assert.equal(await housingView.view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await housingView.section.scrollIntoViewIfNeeded();await housingView.view.screenshot({path:'/tmp/hrct-housing-preview-mobile.png'});
  await housingView.view.setViewportSize({width:1280,height:900});await housingView.section.scrollIntoViewIfNeeded();await housingView.view.screenshot({path:'/tmp/hrct-housing-preview-desktop.png'});
  await housingView.view.close();
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
  const overview=await browser.newPage({viewport:{width:390,height:844}});
  overview.on('pageerror',error=>pageErrors.push(error.message));
  await overview.goto(`${base}/indicators`);await overview.getByRole('heading',{name:'Datos e históricos'}).waitFor();
  await overview.getByText('Indicador sintético de prueba',{exact:true}).waitFor();
  assert.equal(await overview.locator('figure svg circle').count(),3);
  assert.equal(await overview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await overview.getByRole('link',{name:'Todo el histórico',exact:true}).click();
  await overview.waitForURL('**/indicators?history=all');
  await overview.getByText('Indicador sintético de prueba',{exact:true}).waitFor();
  assert.equal(await overview.locator('figure svg circle').count(),4);
  assert.equal(await overview.getByRole('link',{name:/Ver recomendación/}).count(),1);
  await overview.goto(base);await overview.getByRole('heading',{name:'Seguimiento de los compromisos de derechos humanos'}).waitFor();
  assert.equal(await overview.getByRole('heading',{name:'España en datos'}).count(),0);
  assert.equal(await overview.locator('figure svg circle').count(),0);
  await overview.close();
  const admin=await browser.newPage();await admin.goto(`${base}/admin/indicators`,{waitUntil:'commit'});await admin.waitForURL('**/admin/login');assert.match(admin.url(),/\/admin\/login$/);await admin.close();
  const goals=await browser.newPage();goals.on('pageerror',error=>pageErrors.push(error.message));
  await goals.goto(`${base}/ods`);
  // The 17 official icons select a goal; the panel shows how the recommendations relate to it.
  assert.equal(await goals.getByRole('button',{name:/^ODS \d+: /}).count(),17);
  const relations=goals.getByRole('region',{name:/^ODS \d+: /});
  await goals.getByRole('button',{name:/^ODS 2: /}).click();
  assert.equal(await goals.getByRole('button',{name:/^ODS 2: /}).getAttribute('aria-pressed'),'true');
  await relations.getByText('Ninguna recomendación del examen se relaciona con este objetivo',{exact:true}).waitFor();
  await goals.getByRole('button',{name:/^ODS 16: /}).click();
  assert.equal(await relations.getByRole('link',{name:/^16\.3/}).getAttribute('href'),'/ods/16#meta-16.3');
  assert.equal(await relations.getByRole('img',{name:'ODS 16: Paz, justicia e instituciones sólidas'}).evaluate(async img=>{await img.decode();return img.naturalWidth===1500&&img.naturalHeight===1500;}),true);
  await relations.getByRole('link',{name:'Ver objetivo y recomendaciones'}).click();await goals.waitForURL('**/ods/16');
  assert.equal(await goals.getByRole('heading',{level:1}).textContent(),'Paz, justicia e instituciones sólidas');
  assert.equal(await goals.locator('[id="meta-16.3"]').getByRole('link',{name:'PRUEBA AISLADA · Datos sintéticos'}).getAttribute('href'),'/commitments/FIXTURE-MULTI#ods');
  assert.equal(await goals.locator('[id^="meta-16."]').count(),12);
  assert.equal((await goals.goto(`${base}/ods/18`)).status(),404);
  await goals.goto(`${base}/commitments/FIXTURE-NODATA`);
  assert.equal(await goals.locator('#ods').getByText(/no relaciona esta recomendación con ningún Objetivo de Desarrollo Sostenible/).count(),1);
  await goals.close();
  assert.deepEqual(pageErrors,[]);
  console.log('Chromium: desktop/mobile, keyboard points, data table, scopes, history, empty states, errors, SDG pages and protected admin verified.');
} finally {
  await browser?.close();next?.kill('SIGTERM');
  await new Promise(r=>api.close(r));await rm(sandbox,{recursive:true,force:true});
}
