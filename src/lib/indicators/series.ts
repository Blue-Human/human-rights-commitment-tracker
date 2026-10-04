import type { Component, IndicatorLink, Observation, Scope } from './types';
export const number = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 }).format(value);
export const scopeKey = (scope: Scope) => JSON.stringify(Object.entries(scope).sort(([a], [b]) => a.localeCompare(b)));
export const scopeLabel = (scope: Scope) => Object.entries(scope).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${({ territory: 'Territorio', population: 'Población', age: 'Edad', sex: 'Sexo', comparison: 'Comparación', institution: 'Institución', reason: 'Motivo', coverage: 'Cobertura', sector: 'Sector' } as Record<string,string>)[key] || key}: ${({ national: 'Nacional', all: 'Toda la población', women: 'Mujeres', men: 'Hombres', children: 'Infancia', youth: 'Jóvenes' } as Record<string,string>)[value] || value}`).join(' · ');
export const seriesId = (v: Pick<Observation, 'component_id' | 'country_iso2' | 'scope'>) => `${v.component_id}|${v.country_iso2}|${scopeKey(v.scope)}`;
export const orderPoints = (values: Observation[]) => [...values].sort((a,b) => a.period_start.localeCompare(b.period_start) || a.period_end.localeCompare(b.period_end) || a.id.localeCompare(b.id));
export function periodLabel(v: Pick<Observation,'period_start'|'period_end'>, frequency: Component['frequency']) {
  const start = new Date(`${v.period_start}T00:00:00Z`);
  if (frequency === 'annual') return v.period_start.slice(0,4);
  if (frequency === 'quarterly') return `${start.getUTCFullYear()} · T${Math.floor(start.getUTCMonth()/3)+1}`;
  if (frequency === 'monthly') return start.toLocaleDateString('es-ES',{year:'numeric',month:'short',timeZone:'UTC'});
  return v.period_start === v.period_end ? v.period_start : `${v.period_start} – ${v.period_end}`;
}
export function valueLabel(v: Observation) {
  if (v.missing_reason) return `Dato no disponible: ${v.missing_reason}`;
  if (v.numeric_value !== null) return `${number(v.numeric_value)} ${v.unit}`;
  if (v.boolean_value !== null) return v.boolean_value ? 'Sí' : 'No';
  return v.text_value || 'Desconocido';
}
export function comparable(a: Observation,b: Observation) { return seriesId(a) === seriesId(b) && a.unit === b.unit && a.series_key === b.series_key && a.methodology_version === b.methodology_version; }
const ordinal = (date: string,frequency: Component['frequency']) => {
  const d = new Date(`${date}T00:00:00Z`), y = d.getUTCFullYear(), m = d.getUTCMonth();
  return frequency === 'monthly' ? y*12+m : frequency === 'quarterly' ? y*4+Math.floor(m/3) : y;
};
export function connects(a: Observation,b: Observation,frequency: Component['frequency']) {
  if (!comparable(a,b) || b.break_before || a.numeric_value === null || b.numeric_value === null) return false;
  return frequency === 'irregular' || ordinal(b.period_start,frequency)-ordinal(a.period_start,frequency) === (frequency === 'biennial' ? 2 : 1);
}
export function change(values: Observation[], component: Component) {
  const ordered = orderPoints(values), last = ordered.at(-1);
  if (!last || last.numeric_value === null) return null;
  let first = last;
  for (let i=ordered.length-2; i>=0; i--) {
    if (!connects(ordered[i],first,component.frequency)) break;
    first = ordered[i];
  }
  if (first === last || first.numeric_value === null) return null;
  const absolute = last.numeric_value-first.numeric_value;
  return { first,last,absolute,relative:first.numeric_value === 0 ? null : absolute/Math.abs(first.numeric_value)*100, percentage: component.unit.startsWith('%') };
}
export function target(link: IndicatorLink, baseline: Observation | undefined, latest: Observation | undefined) {
  if (link.target_value === null) return null;
  let lower = link.target_value, upper = link.target_upper;
  if (link.target_type === 'relative') {
    if (!baseline || baseline.numeric_value === null || baseline.numeric_value === 0 || !latest || !comparable(baseline,latest)) return null;
    lower = baseline.numeric_value + Math.abs(baseline.numeric_value)*lower/100;
    upper = upper === null ? null : baseline.numeric_value+Math.abs(baseline.numeric_value)*upper/100;
  }
  const scoped = latest && link.component_id === latest.component_id && scopeKey(link.scope) === scopeKey(latest.scope);
  const applicable = scoped && latest.numeric_value !== null && link.target_date && latest.period_end <= link.target_date;
  const value = latest?.numeric_value;
  const achieved = applicable && value !== null && value !== undefined && (link.target_operator === '>=' ? value>=lower : link.target_operator === '<=' ? value<=lower : link.target_operator === '=' ? value===lower : upper!==null && value>=lower && value<=upper);
  return { lower,upper,achieved:!!achieved };
}
export function isStale(v: Observation, frequency: Component['frequency'], now = new Date()) {
  if (frequency === 'irregular') return false;
  const threshold = frequency === 'monthly' ? 2 : frequency === 'quarterly' ? 2 : frequency === 'biennial' ? 2 : 1;
  return ordinal(now.toISOString().slice(0,10),frequency)-ordinal(v.period_end,frequency)>threshold;
}
// Missing expected periods are labelled as absences in the table, never saved as observations.
export function tableRows(values: Observation[], component: Component): Array<Observation | { gap: string }> {
  const ordered = orderPoints(values), rows: Array<Observation | { gap: string }> = [];
  for (let i=0; i<ordered.length; i++) {
    const prev = ordered[i-1], next = ordered[i];
    if (prev && component.frequency !== 'irregular') {
      const step = component.frequency === 'biennial' ? 2 : 1;
      const a = ordinal(prev.period_start,component.frequency), b = ordinal(next.period_start,component.frequency);
      for (let o=a+step; o<b && o-a<1200; o+=step) {
        const gap = component.frequency === 'monthly' ? `${Math.floor(o/12)}-${String(o%12+1).padStart(2,'0')}` : component.frequency === 'quarterly' ? `${Math.floor(o/4)} · T${o%4+1}` : String(o);
        rows.push({gap});
      }
    }
    rows.push(next);
  }
  return rows;
}
