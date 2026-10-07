"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { sendContactMessage } from "@/app/contact/actions";
import { brand } from "@/brand";
import { CONTACT_EMAIL, MESSAGE_MAX, inquiryType, inquiryTypes, type ContactResult } from "@/lib/contact";

const full = { gridColumn: "1 / -1" };

// The contact form. The kind of enquiry chosen decides which extra fields are asked for.
export function ContactForm() {
  const [type, setType] = useState("");
  const [result, setResult] = useState<ContactResult | null>(null);
  const [pending, startTransition] = useTransition();
  const confirmation = useRef<HTMLDivElement>(null);
  const chosen = inquiryType(type);
  const sent = result?.ok === true;
  const errors = (result && !result.ok && result.fields) || {};

  // The confirmation replaces the form: a screen reader is taken to it.
  useEffect(() => { if (sent) confirmation.current?.focus(); }, [sent]);

  // Sent by hand, not as a form action, so that the fields keep what was written when the server answers with an error.
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        setResult(await sendContactMessage(form));
      } catch {
        setResult({ ok: false, error: `No se ha podido enviar el mensaje. Puede escribirse directamente a ${CONTACT_EMAIL}.` });
      }
    });
  }

  if (sent) {
    return (
      <Box ref={confirmation} tabIndex={-1} role="status" sx={{ p: { xs: 2.25, md: 3 }, bgcolor: brand.soft, borderTop: "2px solid", borderColor: "secondary.main", outline: "none" }}>
        <Typography variant="h5" component="h2" color="primary.main">Mensaje enviado</Typography>
        <Typography color="text.secondary" sx={{ mt: 1.25, mb: 2, lineHeight: 1.7, maxWidth: 560 }}>
          Gracias por escribir al HRCI. La respuesta llegará al correo electrónico indicado.
        </Typography>
        <Button onClick={() => { setResult(null); setType(""); }} sx={{ px: 0 }}>Enviar otro mensaje</Button>
      </Box>
    );
  }

  return (
    <Box component="form" aria-label="Formulario de contacto" onSubmit={submit} sx={{ pt: 2.5, borderTop: "2px solid", borderColor: "secondary.main" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", sm: "repeat(2,minmax(0,1fr))" }, columnGap: 2, rowGap: 2 }}>
        <TextField
          select
          name="type"
          label="Tipo de consulta"
          value={type}
          onChange={(event) => setType(event.target.value)}
          required
          fullWidth
          error={!!errors.type}
          helperText={errors.type || chosen?.hint}
          sx={full}
        >
          {inquiryTypes.map(({ value, label }) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </TextField>

        <TextField name="name" label="Nombre" autoComplete="name" required fullWidth error={!!errors.name} helperText={errors.name} sx={chosen?.extra === "organisation" ? undefined : full} slotProps={{ htmlInput: { maxLength: 120 } }} />
        {chosen?.extra === "organisation" && (
          <TextField name="organisation" label={`${chosen.organisationLabel} (opcional)`} autoComplete="organization" fullWidth error={!!errors.organisation} helperText={errors.organisation} slotProps={{ htmlInput: { maxLength: 160 } }} />
        )}

        <TextField name="email" label="Correo electrónico" type="email" autoComplete="email" required fullWidth error={!!errors.email} helperText={errors.email} slotProps={{ htmlInput: { maxLength: 200, autoCapitalize: "none", autoCorrect: "off", spellCheck: false } }} />
        <TextField name="phone" label="Teléfono (opcional)" type="tel" autoComplete="tel" fullWidth error={!!errors.phone} helperText={errors.phone} slotProps={{ htmlInput: { maxLength: 30 } }} />

        {chosen?.extra === "record" && (
          <>
            <TextField name="recommendation" label="Número de la recomendación (opcional)" placeholder="50.12" fullWidth error={!!errors.recommendation} helperText={errors.recommendation} slotProps={{ htmlInput: { maxLength: 40, inputMode: "decimal" } }} />
            <TextField name="source" label="Enlace a la fuente pública (opcional)" type="url" placeholder="https://" fullWidth error={!!errors.source} helperText={errors.source} slotProps={{ htmlInput: { maxLength: 500, autoCapitalize: "none", autoCorrect: "off", spellCheck: false } }} />
          </>
        )}

        <TextField name="message" label="Mensaje" multiline minRows={4} required fullWidth error={!!errors.message} helperText={errors.message} sx={full} slotProps={{ htmlInput: { minLength: 10, maxLength: MESSAGE_MAX } }} />

        {/* Hidden from people; a program that fills in every field gives itself away here. */}
        <Box aria-hidden sx={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
          <label>Sitio web<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
        </Box>
      </Box>

      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} spacing={{ xs: 1.5, sm: 2.5 }} sx={{ mt: 2.5 }}>
        <Button type="submit" variant="contained" disabled={pending} sx={{ px: 3, flexShrink: 0 }}>{pending ? "Enviando…" : "Enviar mensaje"}</Button>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          Los datos de este formulario se utilizan únicamente para responder a la consulta.
        </Typography>
      </Stack>
      <Box role="alert">
        {result && !result.ok && <Typography variant="body2" color="error" sx={{ mt: 2 }}>{result.error}</Typography>}
      </Box>
    </Box>
  );
}
