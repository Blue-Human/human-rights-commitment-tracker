'use client';
import { useActionState } from 'react';
import { Alert, Box, Button } from '@mui/material';
export function IndicatorAdminForm({action,label,children}:{action:(form:FormData)=>Promise<{error?:string;success?:string}>;label:string;children:React.ReactNode}) {
  const [state,dispatch,pending]=useActionState(async (_previous:{error?:string;success?:string},form:FormData)=>action(form),{});
  return <Box component="form" action={dispatch} sx={{my:2}}>{children}{state.error&&<Alert severity="error" sx={{my:1}}>{state.error}</Alert>}{state.success&&<Alert severity="success" sx={{my:1}}>{state.success}</Alert>}<Button disabled={pending} type="submit" variant="outlined" sx={{mt:2}}>{pending?'Guardando…':label}</Button></Box>;
}
