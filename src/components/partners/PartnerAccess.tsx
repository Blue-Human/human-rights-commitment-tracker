'use client';
import { useActionState, useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { invitePartner, changePartnerAccess } from '@/app/partners/actions';
import { IndicatorAdminForm } from '@/components/IndicatorAdminForm';
import { Field } from '@/components/IndicatorAdminFields';
type Account = { id: string; display_name: string; email: string; active: boolean; activated_at: string | null };
export function PartnerAccess({ partnerId, accounts }: { partnerId: string; accounts: Account[] }) {
  const [state, dispatch, pending] = useActionState(async (_previous: Awaited<ReturnType<typeof invitePartner>>, form: FormData) => invitePartner(form), {});
  const [copied, setCopied] = useState(false);
  const invitation = state.invitation ? `${typeof window !== 'undefined' ? window.location.origin : ''}${state.invitation}` : '';
  return <>
    <Typography variant="body2">Invita a una persona y activa el acceso en la asignación de su organización al proyecto. Compartirá los resultados y evidencias que selecciones.</Typography>
    <Box component="form" action={dispatch} sx={{ mt: 2 }}>
      <input type="hidden" name="partner_id" value={partnerId} />
      <Stack spacing={2}><Field name="display_name" label="Nombre de la persona" required /><Field name="email" label="Email de acceso" type="email" required /></Stack>
      {state.error && <Alert severity="error">{state.error}</Alert>}
      {state.success && <Alert severity="success" sx={{ my: 2 }}>{state.success}</Alert>}
      {invitation && <Stack spacing={1} sx={{ my: 2 }}><TextField label="Enlace de invitación" value={invitation} fullWidth slotProps={{ input: { readOnly: true } }} /><Button onClick={async () => { try { await navigator.clipboard.writeText(invitation); setCopied(true); } catch { setCopied(false); } }}>{copied ? 'Enlace copiado' : 'Copiar enlace'}</Button></Stack>}
      <Button type="submit" variant="outlined" disabled={pending} onClick={() => setCopied(false)}>{pending ? 'Creando…' : 'Crear invitación'}</Button>
    </Box>
    {accounts.map(account => <Box key={account.id} sx={{ mt: 3, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
      <Typography sx={{ overflowWrap: 'anywhere' }}>{account.display_name} · {account.email}</Typography>
      <Typography variant="body2" color="text.secondary">{!account.active ? 'Acceso desactivado' : account.activated_at ? 'Acceso activo' : 'Invitación pendiente de activar'}</Typography>
      <IndicatorAdminForm action={changePartnerAccess} label={account.active ? 'Desactivar acceso' : 'Activar acceso'}><input type="hidden" name="partner_id" value={partnerId} /><input type="hidden" name="id" value={account.id} /><input type="hidden" name="active" value={String(!account.active)} /></IndicatorAdminForm>
    </Box>)}
  </>;
}
