// Operational records are separate from the public tracker catalogue. No individual participants.
export type Scalar = string | number | boolean | null;
export type OperationalRecord = { id: string; created_at: string; updated_at: string; created_by: string; updated_by: string; archived_at: string | null } & Record<string, Scalar>;
export type Programme = OperationalRecord & {
  code: string; name: string; description: string; status: keyof typeof programmeStatuses;
  start_date: string | null; end_date: string | null; geographic_scope: string; thematic_scope: string;
  programme_manager: string | null; public_summary: string; internal_notes: string | null;
};
export type Project = OperationalRecord & {
  programme_id: string; project_code: string; title: string; short_title: string | null;
  country: string; country_code: string; description: string; context: string; overall_objective: string;
  status: keyof typeof projectStatuses; start_date: string | null; end_date: string | null;
  project_manager: string | null; funding_status: 'unfunded' | 'pending' | 'partial' | 'funded';
  donor: string | null; currency: string; total_budget: number | null; public_summary: string; internal_notes: string | null;
};
export type Partner = OperationalRecord & {
  legal_name: string; display_name: string; partner_type: 'NGO' | 'civil_society' | 'university' | 'research_institution' | 'public_institution' | 'international_organization' | 'donor' | 'network' | 'other';
  country: string; website: string | null; description: string; relationship_status: 'prospective' | 'active' | 'inactive' | 'ended';
  contact_name: string | null; contact_email: string | null; contact_phone: string | null; internal_notes: string | null; public_visibility: boolean;
};
export type ProjectPartner = OperationalRecord & {
  project_id: string; partner_id: string; role: 'implementing' | 'research' | 'technical' | 'academic' | 'funding' | 'civil_society';
  start_date: string | null; end_date: string | null; lead_partner: boolean; portal_access: boolean; public_visibility: boolean; notes: string | null;
};
export type Activity = OperationalRecord & {
  project_id: string; activity_code: string; title: string; description: string; activity_type: keyof typeof activityTypes; status: keyof typeof activityStatuses;
  planned_start_date: string | null; planned_end_date: string | null; actual_start_date: string | null; actual_end_date: string | null;
  country: string; location: string | null; responsible_partner_id: string | null; responsible_user_id: string | null;
  target_group_description: string | null; planned_participants: number | null; actual_participants: number | null; public_summary: string | null; internal_notes: string | null;
};
export type Output = OperationalRecord & {
  project_id: string; activity_id: string | null; title: string; description: string; planned_value: number | null; achieved_value: number | null; unit: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'; completion_date: string | null; verification_status: keyof typeof verification; public_visibility: boolean; partner_visibility: boolean;
};
export type Outcome = OperationalRecord & {
  project_id: string; specific_objective_id: string | null; title: string; description: string; level: 'immediate' | 'intermediate' | 'long_term';
  assumptions: string | null; risks: string | null; status: 'planned' | 'in_progress' | 'observed' | 'not_observed'; public_visibility: boolean; partner_visibility: boolean;
};
export type ProjectIndicator = OperationalRecord & {
  project_id: string; outcome_id: string | null; output_id: string | null; name: string; description: string; indicator_type: 'output' | 'outcome' | 'process';
  unit: string; baseline_value: number | null; baseline_date: string | null; target_value: number | null; target_date: string | null;
  partner_visibility: boolean; progress_method: 'none' | 'linear'; measurement_frequency: string | null; source_of_verification: string; responsible_user_id: string | null;
};
export type Measurement = OperationalRecord & {
  project_id: string; indicator_id: string; value: number; measurement_date: string; source: string;
  evidence_id: string | null; notes: string | null; recorded_by: string; supersedes_id: string | null;
};
export type ProjectEvidence = OperationalRecord & {
  project_id: string; activity_id: string | null; output_id: string | null; outcome_id: string | null; indicator_id: string | null;
  title: string; description: string; evidence_type: keyof typeof evidenceTypes; source: string; source_url: string | null; file_reference: string | null;
  evidence_date: string; uploaded_by: string; verification_status: keyof typeof verification; verified_by: string | null; verified_at: string | null;
  confidentiality: keyof typeof confidentiality; public_visibility: boolean; partner_visibility: boolean; submitted_by_partner_user: string | null; notes: string | null;
};
export type TargetGroup = OperationalRecord & { name: string; description: string };
export type SpecificObjective = OperationalRecord & { project_id: string; title: string; description: string; position: number };
export type CommitmentContribution = OperationalRecord & { project_id: string; commitment_id: string; contribution_description: string };
export type FieldDefinition = { name: string; label: string; type?: 'text' | 'long' | 'date' | 'number' | 'integer' | 'url' | 'email' | 'boolean' | 'relation'; required?: boolean; options?: Record<string,string>; relation?: string; default?: string; min?: number };
export type EntityDefinition = { table: string; title: string; singular: string; fields: FieldDefinition[]; columns: string[]; projectScoped?: boolean; description?: string };
const f = (name: string, label: string, type: FieldDefinition['type'] = 'text', required = false): FieldDefinition => ({name,label,type,required});
const choice = (name: string, label: string, options: Record<string,string>, value?: string): FieldDefinition => ({name,label,options,required:true,default:value});
const rel = (name: string, label: string, relation: string, required=false): FieldDefinition => ({name,label,type:'relation',relation,required});
const project = rel('project_id','Proyecto','projects',true);
const notes = f('internal_notes','Notas internas','long');
const summary = f('public_summary','Resumen preparado para publicación','long');
const visibility = choice('public_visibility','Preparado para publicación (sin publicación automática)',{false:'Privado',true:'Seleccionado expresamente para publicación'},'false');
const partnerVisibility = choice('partner_visibility','Compartir en el portal de partners',{false:'No compartido',true:'Compartido con los partners autorizados'},'false');
const desc = f('description','Descripción','long');
const dates = [f('start_date','Fecha de inicio','date'),f('end_date','Fecha de fin','date')];
export const verification = {pending:'Pendiente',verified:'Verificada',rejected:'Rechazada',requires_review:'Requiere revisión'};
export const programmeStatuses = {draft:'Borrador',planned:'Planificado',active:'Activo',paused:'Pausado',completed:'Completado',cancelled:'Cancelado'};
export const projectStatuses = {concept:'Concepto',design:'Diseño',proposed:'Propuesto',approved:'Aprobado',active:'Activo',paused:'Pausado',completed:'Completado',cancelled:'Cancelado'};
export const activityStatuses = {planned:'Planificada',in_progress:'En curso',completed:'Completada',delayed:'Retrasada',cancelled:'Cancelada'};
export const activityTypes = {research:'Investigación',workshop:'Taller',training:'Formación',consultation:'Consulta',meeting:'Reunión',field_activity:'Trabajo de campo',evidence_collection:'Recogida de evidencias',publication:'Publicación',advocacy:'Incidencia',stakeholder_engagement:'Participación de actores',assessment:'Evaluación',data_collection:'Recogida de datos',other:'Otro'};
export const evidenceTypes = {attendance_record:'Registro de asistencia (agregado)',report:'Informe',publication:'Publicación',dataset:'Dataset',meeting_minutes:'Acta',partner_confirmation:'Confirmación de partner',photograph:'Fotografía',survey:'Encuesta',evaluation:'Evaluación',training_material:'Material formativo',official_document:'Documento oficial',other:'Otro'};
export const confidentiality = {public:'Pública',partner:'Partners',internal:'Interna',restricted:'Restringida'};
export const entities: Record<string,EntityDefinition> = {
  programmes:{table:'programmes',title:'Programas',singular:'programa',columns:['code','name','status','start_date','end_date'],fields:[f('code','Código', 'text',true),f('name','Nombre','text',true),desc,choice('status','Estado',programmeStatuses,'draft'),...dates,f('geographic_scope','Ámbito geográfico'),f('thematic_scope','Ámbito temático'),f('programme_manager','Responsable del programa'),summary,notes]},
  projects:{table:'projects',title:'Proyectos',singular:'proyecto',columns:['project_code','title','country','status','start_date','end_date'],fields:[rel('programme_id','Programa','programmes',true),f('project_code','Código del proyecto','text',true),f('title','Título','text',true),f('short_title','Título breve'),f('country','País','text',true),f('country_code','Código ISO2 del país','text',true),desc,f('context','Contexto','long'),f('overall_objective','Objetivo general','long'),choice('status','Estado',projectStatuses,'concept'),...dates,f('project_manager','Responsable del proyecto'),choice('funding_status','Financiación',{unfunded:'Sin financiación',pending:'Pendiente',partial:'Parcial',funded:'Financiado'},'unfunded'),f('donor','Donante'),{...f('currency','Moneda ISO3','text',true),default:'EUR'},{...f('total_budget','Presupuesto total (interno)','number'),min:0},summary,notes]},
  partners:{table:'partners',title:'Partners',singular:'partner',columns:['display_name','partner_type','country','relationship_status'],fields:[f('legal_name','Razón social','text',true),f('display_name','Nombre visible','text',true),choice('partner_type','Tipo',{NGO:'ONG',civil_society:'Sociedad civil',university:'Universidad',research_institution:'Institución de investigación',public_institution:'Institución pública',international_organization:'Organización internacional',donor:'Donante',network:'Red',other:'Otro'}),f('country','País','text',true),f('website','Web','url'),desc,choice('relationship_status','Relación',{prospective:'Prospectiva',active:'Activa',inactive:'Inactiva',ended:'Finalizada'},'prospective'),f('contact_name','Persona de contacto (interno)'),f('contact_email','Email de contacto (interno)','email'),f('contact_phone','Teléfono de contacto (interno)'),notes,visibility]},
  activities:{table:'project_activities',title:'Actividades',singular:'actividad',projectScoped:true,columns:['activity_code','title','activity_type','responsible_partner_id','planned_start_date','status','evidence_count'],description:'Una actividad describe lo que hacemos. Registra cifras agregadas y grupos objetivo; evita datos personales de participantes.',fields:[project,f('activity_code','Código de actividad','text',true),f('title','Título','text',true),desc,choice('activity_type','Tipo',activityTypes),choice('status','Estado',activityStatuses,'planned'),f('planned_start_date','Inicio previsto','date'),f('planned_end_date','Fin previsto','date'),f('actual_start_date','Inicio real','date'),f('actual_end_date','Fin real','date'),f('country','País','text',true),f('location','Ubicación'),rel('responsible_partner_id','Partner responsable (asignado al proyecto)','projectPartners'),f('responsible_user_id','Identificador del responsable interno'),f('target_group_description','Descripción del grupo objetivo','long'),{...f('planned_participants','Participantes previstos (agregado)','integer'),min:0},{...f('actual_participants','Participantes reales (agregado)','integer'),min:0},summary,notes]},
  outputs:{table:'project_outputs',title:'Productos · Outputs',singular:'producto',projectScoped:true,columns:['title','activity_id','planned_value','achieved_value','unit','status','verification_status'],description:'Producto directamente generado por el proyecto; su consecución no demuestra implementación estatal.',fields:[project,rel('activity_id','Actividad generadora','activities'),f('title','Título','text',true),desc,f('planned_value','Valor previsto','number'),f('achieved_value','Valor alcanzado','number'),f('unit','Unidad'),choice('status','Estado',{planned:'Previsto',in_progress:'En curso',completed:'Completado',cancelled:'Cancelado'},'planned'),f('completion_date','Fecha de finalización','date'),choice('verification_status','Verificación',verification,'pending'),visibility,partnerVisibility]},
  outcomes:{table:'project_outcomes',title:'Cambios · Outcomes',singular:'outcome',projectScoped:true,columns:['title','specific_objective_id','level','status'],description:'Cambio al que contribuye el proyecto. Las hipótesis y los riesgos se conservan como información interna.',fields:[project,rel('specific_objective_id','Objetivo específico','objectives'),f('title','Título','text',true),desc,choice('level','Nivel',{immediate:'Inmediato',intermediate:'Intermedio',long_term:'Largo plazo'},'immediate'),f('assumptions','Hipótesis (internas)','long'),f('risks','Riesgos (internos)','long'),choice('status','Estado',{planned:'Previsto',in_progress:'En curso',observed:'Observado',not_observed:'No observado'},'planned'),visibility,partnerVisibility]},
  indicators:{table:'project_indicators',title:'Indicadores de proyecto',singular:'indicador',projectScoped:true,columns:['name','indicator_type','baseline_value','current_value','target_value','unit','progress','source_of_verification','last_updated_at'],description:'Las mediciones se añaden al histórico. El progreso lineal solo se muestra si se documenta que la unidad admite esa comparación.',fields:[project,rel('outcome_id','Outcome (solo indicadores de outcome)','outcomes'),rel('output_id','Output (solo indicadores de output)','outputs'),f('name','Nombre','text',true),desc,choice('indicator_type','Tipo',{output:'Producto',outcome:'Cambio',process:'Proceso'}),f('unit','Unidad','text',true),f('baseline_value','Línea de base (si está disponible)','number'),f('baseline_date','Fecha de línea de base','date'),f('target_value','Meta (si está disponible)','number'),f('target_date','Fecha objetivo','date'),choice('progress_method','Método de progreso',{none:'Sin porcentaje: comparación contextual',linear:'Lineal: unidad comparable y trayectoria hacia la meta'},'none'),f('measurement_frequency','Frecuencia de medición'),f('source_of_verification','Fuente / método de verificación','long',true),f('responsible_user_id','Identificador del responsable interno'),partnerVisibility]},
  evidence:{table:'project_evidence',title:'Evidencias de proyecto',singular:'evidencia',projectScoped:true,columns:['title','activity_id','evidence_type','evidence_date','verification_status','confidentiality','public_visibility'],description:'Archivo privado del proyecto. La selección para publicación exige confidencialidad pública y verificación. La carga o referencia de un documento no lo publica.',fields:[project,rel('activity_id','Actividad','activities'),rel('output_id','Producto','outputs'),rel('outcome_id','Outcome','outcomes'),rel('indicator_id','Indicador de proyecto','indicators'),f('title','Título','text',true),desc,choice('evidence_type','Tipo',evidenceTypes),f('source','Fuente','text',true),f('source_url','URL de la fuente','url'),f('file_reference','Referencia del archivo en el repositorio privado'),f('evidence_date','Fecha de la evidencia','date',true),choice('verification_status','Verificación',verification,'pending'),choice('confidentiality','Confidencialidad',confidentiality,'internal'),visibility,partnerVisibility,f('notes','Notas internas','long')]},
  objectives:{table:'project_specific_objectives',title:'Objetivos específicos',singular:'objetivo específico',projectScoped:true,columns:['title','position'],fields:[project,f('title','Objetivo','text',true),desc,{...f('position','Orden','integer',true),default:'0'}]},
  assignments:{table:'project_partners',title:'Asignaciones de partners',singular:'asignación de partner',projectScoped:true,columns:['partner_id','role','lead_partner','start_date','end_date'],fields:[project,rel('partner_id','Partner','partners',true),choice('role','Rol',{implementing:'Implementación',research:'Investigación',technical:'Técnico',academic:'Académico',funding:'Financiación',civil_society:'Sociedad civil'}),...dates,choice('lead_partner','Partner principal',{false:'No',true:'Sí'},'false'),choice('portal_access','Acceso de este partner al proyecto',{false:'Desactivado',true:'Activado'},'false'),visibility,f('notes','Notas internas','long')]},
  'output-outcomes':{table:'project_output_outcomes',title:'Contribuciones de outputs a outcomes',singular:'contribución',projectScoped:true,columns:['output_id','outcome_id'],fields:[project,rel('output_id','Output','outputs',true),rel('outcome_id','Outcome al que contribuye','outcomes',true)]},
  'target-groups':{table:'programme_target_groups',title:'Grupos objetivo',singular:'grupo objetivo',columns:['name','description'],fields:[f('name','Grupo','text',true),desc]},
  'project-groups':{table:'project_target_groups',title:'Grupos del proyecto',singular:'grupo del proyecto',projectScoped:true,columns:['target_group_id'],fields:[project,rel('target_group_id','Grupo objetivo','target-groups',true)]},
  'activity-groups':{table:'activity_target_groups',title:'Grupos de la actividad',singular:'grupo de la actividad',projectScoped:true,columns:['activity_id','target_group_id'],fields:[project,rel('activity_id','Actividad','activities',true),rel('target_group_id','Grupo objetivo','target-groups',true)]},
  'project-commitments':{table:'project_commitments',title:'Compromisos relacionados',singular:'relación con compromiso',projectScoped:true,columns:['commitment_id','contribution_description'],fields:[project,rel('commitment_id','Compromiso existente','commitments',true),f('contribution_description','Contribución / pertinencia de la intervención','long',true)]},
  'activity-commitments':{table:'activity_commitments',title:'Compromisos de la actividad',singular:'relación con compromiso',projectScoped:true,columns:['activity_id','commitment_id','contribution_description'],fields:[project,rel('activity_id','Actividad','activities',true),rel('commitment_id','Compromiso existente','commitments',true),f('contribution_description','Contribución / pertinencia de la intervención','long',true)]},
  'output-commitments':{table:'output_commitments',title:'Compromisos del producto',singular:'relación con compromiso',projectScoped:true,columns:['output_id','commitment_id','contribution_description'],fields:[project,rel('output_id','Output','outputs',true),rel('commitment_id','Compromiso existente','commitments',true),f('contribution_description','Contribución / pertinencia de la intervención','long',true)]},
  measurements:{table:'project_indicator_measurements',title:'Histórico de mediciones',singular:'medición',projectScoped:true,columns:['indicator_id','value','measurement_date','source','recorded_by'],fields:[project,rel('indicator_id','Indicador','indicators',true),f('value','Valor medido','number',true),f('measurement_date','Fecha de medición','date',true),f('source','Fuente / referencia verificable','long',true),rel('evidence_id','Evidencia del proyecto','evidence'),f('notes','Notas / motivo de corrección','long'),f('supersedes_id','UUID de la medición corregida (misma fecha e indicador)')]},
};
export const navigation = [['','Resumen'],['programmes','Programas'],['projects','Proyectos'],['partners','Partners'],['activities','Actividades'],['results','Resultados'],['indicators','Indicadores'],['evidence','Evidencias']] as const;
export const rootPath = '/admin/programmes';
export function recordName(row: OperationalRecord): string { return String(row.title || row.name || row.display_name || row.project_code || row.code || row.id); }
export function sectionForTable(table: string) { return Object.keys(entities).find(s=>entities[s].table===table); }
export function entityFor(section: string) { return Object.hasOwn(entities,section) ? entities[section] : null; }
export function fieldLabel(name: string) { return Object.values(entities).flatMap(e=>e.fields).find(f=>f.name===name)?.label || ({evidence_count:'Evidencias',current_value:'Valor actual',progress:'Progreso',last_updated_at:'Última medición',recorded_by:'Registrado por'} as Record<string,string>)[name] || name; }
export function valueLabel(name: string, value: Scalar) {
  if(value===null || value===undefined || value==='') return 'Datos no disponibles';
  if(/(?:_date|_at)$/.test(name)&&typeof value==='string'&&!Number.isNaN(Date.parse(value))) return /T/.test(value)?new Date(value).toLocaleString('es-ES',{timeZone:'Europe/Madrid'}):new Date(value).toLocaleDateString('es-ES',{timeZone:'Europe/Madrid'});
  if(name==='status') return ({...programmeStatuses,...projectStatuses,...activityStatuses,observed:'Observado',not_observed:'No observado'} as Record<string,string>)[String(value)] || String(value);
  const field = Object.values(entities).flatMap(e=>e.fields).find(f=>f.name===name&&f.options&&Object.hasOwn(f.options,String(value)));
  return field?.options?.[String(value)] || (typeof value==='boolean' ? value?'Sí':'No' : String(value));
}
export function currentMeasurement(rows: Measurement[], indicatorId: string): Measurement | null {
  const superseded = new Set(rows.map(r=>r.supersedes_id).filter(Boolean));
  return rows.filter(r=>r.indicator_id===indicatorId&&!superseded.has(r.id)).sort((a,b)=>b.measurement_date.localeCompare(a.measurement_date)||b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id))[0] || null;
}
export function indicatorProgress(indicator: ProjectIndicator, current: number | null): number | null {
  const {baseline_value:b,target_value:t}=indicator;
  if(indicator.progress_method!=='linear'||b===null||t===null||current===null||![b,t,current].every(Number.isFinite)||b===t) return null;
  return (current-b)/(t-b)*100;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validId(value: string) { return uuid.test(value); }
export function parseValues(section: string, form: FormData): Record<string,Scalar> {
  const entity=entityFor(section); if(!entity) throw new Error('Entidad desconocida.');
  const result:Record<string,Scalar>={};
  for(const field of entity.fields) {
    let raw=String(form.get(field.name)??field.default??'').trim();
    if(field.name==='country_code'||field.name==='currency') raw=raw.toUpperCase();
    if(field.required&&!raw) throw new Error(`${field.label}: campo obligatorio.`);
    if(!raw) { result[field.name]=field.required?'':null; continue; }
    if(raw.length>20000) throw new Error(`${field.label}: texto demasiado largo.`);
    if(field.options&&!Object.hasOwn(field.options,raw)) throw new Error(`${field.label}: opción inválida.`);
    if(field.name==='public_visibility'||field.name==='lead_partner'||field.name==='partner_visibility'||field.name==='portal_access') result[field.name]=raw==='true';
    else if(field.type==='number'||field.type==='integer') {
      const number=Number(raw); if(!Number.isFinite(number)|| (field.type==='integer'&&!Number.isInteger(number)) || (field.min!==undefined&&number<field.min)) throw new Error(`${field.label}: número inválido.`);
      result[field.name]=number;
    } else {
      if(field.type==='relation'&&!validId(raw)) throw new Error(`${field.label}: selecciona un registro válido.`);
      if(field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(raw)||Number.isNaN(Date.parse(raw))||new Date(raw).toISOString().slice(0,10)!==raw)) throw new Error(`${field.label}: fecha inválida.`);
      if(field.type==='url'&&!/^https?:\/\//i.test(raw)) throw new Error(`${field.label}: usa una URL HTTP(S).`);
      if(field.name==='country_code'&&!/^[A-Z]{2}$/.test(raw)) throw new Error('El país requiere un código ISO2.');
      if(field.name==='currency'&&!/^[A-Z]{3}$/.test(raw)) throw new Error('La moneda requiere un código ISO3.');
      if(field.name==='supersedes_id'&&!validId(raw)) throw new Error('UUID de corrección inválido.');
      result[field.name]=raw;
    }
  }
  // Database defaults for optional descriptions are empty strings, never invented values.
  for(const name of ['description','context','overall_objective','geographic_scope','thematic_scope','public_summary']) if(name in result && result[name]===null) result[name]='';
  for(const [start,end] of [['start_date','end_date'],['planned_start_date','planned_end_date'],['actual_start_date','actual_end_date']]) if(result[start]&&result[end]&&String(result[end])<String(result[start])) throw new Error('La fecha de fin precede al inicio.');
  if(section==='evidence'&&result.public_visibility&&(result.confidentiality!=='public'||result.verification_status!=='verified')) throw new Error('La selección pública requiere evidencia pública y verificada.');
  if(section==='evidence'&&result.partner_visibility&&(!['public','partner'].includes(String(result.confidentiality))||result.verification_status!=='verified')) throw new Error('Compartir con partners requiere evidencia verificada y confidencialidad pública o partners.');
  if(section==='indicators') {
    if(result.output_id&&result.outcome_id || result.indicator_type==='output'&&result.outcome_id || result.indicator_type==='outcome'&&result.output_id || result.indicator_type==='process'&&(result.output_id||result.outcome_id)) throw new Error('La relación debe corresponder al tipo de indicador.');
    if(result.progress_method==='linear'&&(result.baseline_value===null||result.target_value===null||result.baseline_value===result.target_value)) throw new Error('El progreso lineal requiere una base y meta distintas, en una unidad comparable.');
  }
  if(section==='outputs'&&(result.planned_value!==null||result.achieved_value!==null)&&!result.unit) throw new Error('Los valores del output requieren una unidad.');
  return result;
}
