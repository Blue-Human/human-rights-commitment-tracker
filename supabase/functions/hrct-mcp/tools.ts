// MCP tools of the HRCT review plugin. Each one is a thin wrapper over an operation of the
// review-queue function: no business rule lives here. Validation, evidence checks, the
// "implemented needs confirmation" rule and the confirmation code are all enforced there.

export type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; destructiveHint: boolean; openWorldHint: boolean };
  request: (args: Record<string, unknown>) => { method: "GET" | "POST"; path: string; body?: unknown };
};

const object = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
const result = (properties: Record<string, unknown>) => ({ type: "object", properties });

const STATUSES = ["unable_to_assess", "not_implemented", "limited_progress", "substantially_implemented", "implemented", "regressed"];
const SOURCE_TYPES = [
  "legislation", "official_gazette", "government_policy", "government_release", "official_budget", "official_statistics",
  "parliamentary_record", "judicial_decision", "independent_institution", "un_body", "civil_society", "academic", "media",
];

const READ = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
// Writes that add to the record: history is kept, nothing is overwritten. They do change what the public site shows.
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true };

export const TOOLS: Tool[] = [
  {
    name: "get_research_batch",
    title: "Get the next recommendations to review",
    description:
      "Use at the start of a periodic review, and again after each submit_reviews, to get the next recommendations due for a research review (least recently reviewed first). Returns each recommendation's text, the State's response, the current assessment, the evidence already on file and look_for_developments_since. Do not keep your own list: each call returns the ones still pending.",
    inputSchema: object({ count: { type: "integer", minimum: 1, maximum: 40, default: 10, description: "How many recommendations to return. Work in groups of 10." } }),
    outputSchema: result({ eligible_total: { type: "integer" }, never_reviewed: { type: "integer" }, awaiting_confirmation: { type: "integer" }, returned: { type: "integer" }, recommendations: { type: "array", items: { type: "object" } } }),
    annotations: READ,
    request: (a) => ({ method: "GET", path: `/batch?count=${Number(a.count) || 10}` }),
  },
  {
    name: "submit_reviews",
    title: "File research reviews",
    description:
      "Use after researching a group of recommendations to file one review for each (max 10 per call). outcome \"no_change\" records that nothing relevant happened. outcome \"update\" changes the assessment and needs proposed_status, confidence, rationale and at least one evidence source you actually opened. The service checks every evidence URL and rejects updates whose sources do not open. An update is published as provisional. proposed_status \"implemented\" is never applied: it is recorded as a proposal for Blue Human to confirm. If a review is rejected, read the error, correct it and resubmit.",
    inputSchema: object({
      reviewer: { type: "string", description: "Who is filing the reviews, e.g. \"chatgpt\"." },
      reviews: {
        type: "array", minItems: 1, maxItems: 10,
        items: object({
          public_id: { type: "string", description: "Recommendation id exactly as received, e.g. ESP-UPR4-050.19." },
          outcome: { type: "string", enum: ["no_change", "update"] },
          change_summary: { type: "string", description: "One or two sentences in Spanish: what was checked and what changed since the last review." },
          proposed_status: { type: "string", enum: STATUSES, description: "Required for an update." },
          confidence: { type: "string", enum: ["high", "medium", "low"], description: "Required for an update." },
          rationale: { type: "string", description: "Required for an update. 120 to 250 words, in Spanish (Spain), neutral and factual. It is published on the site." },
          evidence: {
            type: "array", maxItems: 10, description: "Required for an update.",
            items: object({
              url: { type: "string", description: "The exact page or document that was opened." },
              title: { type: "string", description: "The source's own title, not rewritten." },
              publisher: { type: "string" },
              date: { type: "string", description: "Publication date, YYYY-MM-DD." },
              language: { type: "string" },
              source_type: { type: "string", enum: SOURCE_TYPES },
              evidence_type: { type: "string", enum: ["supports_progress", "contradicts_progress", "context", "mixed"] },
              finding: { type: "string", description: "One or two sentences in Spanish on what this source establishes." },
            }, ["url", "title", "source_type", "evidence_type", "finding"]),
          },
        }, ["public_id", "outcome", "change_summary"]),
      },
    }, ["reviews"]),
    outputSchema: result({ updated: { type: "integer" }, needs_confirmation: { type: "integer" }, no_change: { type: "integer" }, rejected_no_verified_evidence: { type: "integer" }, unknown_recommendation: { type: "integer" }, results: { type: "array", items: { type: "object" } } }),
    annotations: WRITE,
    request: (a) => ({ method: "POST", path: "/reviews", body: a }),
  },
  {
    name: "get_pending_confirmations",
    title: "List \"implemented\" proposals awaiting a decision",
    description:
      "Use when the user asks which recommendations have been proposed as implemented and are waiting for Blue Human to confirm or reject, or to include them in the final report.",
    inputSchema: object({}),
    outputSchema: result({ pending: { type: "integer" }, proposals: { type: "array", items: { type: "object" } } }),
    annotations: READ,
    request: () => ({ method: "GET", path: "/confirmations" }),
  },
  {
    name: "resolve_confirmation",
    title: "Confirm or reject an \"implemented\" proposal",
    description:
      "Sensitive: changes the public record. Use ONLY when the user, in this conversation, explicitly tells you to confirm or reject a specific recommendation and gives the confirmation code. Never call it on your own initiative, never guess the code, and never reuse a code for a recommendation the user did not name. Pass the code exactly as given.",
    inputSchema: object({
      public_id: { type: "string", description: "Recommendation id, e.g. ESP-UPR4-050.19." },
      decision: { type: "string", enum: ["confirm", "reject"] },
      confirmation_code: { type: "string", description: "Given by the Blue Human reviewer in the conversation." },
      confirmed_by: { type: "string", description: "Name of the reviewer who decided." },
    }, ["public_id", "decision", "confirmation_code"]),
    outputSchema: result({ public_id: { type: "string" }, result: { type: "string" } }),
    // Confirming is not reversible through this plugin, so ask the user before running it.
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    request: (a) => ({ method: "POST", path: "/confirmations", body: a }),
  },
  {
    name: "get_pending_candidates",
    title: "Get monitoring candidates to classify",
    description:
      "Use after the research reviews to get news and publications the tracker collected automatically that nobody has classified yet, grouped by recommendation.",
    inputSchema: object({ limit: { type: "integer", minimum: 1, maximum: 100, default: 40 } }),
    outputSchema: result({ pending_total: { type: "integer" }, returned: { type: "integer" }, recommendations: { type: "array", items: { type: "object" } } }),
    annotations: READ,
    request: (a) => ({ method: "GET", path: `?limit=${Number(a.limit) || 40}` }),
  },
  {
    name: "submit_verdicts",
    title: "Classify monitoring candidates",
    description:
      "Use to classify candidates returned by get_pending_candidates, one verdict per candidate, using each id exactly as received. Candidates rated relevant are shown on the site as pending final confirmation; noise is discarded.",
    inputSchema: object({
      reviewer: { type: "string" },
      verdicts: {
        type: "array", minItems: 1, maxItems: 100,
        items: object({
          id: { type: "string" },
          category: { type: "string", enum: ["need_context", "implementation_candidate", "contradiction", "noise"] },
          relevance: { type: "number", minimum: 0, maximum: 1 },
          note: { type: "string", description: "One short neutral sentence in Spanish (Spain)." },
        }, ["id", "category", "relevance", "note"]),
      },
    }, ["verdicts"]),
    outputSchema: result({ updated: { type: "integer" }, shown_publicly: { type: "integer" }, not_found_or_already_reviewed: { type: "integer" }, pending_total: { type: "integer" } }),
    annotations: WRITE,
    request: (a) => ({ method: "POST", path: "", body: a }),
  },
];
