import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function normalizeSeed(seed) {
  const blocks = seed.blocks;
  const rows = (name) => blocks[name].rows.map(row => ({ ...blocks[name].defaults, ...Object.fromEntries(blocks[name].columns.map((key, i) => [key, row[i]])) }));
  const recommendations = rows('recommendations'), indicators = rows('indicators'), links = rows('links');
  const errors = [];
  const unique = (items, key, count, name) => {
    if (items.length !== count || new Set(items.map(key)).size !== count) errors.push(`${name}: se esperaban ${count} registros únicos`);
  };
  unique(recommendations, r => r.recommendation_number, 324, 'recommendations');
  unique(indicators, i => i.indicator_code, 98, 'indicators');
  unique(links, l => `${l.recommendation_number}|${l.indicator_code}`, 428, 'links');
  const numbers = new Set(recommendations.map(r => r.recommendation_number));
  const codes = new Set(indicators.map(i => i.indicator_code));
  for (let n = 1; n <= 324; n++) if (!numbers.has(`50.${n}`)) errors.push(`Falta 50.${n}`);
  for (const l of links) if (!numbers.has(l.recommendation_number) || !codes.has(l.indicator_code)) errors.push(`Referencia sin resolver: ${JSON.stringify(l)}`);
  const counts = (items, key) => Object.fromEntries([...new Set(items.map(r => r[key]))].map(value => [value, items.filter(r => r[key] === value).length]));
  const applicability = counts(recommendations, 'indicator_requirement'), roles = counts(links, 'role');
  if (applicability.required !== 253 || applicability.recommended !== 30 || applicability.not_required !== 41) errors.push('Conteos de aplicabilidad incorrectos');
  if (roles.primary !== 283 || roles.supporting !== 145 || Object.keys(roles).length !== 2) errors.push('Conteos de rol incorrectos');
  for (const r of recommendations) {
    const assigned = links.filter(l => l.recommendation_number === r.recommendation_number);
    r.indicator_count = assigned.length;
    r.indicator_codes = assigned.map(l => l.indicator_code).join('; ') || null;
  }
  for (const l of links) l.recommendation_title = recommendations.find(r => r.recommendation_number === l.recommendation_number)?.recommendation_title;
  // Preserve the canonical identity. Ambiguous components remain proposals for a reviewer.
  for (const i of indicators) {
    const units = i.unit.includes(' / ') ? i.unit.split(' / ') : [i.unit];
    i.components = units.map((unit, index) => ({ code: units.length === 1 ? 'default' : `component-${index + 1}`, label: units.length === 1 ? i.indicator_name : `${i.indicator_name} · ${unit}`, unit, value_type: 'numeric', frequency: ['annual','biennial','monthly','quarterly'].includes(i.frequency) ? i.frequency : 'irregular', visualization: unit === 'EUR' || unit === 'nº' && i.indicator_type === 'output' ? 'bar' : 'line', definition: units.length === 1 ? i.definition : `Propuesta de componente (${unit}). Delimitar definición y fórmula antes de publicar. Definición original: ${i.definition}` }));
    i.normalizations = { orientation: i.direction === 'context' ? 'neutral' : i.direction, indicator_type: i.indicator_type === 'input' ? 'process' : i.indicator_type, component_review_required: units.length > 1 || i.frequency.includes('/') };
  }
  return { payload: { origin: seed.origin, version: seed.version, recommendations, indicators, links, methodology_sources: rows('methodology_sources') }, report: { recommendations: recommendations.length, indicators: indicators.length, links: links.length, applicability, roles, errors } };
}

async function main() {
  const seed = JSON.parse(await readFile(new URL('../data/indicators/spain-upr4.v1.json', import.meta.url)));
  const { payload, report } = normalizeSeed(seed);
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) throw new Error('Validación del anexo fallida; no se escribe');
  if (!process.argv.includes('--database') && !process.argv.includes('--write')) return;
  // Environment is loaded by node --env-file=.env.local; no credentials in command output.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan credenciales de servidor');
  const expected = process.argv.find(a => a.startsWith('--project='))?.split('=')[1];
  if (!expected || new URL(url).hostname !== `${expected}.supabase.co`) throw new Error('Especifica --project=<referencia existente> coincidente con la configuración');
  const response = await fetch(`${url}/rest/v1/rpc/hrct_import_indicators`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_seed: payload, p_write: process.argv.includes('--write') }) });
  if (!response.ok) throw new Error(`Importación ${response.status}: ${await response.text()}`);
  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
  if (result.errors?.length) process.exitCode = 1;
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
