import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadHistory,extractJsonStat} from '../scripts/historical-indicators.mjs';

test('official snapshots retain real values, units, derivations and methodological breaks',async()=>{
  const {manifest,values}=await loadHistory();
  assert.equal(values.length,239);
  const series=(code,component='default')=>values.filter(v=>v.indicator_code===code&&v.component_code===component);
  assert.equal(series('EDU-001').find(v=>v.period_start==='2025-01-01'&&v.scope.population==='all').numeric_value,12.8);
  assert.equal(series('INST-001','component-1').at(-1).numeric_value,21082664.49);
  assert.equal(series('DEV-001').find(v=>v.period_start==='2018-01-01').break_before,true);
  assert.equal(series('EDU-001').find(v=>v.period_start==='2021-01-01').break_before,true);
  assert.equal(series('DIS-001').find(v=>v.period_start==='2024-01-01').break_before,true);
  assert.deepEqual(series('DIG-003').map(v=>v.period_start.slice(0,4)),['2021','2023','2025']);
  assert.equal(manifest.components.find(c=>c.indicator_code==='DIG-003').frequency,'biennial');
  assert.equal(series('RAC-001','known-count').at(-1).numeric_value,2417);
  assert.equal(series('RAC-001').at(-1).numeric_value,4.92);
  assert.ok(series('POV-002').every(v=>v.scope.age==='Menores de 18 años'&&v.unit==='% menores'));
  assert.ok(values.every(v=>v.country_iso2==='ES'&&v.source_url.startsWith('https:')&&!Object.hasOwn(v,'target_value')));
});
test('JSON-stat decoding refuses omitted dimensions and retains missing cells as gaps',()=>{
  const fixture={class:'dataset',id:['geo','unit','time'],size:[1,1,3],dimension:{geo:{category:{index:{ES:0}}},unit:{category:{index:{PC:0}}},time:{category:{index:{2020:0,2021:1,2022:2}}}},value:{0:0,2:12.5},status:{2:'b'}};
  assert.deepEqual(extractJsonStat(fixture,{geo:'ES',unit:'PC'}),[{year:2020,value:0,flags:''},{year:2022,value:12.5,flags:'b'}]);
  assert.throws(()=>extractJsonStat(fixture,{geo:'ES'}),/dimension unit/);
  assert.throws(()=>extractJsonStat(fixture,{geo:'FR',unit:'PC'}),/dimension geo/);
});
test('housing capture distinguishes estimated public stock from annual protected completions',async()=>{
  const {values}=await loadHistory(new URL('../data/indicators/history-housing-2026-10-04/',import.meta.url));
  assert.equal(values.length,11);
  const stock=values.filter(v=>v.indicator_code==='HOU-001'),flow=values.filter(v=>v.indicator_code==='HOU-005');
  assert.equal(stock.length,1);assert.equal(stock[0].numeric_value,290000);
  assert.equal(stock[0].period_start,'2020-01-01');assert.match(stock[0].quality_notes,/Estimación/);
  assert.equal(flow.at(-1).numeric_value,14371);assert.equal(flow.at(-2).numeric_value,8847);
  assert.match(flow[0].comparability_notes,/venta y alquiler/);
  assert.ok(values.every(v=>v.unit==='nº' && !Object.hasOwn(v,'target_value')));
  assert.equal(values.some(v=>v.unit==='% stock'),false);
});
