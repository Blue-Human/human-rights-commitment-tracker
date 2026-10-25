// HRCT's own classification of the recommendations of A/HRC/60/8 by human-security dimension
// (data/human-security/hrct-review-spain-upr4.json). It was made recommendation by recommendation
// from the official text; the criteria are in docs/human-security.md.
//
//   node scripts/human-security-review.mjs --sql       prints the rows of the review for a migration
//   node scripts/human-security-review.mjs --summary   counts per dimension and per recommendation
//   node scripts/human-security-review.mjs --diff      lists the recommendations whose dimensions differ from the earlier assignment
import { readFile } from 'node:fs/promises';

const read = async (name) => JSON.parse(await readFile(new URL(`../data/human-security/${name}`, import.meta.url), 'utf8'));

// The seven dimensions of the UNDP framework, followed by the one Blue Human adds to it.
export const dimensionCodes = ['economic', 'food', 'health', 'environmental', 'personal', 'community', 'political', 'technological'];

// One row per recommendation and dimension: (recommendation, dimension, primary, rationale).
export function reviewRows(review) {
  return review.records.flatMap((record) => record.links.map((link) => ({
    n: Number(record.number.split('.')[1]), code: link.code, primary: link.primary, rationale: link.rationale,
  })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const review = await read('hrct-review-spain-upr4.json');
  const rows = reviewRows(review);
  if (process.argv[2] === '--sql') {
    console.log(rows.map((r) => `  (${r.n}, '${r.code}', ${r.primary}, $es$${r.rationale}$es$)`).join(',\n'));
  } else if (process.argv[2] === '--summary') {
    for (const code of dimensionCodes) {
      const own = rows.filter((r) => r.code === code);
      console.log(`${code}\t${own.length}\tprincipal en ${own.filter((r) => r.primary).length}`);
    }
    for (const size of [0, 1, 2, 3]) console.log(`${size} dimensiones\t${review.records.filter((r) => r.links.length === size).length} recomendaciones`);
    console.log(`${rows.length} asignaciones en ${review.records.length} recomendaciones.`);
  } else if (process.argv[2] === '--diff') {
    // "personal* political": the dimensions of a record, the primary one marked.
    const summary = (record) => record.links.map((link) => `${link.code}${link.primary ? '*' : ''}`).join(' ') || '—';
    const before = new Map((await read('previous-assignment-spain-upr4.json')).records.map((record) => [record.number, summary(record)]));
    let changed = 0;
    for (const record of review.records) {
      if (summary(record) === before.get(record.number)) continue;
      changed++;
      console.log(`${record.number}\tAntes: ${before.get(record.number)}\tRevisión: ${summary(record)}`);
    }
    console.log(`${changed} de ${review.records.length} recomendaciones cambian respecto a la asignación anterior.`);
  } else {
    console.error('Uso: node scripts/human-security-review.mjs --sql | --summary | --diff');
    process.exit(1);
  }
}
