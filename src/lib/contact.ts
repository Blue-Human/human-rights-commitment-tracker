// What the contact form and the server action that sends it have in common.

// The address of the HRCI: shown on the site, and where the form is sent unless CONTACT_TO_EMAIL says otherwise.
export const CONTACT_EMAIL = "hrci@bluehuman.org";

// `extra` names the fields a kind of enquiry adds to the form.
export type InquiryType = { value: string; label: string; hint: string; extra?: "record" | "organisation"; organisationLabel?: string };

export const inquiryTypes: InquiryType[] = [
  { value: "general", label: "Consulta general", hint: "Preguntas sobre el HRCI, sus datos o su método." },
  { value: "correccion", label: "Corrección de una ficha", hint: "Las correcciones se revisan antes de incorporarse al registro. Conviene indicar el número de la recomendación y la fuente pública en la que se basa.", extra: "record" },
  { value: "evidencia", label: "Nueva evidencia", hint: "Las nuevas evidencias se revisan antes de incorporarse al registro. Conviene indicar el número de la recomendación y la fuente pública en la que se basa.", extra: "record" },
  { value: "replica", label: "Derecho de réplica", hint: "Las réplicas se revisan antes de incorporarse al registro. Conviene indicar el número de la recomendación a la que se refiere.", extra: "record" },
  { value: "medios", label: "Medios de comunicación", hint: "Peticiones de información, datos o declaraciones.", extra: "organisation", organisationLabel: "Medio de comunicación" },
  { value: "colaboracion", label: "Colaboración", hint: "Propuestas de colaboración de organizaciones, instituciones y centros de investigación.", extra: "organisation", organisationLabel: "Organización" },
];

export const inquiryType = (value: string) => inquiryTypes.find((type) => type.value === value);

export type ContactField = "type" | "name" | "email" | "phone" | "organisation" | "recommendation" | "source" | "message";

export type ContactResult = { ok: true } | { ok: false; error: string; fields?: Partial<Record<ContactField, string>> };

export const MESSAGE_MAX = 5000;
