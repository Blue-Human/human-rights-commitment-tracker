// What the contact form and the server action that sends it have in common.

// The address of the HRCI: shown on the site, and where the form is sent unless CONTACT_TO_EMAIL says otherwise.
export const CONTACT_EMAIL = "hrci@bluehuman.org";

// `extra` names the fields a kind of enquiry adds to the form: a mission asks for the organisation and the country.
export type InquiryType = { value: string; label: string; hint: string; extra?: "record" | "organisation" | "mission"; organisationLabel?: string };

export const inquiryTypes: InquiryType[] = [
  { value: "general", label: "Consulta general", hint: "Preguntas sobre el HRCI, sus datos o su método." },
  { value: "correccion", label: "Corrección de una ficha", hint: "Las correcciones se revisan antes de incorporarse al registro. Conviene indicar el número de la recomendación y la fuente pública en la que se basa.", extra: "record" },
  { value: "evidencia", label: "Nueva evidencia", hint: "Las nuevas evidencias se revisan antes de incorporarse al registro. Conviene indicar el número de la recomendación y la fuente pública en la que se basa.", extra: "record" },
  { value: "replica", label: "Derecho de réplica", hint: "Las réplicas se revisan antes de incorporarse al registro. Conviene indicar el número de la recomendación a la que se refiere.", extra: "record" },
  { value: "medios", label: "Medios de comunicación", hint: "Peticiones de información, datos o declaraciones.", extra: "organisation", organisationLabel: "Medio de comunicación" },
  { value: "mision", label: "Nueva misión del HRCI", hint: "Propuestas para abrir una misión del HRCI en otro país en cooperación con Blue Human. Conviene presentar la organización y explicar el motivo de la propuesta.", extra: "mission", organisationLabel: "Organización" },
  { value: "colaboracion", label: "Colaboración", hint: "Propuestas de colaboración de organizaciones, instituciones y centros de investigación.", extra: "organisation", organisationLabel: "Organización" },
];

export const inquiryType = (value: string) => inquiryTypes.find((type) => type.value === value);

// Whether a kind of enquiry asks who writes on behalf of which organisation.
export const asksOrganisation = (type?: InquiryType): type is InquiryType => type?.extra === "organisation" || type?.extra === "mission";

export type ContactField = "type" | "name" | "email" | "phone" | "organisation" | "country" | "recommendation" | "source" | "message";

export type ContactResult = { ok: true } | { ok: false; error: string; fields?: Partial<Record<ContactField, string>> };

export const MESSAGE_MAX = 5000;
