// Optional semantic triage of monitoring candidates with Gemini.
// Enabled only when the GEMINI_API_KEY function secret is set. The classifier
// sorts candidates into monitoring channels; it never writes evidence or assessments.
// No Deno-specific code, so it can be exercised locally (see check.ts).

import type { Candidate } from "./lib.ts";

export type Category = "need_context" | "implementation_candidate" | "contradiction" | "noise";
export type Verdict = { category: Category; relevance: number; note: string };
export type ClassifierConfig = { apiKey: string; model: string };

export const DEFAULT_MODEL = "gemini-flash-latest";

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
- note is one short neutral sentence in English explaining the choice. Do not add facts that are not in the title.
- Return exactly one result per candidate, using the candidate's index.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    results: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          index: { type: "INTEGER" },
          category: { type: "STRING", enum: ["need_context", "implementation_candidate", "contradiction", "noise"] },
          relevance: { type: "NUMBER" },
          note: { type: "STRING" },
        },
        required: ["index", "category", "relevance", "note"],
      },
    },
  },
  required: ["results"],
};

const CATEGORIES = new Set(["need_context", "implementation_candidate", "contradiction", "noise"]);

export type Triage = { verdicts: Map<number, Verdict> | null; error?: string };

// Returns a verdict per candidate index. When the classifier fails, verdicts is null and
// error says why; callers then fall back to keyword heuristics.
export async function classify(
  config: ClassifierConfig,
  recommendation: { public_id: string; title: string; original_text: string },
  candidates: Candidate[],
): Promise<Triage> {
  if (!candidates.length) return { verdicts: null };
  const list = candidates
    .map((c, i) => `${i}. [${c.source_type}] ${c.title} — ${c.publisher || c.source_domain || "unknown publisher"}${c.published_at ? `, ${c.published_at.slice(0, 10)}` : ""}`)
    .join("\n");
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{
          role: "user",
          parts: [{ text: `Recommendation ${recommendation.public_id}: ${recommendation.title}\n\nAuthoritative text:\n${recommendation.original_text}\n\nCandidates:\n${list}` }],
        }],
        generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0 },
      }),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => null);
      return { verdicts: null, error: `HTTP ${r.status} ${String(body?.error?.message || "").slice(0, 160)}` };
    }
    const data = await r.json();
    const candidate = data?.candidates?.[0];
    if (candidate?.finishReason !== "STOP") return { verdicts: null, error: `finishReason ${candidate?.finishReason ?? "none"}` };
    const text = (candidate.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");
    const parsed = JSON.parse(text) as { results: Array<Verdict & { index: number }> };
    const verdicts = new Map<number, Verdict>();
    for (const v of parsed.results) {
      if (!Number.isInteger(v.index) || v.index < 0 || v.index >= candidates.length || !CATEGORIES.has(v.category)) continue;
      verdicts.set(v.index, { category: v.category, relevance: Math.max(0, Math.min(1, Number(v.relevance) || 0)), note: String(v.note).slice(0, 500) });
    }
    return { verdicts };
  } catch (e) {
    return { verdicts: null, error: String(e).slice(0, 200) };
  }
}
