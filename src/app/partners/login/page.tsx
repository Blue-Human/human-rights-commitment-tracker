import { Typography } from '@mui/material';
import { redirect } from 'next/navigation';
import { currentPartner } from '@/lib/partners/server';
import { PartnerFrame } from '@/components/partners/PartnerFrame';
import { PartnerLoginForm } from '@/components/partners/PartnerLoginForm';
export default async function Login() {
  if (await currentPartner()) redirect('/partners');
  return <PartnerFrame title="Entrar" signedIn={false}>
    <Typography color="text.secondary">Accede con el email y la contraseña de tu invitación.</Typography>
    <PartnerLoginForm />
    <Typography variant="body2" color="text.secondary">Para obtener acceso o restablecer tu contraseña, pide una nueva invitación a tu contacto de Blue Human.</Typography>
  </PartnerFrame>;
}
