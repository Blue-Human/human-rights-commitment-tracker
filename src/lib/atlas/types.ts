// Shapes of the files in data/atlas, written by scripts/atlas/build.py. Every legal value comes with
// the reference of the official source it was read from.

export type SystemCode = "un" | "coe" | "oas" | "au";
export type InstrumentKind = "treaty" | "optional_protocol" | "protocol" | "amendment" | "declaration" | "charter" | "rules" | "statute";
export type Category = "core" | "regional" | "related" | "procedural";

export type SourceRef = { source: string; url: string; retrieved?: string; sha256?: string; locator?: string; identifier?: string };

export type TextCheck = { check: string; ok: boolean; detail?: string | null; exceptions?: { article: string; reason: string }[] };

export type InstrumentText = {
  lang: string;
  authority: "authentic" | "official_es" | "body" | "depositary";
  complete: boolean;
  publisher: string;
  url: string;
  identifier?: string | null;
  method?: string | null;
  articles: number;
  checks: TextCheck[];
  pending_review?: { since: string; articles: string[] };
};

export type Instrument = {
  id: string;
  system: SystemCode;
  kind: InstrumentKind;
  category: Category;
  parent: string | null;
  children: string[];
  title_es: string | null;
  title_en?: string | null;
  title_es_note?: string;
  title_es_source?: string;
  popular_name_es?: string;
  concluded?: string | null;
  concluded_text?: string | null;
  concluded_precision?: "day" | "month";
  done_es?: string | null;
  council_number?: string | null;
  entry_into_force?: { date: string | null; text?: string | null; ref?: SourceRef } | null;
  registration?: string | null;
  text_reference?: string | null;
  register_notes?: string[];
  status?: { signatories: number | null; parties: number | null; as_of: string | null; ref: SourceRef; counted?: boolean } | null;
  depositary?: string | null;
  registry: Record<string, string | Record<string, string> | undefined>;
  bodies: string[];
  texts: InstrumentText[];
  spain_boe?: { instrument_type: string | null; entry_into_force: string | null; general_entry_into_force?: string | null; note: string | null; boe: string; url: string };
};

export type Paragraph = { id: string; text?: string; number?: string; table?: string[][] };

export type TextNode =
  | { kind: "heading"; id: string; level: number; label: string; title: string | null; text?: string[]; annex?: boolean }
  | {
      kind: "article";
      id: string;
      number: string;
      label: string;
      heading: string | null;
      paragraphs: Paragraph[];
      notes?: string[];
      version?: { norm: string; published: string | null; in_force: string | null };
      history?: { norm: string; published: string | null; in_force: string | null; paragraphs: string[] }[];
    };

export type ArticleNode = Extract<TextNode, { kind: "article" }>;

export type TextFile = {
  instrument: string;
  lang: string;
  authority: InstrumentText["authority"];
  title: string | null;
  source: { publisher: string; document?: string; identifier?: string; url: string; data_url?: string; eli?: string | null; published?: string | null; retrieved?: string; sha256?: string; method?: string };
  versions: { norm: string; published: string | null }[];
  preamble: { id: string; text: string }[];
  nodes: TextNode[];
  final_clauses: { text: string }[];
  spain_instrument?: string[];
  publication_notes?: string[];
  authentic_clause?: { article: string | null; paragraph: string | null; text: string } | null;
  quality: { articles: number; stated_articles?: number | null; checks: TextCheck[]; complete: boolean };
  pending_review?: { since: string; articles: string[] };
};

export type Consent = { date: string; type: string; code?: string | null; raw?: string; bracketed?: boolean } | null;

export type Statement = { section: string; section_title: string; label: string | null; kind: string; text: string; notes?: string[] };

export type Participant = {
  iso3: string | null;
  name: string;
  signature?: string | null;
  signature_bracketed?: boolean | null;
  consent: Consent;
  deposit?: string | null;
  date_reading?: string | null;
  notes?: string[];
  statements: Statement[];
  listed?: boolean;
  status?: { code: StatusCode; date: string | null; type: string | null };
  ohchr?: { entry_into_force: string | null; denunciation: string | null; consent: string | null; consent_code: string | null; ref: SourceRef };
};

export type Participation = {
  instrument: string;
  register: "untc" | "oas" | "au";
  as_of: string | null;
  ref: SourceRef;
  legend: string;
  columns?: string[];
  sections?: { key: string; title: string; intro: string | null; entries: number }[];
  notes?: Record<string, string>;
  statements_text?: string | null;
  participants: Participant[];
};

export type StatusCode = "consent" | "consent_boe" | "signature" | "denounced" | "bracketed" | "listed";

// One State in one instrument, compact: status, date, type of act, entry into force (OHCHR),
// number of reservations and declarations in the register.
export type MatrixCell = { s: StatusCode; d: string | null; t: string | null; eif?: string | null; r?: number; dc?: number };

export type Country = {
  iso3: string;
  iso2: string | null;
  m49: string;
  name_es: string | null;
  name_en: string;
  region_es: string | null;
  subregion_es: string | null;
  systems: SystemCode[];
};

export type ProcedureAcceptance = { kind: "individual" | "inquiry" | "interstate"; code: string; name_es: string; instrument: string | null; article: string | null; accepted: boolean | null; raw: string | null; date: string | null };

export type Quote = {
  i?: string; a?: string; p?: string | null; x?: string | null; doc?: string;
  quote?: string | null; lang?: string; anchor?: string; heading?: string | null; unavailable?: string; error?: string; label?: string;
  source?: { publisher?: string; identifier?: string; url?: string; retrieved?: string };
  document_title?: string;
};

export type Body = {
  id: string;
  system: SystemCode;
  name_es: string;
  name_en?: string;
  name_note?: string;
  nature: string;
  established_by?: Quote;
  established_by_note?: string;
  composition: Quote[];
  competences: Quote[];
  rules?: string;
  statute?: string;
  instruments: string[];
  members?: { as_at: string | null; members: { name: string; state?: string; function?: string; term_start?: string; term_end?: string }[]; officers?: { function: string; name: string }[]; ref: SourceRef } | null;
  interpretations: number;
  decisions: number;
};

export type Procedure = {
  id: string;
  kind: string;
  system: SystemCode;
  body: string | null;
  name_es: string;
  acceptance: Record<string, unknown>;
  basis: Quote[];
  basis_note?: string;
  who: Quote[];
  against: Quote[];
  requirements: Quote[];
  deadline: Quote[];
  interim: Quote[];
  steps: Quote[];
  follow_up: Quote[];
  submission?: { label: string; url: string };
  official_pages?: { label: string; url: string }[];
  not_quoted?: string[];
  quoted: number;
  unquoted: number;
};

export type AcceptanceStatus = { s: "accepted" | "not_accepted" | "withdrawn" | "not_recorded" | "check"; why: string; d?: string | null; quote?: string };

export type Interpretation = {
  id: string;
  type: "general_comment" | "general_recommendation";
  symbol: string;
  title: string;
  committee: string;
  body: string;
  instrument: string;
  date: string | null;
  joint: boolean;
  version_note?: string | null;
  links: Record<string, string>;
  articles: { instrument: string; article: string; relation: string; evidence: string; anchor: string | null; in_reader: boolean }[];
};

export type Decision = {
  id: string;
  source: "tbinternet" | "hudoc";
  type: string;
  symbol?: string;
  communication?: string | null;
  title: string | null;
  application?: string | null;
  ecli?: string | null;
  committee?: string;
  body: string;
  instrument: string;
  states: string[];
  date: string | null;
  conclusion?: string | null;
  articles: { instrument: string; article: string; relation: "violation" | "no_violation"; code?: string; evidence?: string | null; anchor?: string | null }[];
  links: Record<string, string>;
};

export type Right = {
  id: string;
  name: string;
  phrases: string[];
  articles: { instrument: string; article: string; anchor: string | null; basis: "article_heading" | "general_comment_title"; evidence: string; lang?: string; document?: string; symbol?: string }[];
  instruments: { instrument: string; basis: "instrument_title"; evidence: string }[];
  interpretations: string[];
};

export type Source = {
  id: string; institution: string; name: string; url: string; data: string; access: string; terms: string | null;
  integration: "integrated" | "partial" | "blocked" | "pending" | "reference" | "link"; documents: number; last_checked: string | null; answered_last_run: boolean | null;
};
