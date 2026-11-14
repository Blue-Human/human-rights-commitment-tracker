// Synthetic preview fixture. Used only by tests, never by application routes or production seeds.
export function previewBundle() {
  const year=new Date().getUTCFullYear();
  const scope={territory:'national',population:'all'},women={territory:'national',population:'women'};
  const indicator={id:'fixture-indicator',code:'TEST-001',name:'Indicador sintético de prueba',description:'Datos sintéticos: exclusivamente para pruebas aisladas.',indicator_type:'outcome',topic:'TEST',methodology:'Metodología sintética para pruebas',orientation:'neutral',preferred_sources:'Fuente candidata de pruebas',recommended_disaggregation:'Población',updated_at:`${year}-01-01`};
  const component={id:'fixture-component',indicator_id:indicator.id,code:'default',label:'Tasa sintética',unit:'%',value_type:'numeric',frequency:'annual',visualization:'line',definition:'Definición sintética, nunca publicar.',formula:'Numerador de prueba / denominador de prueba × 100',editorial_status:'published'};
  const link={id:'fixture-link',indicator_id:indicator.id,role:'primary',rationale:'Relación sintética exclusiva de pruebas.',rationale_kind:'specific',scope:{},component_id:null,baseline_value_id:null,baseline_reason:null,target_operator:null,target_type:null,target_value:null,target_upper:null,target_date:null,target_source_url:null,target_citation:null,updated_at:`${year}-01-01`};
  const point=(offset,value,group=scope,extras={})=>({id:`fixture-${offset}-${group.population}`,indicator_id:indicator.id,component_id:component.id,country_iso2:'ES',scope:group,period_start:`${year-offset}-01-01`,period_end:`${year-offset}-12-31`,numeric_value:value,boolean_value:null,text_value:null,missing_reason:null,unit:'%',source_url:'https://example.test/fixture',source_title:'Fuente sintética aislada',citation:'Fixture TEST, no evidencia',publication_date:`${year}-01-01`,retrieved_at:`${year}-01-02`,series_key:'test-series',methodology_version:'test-v1',comparability_notes:null,break_before:false,quality_notes:null,editorial_status:'published',selection_reason:'Selección de fuente sintética',supersedes_id:null,reviewed_at:`${year}-01-02`,updated_at:`${year}-01-02`,...extras});
  const values=[point(7,17),point(4,20),point(3,22),point(1,24,scope,{break_before:true,comparability_notes:'Ruptura sintética de metodología'}),point(1,0,women)];
  return {requirement:'required',reason:'Fixture TEST',links:[link],indicators:[indicator],components:[component],values,latest:[values[3],values[4]],baselines:[],has_older:true};
}
export function manyPreviewBundle() {
  const base=previewBundle(),result={...base,links:[],indicators:[],components:[],values:[],latest:[]};
  for(let i=0;i<5;i++) {
    const indicatorId=`fixture-indicator-${i}`,componentId=`fixture-component-${i}`;
    result.links.push({...base.links[0],id:`fixture-link-${i}`,indicator_id:indicatorId,role:i===0?'primary':'supporting'});
    result.indicators.push({...base.indicators[0],id:indicatorId,code:`TEST-00${i}`,name:`Indicador sintético ${i}`});
    result.components.push({...base.components[0],id:componentId,indicator_id:indicatorId,visualization:i===1?'bar':'line'});
    result.values.push(...base.values.map(v=>({...v,id:`${v.id}-${i}`,indicator_id:indicatorId,component_id:componentId})));
    result.latest.push(...base.latest.map(v=>({...v,id:`${v.id}-${i}`,indicator_id:indicatorId,component_id:componentId})));
  }
  return result;
}
