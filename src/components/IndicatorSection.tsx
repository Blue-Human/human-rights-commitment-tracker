'use client';
import { useCallback, useId, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, FormControl, InputLabel, NativeSelect, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { Component, Indicator, IndicatorBundle, IndicatorLink, Observation } from '@/lib/indicators/types';
import { connects, interpretation, isStale, number, orderPoints, periodLabel, scopeKey, scopeLabel, seriesId, tableRows, target, valueLabel } from '@/lib/indicators/series';
import { formatDate } from '@/lib/hrct';

const roles = { primary:'Principal', supporting:'Apoyo', contextual:'Contextual' };
const types: Record<string,string> = { structural:'Estructural',process:'Proceso',output:'Producto',outcome:'Resultado' };
const frequencies: Record<string,string> = { annual:'Anual',biennial:'Bienal',quarterly:'Trimestral',monthly:'Mensual',irregular:'Irregular' };
const hint = (v: Observation,c: Component) => `${periodLabel(v,c.frequency)} · ${valueLabel(v)} · ${scopeLabel(v.scope)} · ${v.source_title} · Revisado por Blue Human`;

const columns=['Periodo','Valor','Fuente y publicación','Revisión y comparabilidad'];
// Four columns do not fit a phone: there each observation becomes a block and each cell carries the name of its column.
// The roles on the table keep it a table for screen readers once its rows stop being laid out as one.
const stackedTable=(theme:Theme)=>({mt:1,[theme.breakpoints.down('sm')]:{
  overflowX:'visible','& table, & caption, & tbody, & tr, & th, & td':{display:'block'},
  '& thead':{position:'absolute',width:'1px',height:'1px',overflow:'hidden',clipPath:'inset(50%)',whiteSpace:'nowrap'},
  '& table caption':{px:0,pt:0},
  '& tbody tr':{py:1.5,borderTop:'1px solid',borderColor:'divider'},
  '& tbody th, & td':{p:0,border:0,overflowWrap:'anywhere'},
  '& tbody th':{fontSize:'1rem',fontWeight:600,color:'primary.main'},
  '& td':{mt:1},
  '& td[data-label]::before':{content:'attr(data-label)',display:'block',mb:.25,color:'text.secondary',fontSize:'.7rem',fontWeight:600,letterSpacing:'.09em',textTransform:'uppercase'},
}});

// Widest drawing of a chart, in SVG units; narrower containers get a narrower drawing of the same height.
const WIDE=440,NARROW=260,CHART_HEIGHT=220;

function Chart({ values,component,marker,allHistory }: { values:Observation[];component:Component;marker:{value:number;upper:number|null;date:string}|null;allHistory:boolean }) {
  const captionId = useId();
  const [active,setActive] = useState<Observation|null>(null);
  // The drawing takes the width it is given, so its text keeps its size on a phone instead of shrinking with the chart.
  const [available,setAvailable] = useState(WIDE);
  const frame = useCallback((node:HTMLDivElement|null)=>{
    if(!node)return;
    const observer=new ResizeObserver(([entry])=>setAvailable(entry.contentRect.width));
    observer.observe(node);
    return ()=>observer.disconnect();
  },[]);
  const points = orderPoints(values), numeric = points.filter(v=>v.numeric_value!==null);
  if (!numeric.length) return <Box sx={{bgcolor:'background.default',p:1.5}}><Typography color="text.secondary" variant="body2">{values.length ? 'Sin valores numéricos disponibles en este periodo.' : 'Sin mediciones publicadas en este periodo.'}</Typography></Box>;
  const width=Math.max(NARROW,Math.min(WIDE,Math.round(available))),compact=width<400;
  const height=CHART_HEIGHT,left=compact?54:65,right=compact?14:25,top=25,bottom=50;
  const time = (date:string) => new Date(`${date}T00:00:00Z`).getTime();
  const times = points.map(v=>time(v.period_start));
  const currentYear=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Madrid'}).format(new Date()));
  const minTime=allHistory?Math.min(...times):time(`${currentYear-4}-01-01`),maxTime=allHistory?Math.max(...points.map(v=>time(v.period_end))):time(`${currentYear}-12-31`);
  const padding=component.visualization==='bar'?16:0;
  const x = (date:string) => minTime === maxTime || (allHistory && points.length===1) ? (left+width-right)/2 : left+padding+(time(date)-minTime)/(maxTime-minTime)*(width-left-right-2*padding);
  const markerVisible=marker && time(marker.date)>=minTime && time(marker.date)<=maxTime;
  const numbers=numeric.map(v=>v.numeric_value!); if(markerVisible) {numbers.push(marker.value);if(marker.upper!==null)numbers.push(marker.upper);}
  let min=component.visualization === 'bar' ? Math.min(0,...numbers) : Math.min(...numbers);
  let max=component.visualization === 'bar' ? Math.max(0,...numbers) : Math.max(...numbers);
  if (min===max) { if(component.visualization==='bar') max=min+1; else {min-=1;max+=1;} }
  const y = (v:number) => height-bottom-(v-min)/(max-min)*(height-top-bottom);
  const magnitude=Math.max(...numbers.map(Math.abs)),scale=magnitude>=1e9?1e9:magnitude>=1e6?1e6:magnitude>=1e4?1e3:1;
  const scaleLabel=scale===1e9?' (miles de millones)':scale===1e6?' (millones)':scale===1e3?' (miles)':'';
  const ticks = numeric.filter((_,i)=>i===0 || i===numeric.length-1 || numeric.length<=4);
  // In a narrow drawing a period label on the lower row can land on a year of the range: that year then gives way.
  const crowded=(year:number)=>ticks.some((v,index)=>index%2===1 && Math.abs(x(v.period_start)-(x(`${year}-01-01`)+(year===currentYear?-12:12)))<28);
  // A finger cannot hit a 5-unit point: each one answers to a band of the plot around it, as wide as its neighbours allow.
  const positions=[...new Set(numeric.map(v=>x(v.period_start)))].sort((a,b)=>a-b);
  const reach=Math.min(22,...positions.slice(1).map((position,i)=>(position-positions[i])/2));
  return <Box component="figure" sx={{m:0,my:2}}>
    <Box ref={frame} sx={theme=>({containerType:'inline-size',color:'primary.main','& svg':{display:'block',width:'100%',height:'auto'},[`@container (max-width:${WIDE-.02}px)`]:{'& svg':{height:CHART_HEIGHT}},'& .point':{fill:theme.palette.secondary.main,stroke:theme.palette.primary.main,strokeWidth:1.5},'& .point:focus, & .point.active':{outline:'none',strokeWidth:4,stroke:'currentColor'},'& .reach':{fill:'transparent',cursor:'pointer'}})}>
      <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`Evolución de ${component.label}, unidad ${component.unit}. Cada punto permite consultar sus datos con el teclado.`} aria-describedby={captionId}>
        <text x={left} y={14} fill="currentColor" fontSize="11">{component.unit}{scaleLabel}</text>
        {[min,(min+max)/2,max].map((tick,index)=><g key={index}><line x1={left} x2={width-right} y1={y(tick)} y2={y(tick)} stroke="currentColor" opacity=".15"/><text x={left-8} y={y(tick)+4} textAnchor="end" fill="currentColor" fontSize="11">{number(tick/scale)}</text></g>)}
        <line x1={left} x2={left} y1={top} y2={height-bottom} stroke="currentColor"/>
        <line x1={left} x2={width-right} y1={height-bottom} y2={height-bottom} stroke="currentColor"/>
        {component.visualization === 'bar' && <line x1={left} x2={width-right} y1={y(0)} y2={y(0)} stroke="currentColor"/>}
        {markerVisible && <g>{marker.upper!==null&&<line x1={left} x2={width-right} y1={y(marker.upper)} y2={y(marker.upper)} stroke="currentColor" strokeDasharray="4 4"/>}<line x1={left} x2={width-right} y1={y(marker.value)} y2={y(marker.value)} stroke="currentColor" strokeDasharray="4 4"/><text x={x(marker.date)} y={Math.max(12,y(marker.value)-6)} textAnchor="end" fontSize="11" fill="currentColor">Meta · {marker.date}</text></g>}
        {component.visualization!=='bar' && points.map((v,i)=>i>0 && connects(points[i-1],v,component.frequency) ? <line key={`line-${v.id}`} x1={x(points[i-1].period_start)} x2={x(v.period_start)} y1={y(points[i-1].numeric_value!)} y2={y(v.numeric_value!)} stroke="currentColor" strokeWidth="2"/> : null)}
        {active && active.numeric_value!==null && <line x1={x(active.period_start)} x2={x(active.period_start)} y1={top} y2={height-bottom} stroke="currentColor" opacity=".35" strokeDasharray="2 3"/>}
        {numeric.map(v=><rect key={`reach-${v.id}`} className="reach" aria-hidden x={x(v.period_start)-reach} y={top} width={2*reach} height={height-top-bottom} onClick={()=>setActive(v)} onMouseEnter={()=>setActive(v)}/>)}
        {numeric.map(v=><g key={v.id}>
          {component.visualization==='bar' && <rect x={x(v.period_start)-Math.min(14,120/numeric.length)} y={Math.min(y(v.numeric_value!),y(0))} width={Math.min(28,240/numeric.length)} height={Math.max(1,Math.abs(y(0)-y(v.numeric_value!)))} fill="currentColor" opacity=".55"/>}
          <circle className={active?.id===v.id?'point active':'point'} cx={x(v.period_start)} cy={y(v.numeric_value!)} r="5" fill="currentColor" tabIndex={0} role="button" aria-label={hint(v,component)} onFocus={()=>setActive(v)} onMouseEnter={()=>setActive(v)} onClick={()=>setActive(v)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ') {event.preventDefault();setActive(v);}}}><title>{hint(v,component)}</title></circle>
        </g>)}
        {ticks.map((v,index)=><text key={v.id} x={x(v.period_start)} y={height-bottom+20+(index%2)*13} textAnchor="middle" fontSize="10" fill="currentColor">{periodLabel(v,component.frequency)}</text>)}
        {!allHistory && [currentYear-4,currentYear].filter(year=>!crowded(year)).map(year=><text key={year} x={x(`${year}-01-01`)} y={height-15} textAnchor={year===currentYear-4?'start':'end'} fontSize="10" fill="currentColor">{year}</text>)}
        <text x={width-right} y={height-2} textAnchor="end" fontSize="11" fill="currentColor">Periodo de referencia</text>
      </svg>
    </Box>
    <Typography component="figcaption" id={captionId} aria-live="polite" variant="caption" color="text.secondary" sx={{display:'block',minHeight:36}}>{active ? hint(active,component) : 'Toca o selecciona un punto para consultar periodo, valor y fuente.'}</Typography>
    {numeric.length===1 && <Typography variant="body2" color="text.secondary">Una observación disponible; no se puede calcular tendencia.</Typography>}
  </Box>;
}

function Measurement({ component,indicator,link,bundle,allHistory }: {component:Component;indicator:Indicator;link:IndicatorLink;bundle:IndicatorBundle;allHistory:boolean}) {
  const selectId=useId();
  const relevant=(v:Observation)=>v.component_id===component.id && Object.entries(link.scope).every(([key,value])=>v.scope[key]===value);
  const scopes=[...new Map([...bundle.latest,...bundle.values].filter(relevant).map(v=>[seriesId(v),v])).values()];
  const [selection,setSelection]=useState('');
  const selected=scopes.find(v=>seriesId(v)===selection)||scopes[0];
  const values=orderPoints(bundle.values.filter(v=>relevant(v) && selected && seriesId(v)===seriesId(selected)));
  const latest=bundle.latest.find(v=>relevant(v) && selected && seriesId(v)===seriesId(selected));
  const baseline=bundle.baselines.find(v=>v.id===link.baseline_value_id && selected && seriesId(v)===seriesId(selected));
  const goal=target(link,baseline,latest);
  const scopedTarget=link.component_id===component.id && (!selected || scopeKey(link.scope)===scopeKey(selected.scope));
  const warnings=values.filter(v=>v.break_before||v.comparability_notes||v.quality_notes);
  if (!latest && !values.length && link.target_value===null && !link.baseline_value_id) return <Box sx={{mt:2,pt:2,borderTop:'1px solid',borderColor:'divider'}}><Typography variant="body2" color="text.secondary">{component.label} · Sin mediciones publicadas.</Typography><Box component="details" sx={{mt:1,'& summary':{cursor:'pointer',color:'primary.main',fontSize:'.85rem'}}}><summary>Ver datos y metodología · {component.label}</summary><Typography variant="body2" sx={{mt:1}}>{component.definition} · Unidad: {component.unit} · Frecuencia: {frequencies[component.frequency]}</Typography></Box></Box>;
  return <Box sx={{mt:2,pt:2,borderTop:'1px solid',borderColor:'divider'}}>
    <Typography variant="subtitle2" color="primary.main">{component.label}</Typography>
    {scopes.length>1 ? <FormControl fullWidth sx={{my:1.5}}><InputLabel htmlFor={selectId}>Población y territorio</InputLabel><NativeSelect id={selectId} value={selected?seriesId(selected):''} onChange={event=>setSelection(event.target.value)}>{scopes.map(v=><option key={seriesId(v)} value={seriesId(v)}>{scopeLabel(v.scope).replace('Población: ','').replace('Territorio: ','')}</option>)}</NativeSelect><Typography variant="caption" color="text.secondary" sx={{mt:1,overflowWrap:'anywhere'}}>{selected && scopeLabel(selected.scope)}</Typography></FormControl> : selected && <Typography variant="caption" color="text.secondary">{scopeLabel(selected.scope)}</Typography>}{!selected && Object.keys(link.scope).length>0 && <Typography variant="caption" color="text.secondary">{scopeLabel(link.scope)}</Typography>}
    {latest && <Typography sx={{mt:1.5,fontSize:{xs:'1.9rem',sm:'2.25rem'},fontWeight:600,color:'primary.main',lineHeight:1.2,overflowWrap:'anywhere'}}>{/^HOU-00[15]$/.test(indicator.code||'') && latest.numeric_value!==null && component.unit==='nº'?`${number(latest.numeric_value)} viviendas`:valueLabel(latest)}</Typography>}
    {latest && <Typography variant="caption" color="text.secondary">Último valor · periodo {periodLabel(latest,component.frequency)}</Typography>}
    {latest && isStale(latest,component.frequency) && <Typography variant="caption" color="text.secondary" sx={{display:'block',mt:1}}>Dato histórico de {periodLabel(latest,component.frequency)} · no hay una medición posterior en esta serie.</Typography>}
    {component.value_type==='numeric' ? <Chart key={`${selected?seriesId(selected):component.id}|${allHistory}`} values={values} component={component} allHistory={allHistory} marker={scopedTarget && goal && link.target_date ? {value:goal.lower,upper:goal.upper,date:link.target_date}:null}/> : <Stack component="ol" sx={{pl:2.5}}>{values.map(v=><Box component="li" key={v.id} sx={{mb:1}}><Typography variant="body2">{periodLabel(v,component.frequency)} · {valueLabel(v)}</Typography><Button component="a" href={v.source_url} target="_blank" rel="noreferrer" size="small">{v.source_title} · Revisado por Blue Human</Button></Box>)}{!values.length && <Typography variant="body2" color="text.secondary">Sin mediciones publicadas en este periodo.</Typography>}</Stack>}
    {component.value_type==='numeric' && values.some(v=>v.numeric_value!==null) && <Box sx={{p:2,bgcolor:'rgba(0,163,224,.04)',borderLeft:'3px solid',borderColor:'secondary.main'}}><Typography variant="overline" color="primary.main">Lectura de los datos</Typography><Typography variant="body2" sx={{mt:.5,lineHeight:1.65}}>{interpretation(values,component,indicator)}</Typography></Box>}
    {link.baseline_value_id && !baseline && <Typography variant="body2" color="text.secondary" sx={{mt:1}}>La baseline documentada no está disponible para esta serie. No se calcula una comparación con la meta.</Typography>}
    {baseline && <Typography variant="body2" sx={{mt:1}}>Baseline documentada: {valueLabel(baseline)} · {periodLabel(baseline,component.frequency)}. {link.baseline_reason}</Typography>}
    {scopedTarget && link.target_value!==null ? <Box sx={{mt:1.5}}><Typography variant="body2">Meta: {link.target_operator==='range' ? `${number(link.target_value)}–${number(link.target_upper!)}` : `${link.target_operator} ${number(link.target_value)}`} {link.target_type==='relative' ? '% respecto a la baseline documentada' : component.unit} · plazo {formatDate(link.target_date)}.</Typography><Button component="a" href={link.target_source_url!} target="_blank" rel="noreferrer" size="small">Fuente de la meta</Button><Typography variant="caption" sx={{display:'block'}}>{link.target_citation}</Typography>{goal?.achieved && <Typography variant="body2">✓ Meta cuantitativa alcanzada · periodo {latest && periodLabel(latest,component.frequency)} · {selected && scopeLabel(selected.scope)}</Typography>}</Box> : null}
    {warnings.some(v=>v.break_before) && <Typography variant="caption" color="text.secondary" sx={{display:'block',mt:1}}>Los tramos separados indican rupturas metodológicas. Consulta las notas en la tabla.</Typography>}
    {latest && <Box sx={{mt:1.5}}><Button component="a" href={latest.source_url} target="_blank" rel="noreferrer" sx={{px:0}} size="small">{latest.source_title}</Button><Typography variant="caption" color="text.secondary" sx={{display:'block'}}>Versión de fuente: {formatDate(latest.publication_date)}</Typography></Box>}
    <Box component="details" sx={{mt:2,'& summary':{cursor:'pointer',color:'primary.main',fontSize:'.9rem',py:1.4}}}>
      <summary>Ver datos y metodología · {component.label}</summary>
      <Typography variant="body2" sx={{my:1}}>{component.definition}</Typography>
      <Typography variant="body2" color="text.secondary">Fórmula: {component.formula||'No especificada'} · Unidad: {component.unit} · Frecuencia: {frequencies[component.frequency]}</Typography>
      <TableContainer sx={stackedTable}><Table size="small" role="table" aria-label={`Observaciones de ${component.label}`}>
        <caption>Datos publicados para {selected?scopeLabel(selected.scope):'la serie seleccionada'}. Las ausencias no son ceros. Las correcciones y fuentes alternativas se conservan en el registro de revisión.</caption>
        <TableHead role="rowgroup"><TableRow role="row">{columns.map(label=><TableCell key={label} component="th" scope="col" role="columnheader">{label}</TableCell>)}</TableRow></TableHead>
        <TableBody role="rowgroup">{tableRows(values,component).map(row=>'gap' in row ? <TableRow role="row" key={`gap-${row.gap}`}><TableCell component="th" scope="row" role="rowheader">{row.gap}</TableCell><TableCell role="cell" colSpan={3}>Sin observación para este periodo esperado</TableCell></TableRow> : <TableRow role="row" key={row.id}>
          <TableCell component="th" scope="row" role="rowheader">{periodLabel(row,component.frequency)}<Typography variant="caption" sx={{display:'block'}}>{row.period_start} – {row.period_end}</Typography></TableCell>
          <TableCell role="cell" data-label={columns[1]}>{valueLabel(row)}</TableCell><TableCell role="cell" data-label={columns[2]}><a href={row.source_url} target="_blank" rel="noreferrer">{row.source_title}</a><Typography variant="caption" sx={{display:'block'}}>{row.citation} · Versión de fuente {formatDate(row.publication_date)} · Recuperación {formatDate(row.retrieved_at)}</Typography></TableCell>
          <TableCell role="cell" data-label={columns[3]}>Revisado {formatDate(row.reviewed_at)} · {row.series_key} · metodología {row.methodology_version}<Typography variant="caption" sx={{display:'block'}}>{row.break_before?'Ruptura metodológica. ':''}{row.comparability_notes} {row.quality_notes} {row.supersedes_id?'Observación corregida. ':''}{row.selection_reason}</Typography></TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>
    </Box>
  </Box>;
}

export function IndicatorCard({indicator,link,bundle,allHistory}:{indicator:Indicator;link:IndicatorLink;bundle:IndicatorBundle;allHistory:boolean}) {
  const components=bundle.components.filter(c=>c.indicator_id===indicator.id && (!link.component_id||c.id===link.component_id));
  const measured=(c:Component)=>[...bundle.latest,...bundle.values].some(v=>v.component_id===c.id && Object.entries(link.scope).every(([k,value])=>v.scope[k]===value));
  const withData=components.filter(measured),withoutData=components.filter(c=>!measured(c));
  return <Card sx={{height:'100%'}}><CardContent sx={{p:{xs:2.5,sm:3}}}>
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap"><Chip label={roles[link.role]} size="small" variant="outlined"/><Chip label={types[indicator.indicator_type||'']||'Tipo no especificado'} size="small" variant="outlined"/></Stack>
    <Typography variant="overline" color="text.secondary" sx={{display:'block',mt:1.5}}>{indicator.code||'Sin código'}</Typography>
    <Typography variant="h6" color="primary.main">{indicator.name}</Typography>
    {(withData.length?withData:components).map(c=><Measurement key={c.id} component={c} indicator={indicator} link={link} bundle={bundle} allHistory={allHistory}/>)}
    {!!withData.length && !!withoutData.length && <Box component="details" sx={{mt:2,'& summary':{cursor:'pointer',color:'text.secondary',fontSize:'.85rem'}}}><summary>Otras métricas · {withoutData.length} sin datos disponibles</summary>{withoutData.map(c=><Measurement key={c.id} component={c} indicator={indicator} link={link} bundle={bundle} allHistory={allHistory}/>)}</Box>}
    {!components.length && <Typography variant="body2" color="text.secondary" sx={{py:2}}>Sin datos publicados para este indicador.</Typography>}
    <Box component="details" sx={{mt:2,'& summary':{cursor:'pointer',color:'primary.main',fontSize:'.9rem'}}}><summary>Por qué este indicador</summary><Typography variant="body2" color="text.secondary" sx={{mt:1}}>{indicator.description}</Typography><Typography variant="body2" sx={{mt:1}}>{link.rationale_kind==='general'?'Justificación general del expediente: ':''}{link.rationale}</Typography><Typography variant="body2" color="text.secondary" sx={{mt:1}}>Metodología: {indicator.methodology||'No especificada'} · Desagregaciones recomendadas: {indicator.recommended_disaggregation||'No especificadas'}</Typography><Typography variant="caption" color="text.secondary">Actualización del catálogo: {formatDate(indicator.updated_at)}</Typography></Box>
  </CardContent></Card>;
}

export function IndicatorSkeleton() { return <Box sx={{minHeight:300}}><Skeleton animation={false} width="60%" height={50}/><Skeleton animation={false} variant="rectangular" height={220}/></Box>; }
export function IndicatorSection({publicId,initial,initialError=false,initialAllHistory=false}:{publicId:string;initial:IndicatorBundle|null;initialError?:boolean;initialAllHistory?:boolean}) {
  const [bundle,setBundle]=useState(initial),[error,setError]=useState(initialError),[loading,setLoading]=useState(false),[all,setAll]=useState(initialAllHistory),[expanded,setExpanded]=useState(false);
  const selectorId=useId();
  async function reload(history:boolean) {
    setAll(history);setLoading(true);setError(false);
    try { const response=await fetch(`/api/commitments/${encodeURIComponent(publicId)}/indicators?history=${history?'all':'recent'}`);if(!response.ok) throw new Error();setBundle(await response.json());setAll(history); } catch {setError(true);} finally {setLoading(false);}
  }
  const measured=(link:IndicatorLink)=>!!bundle?.latest.some(v=>v.indicator_id===link.indicator_id && (!link.component_id||v.component_id===link.component_id) && Object.entries(link.scope).every(([k,val])=>v.scope[k]===val));
  const ordered=bundle ? [...bundle.links].sort((a,b)=>Number(measured(b))-Number(measured(a))) : [];
  const measuredCount=ordered.filter(measured).length;
  const featured=measuredCount?ordered.filter(measured):ordered;
  const withoutData=measuredCount?ordered.filter(link=>!measured(link)):[];
  const visible=expanded ? featured : featured.slice(0,4);
  return <Box component="section" id="indicadores" aria-labelledby="indicators-heading" sx={{scrollMarginTop:{xs:76,md:100}}}>
    <Stack direction={{xs:'column',sm:'row'}} spacing={2} justifyContent="space-between" alignItems={{sm:'center'}}>
      <Typography id="indicators-heading" variant="h4" color="primary.main">Indicadores y evolución{bundle ? ` · ${bundle.links.length}` : ''}</Typography>
      {!!bundle && (bundle.values.length>0||bundle.latest.length>0||bundle.has_older) && <FormControl size="small" sx={{minWidth:170}}><InputLabel htmlFor={selectorId}>Histórico</InputLabel><NativeSelect id={selectorId} value={all?'all':'recent'} disabled={loading} onChange={event=>void reload(event.target.value==='all')}><option value="recent">Últimos 5 años</option><option value="all">Todo el histórico</option></NativeSelect></FormControl>}
    </Stack>
    <Typography variant="body2" color="text.secondary" sx={{mt:1.5,mb:2,lineHeight:1.75}}>Datos para evaluar esta recomendación. Su evolución no determina por sí sola el cumplimiento.</Typography>
    {!!bundle?.links.length && <Typography variant="body2" color="primary.main" sx={{mb:2}}>{measuredCount} de {bundle?.links.length} indicadores con mediciones publicadas</Typography>}
    {error ? <Alert severity="warning" action={<Button onClick={()=>void reload(all)}>Reintentar</Button>}>No se pudieron cargar los indicadores. La consulta fallida no indica ausencia de mediciones.</Alert> : loading ? <IndicatorSkeleton/> : bundle && <>
      {bundle.has_older&&!all&&<Typography variant="body2" color="text.secondary" sx={{mb:2}}>También hay datos anteriores. <Button onClick={()=>void reload(true)} size="small">Ver todo el histórico</Button></Typography>}
      {!bundle.links.length && <Box sx={{py:3}}><Typography variant="body2" color="text.secondary">{bundle.requirement==='not_required'?'Esta recomendación se verifica mediante acciones y evidencia documental':'No hay indicadores publicados para esta recomendación.'}</Typography>{bundle.reason && <Typography variant="body2" color="text.secondary" sx={{mt:1}}>{bundle.reason}</Typography>}{bundle.requirement==='not_required'&&<Button component="a" href="#evidencias">Ver evidencias</Button>}</Box>}
      <Box sx={{display:'grid',gridTemplateColumns:{xs:'minmax(0,1fr)',md:(visible?.length||0)>1?'repeat(2,minmax(0,1fr))':'minmax(0,1fr)'},gap:2}}>{visible?.map(link=>{const indicator=bundle.indicators.find(i=>i.id===link.indicator_id);return indicator?<IndicatorCard key={link.id} indicator={indicator} link={link} bundle={bundle} allHistory={all}/>:null;})}</Box>
      {featured.length>4 && <Button onClick={()=>setExpanded(!expanded)} sx={{mt:2}}>{expanded?'Mostrar menos':`Ver los ${featured.length-4} indicadores restantes`}</Button>}
      {!!withoutData.length && <Box component="details" sx={{mt:3,'& summary':{cursor:'pointer',color:'primary.main'}}}><summary>Otros indicadores asignados · {withoutData.length} sin mediciones publicadas</summary><Stack spacing={2} sx={{mt:2}}>{withoutData.map(link=>{const indicator=bundle.indicators.find(i=>i.id===link.indicator_id);return indicator?<IndicatorCard key={link.id} indicator={indicator} link={link} bundle={bundle} allHistory={all}/>:null;})}</Stack></Box>}

    </>}
  </Box>;
}
