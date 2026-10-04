'use client';
import { useId, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, FormControl, InputLabel, NativeSelect, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { AnnexIndicator, Component, Indicator, IndicatorBundle, IndicatorLink, Observation } from '@/lib/indicators/types';
import { change, connects, isStale, number, orderPoints, periodLabel, scopeKey, scopeLabel, seriesId, tableRows, target, valueLabel } from '@/lib/indicators/series';
import { formatDate } from '@/lib/hrct';

const roles = { primary:'Principal', supporting:'Apoyo', contextual:'Contextual' };
const types: Record<string,string> = { structural:'Estructural',process:'Proceso',output:'Producto',outcome:'Resultado' };
const frequencies: Record<string,string> = { annual:'Anual',biennial:'Bienal',quarterly:'Trimestral',monthly:'Mensual',irregular:'Irregular' };
const hint = (v: Observation,c: Component) => `${periodLabel(v,c.frequency)} · ${valueLabel(v)} · ${scopeLabel(v.scope)} · ${v.source_title} · Revisado por Blue Human`;

function Chart({ values,component,marker,allHistory }: { values:Observation[];component:Component;marker:{value:number;upper:number|null;date:string}|null;allHistory:boolean }) {
  const captionId = useId();
  const [active,setActive] = useState<Observation|null>(null);
  const points = orderPoints(values), numeric = points.filter(v=>v.numeric_value!==null);
  if (!numeric.length) return <Box sx={{minHeight:180,bgcolor:'background.default',p:2,display:'grid',alignItems:'center'}}><Typography color="text.secondary" variant="body2">{values.length ? 'Sin valores numéricos disponibles en este periodo.' : 'Sin mediciones publicadas en este periodo.'}</Typography></Box>;
  const width=440,height=220,left=65,right=25,top=25,bottom=50;
  const time = (date:string) => new Date(`${date}T00:00:00Z`).getTime();
  const times = points.map(v=>time(v.period_start));
  const currentYear=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Madrid'}).format(new Date()));
  const minTime=allHistory?Math.min(...times):time(`${currentYear-4}-01-01`),maxTime=allHistory?Math.max(...points.map(v=>time(v.period_end))):time(`${currentYear}-12-31`);
  const x = (date:string) => minTime === maxTime ? (left+width-right)/2 : left+(time(date)-minTime)/(maxTime-minTime)*(width-left-right);
  const markerVisible=marker && time(marker.date)>=minTime && time(marker.date)<=maxTime;
  const numbers=numeric.map(v=>v.numeric_value!); if(markerVisible) {numbers.push(marker.value);if(marker.upper!==null)numbers.push(marker.upper);}
  let min=component.visualization === 'bar' ? Math.min(0,...numbers) : Math.min(...numbers);
  let max=component.visualization === 'bar' ? Math.max(0,...numbers) : Math.max(...numbers);
  if (min===max) { if(component.visualization==='bar') max=min+1; else {min-=1;max+=1;} }
  const y = (v:number) => height-bottom-(v-min)/(max-min)*(height-top-bottom);
  const magnitude=Math.max(...numbers.map(Math.abs)),scale=magnitude>=1e9?1e9:magnitude>=1e6?1e6:magnitude>=1e4?1e3:1;
  const scaleLabel=scale===1e9?' (miles de millones)':scale===1e6?' (millones)':scale===1e3?' (miles)':'';
  const ticks = numeric.filter((_,i)=>i===0 || i===numeric.length-1 || numeric.length<=4);
  return <Box component="figure" sx={{m:0,my:2}}>
    <Box sx={{overflowX:'auto',color:'primary.main','& svg':{width:'100%',minWidth:300,height:'auto'},'& .point:focus':{outline:'none',strokeWidth:4,stroke:'currentColor'}}}>
      <svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`Evolución de ${component.label}, unidad ${component.unit}. Cada punto permite consultar sus datos con el teclado.`} aria-describedby={captionId}>
        <text x={left} y={14} fill="currentColor" fontSize="11">{component.unit}{scaleLabel}</text>
        {[min,(min+max)/2,max].map((tick,index)=><g key={index}><line x1={left} x2={width-right} y1={y(tick)} y2={y(tick)} stroke="currentColor" opacity=".15"/><text x={left-8} y={y(tick)+4} textAnchor="end" fill="currentColor" fontSize="11">{number(tick/scale)}</text></g>)}
        <line x1={left} x2={left} y1={top} y2={height-bottom} stroke="currentColor"/>
        <line x1={left} x2={width-right} y1={height-bottom} y2={height-bottom} stroke="currentColor"/>
        {component.visualization === 'bar' && <line x1={left} x2={width-right} y1={y(0)} y2={y(0)} stroke="currentColor"/>}
        {markerVisible && <g>{marker.upper!==null&&<line x1={left} x2={width-right} y1={y(marker.upper)} y2={y(marker.upper)} stroke="currentColor" strokeDasharray="4 4"/>}<line x1={left} x2={width-right} y1={y(marker.value)} y2={y(marker.value)} stroke="currentColor" strokeDasharray="4 4"/><text x={x(marker.date)} y={Math.max(12,y(marker.value)-6)} textAnchor="end" fontSize="11" fill="currentColor">Meta · {marker.date}</text></g>}
        {component.visualization!=='bar' && points.map((v,i)=>i>0 && connects(points[i-1],v,component.frequency) ? <line key={`line-${v.id}`} x1={x(points[i-1].period_start)} x2={x(v.period_start)} y1={y(points[i-1].numeric_value!)} y2={y(v.numeric_value!)} stroke="currentColor" strokeWidth="2"/> : null)}
        {numeric.map(v=><g key={v.id}>
          {component.visualization==='bar' && <rect x={x(v.period_start)-Math.min(14,120/numeric.length)} y={Math.min(y(v.numeric_value!),y(0))} width={Math.min(28,240/numeric.length)} height={Math.max(1,Math.abs(y(0)-y(v.numeric_value!)))} fill="currentColor" opacity=".55"/>}
          <circle className="point" cx={x(v.period_start)} cy={y(v.numeric_value!)} r="5" fill="currentColor" tabIndex={0} role="button" aria-label={hint(v,component)} onFocus={()=>setActive(v)} onMouseEnter={()=>setActive(v)} onClick={()=>setActive(v)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ') {event.preventDefault();setActive(v);}}}><title>{hint(v,component)}</title></circle>
        </g>)}
        {ticks.map((v,index)=><text key={v.id} x={x(v.period_start)} y={height-bottom+20+(index%2)*13} textAnchor="middle" fontSize="10" fill="currentColor">{periodLabel(v,component.frequency)}</text>)}
        {!allHistory && [currentYear-4,currentYear].map(year=><text key={year} x={x(`${year}-01-01`)} y={height-15} textAnchor={year===currentYear-4?'start':'end'} fontSize="10" fill="currentColor">{year}</text>)}
        <text x={width-right} y={height-2} textAnchor="end" fontSize="11" fill="currentColor">Periodo de referencia</text>
      </svg>
    </Box>
    <Typography component="figcaption" id={captionId} aria-live="polite" variant="caption" color="text.secondary" sx={{display:'block',minHeight:36}}>{active ? hint(active,component) : 'Selecciona un punto con el teclado o el cursor para consultar periodo, valor y fuente.'}</Typography>
    {numeric.length===1 && <Typography variant="body2" color="text.secondary">Una observación disponible; no se puede calcular tendencia.</Typography>}
  </Box>;
}

function Measurement({ component,link,bundle,allHistory }: {component:Component;link:IndicatorLink;bundle:IndicatorBundle;allHistory:boolean}) {
  const selectId=useId();
  const relevant=(v:Observation)=>v.component_id===component.id && Object.entries(link.scope).every(([key,value])=>v.scope[key]===value);
  const scopes=[...new Map([...bundle.latest,...bundle.values].filter(relevant).map(v=>[seriesId(v),v])).values()];
  const [selection,setSelection]=useState('');
  const selected=scopes.find(v=>seriesId(v)===selection)||scopes[0];
  const values=orderPoints(bundle.values.filter(v=>relevant(v) && selected && seriesId(v)===seriesId(selected)));
  const latest=bundle.latest.find(v=>relevant(v) && selected && seriesId(v)===seriesId(selected));
  const baseline=bundle.baselines.find(v=>v.id===link.baseline_value_id && selected && seriesId(v)===seriesId(selected));
  const delta=change(values,component), goal=target(link,baseline,latest);
  const scopedTarget=link.component_id===component.id && (!selected || scopeKey(link.scope)===scopeKey(selected.scope));
  const warnings=values.filter(v=>v.break_before||v.comparability_notes||v.quality_notes);
  return <Box sx={{mt:2,pt:2,borderTop:'1px solid',borderColor:'divider'}}>
    <Typography variant="subtitle2" color="primary.main">{component.label}</Typography>
    {scopes.length>1 ? <FormControl fullWidth sx={{my:1.5}}><InputLabel htmlFor={selectId}>Población y territorio</InputLabel><NativeSelect id={selectId} value={selected?seriesId(selected):''} onChange={event=>setSelection(event.target.value)}>{scopes.map(v=><option key={seriesId(v)} value={seriesId(v)}>{scopeLabel(v.scope).replace('Población: ','').replace('Territorio: ','')}</option>)}</NativeSelect><Typography variant="caption" color="text.secondary" sx={{mt:1,overflowWrap:'anywhere'}}>{selected && scopeLabel(selected.scope)}</Typography></FormControl> : selected && <Typography variant="caption" color="text.secondary">{scopeLabel(selected.scope)}</Typography>}{!selected && Object.keys(link.scope).length>0 && <Typography variant="caption" color="text.secondary">{scopeLabel(link.scope)}</Typography>}
    <Typography sx={{mt:1,fontSize:'1.45rem',color:'primary.main'}}>{latest ? valueLabel(latest) : 'Sin mediciones publicadas'}</Typography>
    {latest && <Typography variant="caption" color="text.secondary">Último valor · periodo {periodLabel(latest,component.frequency)}</Typography>}
    {latest && isStale(latest,component.frequency) && <Alert severity="info" sx={{mt:1}}>El último dato publicado es anterior al periodo esperado para una serie {frequencies[component.frequency].toLowerCase()}.</Alert>}
    {component.value_type==='numeric' ? <Chart key={`${selected?seriesId(selected):component.id}|${allHistory}`} values={values} component={component} allHistory={allHistory} marker={scopedTarget && goal && link.target_date ? {value:goal.lower,upper:goal.upper,date:link.target_date}:null}/> : <Stack component="ol" sx={{pl:2.5}}>{values.map(v=><Box component="li" key={v.id} sx={{mb:1}}><Typography variant="body2">{periodLabel(v,component.frequency)} · {valueLabel(v)}</Typography><Button component="a" href={v.source_url} target="_blank" rel="noreferrer" size="small">{v.source_title} · Revisado por Blue Human</Button></Box>)}{!values.length && <Typography variant="body2" color="text.secondary">Sin mediciones publicadas en este periodo.</Typography>}</Stack>}
    {delta ? <Typography variant="body2">Cambio {periodLabel(delta.first,component.frequency)} → {periodLabel(delta.last,component.frequency)}: {delta.absolute>0?'+':''}{number(delta.absolute)} {delta.percentage ? 'puntos porcentuales' : component.unit}{!delta.percentage && (delta.relative===null ? ' · cambio relativo indefinido (valor inicial cero)' : ` · ${delta.relative>0?'+':''}${number(delta.relative)} %`)}. La variación no prueba causalidad.</Typography> : component.value_type==='numeric' && values.length>1 && <Typography variant="body2" color="text.secondary">No hay dos puntos consecutivos comparables para calcular el cambio.</Typography>}
    {link.baseline_value_id && !baseline && <Typography variant="body2" color="text.secondary" sx={{mt:1}}>La baseline documentada no está vigente para esta serie; requiere revisión antes de comparar con la meta.</Typography>}
    {baseline && <Typography variant="body2" sx={{mt:1}}>Baseline documentada: {valueLabel(baseline)} · {periodLabel(baseline,component.frequency)}. {link.baseline_reason}</Typography>}
    {scopedTarget && link.target_value!==null ? <Box sx={{mt:1.5}}><Typography variant="body2">Meta: {link.target_operator==='range' ? `${number(link.target_value)}–${number(link.target_upper!)}` : `${link.target_operator} ${number(link.target_value)}`} {link.target_type==='relative' ? '% respecto a la baseline documentada' : component.unit} · plazo {formatDate(link.target_date)}.</Typography><Button component="a" href={link.target_source_url!} target="_blank" rel="noreferrer" size="small">Fuente de la meta</Button><Typography variant="caption" sx={{display:'block'}}>{link.target_citation}</Typography>{goal?.achieved && <Typography variant="body2">✓ Meta cuantitativa alcanzada · periodo {latest && periodLabel(latest,component.frequency)} · {selected && scopeLabel(selected.scope)}</Typography>}</Box> : <Typography variant="body2" color="text.secondary" sx={{mt:1.5}}>Sin meta cuantitativa documentada para esta serie.</Typography>}
    {warnings.length>0 && <Alert severity="info" sx={{mt:1.5}}>{[...new Set(warnings.map(v=>[v.break_before?'Ruptura de comparabilidad':null,v.comparability_notes,v.quality_notes].filter(Boolean).join(' · ')))].join('; ')}</Alert>}
    {latest && <Box sx={{mt:1.5}}><Button component="a" href={latest.source_url} target="_blank" rel="noreferrer" sx={{px:0}} size="small">{latest.source_title}</Button><Typography variant="caption" color="text.secondary" sx={{display:'block'}}>Publicación: {formatDate(latest.publication_date)} · Recuperación: {formatDate(latest.retrieved_at)} · Actualización: {formatDate(latest.updated_at)} · Revisado: {formatDate(latest.reviewed_at)}</Typography></Box>}
    <Box component="details" sx={{mt:2,'& summary':{cursor:'pointer',color:'primary.main',fontSize:'.9rem',py:1}}}>
      <summary>Ver datos y metodología · {component.label}</summary>
      <Typography variant="body2" sx={{my:1}}>{component.definition}</Typography>
      <Typography variant="body2" color="text.secondary">Fórmula: {component.formula||'Pendiente de documentación'} · Unidad: {component.unit} · Frecuencia: {frequencies[component.frequency]}</Typography>
      <TableContainer sx={{mt:1}}><Table size="small" aria-label={`Observaciones de ${component.label}`}>
        <caption>Datos publicados para {selected?scopeLabel(selected.scope):'la serie seleccionada'}. Las ausencias no son ceros. Las correcciones y fuentes alternativas se conservan en el registro de revisión.</caption>
        <TableHead><TableRow>{['Periodo','Valor','Fuente y publicación','Revisión y comparabilidad'].map(label=><TableCell key={label} component="th" scope="col">{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{tableRows(values,component).map(row=>'gap' in row ? <TableRow key={`gap-${row.gap}`}><TableCell component="th" scope="row">{row.gap}</TableCell><TableCell colSpan={3}>Sin observación para este periodo esperado</TableCell></TableRow> : <TableRow key={row.id}>
          <TableCell component="th" scope="row">{periodLabel(row,component.frequency)}<Typography variant="caption" sx={{display:'block'}}>{row.period_start} – {row.period_end}</Typography></TableCell>
          <TableCell>{valueLabel(row)}</TableCell><TableCell><a href={row.source_url} target="_blank" rel="noreferrer">{row.source_title}</a><Typography variant="caption" sx={{display:'block'}}>{row.citation} · Publicación {formatDate(row.publication_date)} · Recuperación {formatDate(row.retrieved_at)}</Typography></TableCell>
          <TableCell>Revisado {formatDate(row.reviewed_at)} · {row.series_key} · metodología {row.methodology_version}<Typography variant="caption" sx={{display:'block'}}>{row.break_before?'Ruptura metodológica. ':''}{row.comparability_notes} {row.quality_notes} {row.supersedes_id?'Observación corregida. ':''}{row.selection_reason}</Typography></TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>
    </Box>
  </Box>;
}

function IndicatorCard({indicator,link,bundle,allHistory}:{indicator:Indicator;link:IndicatorLink;bundle:IndicatorBundle;allHistory:boolean}) {
  const components=bundle.components.filter(c=>c.indicator_id===indicator.id && (!link.component_id||c.id===link.component_id));
  return <Card><CardContent>
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap"><Chip label={roles[link.role]} size="small" variant="outlined"/><Chip label={types[indicator.indicator_type||'']||'Tipo pendiente de revisión'} size="small" variant="outlined"/></Stack>
    <Typography variant="overline" color="text.secondary" sx={{display:'block',mt:1.5}}>{indicator.code||'Código pendiente'}</Typography>
    <Typography variant="h6" color="primary.main">{indicator.name}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{mt:1}}>{indicator.description}</Typography>
    <Typography variant="body2" sx={{mt:1}}>{link.rationale_kind==='general'?'Justificación general del expediente: ':'Relación con esta recomendación: '}{link.rationale}</Typography>
    {components.map(c=><Measurement key={c.id} component={c} link={link} bundle={bundle} allHistory={allHistory}/>)}
    {!components.length && <Typography variant="body2" color="text.secondary" sx={{minHeight:180,py:3}}>Sin mediciones publicadas. Componentes de medición pendientes de revisión.</Typography>}
    {!bundle.latest.some(v=>v.indicator_id===indicator.id) && indicator.preferred_sources && <Typography variant="body2" color="text.secondary" sx={{mt:2}}>Fuente preferente candidata (no respalda una medición): {indicator.preferred_sources}</Typography>}
    {!components.length && <Typography variant="body2" color="text.secondary">Sin meta cuantitativa documentada.</Typography>}
    <Box component="details" sx={{mt:2,'& summary':{cursor:'pointer',color:'primary.main',fontSize:'.9rem'}}}><summary>Por qué este indicador</summary><Typography variant="body2" sx={{mt:1}}>{link.rationale_kind==='general'?'Justificación general del expediente: ':''}{link.rationale}</Typography><Typography variant="body2" color="text.secondary" sx={{mt:1}}>Metodología: {indicator.methodology||'Pendiente de documentación'} · Desagregaciones recomendadas: {indicator.recommended_disaggregation||'Pendientes de definición'}</Typography><Typography variant="caption" color="text.secondary">Actualización del catálogo: {formatDate(indicator.updated_at)}</Typography></Box>
    <Typography variant="caption" color="text.secondary" sx={{display:'block',mt:2}}>{({neutral:'Orientación contextual.',higher_is_better:'Orientación documentada: valores mayores.',lower_is_better:'Orientación documentada: valores menores.',target_value:'Orientación documentada: valor objetivo.'} as Record<string,string>)[indicator.orientation]} Más denuncias o víctimas detectadas pueden reflejar mayor detección y no prueban un deterioro.</Typography>
  </CardContent></Card>;
}

function AnnexIndicatorCard({indicator,reason}:{indicator:AnnexIndicator;reason:string}) {
  return <Card component="article" aria-label={`${indicator.code} · Propuesta sin validar`}><CardContent>
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      <Chip label="Propuesto · Sin validar" size="small" variant="outlined"/>
      <Chip label={roles[indicator.role]} size="small" variant="outlined"/>
      <Chip label={types[indicator.indicator_type]||'Tipo pendiente de revisión'} size="small" variant="outlined"/>
    </Stack>
    <Typography variant="overline" color="text.secondary" sx={{display:'block',mt:1.5}}>{indicator.code}</Typography>
    <Typography variant="h6" color="primary.main">{indicator.name}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{mt:1}}>{indicator.description}</Typography>
    <Typography variant="body2" sx={{mt:1}}>Justificación general propuesta para esta recomendación: {reason}</Typography>
    <Box sx={{mt:2,p:2,bgcolor:'background.default'}}>
      <Typography variant="body2">Sin mediciones publicadas para esta asignación.</Typography>
      <Typography variant="body2" color="text.secondary" sx={{mt:1}}>La evolución se mostrará cuando la asignación esté revisada y existan observaciones publicadas.</Typography>
    </Box>
    <Box component="details" sx={{mt:2,'& summary':{cursor:'pointer',color:'primary.main',fontSize:'.9rem',py:1}}}>
      <summary>Ver definición propuesta y fuentes</summary>
      <Typography variant="body2" sx={{mt:1}}>Unidades propuestas: {indicator.unit} · Frecuencia propuesta: {indicator.frequency.split('/').map(f=>frequencies[f]||f).join(' / ')}.</Typography>
      {indicator.unit.includes(' / ') && <Typography variant="body2" color="text.secondary" sx={{mt:1}}>Cada unidad requiere un componente de medición separado; la definición está pendiente de revisión.</Typography>}
      <Typography variant="body2" sx={{mt:1}}>Fuente preferente candidata (no respalda una medición): {indicator.preferred_sources}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{mt:1}}>Desagregaciones propuestas: {indicator.recommended_disaggregation}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{mt:1}}>Sin baseline ni meta cuantitativa documentadas.</Typography>
    </Box>
  </CardContent></Card>;
}

export function IndicatorSkeleton() { return <Box sx={{minHeight:300}}><Skeleton animation={false} width="60%" height={50}/><Skeleton animation={false} variant="rectangular" height={220}/></Box>; }
export function IndicatorSection({publicId,initial,initialError=false}:{publicId:string;initial:IndicatorBundle|null;initialError?:boolean}) {
  const [bundle,setBundle]=useState(initial),[error,setError]=useState(initialError),[loading,setLoading]=useState(false),[all,setAll]=useState(false),[expanded,setExpanded]=useState(false);
  const [expandedProposals,setExpandedProposals]=useState(false);
  const selectorId=useId();
  async function reload(history:boolean) {
    setAll(history);setLoading(true);setError(false);
    try { const response=await fetch(`/api/commitments/${encodeURIComponent(publicId)}/indicators?history=${history?'all':'recent'}`);if(!response.ok) throw new Error();setBundle(await response.json());setAll(history); } catch {setError(true);} finally {setLoading(false);}
  }
  const visible=expanded ? bundle?.links : bundle?.links.slice(0,4);
  const proposals=bundle?.annex?.indicators||[];
  const visibleProposals=expandedProposals?proposals:proposals.slice(0,4);
  const annexNotRequired=bundle?.requirement==='pending_review'&&bundle.annex?.requirement==='not_required';
  const counts=bundle ? proposals.length ? `${bundle.links.length?` · ${bundle.links.length} publicado${bundle.links.length===1?'':'s'}`:''} · ${proposals.length} propuesto${proposals.length===1?'':'s'}` : ` · ${bundle.links.length}` : '';
  return <Box component="section" aria-labelledby="indicators-heading" sx={{pt:4,borderTop:'1px solid',borderColor:'divider'}}>
    <Stack direction={{xs:'column',sm:'row'}} spacing={2} justifyContent="space-between" alignItems={{sm:'center'}}>
      <Typography id="indicators-heading" variant="h4" color="primary.main">Indicadores y evolución{counts}</Typography>
      {!!bundle?.links.length && <FormControl size="small" sx={{minWidth:170}}><InputLabel htmlFor={selectorId}>Histórico</InputLabel><NativeSelect id={selectorId} value={all?'all':'recent'} disabled={loading} onChange={event=>void reload(event.target.value==='all')}><option value="recent">Últimos 5 años</option><option value="all">Todo el histórico</option></NativeSelect></FormControl>}
    </Stack>
    <Typography variant="body2" color="text.secondary" sx={{mt:1.5,mb:2,lineHeight:1.75}}>Los indicadores aportan evidencia para la evaluación. Alcanzar una meta no determina por sí solo el cumplimiento de la recomendación.</Typography>
    {error ? <Alert severity="warning" action={<Button onClick={()=>void reload(all)}>Reintentar</Button>}>No se pudieron cargar los indicadores. La consulta fallida no indica ausencia de mediciones.</Alert> : loading ? <IndicatorSkeleton/> : bundle && <>
      {bundle.has_older&&!all&&<Alert severity="info" sx={{mb:2}}>Hay datos anteriores a la ventana de cinco años calendario. <Button onClick={()=>void reload(true)}>Todo el histórico</Button></Alert>}
      {!bundle.links.length&&!proposals.length && <Box sx={{py:3}}><Typography variant="body2" color="text.secondary">{bundle.requirement==='not_required'?'Esta recomendación se verifica mediante acciones y evidencia documental':annexNotRequired?'El anexo no propone indicadores para esta recomendación; propone verificarla mediante acciones y evidencia documental. Esta decisión está pendiente de revisión.':bundle.annex?'Sin indicadores publicados ni propuestas activas para esta recomendación.':bundle.requirement==='pending_review'?'La necesidad de indicadores está pendiente de revisión':'Indicadores pendientes de definición o revisión'}</Typography>{(bundle.reason||annexNotRequired&&bundle.annex?.reason) && <Typography variant="body2" color="text.secondary" sx={{mt:1}}>{bundle.reason||bundle.annex?.reason}</Typography>}{(bundle.requirement==='not_required'||annexNotRequired)&&<Button component="a" href="#evidencias">Ver evidencias</Button>}</Box>}
      <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:(visible?.length||0)>1?'repeat(2,minmax(0,1fr))':'1fr'},gap:2}}>{visible?.map(link=>{const indicator=bundle.indicators.find(i=>i.id===link.indicator_id);return indicator?<IndicatorCard key={link.id} indicator={indicator} link={link} bundle={bundle} allHistory={all}/>:null;})}</Box>
      {bundle.links.length>4 && <Button onClick={()=>setExpanded(!expanded)} sx={{mt:2}}>{expanded?'Mostrar menos':`Ver los ${bundle.links.length-4} indicadores restantes`}</Button>}
      {!!proposals.length && <Box sx={{mt:bundle.links.length?3:0}}>
        <Alert severity="info" sx={{mb:2}}>Estas asignaciones proceden del anexo metodológico y todavía no están validadas. No son evidencia de cumplimiento.{bundle.requirement==='pending_review' && ` El anexo propone que los indicadores sean ${bundle.annex?.requirement==='required'?'necesarios':'recomendados'} para esta recomendación.`}</Alert>
        <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:visibleProposals.length>1?'repeat(2,minmax(0,1fr))':'1fr'},gap:2}}>{visibleProposals.map(indicator=><AnnexIndicatorCard key={indicator.code} indicator={indicator} reason={bundle.annex!.reason}/>)}</Box>
        {proposals.length>4&&<Button onClick={()=>setExpandedProposals(!expandedProposals)} sx={{mt:2}}>{expandedProposals?'Mostrar menos propuestas':`Ver ${proposals.length-4} propuesta${proposals.length===5?'':'s'} restante${proposals.length===5?'':'s'}`}</Button>}
        <Typography variant="caption" color="text.secondary" sx={{display:'block',mt:2,overflowWrap:'anywhere'}}>Propuesta metodológica: {bundle.annex!.origin} · versión {bundle.annex!.version}.</Typography>
      </Box>}
    </>}
  </Box>;
}
