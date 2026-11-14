import "server-only";

// Editorial annotations of Blue Human on the Atlas. They live in Supabase (table atlas_annotations,
// managed from /admin/atlas); visitors read only the published ones, through the public view
// atlas_public_annotations, which exposes no draft and no review metadata.

export const annotationKinds: Record<string, string> = {
  case_law_reference: "Referencia jurisprudencial",
  institutional_interpretation: "Interpretación institucional",
  general_comment: "Observación general",
  documented_relation: "Relación documentada con otra disposición",
  academic_note: "Nota académica",
  editorial_comment: "Comentario editorial de Blue Human",
  bibliography: "Referencia bibliográfica",
  documentary_correction: "Corrección documental",
};

export type PublishedAnnotation = {
  id: string;
  instrument_id: string;
  article: string | null;
  paragraph: string | null;
  kind: string;
  title: string;
  body: string;
  author_name: string;
  sources: { label: string; url?: string | null }[] | null;
  doc_references: { label: string; url?: string | null }[] | null;
  created_at: string;
  published_at: string;
  updated_at: string;
  version: number;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function getPublishedAnnotations(filter: { instrument?: string; article?: string } = {}): Promise<PublishedAnnotation[]> {
  if (!url || !key) return [];
  const query = ["select=*", "order=published_at.desc"];
  if (filter.instrument) query.push(`instrument_id=eq.${encodeURIComponent(filter.instrument)}`);
  if (filter.article) query.push(`article=eq.${encodeURIComponent(filter.article)}`);
  try {
    const response = await fetch(`${url}/rest/v1/atlas_public_annotations?${query.join("&")}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 300, tags: ["atlas-annotations"] },
    });
    if (!response.ok) return [];
    return (await response.json()) as PublishedAnnotation[];
  } catch {
    return [];
  }
}
