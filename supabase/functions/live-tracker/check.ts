// Read-only check of the live-tracker connectors against the real sources.
// Writes nothing. Run with: node supabase/functions/live-tracker/check.ts "<query>"

import { boeDailySummary, boeSearch, boeSearchQuery, gdelt, isoDate, lastDays, match, matchBoeEntry } from "./lib.ts";

const query = process.argv[2] || "igualdad de trato no discriminación racial";

console.log("isoDate:", isoDate("20261003T101500Z"), isoDate("20261003"), isoDate("20261003101500"));
console.log("match:", match("Real Decreto sobre igualdad de trato y no discriminación", query));
console.log("BOE query:", boeSearchQuery(query));

const search = await boeSearch(query);
console.log(`\nBOE consolidated legislation: ${search.outcome} ${search.detail ?? ""} — ${search.candidates.length} candidates`);
for (const c of search.candidates.slice(0, 8)) console.log(`  ${c.relevance_score.toFixed(2)} ${c.published_at?.slice(0, 10)} ${c.title.slice(0, 110)}`);

for (const day of lastDays(4)) {
  const summary = await boeDailySummary(day);
  const hits = summary.entries.map((e) => matchBoeEntry(e, query)).filter(Boolean);
  console.log(`\nBOE gazette ${day}: ${summary.outcome} ${summary.detail ?? ""} — ${summary.entries.length} dispositions, ${hits.length} matched`);
  for (const c of hits.slice(0, 5)) console.log(`  ${c!.relevance_score.toFixed(2)} ${c!.title.slice(0, 110)}`);
}

const news = await gdelt(`${query} sourcecountry:spain`, "need_context", "supports_need", 14);
console.log(`\nGDELT: ${news.outcome} ${news.detail ?? ""} — ${news.candidates.length} candidates`);
for (const c of news.candidates.slice(0, 8)) console.log(`  ${c.relevance_score.toFixed(2)} ${c.published_at?.slice(0, 10)} ${c.source_domain} ${c.title.slice(0, 90)}`);
