// HRCT's own classification of the recommendations of A/HRC/60/8 by Sustainable Development Goal
// and target (data/sdg/hrct-review-spain-upr4.json). It was made recommendation by recommendation
// from the official text, with the UHRI tagging as a reference; the criteria are in docs/sdg.md.
//
//   node scripts/sdg-review.mjs --sql    prints the rows of the review for a migration
//   node scripts/sdg-review.mjs --diff   lists the recommendations whose links differ from the UHRI's
import { readFile } from 'node:fs/promises';

const read = async (name) => JSON.parse(await readFile(new URL(`../data/sdg/${name}`, import.meta.url), 'utf8'));

// One row per recommendation and goal: (recommendation, goal, targets of that goal, rationale).
export function reviewRows(review) {
  return review.records.flatMap((record) => record.links.map((link) => ({
    n: Number(record.number.split('.')[1]), goal: link.goal, targets: link.targets, rationale: link.rationale,
  })));
}

// "16.3 16.b · G13": the targets, and the goals linked as a whole.
const summary = (goals, targets) => [...targets, ...goals.filter((goal) => !targets.some((code) => code.startsWith(`${goal}.`))).map((goal) => `G${goal}`)].join(' ') || '—';

if (import.meta.url === `file://${process.argv[1]}`) {
  const review = await read('hrct-review-spain-upr4.json');
  if (process.argv[2] === '--sql') {
    console.log(reviewRows(review).map((r) => `  (${r.n}, ${r.goal}, '{${r.targets.join(',')}}', $es$${r.rationale}$es$)`).join(',\n'));
  } else if (process.argv[2] === '--diff') {
    const uhri = new Map((await read('uhri-spain-upr4.json')).records.map((r) => [r.number, summary(r.goals, r.targets)]));
    let changed = 0;
    for (const record of review.records) {
      const own = summary(record.links.map((l) => l.goal), record.links.flatMap((l) => l.targets));
      if (own === uhri.get(record.number)) continue;
      changed++;
      console.log(`${record.number}\tUHRI: ${uhri.get(record.number)}\tHRCT: ${own}`);
    }
    console.log(`${changed} de ${review.records.length} recomendaciones difieren del etiquetado del UHRI.`);
  } else {
    console.error('Uso: node scripts/sdg-review.mjs --sql | --diff');
    process.exit(1);
  }
}
