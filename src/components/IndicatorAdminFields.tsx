import { Stack,TextField } from '@mui/material';
export function Field({name,label,value='',required=false,multiline=false,type='text'}:{name:string;label:string;value?:string|number|null;required?:boolean;multiline?:boolean;type?:string}) {
  return <TextField fullWidth name={name} label={label} defaultValue={value??''} required={required} multiline={multiline} minRows={multiline?3:undefined} type={type} slotProps={type==='date'||type==='datetime-local'?{inputLabel:{shrink:true}}:undefined}/>;
}
export function Choice({name,label,value,options}:{name:string;label:string;value?:string|null;options:Record<string,string>}) {
  return <TextField fullWidth name={name} label={label} defaultValue={value??Object.keys(options)[0]} select slotProps={{select:{native:true}}}>{Object.entries(options).map(([v,l])=><option key={v} value={v}>{l}</option>)}</TextField>;
}
export const IndicatorFields = ({values={}}:{values?:Partial<Record<"topic"|"name"|"description"|"indicator_type"|"methodology"|"orientation"|"preferred_sources"|"recommended_disaggregation",string|null>>}) => <Stack spacing={2}>
  <Field name="topic" label="Tema" value={values.topic}/><Field name="name" label="Nombre" required value={values.name}/><Field name="description" label="Definición" required multiline value={values.description}/>
  <Choice name="indicator_type" label="Tipo" value={values.indicator_type} options={{structural:'Estructural',process:'Proceso (incluye recursos)',output:'Producto',outcome:'Resultado'}}/>
  <Field name="methodology" label="Metodología" multiline value={values.methodology}/>
  <Choice name="orientation" label="Orientación documentada" value={values.orientation||'neutral'} options={{neutral:'Neutral / contextual',higher_is_better:'Mayor es mejor',lower_is_better:'Menor es mejor',target_value:'Valor objetivo'}}/>
  <Field name="preferred_sources" label="Fuentes preferentes candidatas" value={values.preferred_sources}/><Field name="recommended_disaggregation" label="Desagregaciones recomendadas" value={values.recommended_disaggregation}/>
</Stack>;
