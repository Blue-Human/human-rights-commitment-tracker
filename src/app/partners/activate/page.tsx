import { Alert, Typography, TextField } from '@mui/material';
import { PartnerFrame } from '@/components/partners/PartnerFrame';
import { IndicatorAdminForm } from '@/components/IndicatorAdminForm';
import { activatePartner } from '../actions';
export default async function Activate({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <PartnerFrame title="Activar acceso" signedIn={false}>
    {!token || !/^[a-f0-9]{64}$/.test(token) ? <Alert severity="warning">La invitación no es válida. Pide una nueva a Blue Human.</Alert> : <>
      <Typography color="text.secondary">Elige tu contraseña para entrar al portal. El enlace se puede usar una sola vez y caduca en 7 días.</Typography>
      <IndicatorAdminForm action={activatePartner} label="Activar y entrar">
        <input type="hidden" name="token" value={token} />
        <TextField name="password" label="Contraseña (mínimo 12 caracteres)" type="password" autoComplete="new-password" fullWidth required sx={{ my: 1 }} slotProps={{ htmlInput: { minLength: 12, maxLength: 128 } }} />
        <TextField name="confirmation" label="Repite la contraseña" type="password" autoComplete="new-password" fullWidth required sx={{ my: 1 }} />
      </IndicatorAdminForm>
    </>}
  </PartnerFrame>;
}
