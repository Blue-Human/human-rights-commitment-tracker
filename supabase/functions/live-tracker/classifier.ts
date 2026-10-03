// Optional semantic triage of monitoring candidates with Claude.
// Enabled only when the ANTHROPIC_API_KEY function secret is set. The classifier
// sorts candidates into monitoring channels; it never writes evidence or assessments.

import Anthropic from "npm:@anthropic-ai/sdk";
import type { Candidate } from "./lib.ts";

export type Category = "need_context" | "implementation_candidate" | "contradiction" | "noise";
export type Verdict = { category: Category; relevance: number; note: string };

const MODEL = Deno.env.get("HRCT_CLASSIFIER_MODEL") || "claude-opus-5-5";

const SYSTEM = `You triage automatically discovered documents for the Human Rights Commitment Tracker (HRCT), an evidence-first public record of human-rights recommendations addressed to Spain.

For each candidate decide how it relates to ONE recommendation. You only see the candidate's title, publisher and date, so judge only what the title itself supports.

Categories:
- need_context: reporting, data or statements showing that the problem addressed by the recommendation persists in Spain (incidents, statistics, monitoring reports). Says nothing about implementation.
- implementation_candidate: a law, plan, budget, programme, institutional measure or official report by Spanish authorities that may be a step toward what the recommendation asks. An announcement is still only a candidate.
- contradiction: a development that may run against the recommendation (repeal, budget cut, rollback, an official finding of non-compliance).
- noise: not about Spain, not about this recommendation's subject, opinion without facts, or too vague to tell.

Rules:
- When unsure, choose noise. A false positive on a public human-rights record is worse than a missed item.
- relevance is 0 to 1: how directly the title concerns this specific recommendation, not the general topic.
- note is one short neutral sentence explaining the choice. Do not add facts that are not in the title.
- Return exactly one result per candidate, using the candidate's index.`;

const SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          category: { type: "string", enum: ["need_context", "implementation_candidate", "contradiction", "noise"] },
          relevance: { type: "number" },
          note: { type: "string" },
        },
        required: ["index", "category", "relevance", "note"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
};

export const classifierName = () => (Deno.env.get("ANTHROPIC_API_KEY") ? MODEL : null);

// Returns a verdict per candidate index, or null when the classifier is unavailable
// or fails; callers then fall back to keyword heuristics.
export async function classify(
  recommendation: { public_id: string; title: string; original_text: string },
  candidates: Candidate[],
): Promise<Map<number, Verdict> | null> {
  if (!Deno.env.get("ANTHROPIC_API_KEY") || !candidates.length) return null;
  const client = new Anthropic();
  const list = candidates
    .map((c, i) => `${i}. [${c.source_type}] ${c.title} — ${c.publisher || c.source_domain || "unknown publisher"}${c.published_at ? `, ${c.published_at.slice(0, 10)}` : ""}`)
    .join("\n");
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user",
        content: `Recommendation ${recommendation.public_id}: ${recommendation.title}\n\nAuthoritative text:\n${recommendation.original_text}\n\nCandidates:\n${list}`,
      }],
    });
    if (response.stop_reason !== "end_turn") return null;
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return null;
    const parsed = JSON.parse(text.text) as { results: Array<Verdict & { index: number }> };
    const verdicts = new Map<number, Verdict>();
    for (const r of parsed.results) {
      if (r.index < 0 || r.index >= candidates.length) continue;
      verdicts.set(r.index, { category: r.category, relevance: Math.max(0, Math.min(1, r.relevance)), note: r.note.slice(0, 500) });
    }
    return verdicts;
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) console.warn("classifier rate limited");
    else if (e instanceof Anthropic.APIError) console.warn(`classifier API error ${e.status}`);
    else console.warn(`classifier error ${String(e).slice(0, 200)}`);
    return null;
  }
}
