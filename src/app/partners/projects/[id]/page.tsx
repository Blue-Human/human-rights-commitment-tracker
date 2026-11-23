import { notFound } from 'next/navigation';
import { Box, Link, Stack, Typography } from '@mui/material';
import { requirePartner, partnerProject, type SharedRecord } from '@/lib/partners/server';
import { validId, evidenceTypes, verification, valueLabel } from '@/lib/programmes/model';
import { PartnerFrame } from '@/components/partners/PartnerFrame';
import { AdminSection } from '@/components/AdminFrame';
import { IndicatorAdminForm } from '@/components/IndicatorAdminForm';
import { Field, Choice } from '@/components/IndicatorAdminFields';
import { submitPartnerEvidence } from '../../actions';
function SharedList({ rows, emptyMessage }: { rows: SharedRecord[]; emptyMessage: string }) {
  if (!rows.length) return <Typography color="text.secondary">{emptyMessage}</Typography>;
  return <Stack spacing={3}>{rows.map(row => <Box key={row.id}>
    <Typography fontWeight={600}>{row.title || row.name}</Typography>
    {(row.description || row.public_summary) && <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mt: .5 }}>{row.description || row.public_summary}</Typography>}
    {row.status && <Typography variant="body2" color="text.secondary">{valueLabel('status', row.status)}</Typography>}
    {row.planned_start_date && <Typography variant="body2">{valueLabel('planned_start_date', row.planned_start_date)} — {valueLabel('planned_end_date', row.planned_end_date)}</Typography>}
    {'achieved_value' in row && <Typography variant="body2">Alcanzado: {row.achieved_value ?? 'Datos no disponibles'} {row.achieved_value !== null && row.unit} · Previsto: {row.planned_value ?? 'Datos no disponibles'}</Typography>}
    {'current_value' in row && <Typography variant="body2">Valor actual: {row.current_value ?? 'Datos no disponibles'} {row.current_value !== null && row.unit} · Base: {row.baseline_value ?? 'Datos no disponibles'} · Meta: {row.target_value ?? 'Datos no disponibles'}{row.measurement_date && ` · ${valueLabel('measurement_date', row.measurement_date)}`}</Typography>}
    {row.evidence_date && <Typography variant="body2" color="text.secondary">{valueLabel('evidence_date', row.evidence_date)} · {verification[row.verification_status as keyof typeof verification]}</Typography>}
    {row.source && <Typography variant="body2">Fuente: {row.source}</Typography>}
    {typeof row.source_url === 'string' && /^https?:\/\//i.test(row.source_url) && <Link href={row.source_url} target="_blank" rel="noopener noreferrer" sx={{ overflowWrap: 'anywhere' }}>Consultar documento</Link>}
  </Box>)}</Stack>;
}
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const account = await requirePartner(), { id } = await params;
  if (!validId(id)) notFound();
  const data = await partnerProject(account, id); if (!data) notFound();
  return <PartnerFrame title={String(data.project.title)}>
    <Typography variant="overline">{data.project.project_code} · {data.project.country}</Typography>
    <Typography sx={{ mt: 1, whiteSpace: 'pre-line' }}>{data.project.public_summary || data.project.overall_objective}</Typography>
    <AdminSection title="Tus actividades"><SharedList rows={data.activities} emptyMessage="Aún no hay actividades asignadas a tu organización." /></AdminSection>
    <AdminSection title="Resultados e indicadores"><SharedList rows={[...data.outputs, ...data.outcomes, ...data.indicators]} emptyMessage="Aún no se han compartido resultados o indicadores." /></AdminSection>
    <AdminSection title="Evidencias compartidas"><SharedList rows={data.evidence} emptyMessage="Aún no hay evidencias compartidas." /></AdminSection>
    <AdminSection title="Enviar una evidencia" note="Añade una referencia o un enlace al documento. Blue Human revisará el contenido. Evita datos personales de participantes.">
      <IndicatorAdminForm action={submitPartnerEvidence} label="Enviar evidencia">
        <input type="hidden" name="project_id" value={id} />
        <Stack spacing={2}>
        <Field name="title" label="Título" required /><Field name="description" label="Descripción" multiline />
        <Choice name="activity_id" label="Actividad (opcional)" value="" options={{ '': 'Evidencia del proyecto', ...Object.fromEntries(data.activities.map(a => [a.id, String(a.title)])) }} />
        <Choice name="evidence_type" label="Tipo de evidencia" value="report" options={evidenceTypes} />
        <Field name="source" label="Fuente" required /><Field name="source_url" label="Enlace al documento (opcional)" type="url" />
        <Field name="evidence_date" label="Fecha de la evidencia" type="date" required />
        </Stack>
      </IndicatorAdminForm>
    </AdminSection>
    <AdminSection title="Tus aportaciones enviadas"><SharedList rows={data.submissions} emptyMessage="Aún no has enviado aportaciones." /></AdminSection>
  </PartnerFrame>;
}
