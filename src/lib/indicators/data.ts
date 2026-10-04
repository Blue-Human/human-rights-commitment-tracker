import 'server-only';
import type { IndicatorBundle } from './types';
export async function getIndicators(publicId: string, allHistory = false): Promise<IndicatorBundle> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Indicadores: acceso público no configurado');
  const response = await fetch(`${url}/rest/v1/rpc/hrct_public_indicators`, {
    // Include the response contract in the fetch cache key across deployments.
    method: 'POST', headers: { apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json', 'X-HRCT-Indicators-Contract':'approved-v1' },
    body: JSON.stringify({p_public_id:publicId,p_all_history:allHistory}), next:{revalidate:120,tags:['indicators']},
  });
  if (!response.ok) throw new Error(`Indicadores: consulta fallida (${response.status})`);
  const bundle = await response.json();
  delete bundle.annex;
  return bundle;
}
