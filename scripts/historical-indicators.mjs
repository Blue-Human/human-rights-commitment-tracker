import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export function extractJsonStat(data,filters) {
  if(data.class!=='dataset'||data.id.length!==data.size.length)throw new Error('Invalid JSON-stat dataset');
  if(Object.keys(filters).some(k=>!data.id.includes(k)))throw new Error('Unknown dimension');
  const index=(dimension,code)=>{const categories=data.dimension[dimension].category.index;return Array.isArray(categories)?categories.indexOf(code):categories[code];};
  for(const dimension of data.id.filter(k=>k!=='time'))if(!Object.hasOwn(filters,dimension)||index(dimension,filters[dimension])===undefined||index(dimension,filters[dimension])<0)throw new Error(`Missing or invalid dimension ${dimension}`);
  const years=data.dimension.time.category.index,entries=Array.isArray(years)?years.map((y,i)=>[y,i]):Object.entries(years);
  return entries.sort((a,b)=>Number(a[0])-Number(b[0])).flatMap(([year,timeIndex])=>{
    const offset=data.id.reduce((n,key,i)=>n*data.size[i]+(key==='time'?timeIndex:index(key,filters[key])),0);
    const value=data.value?.[offset];if(value===undefined||value===null)return [];
    if(!Number.isFinite(value)||!/^\d{4}$/.test(year))throw new Error('Invalid observation');
    return [{year:Number(year),value,flags:data.status?.[offset]||''}];
  });
}
const quoted=value=>value===null||value===undefined?'NULL':`'${String(value).replaceAll("'","''")}'`;
export async function loadHistory(root=new URL('../data/indicators/history-2026-10-04/',import.meta.url)) {
  const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
  const files=new Map();
  for(const s of manifest.sources) {
    if(!/^sources\/[a-z\d-]+\.json$/.test(s.file)||new URL(s.url).protocol!=='https:')throw new Error('Invalid source');
    const raw=await readFile(new URL(s.file,root),'utf8');
    if(createHash('sha256').update(raw).digest('hex')!==s.sha256)throw new Error('Source checksum mismatch');
    files.set(s.file,JSON.parse(raw));
  }
  if(manifest.country_iso2!=='ES')throw new Error('Unexpected country');
  const components=new Map(manifest.components.map(c=>[`${c.indicator_code}|${c.component_code}`,c])),keys=new Set(),values=[];
  for(const series of manifest.series) {
    const c=components.get(`${series.indicator_code}|${series.component_code}`);
    if(!c||!series.scope.territory||!series.scope.population||Object.values(series.scope).some(v=>typeof v!=='string'||!v.trim())||['country','country_iso2','component_id'].some(k=>k in series.scope))throw new Error('Invalid component/scope');
    let segment='initial',previousDefinition=false;
    const points=[...series.observations].sort((a,b)=>a.year-b.year);
    const original=series.dataset?extractJsonStat(files.get(series.source),series.filters):null;
    const second=series.subtract?extractJsonStat(files.get(series.source),{...series.filters,...series.subtract}):null;
    for (const [index,p] of points.entries()) {
      const s=manifest.sources.find(source=>source.file===(p.source||series.source));
      if(!s||!Number.isInteger(p.year)||p.year<2015||p.year>2025||!Number.isFinite(p.value)||!/^[bdepurs]*$/.test(p.flags))throw new Error('Invalid sourced observation');
      if(original) {
        const a=original.find(v=>v.year===p.year),b=second?.find(v=>v.year===p.year);
        if(!a||second&&!b||p.value!==(b?Number((a.value-b.value).toFixed(3)):a.value)||p.flags!==[...new Set((a.flags+(b?.flags||'')).split(''))].sort().join(''))throw new Error('Source/mapping mismatch');
      } else {
        const raw=files.get(s.file);
        const sourceValue=raw.cells?Number(raw.cells[2].replace(/[^\d,.-]/g,'').replaceAll('.','').replace(',','.')):raw.observations?.find(v=>v.year===p.year)?.value;
        if(sourceValue!==p.value)throw new Error('Official table/value mismatch');
      }
      const breakBefore=index>0&&(p.flags.includes('b')||p.flags.includes('d')!==previousDefinition);
      if(breakBefore)segment=`from-${p.year}`;
      previousDefinition=p.flags.includes('d');
      const key=JSON.stringify([c.indicator_code,c.component_code,series.scope,p.year]);
      if(keys.has(key))throw new Error('Duplicate observation');keys.add(key);
      const flagLabels={b:'Ruptura de serie',d:'Definición nacional diferente: véanse metadatos',e:'Estimación',p:'Provisional',u:'Baja fiabilidad',r:'Revisado',s:'Estimación Eurostat'};
      const flags=[...p.flags].map(f=>flagLabels[f]).join(' · ');
      values.push({indicator_code:c.indicator_code,component_code:c.component_code,country_iso2:'ES',scope:series.scope,period_start:`${p.year}-01-01`,period_end:`${p.year}-12-31`,numeric_value:p.value,unit:c.unit,source_url:s.url,source_title:s.title,citation:`${c.label}; ${series.dataset||'tabla oficial'}; periodo ${p.year}. ${series.dataset?'Filtros '+JSON.stringify(series.filters)+(series.subtract?'; resta '+JSON.stringify(series.subtract):'')+'. ':''}Versión de fuente ${s.publication_date}; captura SHA-256 ${s.sha256}.`,publication_date:s.publication_date,retrieved_at:s.retrieved_at,series_key:`${series.dataset||c.indicator_code}|${c.component_code}`,methodology_version:`${manifest.version}:${segment}`,break_before:breakBefore,comparability_notes:[series.comparability_notes,breakBefore?'Se inicia un tramo separado por ruptura o cambio de definición señalado por Eurostat; no se calcula cambio a través de este límite.':null].filter(Boolean).join(' ')||null,quality_notes:[flags,series.dataset?.startsWith('ilc_')?'El periodo corresponde a la encuesta EU-SILC; la renta suele referirse al año anterior.':null].filter(Boolean).join(' ')||null});
    }
  }
  return {manifest,values};
}
// Transactional data load, canonical identities resolved by codes. Existing human
// decisions and published values are never overwritten; any conflict aborts all.
export function historySql({manifest,values}) {
  const payload=JSON.stringify({components:manifest.components,values});
  return `begin; do $history$\ndeclare payload jsonb := ${quoted(payload)}::jsonb; c jsonb; v jsonb; iid uuid; cid uuid; vid uuid; existing public.indicator_values; inserted integer:=0; skipped integer:=0;\nbegin
  perform pg_advisory_xact_lock(hashtextextended('hrct-official-history-2026-10-04',0));
  for c in select value from jsonb_array_elements(payload->'components') loop
    select id into strict iid from public.indicators where code=c->>'indicator_code' and editorial_status='published' and active;
    select id into cid from public.indicator_components where indicator_id=iid and code=c->>'component_code';
    if cid is null then
      if c->>'indicator_code'<>'RAC-001' or c->>'component_code'<>'known-count' then raise exception 'Unexpected new component'; end if;
      insert into public.indicator_components(indicator_id,code,label,unit,value_type,frequency,visualization,definition,formula,editorial_status)
      values(iid,c->>'component_code',c->>'label',c->>'unit','numeric',c->>'frequency',c->>'visualization',c->>'definition',c->>'formula','published');
    else
      if not exists(select 1 from public.indicator_components where id=cid and unit=c->>'unit' and value_type='numeric' and editorial_status='published') then raise exception 'Component unit/status conflict'; end if;
      update public.indicator_components set label=c->>'label',definition=c->>'definition',formula=c->>'formula',frequency=c->>'frequency'
      where id=cid and (label,definition,formula,frequency) is distinct from (c->>'label',c->>'definition',c->>'formula',c->>'frequency');
    end if;
  end loop;
  for v in select value from jsonb_array_elements(payload->'values') loop
    select i.id,c.id into strict iid,cid from public.indicators i join public.indicator_components c on c.indicator_id=i.id where i.code=v->>'indicator_code' and c.code=v->>'component_code';
    select * into existing from public.indicator_values where component_id=cid and country_iso2=v->>'country_iso2' and scope=v->'scope' and period_start=(v->>'period_start')::date and period_end=(v->>'period_end')::date and is_current;
    if existing.id is not null then
      if (existing.numeric_value,existing.unit,existing.source_url,existing.source_title,existing.citation,existing.publication_date,existing.retrieved_at,existing.series_key,existing.methodology_version,existing.break_before,existing.comparability_notes,existing.quality_notes)
        is distinct from ((v->>'numeric_value')::numeric,v->>'unit',v->>'source_url',v->>'source_title',v->>'citation',(v->>'publication_date')::date,(v->>'retrieved_at')::timestamptz,v->>'series_key',v->>'methodology_version',(v->>'break_before')::boolean,v->>'comparability_notes',v->>'quality_notes') then raise exception 'Published observation conflict; explicit correction required'; end if;
      skipped:=skipped+1; continue;
    end if;
    insert into public.indicator_values(indicator_id,component_id,country_iso2,scope,period_start,period_end,numeric_value,unit,source_url,source_title,citation,publication_date,retrieved_at,series_key,methodology_version,break_before,comparability_notes,quality_notes,authored_by)
    values(iid,cid,v->>'country_iso2',v->'scope',(v->>'period_start')::date,(v->>'period_end')::date,(v->>'numeric_value')::numeric,v->>'unit',v->>'source_url',v->>'source_title',v->>'citation',(v->>'publication_date')::date,(v->>'retrieved_at')::timestamptz,v->>'series_key',v->>'methodology_version',(v->>'break_before')::boolean,v->>'comparability_notes',v->>'quality_notes','Blue Human · carga de fuentes oficiales solicitada el 2026-10-04') returning id into vid;
    perform public.hrct_publish_indicator_value(vid,'Blue Human · comprobación de fuente y correspondencia estadística','Serie histórica oficial solicitada por el responsable de HRCT el 2026-10-04; valor contrastado con captura versionada, unidad, población, periodo y banderas de fuente. No implica valoración de cumplimiento.');
    inserted:=inserted+1;
  end loop;
  raise notice 'Historical observations: % inserted, % already published',inserted,skipped;
end $history$; commit;`;
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href) {
  const capture=process.argv.find(arg=>arg.startsWith('--capture='))?.slice('--capture='.length);
  const history=await loadHistory(capture?new URL(`${capture.replace(/\/$/,'')}/`,pathToFileURL(`${process.cwd()}/`)):undefined);
  if(process.argv.includes('--sql'))process.stdout.write(historySql(history));
  else console.log(JSON.stringify({observations:history.values.length,indicators:new Set(history.values.map(v=>v.indicator_code)).size,series:history.manifest.series.length,first:history.values.map(v=>v.period_start).sort()[0],last:history.values.map(v=>v.period_end).sort().at(-1)},null,2));
}
