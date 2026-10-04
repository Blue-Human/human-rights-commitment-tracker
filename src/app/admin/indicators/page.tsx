import Link from 'next/link';
import { Button,Stack,TextField,Typography } from '@mui/material';
import { AdminFrame,AdminSection } from '@/components/AdminFrame';
import { IndicatorAdminForm } from '@/components/IndicatorAdminForm';
import { Field,IndicatorFields } from '@/components/IndicatorAdminFields';
import { listIndicators } from '@/lib/admin/indicators';
import { requireAdmin } from '@/lib/admin/session';
import { createIndicator } from './actions';
export const metadata={title:'Indicadores | HRCT',robots:{index:false,follow:false}};
export default async function IndicatorCatalogue({searchParams}:{searchParams:Promise<{q?:string}>}) {
  await requireAdmin(); const {q=''}=await searchParams;
  let indicators;try {indicators=await listIndicators(q);}catch {return <AdminFrame title="Indicadores"><Typography>El catálogo no está disponible. Comprueba la conexión y que se hayan aplicado las migraciones de indicadores.</Typography></AdminFrame>;}
  return <AdminFrame title="Catálogo de indicadores" intro="Reutiliza indicadores y revisa sus definiciones y componentes. Las propuestas del anexo no son evidencia publicada. La revisión metodológica sigue el expediente de Jira; registra su referencia en la metodología y las citas.">
    <Stack component="form" direction="row" spacing={2} sx={{mb:3}}><TextField fullWidth name="q" label="Buscar por código, nombre o definición antes de crear" defaultValue={q}/><Button type="submit" variant="outlined">Buscar</Button></Stack>
    <AdminSection title={`${indicators.length} indicadores`}><Stack spacing={1.5}>{indicators.map(i=><Stack key={i.id} direction={{xs:'column',sm:'row'}} spacing={2} justifyContent="space-between"><Typography variant="body2">{i.code||'Heredado'} · {i.name} · {i.editorial_status}</Typography><Button component={Link} href={`/admin/indicators/${i.id}`} size="small">Datos y revisión</Button></Stack>)}</Stack></AdminSection>
    <AdminSection title="Crear indicador" note="Busca primero para evitar duplicados. Al crear se guarda un borrador; define al menos un componente antes de añadir mediciones."><IndicatorAdminForm action={createIndicator} label="Crear borrador"><Stack spacing={2} sx={{maxWidth:800}}><Field name="code" label="Código canónico único" required/><IndicatorFields/></Stack></IndicatorAdminForm></AdminSection>
  </AdminFrame>;
}
