"use server";

import { CONTACT_EMAIL, MESSAGE_MAX, inquiryType, type ContactField, type ContactResult } from "@/lib/contact";

// A single line: no line breaks, so a value cannot spill into the next line of the message.
const line = (form: FormData, name: string, max: number) => String(form.get(name) ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const UNAVAILABLE = `No se ha podido enviar el mensaje. Puede escribirse directamente a ${CONTACT_EMAIL}.`;

// Sends the contact form to Blue Human through Resend. The key is read from RESEND_API_KEY and never reaches the browser.
export async function sendContactMessage(form: FormData): Promise<ContactResult> {
  // A field people cannot see: only a program fills it in. It gets the same answer as a real message.
  if (String(form.get("website") ?? "")) return { ok: true };

  const type = inquiryType(line(form, "type", 40));
  const name = line(form, "name", 120);
  const email = line(form, "email", 200);
  const phone = line(form, "phone", 30);
  const organisation = type?.extra === "organisation" ? line(form, "organisation", 160) : "";
  const recommendation = type?.extra === "record" ? line(form, "recommendation", 40) : "";
  const source = type?.extra === "record" ? line(form, "source", 500) : "";
  const message = String(form.get("message") ?? "").trim();

  const fields: Partial<Record<ContactField, string>> = {};
  if (!type) fields.type = "Hay que elegir un tipo de consulta.";
  if (!name) fields.name = "Hay que indicar un nombre.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "Hay que indicar un correo electrónico válido.";
  if (phone && !/^\+?[\d\s().-]{6,}$/.test(phone)) fields.phone = "El teléfono solo puede llevar cifras, espacios y el prefijo.";
  if (source && !/^https?:\/\/\S+$/.test(source)) fields.source = "El enlace debe empezar por http:// o https://.";
  if (message.length < 10) fields.message = "El mensaje es demasiado corto.";
  else if (message.length > MESSAGE_MAX) fields.message = `El mensaje no puede superar los ${MESSAGE_MAX} caracteres.`;
  if (!type || Object.keys(fields).length) return { ok: false, error: "Hay campos que revisar.", fields };

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("Contact form: RESEND_API_KEY is not set");
    return { ok: false, error: UNAVAILABLE };
  }

  const details = [
    ["Tipo de consulta", type.label],
    ["Nombre", name],
    ["Correo electrónico", email],
    ["Teléfono", phone],
    [type.organisationLabel ?? "Organización", organisation],
    ["Recomendación", recommendation],
    ["Fuente pública", source],
  ].filter(([, value]) => value);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // The sender must be on a domain verified in Resend: bluehuman.org is.
        from: process.env.CONTACT_FROM_EMAIL || `Human Rights Commitment Institute <${CONTACT_EMAIL}>`,
        to: [process.env.CONTACT_TO_EMAIL || CONTACT_EMAIL],
        // Answering the e-mail answers the person who wrote.
        reply_to: email,
        subject: `[HRCI] ${type.label} · ${name}`,
        text: `${details.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nMensaje:\n${message}\n`,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`Contact form: Resend ${response.status}: ${(await response.text()).slice(0, 300)}`);
      return { ok: false, error: UNAVAILABLE };
    }
  } catch (error) {
    console.error("Contact form: Resend request failed", error);
    return { ok: false, error: UNAVAILABLE };
  }
  return { ok: true };
}
