import { test } from 'node:test';
import assert from 'node:assert/strict';
import { currentMeasurement,indicatorProgress,parseValues,entityFor,valueLabel } from '../src/lib/programmes/model.ts';
const form=values=>{const f=new FormData();for(const [k,v] of Object.entries(values))if(v!==null&&v!==undefined)f.set(k,String(v));return f;};
const project='10000000-0000-0000-0000-000000000001';
test('MEL progress requires an explicit comparable linear method and complete real data',()=>{
  const i={baseline_value:0,target_value:10,progress_method:'linear'};
  assert.equal(indicatorProgress(i,0),0);assert.equal(indicatorProgress(i,5),50);
  assert.equal(indicatorProgress({...i,progress_method:'none'},5),null);
  assert.equal(indicatorProgress({...i,target_value:0},5),null);
  assert.equal(indicatorProgress({...i,baseline_value:null},5),null);
  assert.equal(indicatorProgress(i,null),null);assert.equal(indicatorProgress(i,NaN),null);
  assert.equal(indicatorProgress({baseline_value:20,target_value:10,progress_method:'linear'},15),50);
  assert.equal(indicatorProgress(i,15),150);assert.equal(indicatorProgress(i,-1),-10);
  assert.equal(valueLabel('current_value',null),'Datos no disponibles');
});
test('current measurements use observation dates and correction chains, not entry order',()=>{
  const m=(id,date,value,created_at,supersedes_id=null)=>({id,indicator_id:'i',measurement_date:date,value,created_at,supersedes_id});
  const values=[m('a','2026-01-01',0,'2026-01-01'),m('b','2026-02-01',2,'2026-02-01'),m('c','2026-01-01',9,'2026-03-01','a'),m('d','2026-02-01',3,'2026-03-02','b')];
  assert.equal(currentMeasurement(values,'i').id,'d');assert.equal(currentMeasurement(values,'other'),null);
  assert.equal(currentMeasurement([m('zero','2026-01-01',0,'2026-01-01')],'i').value,0);
});
test('server form validation allowlists fields, IDs, enum states, numbers, dates and evidence privacy',()=>{
  assert.equal(entityFor('__proto__'),null);
  const programme=parseValues('programmes',form({code:'DEMO',name:'DEMO programme',status:'active',created_by:'forged'}));
  assert.equal(programme.name,'DEMO programme');assert.equal('created_by' in programme,false);
  const p=parseValues('projects',form({programme_id:project,project_code:'DEMO',title:'DEMO',country:'Colombia',country_code:'co',status:'concept',funding_status:'unfunded',currency:'eur'}));
  assert.equal(p.country_code,'CO');assert.equal(p.currency,'EUR');assert.equal(p.total_budget,null);
  assert.throws(()=>parseValues('projects',form({...p,programme_id:'bad'})),/registro válido/);
  assert.throws(()=>parseValues('projects',form({...p,status:'fake'})),/opción inválida/);
  assert.throws(()=>parseValues('projects',form({...p,total_budget:-1})),/número inválido/);
  assert.throws(()=>parseValues('programmes',form({code:'DEMO',name:'DEMO',status:'draft',start_date:'2026-02-30'})),/fecha inválida/);
  const e={project_id:project,title:'DEMO',evidence_type:'report',source:'DEMO',evidence_date:'2026-01-01',verification_status:'pending',confidentiality:'restricted',public_visibility:'true'};
  assert.throws(()=>parseValues('evidence',form(e)),/evidencia pública y verificada/);
  assert.equal(parseValues('evidence',form({...e,public_visibility:'false'})).public_visibility,false);
  const i={project_id:project,name:'DEMO',indicator_type:'output',unit:'n',source_of_verification:'DEMO',progress_method:'linear',target_value:10};
  assert.throws(()=>parseValues('indicators',form(i)),/base y meta/);
  assert.equal(parseValues('indicators',form({...i,baseline_value:0})).baseline_value,0);
});
