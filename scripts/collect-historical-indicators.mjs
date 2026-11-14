import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {components,eurostatSeries} from '../data/indicators/historical-sources.mjs';
import {extractJsonStat} from './historical-indicators.mjs';

// Explicit refresh only: capture official responses; never publish automatically.
const root=new URL('../data/indicators/history-2026-10-04/',import.meta.url);
await mkdir(new URL('sources/',root),{recursive:true});
const retrieved_at=new Date().toISOString(),sources=[],series=[];
for (const [index,s] of eurostatSeries.entries()) {
  const {subtract,...mapping}=s;
  const filters={...s.filters};
  if(subtract) for(const key of Object.keys(subtract)) delete filters[key];
  const url=new URL(`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${s.dataset}`);
  url.search=new URLSearchParams({lang:'EN',sinceTimePeriod:'2015',...filters}).toString();
  const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
  if(!response.ok) throw new Error(`Eurostat ${s.dataset}: ${response.status}`);
  const raw=await response.text(),data=JSON.parse(raw),filename=`sources/eurostat-${index+1}.json`;
  await writeFile(new URL(filename,root),raw+'\n');
  const source={file:filename,url:url.href,sha256:createHash('sha256').update(raw+'\n').digest('hex'),retrieved_at,publication_date:data.updated.slice(0,10),title:`Eurostat · ${s.dataset}`,metadata_url:data.extension?.annotation?.find(a=>a.type==='ESMS_HTML')?.href};
  sources.push(source);
  const points=extractJsonStat(data,s.filters),other=subtract?new Map(extractJsonStat(data,{...s.filters,...subtract}).map(p=>[p.year,p])):null;
  const observations=points.map(point=>{
    const second=other?.get(point.year); if(other&&!second) return null;
    return {year:point.year,value:second?Number((point.value-second.value).toFixed(3)):point.value,flags:[...new Set((point.flags+(second?.flags||'')).split(''))].sort().join('')};
  }).filter(Boolean);
  if(observations.length<2)throw new Error(`Serie insuficiente ${s.indicator_code}`);
  series.push({...mapping,subtract,source:filename,observations});
  console.log(`${s.indicator_code} · ${observations.length} valores`);
}
// Reviewed HTML tables: strictly require a closed annual budget and the labelled
// recognised-obligations column. Historical pages with ambiguous year/date are excluded.
const observations=[];
for(const year of [2020,2022,2023,2024,2025]) {
  const url=`https://www.defensordelpueblo.es/transparencia/informacion-economica-presupuestaria-y-contractual/presupuestos/ejecucion-${year}/`;
  const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error(`Defensor ${response.status}`);
  const raw=await response.text(),clean=t=>t.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
  const row=[...raw.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].find(m=>clean(m[1]).includes(`TOTAL PRESUPUESTO ${year}`));
  if(!row||!clean(raw).includes(`31 de diciembre de ${year}`))throw new Error('Periodo presupuestario ambiguo');
  const cells=[...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>clean(m[1]));
  const date=clean(raw).match(/Última actualización: (\d+) de (\w+) de (\d{4})/);
  const months={enero:'01',febrero:'02',marzo:'03',abril:'04',mayo:'05',junio:'06',julio:'07',agosto:'08',septiembre:'09',octubre:'10',noviembre:'11',diciembre:'12'};
  if(cells.length!==4||!date||!months[date[2]])throw new Error('Tabla o fecha no verificable');
  const value=Number(cells[2].replace(/[^\d,.-]/g,'').replaceAll('.','').replace(',','.'));
  const filename=`sources/defensor-${year}.json`,snapshot=JSON.stringify({year,columns:['Total','Dotación final','Obligaciones reconocidas','Disponible'],cells,last_updated:date[0]},null,2)+'\n';
  await writeFile(new URL(filename,root),snapshot);
  sources.push({file:filename,url,sha256:createHash('sha256').update(snapshot).digest('hex'),retrieved_at,publication_date:`${date[3]}-${months[date[2]]}-${date[1].padStart(2,'0')}`,title:'Defensor del Pueblo · ejecución presupuestaria',original_html_sha256:createHash('sha256').update(raw).digest('hex')});
  observations.push({year,value,source:filename,flags:''});
}
series.push({indicator_code:'INST-001',component_code:'component-1',scope:{territory:'national',population:'Defensor del Pueblo'},observations,comparability_notes:'Misma clasificación presupuestaria y obligaciones reconocidas al cierre anual; páginas oficiales distintas por ejercicio. Euros nominales. No se enlaza el salto por ausencia de 2021.'});
// This PDF was checked through the browser; direct downloads are blocked by the
// publisher. Preserve the explicit manual extraction, not a hash of a block page.
const interior=JSON.parse(await readFile(new URL('../data/indicators/interior-reviewed-2025.json',import.meta.url),'utf8'));
for(const {component_code,observations,printed_page:page} of interior.tables) {
  const file=`sources/interior-${component_code}.json`,raw=JSON.stringify({extraction:interior.extraction,printed_page:page,observations},null,2)+'\n';
  await writeFile(new URL(file,root),raw);
  sources.push({file,url:interior.url,sha256:createHash('sha256').update(raw).digest('hex'),retrieved_at:interior.retrieved_at,publication_date:interior.publication_date,title:`Ministerio del Interior · informe de odio 2025 · p. ${page}`});
  series.push({indicator_code:'RAC-001',component_code,scope:{territory:'national',population:'all'},source:file,observations,comparability_notes:'Hechos conocidos, incluidos delitos, infracciones e incidentes. Las categorías registradas evolucionan; más detección o denuncia no prueba mayor prevalencia.'});
}
await writeFile(new URL('manifest.json',root),JSON.stringify({version:'official-history-2026-10-04',country_iso2:'ES',retrieved_at,components,sources,series},null,2)+'\n');
