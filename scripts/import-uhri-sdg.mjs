// Sustainable Development Goals and targets that the Universal Human Rights Index (UHRI, OHCHR)
// attaches to each recommendation of A/HRC/60/8. HRCT publishes that official tagging as it is:
// it does not add, remove or reinterpret links.
//
//   node scripts/import-uhri-sdg.mjs <export-full-es.json>   writes data/sdg/uhri-spain-upr4.json
//   node scripts/import-uhri-sdg.mjs --sql                   prints the rows of the snapshot for a migration
//
// The export is the full UHRI dataset (about 400 MB), published by OHCHR at
// https://uhri.ohchr.org/api/uhri/export-results/export-full-es.json
import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

const SYMBOL = 'A/HRC/60/8';
const SNAPSHOT = new URL('../data/sdg/uhri-spain-upr4.json', import.meta.url);
const EXPORT_URL = 'https://uhri.ohchr.org/api/uhri/export-results/export-full-es.json';

// "16.10" sorts after "16.9", and the lettered targets (means of implementation) after the numbered ones.
export function compareTargets(a, b) {
  const key = (code) => { const [goal, rest] = code.split('.'); const n = Number(rest); return [Number(goal), Number.isNaN(n) ? 1 : 0, Number.isNaN(n) ? rest.charCodeAt(0) : n]; };
  const x = key(a), y = key(b);
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

// "16 - Paz, Justicia e Instituciones" is a goal; "16.b - Promover y aplicar leyes no discriminatorias" a target.
export function parseSdgs(labels) {
  const goals = new Set(), targets = new Set();
  for (const label of labels || []) {
    const code = label.split(' - ')[0].trim();
    if (/^\d{1,2}$/.test(code)) goals.add(Number(code));
    else if (/^\d{1,2}\.(\d{1,2}|[a-d])$/.test(code)) { targets.add(code); goals.add(Number(code.split('.')[0])); }
    else throw new Error(`Etiqueta de ODS no reconocida: ${label}`);
  }
  return { goals: [...goals].sort((a, b) => a - b), targets: [...targets].sort(compareTargets) };
}

// The recommendation number opens the text; a few records carry it inside HTML markup.
export function recommendationNumber(text) {
  return text.replace(/<[^>]+>/g, '').match(/^\s*(\d+\.\d+)\b/)?.[1] ?? null;
}

// The export is one JSON array too large to parse at once: its top-level objects are read one by one.
async function* topLevelObjects(path) {
  let depth = 0, inString = false, escaped = false, current = '';
  for await (const chunk of createReadStream(path, { encoding: 'utf8' })) {
    let start = depth > 0 ? 0 : -1;
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk.charCodeAt(i);
      if (inString) {
        if (escaped) escaped = false;
        else if (c === 92) escaped = true;
        else if (c === 34) inString = false;
      } else if (c === 34) inString = true;
      else if (c === 123) { if (depth++ === 0) start = i; }
      else if (c === 125 && --depth === 0) { yield current + chunk.slice(start, i + 1); current = ''; start = -1; }
    }
    if (start >= 0) current += chunk.slice(start);
  }
}

async function buildSnapshot(path) {
  const records = [];
  let publishedOnUhri = '';
  for await (const text of topLevelObjects(path)) {
    if (!text.includes(`"Symbol":"${SYMBOL}"`)) continue;
    const row = JSON.parse(text);
    if (row.Symbol !== SYMBOL) continue;
    const number = recommendationNumber(row.Text);
    if (!number) throw new Error(`Recomendación sin número: ${row.AnnotationId}`);
    records.push({ number, annotation_id: row.AnnotationId, ...parseSdgs(row.Sdgs) });
    if ((row.PublicationDateOnUhri || '') > publishedOnUhri) publishedOnUhri = row.PublicationDateOnUhri;
  }
  const order = (number) => Number(number.split('.')[1]);
  records.sort((a, b) => order(a.number) - order(b.number));
  if (new Set(records.map((r) => r.number)).size !== records.length) throw new Error('Hay recomendaciones repetidas en la exportación');
  return {
    source: 'Índice Universal de los Derechos Humanos (UHRI), ACNUDH',
    export_url: EXPORT_URL,
    symbol: SYMBOL,
    retrieved_at: new Date().toISOString().slice(0, 10),
    published_on_uhri: publishedOnUhri.slice(0, 10),
    records,
  };
}

// One row per recommendation and goal: (recommendation, goal, targets of that goal).
export function snapshotRows(snapshot) {
  return snapshot.records.flatMap((record) => record.goals.map((goal) => ({
    n: Number(record.number.split('.')[1]),
    goal,
    targets: record.targets.filter((code) => Number(code.split('.')[0]) === goal),
  })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (arg === '--sql') {
    const rows = snapshotRows(JSON.parse(await readFile(SNAPSHOT, 'utf8')));
    console.log(rows.map((r) => `  (${r.n}, ${r.goal}, '{${r.targets.join(',')}}')`).join(',\n'));
  } else if (arg) {
    const snapshot = await buildSnapshot(arg);
    // One record per line keeps later refreshes readable in a diff.
    const { records, ...header } = snapshot;
    await writeFile(SNAPSHOT, `${JSON.stringify(header, null, 1).slice(0, -2)},\n "records": [\n${records.map((r) => `  ${JSON.stringify(r)}`).join(',\n')}\n ]\n}\n`);
    const linked = snapshot.records.filter((r) => r.goals.length).length;
    console.log(`${snapshot.records.length} recomendaciones de ${SYMBOL}; ${linked} con algún ODS; publicado en el UHRI el ${snapshot.published_on_uhri}.`);
  } else {
    console.error('Uso: node scripts/import-uhri-sdg.mjs <export-full-es.json> | --sql');
    process.exit(1);
  }
}
