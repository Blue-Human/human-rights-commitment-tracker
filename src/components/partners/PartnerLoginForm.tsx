'use client';
import { useState } from 'react';
import { TextField } from '@mui/material';
import { IndicatorAdminForm } from '@/components/IndicatorAdminForm';
import { loginPartner } from '@/app/partners/actions';
export function PartnerLoginForm() {
  const [email, setEmail] = useState('');
  return <IndicatorAdminForm action={loginPartner} label="Entrar">
    <TextField name="email" label="Email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} fullWidth required sx={{ my: 1 }} />
    <TextField name="password" label="Contraseña" type="password" autoComplete="current-password" fullWidth required sx={{ my: 1 }} />
  </IndicatorAdminForm>;
}
