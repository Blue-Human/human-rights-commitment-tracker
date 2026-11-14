// The words the Atlas uses for the registers' categories. Each label names a category as the source
// defines it; none adds a legal effect. No dependencies, so server and client components share it.
import type { AcceptanceStatus, Instrument, InstrumentKind, MatrixCell, StatusCode, SystemCode } from "./types";

export const ATLAS = "Atlas";
export const BASE = "/atlas";

export const systemNames: Record<SystemCode, string> = {
  un: "Naciones Unidas",
  coe: "Consejo de Europa",
  oas: "Organización de los Estados Americanos",
  au: "Unión Africana",
};
export const systemShort: Record<SystemCode, string> = { un: "ONU", coe: "Consejo de Europa", oas: "OEA", au: "UA" };
export const systemOrder: SystemCode[] = ["un", "coe", "oas", "au"];

export const kindNames: Record<InstrumentKind, string> = {
  treaty: "Tratado",
  optional_protocol: "Protocolo facultativo",
  protocol: "Protocolo",
  amendment: "Enmienda",
  declaration: "Declaración",
  charter: "Carta constitutiva",
  rules: "Reglamento",
  statute: "Estatuto",
};

// What kind of document it is, in a line that does not attach effects to it.
export const kindNotes: Partial<Record<InstrumentKind, string>> = {
  declaration: "No es un tratado: no se ratifica ni tiene Estados Partes.",
  amendment: "Modifica una disposición del tratado al que pertenece; vincula a los Estados que la han aceptado una vez en vigor.",
  rules: "Norma de procedimiento adoptada por el propio órgano.",
  statute: "Norma que regula la organización y las funciones del órgano.",
};

export const categoryNames: Record<string, string> = {
  core: "Instrumentos fundamentales de las Naciones Unidas",
  related: "Otros instrumentos relacionados",
  regional: "Sistemas regionales",
  procedural: "Reglamentos y estatutos de los órganos",
};

export const consentTypes: Record<string, string> = {
  ratification: "Ratificación",
  accession: "Adhesión",
  succession: "Sucesión",
  acceptance: "Aceptación",
  approval: "Aprobación",
  formal_confirmation: "Confirmación formal",
  definitive_signature: "Firma definitiva",
  ratification_or_accession: "Ratificación o adhesión",
  unknown: "Ratificación o adhesión (el registro no indica cuál)",
};

export const statusNames: Record<StatusCode | "none", string> = {
  consent: "Consentimiento registrado",
  consent_boe: "Consentimiento publicado en el BOE",
  signature: "Firma, sin ratificación",
  denounced: "Denuncia registrada",
  bracketed: "Entrada entre corchetes",
  listed: "Mención en el registro",
  none: "Sin actuación registrada",
};

export const statusNotes: Partial<Record<StatusCode | "none", string>> = {
  bracketed: "El depositario imprime entre corchetes los actos de un Estado que ya no está obligado; sus notas explican el motivo.",
  none: "El registro del depositario no recoge ningún acto de este Estado respecto del instrumento.",
  consent_boe: "El Atlas no dispone del registro del Consejo de Europa; el dato procede del instrumento publicado en el BOE.",
};

// One hue per register category; the legend always names them.
export const statusTones: Record<StatusCode | "none", string> = {
  consent: "#006c95",
  consent_boe: "#006c95",
  signature: "#9fd3e8",
  denounced: "#963b34",
  bracketed: "#a87b2a",
  listed: "#d8dde2",
  none: "#eef0f2",
};

export function cellStatus(cell?: MatrixCell | null): StatusCode | "none" {
  return cell ? cell.s : "none";
}

export function cellLabel(cell?: MatrixCell | null) {
  if (!cell) return statusNames.none;
  if (cell.s === "consent" || cell.s === "consent_boe") return cell.t ? consentTypes[cell.t] || statusNames[cell.s] : statusNames[cell.s];
  return statusNames[cell.s];
}

export const authorityNames: Record<string, string> = {
  authentic: "Lengua auténtica del tratado",
  official_es: "Traducción oficial al español publicada en el BOE",
  body: "Texto publicado por la organización o el órgano",
  depositary: "Texto publicado por el depositario",
};

export const authorityNotes: Record<string, string> = {
  authentic: "El español es una de las lenguas en las que el texto del tratado es igualmente auténtico, según su propia cláusula final (citada).",
  official_es: "Los textos auténticos de este tratado están en otras lenguas; el BOE publica la versión en español que rige en España.",
  body: "Versión publicada en el sitio oficial de la organización o del órgano.",
  depositary: "Versión publicada por la Secretaría General de la OEA, depositaria del tratado.",
};

export const checkNames: Record<string, string> = {
  sin_duplicados: "Sin artículos duplicados",
  numeracion_consecutiva: "Numeración consecutiva",
  recuento_declarado: "Coincide con el número de artículos que declara el instrumento de ratificación",
  articulos_con_texto: "Todos los artículos tienen texto",
  anexos_con_texto: "Los anexos tienen texto",
  sin_texto_en_mayusculas: "Sin transcripciones en mayúsculas",
  sin_errores_de_reconocimiento: "Sin errores de reconocimiento óptico",
  termina_con_clausulas_finales: "Llega hasta las cláusulas finales",
  articulos_completos: "Ningún artículo termina a mitad de frase",
  articulos_bien_separados: "Artículos bien delimitados",
  codificacion: "Sin caracteres ilegibles",
};

export const natureNames: Record<string, string> = {
  committee: "Comité",
  subcommittee: "Subcomité",
  court: "Tribunal",
  commission: "Comisión",
  intergovernmental: "Órgano intergubernamental",
  expert_group: "Grupo de expertos",
  committee_of_parties: "Comité de las Partes",
  advisory_committee: "Comité consultivo",
};

export const procedureKinds: Record<string, string> = {
  individual_communication: "Comunicación individual",
  individual_application: "Demanda individual",
  petition: "Petición individual",
  communication: "Comunicación",
  contentious: "Procedimiento contencioso",
  urgent_action: "Acción urgente",
  inquiry: "Procedimiento de investigación",
  interstate: "Comunicación entre Estados",
  state_reporting: "Informes periódicos",
  visits: "Visitas",
  upr: "Examen Periódico Universal",
  special_procedures: "Procedimientos especiales",
  advisory: "Procedimiento consultivo",
  collective_complaint: "Reclamación colectiva",
};

// Procedures a person or an organisation can start.
export const startedByPeople = new Set(["individual_communication", "individual_application", "petition", "communication", "urgent_action", "collective_complaint", "special_procedures"]);

export const acceptanceNames: Record<AcceptanceStatus["s"], string> = {
  accepted: "Consta",
  not_accepted: "No consta",
  withdrawn: "Retirada",
  not_recorded: "Sin actuación registrada",
  check: "Requiere verificación",
};
export const acceptanceTones: Record<AcceptanceStatus["s"], string> = {
  accepted: "#176b46",
  not_accepted: "#6c7882",
  withdrawn: "#963b34",
  not_recorded: "#6c7882",
  check: "#7a5600",
};

export const basisNames: Record<string, string> = {
  article_heading: "El encabezamiento oficial del artículo lo nombra",
  general_comment_title: "El título oficial de una observación o recomendación general lo vincula a este artículo",
  instrument_title: "El título oficial del instrumento lo nombra",
  title_names_article: "El título oficial del documento nombra el artículo",
  violation: "Violación declarada por el Tribunal (metadatos oficiales de HUDOC)",
  no_violation: "Ausencia de violación declarada por el Tribunal (metadatos oficiales de HUDOC)",
};

export function instrumentTitle(i: Pick<Instrument, "title_es" | "title_en" | "id">) {
  return i.title_es || i.title_en || i.id;
}

export function shortTitle(i: Pick<Instrument, "title_es" | "title_en" | "id" | "registry"> & { popular_name_es?: string }) {
  const title = instrumentTitle(i);
  return title.length > 90 ? `${title.slice(0, 87).replace(/\s+\S*$/, "")}…` : title;
}

export const instrumentPath = (id: string) => `${BASE}/instruments/${id}`;
export const articlePath = (instrument: string, number: string) => `${BASE}/instruments/${instrument}/${encodeURIComponent(number.replace(/\s+/g, "-"))}`;
export const countryPath = (iso3: string) => `${BASE}/countries/${iso3.toLowerCase()}`;
export const bodyPath = (id: string) => `${BASE}/bodies/${id}`;
export const procedurePath = (id: string) => `${BASE}/mechanisms/${id}`;
export const rightPath = (id: string) => `${BASE}/topics/${id}`;

const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// "1966-12-16" → "16 de diciembre de 1966"; "1981-06" → "junio de 1981".
export function longDate(value?: string | null) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y) return null;
  if (!d) return m ? `${months[m - 1]} de ${y}` : String(y);
  return `${d} de ${months[m - 1]} de ${y}`;
}

export function shortDate(value?: string | null) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!d) return m ? `${String(m).padStart(2, "0")}/${y}` : String(y);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export const year = (value?: string | null) => (value ? value.slice(0, 4) : null);

export function partiesLine(i: Pick<Instrument, "status">) {
  if (!i.status || i.status.parties === null || i.status.parties === undefined) return null;
  return `${i.status.parties} ${i.status.counted ? "con ratificación o adhesión" : "Partes"}`;
}
