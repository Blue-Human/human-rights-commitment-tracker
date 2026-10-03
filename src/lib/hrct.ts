export type Commitment = {
  id: string;
  public_id: string;
  title: string;
  original_text: string;
  normalized_summary: string | null;
  recommendation_number: string | null;
  acceptance_status: string | null;
  published_at: string | null;
  country_iso2: string;
  country_name: string;
  country_slug: string;
  mechanism_code: string;
  mechanism_name: string;
  authoritative_source_title: string | null;
  authoritative_source_publisher: string | null;
  authoritative_source_reference: string | null;
  authoritative_source_date: string | null;
  authoritative_source_url: string | null;
  assessment_status: string | null;
  assessment_confidence: string | null;
  assessment_rationale: string | null;
  assessment_date: string | null;
  methodology_version: string | null;
  methodology_title: string | null;
  methodology_url: string | null;
};

export type Evidence = {
  id: string;
  public_id: string;
  evidence_type: string;
  finding: string;
  excerpt: string | null;
  reliability_notes: string | null;
  evidence_date: string | null;
  source_title: string;
  source_publisher: string | null;
  source_type: string;
  document_reference: string | null;
  source_url: string | null;
};

export type HumanSecurityDimension = {
  public_id: string;
  code: "economic" | "food" | "health" | "environmental" | "personal" | "community" | "political";
  name: string;
  description: string | null;
  is_primary: boolean;
  confidence: number | null;
  classification_method: string;
  reviewed: boolean;
  rationale: string | null;
};

export type MonitoringItem = {
  public_id: string;
  id: string;
  kind: "need_context" | "implementation_candidate" | "legal_change" | "statement" | "news";
  relation: "supports_need" | "supports_progress" | "contradicts_progress" | "context";
  title: string;
  url: string;
  publisher: string | null;
  source_domain: string | null;
  source_type: string;
  published_at: string | null;
  summary: string | null;
  excerpt: string | null;
  relevance_score: number;
  status: "auto" | "reviewed" | "rejected";
  discovered_at: string;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function rest<T>(path: string): Promise<T> {
  if (!url || !key) return [] as T;
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 120 },
  });
  if (!response.ok) throw new Error(`HRCT public API error: ${response.status}`);
  return response.json();
}

export async function getCommitments(): Promise<Commitment[]> {
  return rest<Commitment[]>("hrct_public_commitments?select=*&order=published_at.desc");
}

export async function getCommitment(publicId: string): Promise<Commitment | null> {
  const rows = await rest<Commitment[]>(`hrct_public_commitments?select=*&public_id=eq.${encodeURIComponent(publicId)}&limit=1`);
  return rows[0] ?? null;
}

export async function getEvidence(publicId: string): Promise<Evidence[]> {
  return rest<Evidence[]>(`hrct_public_evidence?select=*&public_id=eq.${encodeURIComponent(publicId)}&order=evidence_date.desc.nullslast`);
}

export async function getHumanSecurityDimensions(publicId: string): Promise<HumanSecurityDimension[]> {
  return rest<HumanSecurityDimension[]>(`hrct_public_human_security?select=*&public_id=eq.${encodeURIComponent(publicId)}&order=is_primary.desc,name.asc`);
}

export async function getMonitoringItems(publicId: string): Promise<MonitoringItem[]> {
  return rest<MonitoringItem[]>(`hrct_public_monitoring?select=*&public_id=eq.${encodeURIComponent(publicId)}&order=published_at.desc.nullslast,discovered_at.desc&limit=30`);
}

export type Signal = {public_id:string;id:string;title:string;summary:string|null;url:string;source_domain:string;source_type:string;source_tier:number;published_at:string|null;observed_at:string|null;discovered_at:string;cluster_id:string|null;source_count:number;original_source_url:string|null;rationale:string;publication_status:string};
export type Freshness = {public_id:string;enabled:boolean|null;last_run_at:string|null;last_success_at:string|null;last_signal_at:string|null;last_evidence_at:string|null};
export type AssessmentHistory = {id:string;public_id:string;status:string;confidence:string;rationale:string;assessment_date:string;is_current:boolean;methodology_version:string};

export async function getSignals(publicId?:string):Promise<Signal[]> {
  // Paginate to avoid PostgREST's default 1,000-row cap truncating dashboard totals.
  const all:Signal[]=[];
  for(let offset=0;;offset+=500){
    const page=await rest<Signal[]>(`hrct_public_signals?select=*&order=discovered_at.desc,id.asc,public_id.asc${publicId?`&public_id=eq.${encodeURIComponent(publicId)}`:''}&limit=500&offset=${offset}`);
    all.push(...page);if(page.length<500)break;
  }
  return all;
}
export async function getAllDimensions():Promise<HumanSecurityDimension[]> {
  const all:HumanSecurityDimension[]=[];
  for(let offset=0;;offset+=500){const page=await rest<HumanSecurityDimension[]>(`hrct_public_human_security?select=*&order=public_id,code&limit=500&offset=${offset}`);all.push(...page);if(page.length<500)break;}return all;
}
export async function getFreshness(publicId?:string):Promise<Freshness[]> {
  return rest<Freshness[]>(`hrct_public_freshness?select=*${publicId?`&public_id=eq.${encodeURIComponent(publicId)}`:''}`);
}
export async function getAssessmentHistory(publicId:string):Promise<AssessmentHistory[]> {
  return rest<AssessmentHistory[]>(`hrct_public_assessment_history?select=*&public_id=eq.${encodeURIComponent(publicId)}&order=assessment_date.desc,published_at.desc`);
}
