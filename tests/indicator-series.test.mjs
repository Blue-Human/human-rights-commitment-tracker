import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { change,comparable,connects,interpretation,isStale,scopeKey,seriesId,tableRows,target,valueLabel } from '../src/lib/indicators/series.ts';
import { normalizeSeed } from '../scripts/import-indicators.mjs';
// Synthetic data for calculations only. No production seed contains observations.
const component={id:'component',indicator_id:'indicator',frequency:'annual',unit:'%',value_type:'numeric',visualization:'line'};
const point=(year,numeric_value,extra={})=>({id:`fixture-${year}`,indicator_id:'indicator',component_id:'component',country_iso2:'ES',scope:{territory:'national',population:'all'},period_start:`${year}-01-01`,period_end:`${year}-12-31`,unit:'%',numeric_value,boolean_value:null,text_value:null,missing_reason:null,series_key:'test-series',methodology_version:'v1',break_before:false,...extra});
test('seed counts, derived fields, provenance and normalizations',async()=>{
  const seed=JSON.parse(await readFile(new URL('../data/indicators/spain-upr4.v1.json',import.meta.url)));
  const {payload,report}=normalizeSeed(seed);assert.deepEqual(report.errors,[]);
  assert.equal(payload.recommendations[0].indicator_count,0);assert.equal(payload.recommendations[0].indicator_codes,null);
  assert.ok(payload.links.every(l=>l.recommendation_title));
  assert.equal(payload.indicators.find(i=>i.indicator_code==='TRAF-001').normalizations.orientation,'neutral');
  assert.equal(payload.indicators.find(i=>i.indicator_type==='input').normalizations.indicator_type,'process');
  assert.deepEqual(payload.indicators[0].components.map(c=>c.unit),['EUR','FTE']);
  assert.ok(payload.links.every(l=>l.baseline_rule.includes('2025')));
  assert.equal('observations' in payload,false);
  const corrupted=structuredClone(seed);corrupted.blocks.links.rows[0][1]='UNKNOWN';assert.ok(normalizeSeed(corrupted).report.errors.length);
});
test('zero is a real observation and false is distinct from unknown',()=>{
  assert.equal(valueLabel(point(2024,0)),'0 %');assert.equal(valueLabel(point(2024,null,{boolean_value:false})),'No');
  assert.match(valueLabel(point(2024,null,{missing_reason:'Desconocido'})),/Desconocido/);
});
test('percentage points, relative change and initial zero',()=>{
  assert.equal(change([point(2023,10),point(2024,12)],component).absolute,2);
  assert.equal(change([point(2023,10),point(2024,12)],component).percentage,true);
  assert.equal(change([point(2023,0),point(2024,12)],{...component,unit:'nº'}).relative,null);
  assert.equal(change([point(2024,12)],component),null);
});
test('visible interpretations use comparable values, units and statistical scope',()=>{
  const indicator={code:'POV-001'};
  assert.match(interpretation([point(2023,12),point(2024,10)],component,indicator),/baja 2 puntos porcentuales.*reducción en riesgo de pobreza/);
  assert.doesNotMatch(interpretation([point(2022,12),point(2024,10)],component,indicator),/baja|sube|reducción/);
  assert.match(interpretation([point(2023,0),point(2024,0)],component,indicator),/se mantiene/);
  assert.match(interpretation([point(2023,10),point(2024,12)],component,{code:'RAC-001'}),/mayor denuncia o detección/);
  assert.match(interpretation([point(2020,290000,{unit:'nº'})],{...component,unit:'nº'},{code:'HOU-001'}),/aproximadamente 290.000 viviendas.*no permite/);
  assert.match(interpretation([point(2023,8847,{unit:'nº'}),point(2024,14371,{unit:'nº'})],{...component,unit:'nº'},{code:'HOU-005'}),/8847 en 2023 a 14.371 en 2024 \(\+5524 viviendas\).*no equivale a nuevas viviendas públicas/);
});
test('gaps and incompatible methodology never connect or produce a change',()=>{
  assert.equal(connects(point(2022,10),point(2024,12),'annual'),false);
  assert.equal(change([point(2022,10),point(2024,12)],component),null);
  assert.equal(change([point(2023,10),point(2024,12,{methodology_version:'v2'})],component),null);
  assert.equal(connects(point(2023,10),point(2024,12,{break_before:true}),'annual'),false);
  assert.equal(connects(point(2023,10),point(2024,12,{source_title:'New comparable source'}),'annual'),true);
  assert.equal(connects(point(2022,10),point(2024,12),'irregular'),true);
  assert.equal(connects(point(2022,10),point(2024,12),'biennial'),true);
  assert.equal(tableRows([point(2022,10),point(2024,12)],component)[1].gap,'2023');
  assert.equal(change([point(2022,10),point(2023,null,{missing_reason:'Unpublished survey'}),point(2024,12)],component),null);
});
test('country, component and normalized scope isolate series',()=>{
  assert.equal(scopeKey({a:'1',b:'2'}),scopeKey({b:'2',a:'1'}));
  assert.equal(comparable(point(2023,1),point(2024,2,{country_iso2:'FR'})),false);
  assert.notEqual(seriesId(point(2023,1)),seriesId(point(2023,1,{scope:{territory:'national',population:'women'}})));
  assert.equal(comparable(point(2023,1),point(2024,2,{component_id:'other'})),false);
});
test('documented targets apply only to exact component, scope and period',()=>{
  const baseline=point(2023,10),latest=point(2024,12);
  const link={target_value:12,target_upper:null,target_type:'absolute',target_operator:'>=',component_id:'component',scope:baseline.scope,target_date:'2024-12-31'};
  assert.equal(target(link,baseline,latest).achieved,true);
  assert.equal(target({...link,scope:{population:'women',territory:'national'}},baseline,latest).achieved,false);
  assert.equal(target({...link,target_date:'2023-12-31'},baseline,latest).achieved,false);
  assert.equal(target({...link,target_type:'relative',target_value:20},baseline,latest).lower,12);
  assert.equal(target({...link,target_type:'relative'},point(2023,0),latest),null);
  assert.equal(target({...link,target_type:'relative'},baseline,point(2024,12,{methodology_version:'v2'})),null);
  assert.equal(target({...link,target_value:null},baseline,latest),null);
});
test('staleness uses reference period and frequency',()=>{
  assert.equal(isStale(point(2024,10),'annual',new Date('2026-10-04')),true);
  assert.equal(isStale(point(2025,10),'annual',new Date('2026-10-04')),false);
  assert.equal(isStale(point(2020,10),'irregular',new Date('2026-10-04')),false);
});
