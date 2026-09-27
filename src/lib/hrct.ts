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
