# Weekly research and review with an external assistant

Once a week an assistant (for example a custom GPT in ChatGPT) does two things for the Human Rights Commitment Tracker:

1. **Reviews the queue**: candidates the live tracker collected on Monday and nobody has classified.
2. **Researches each recommendation**: searches the web for recent news, official publications and legislation, and files what it finds under the right recommendation.

Everything it files appears on the site as "Pending final confirmation" until a person at Blue Human reviews it. The assistant cannot write evidence, change an assessment, or touch an item a person has reviewed or rejected.

## The service

- Base URL: `https://gostbdmrzchccnydftgd.supabase.co/functions/v1`
- Auth: `Authorization: Bearer <REVIEW_QUEUE_API_KEY>` (a Supabase function secret)

| Operation | What it does |
|---|---|
| `GET /review-queue` | Unclassified candidates, grouped by recommendation |
| `POST /review-queue` | A verdict per candidate |
| `GET /review-queue/recommendations?from=1&count=10` | Recommendations to research, with their text, current assessment and what is already on file |
| `POST /review-queue/findings` | New sources found for a recommendation (max 25 per call) |

Server-side rules that apply whatever the assistant sends:

- An item is shown publicly only if its relevance is 0.8 or higher and it is not `noise`.
- A source whose URL does not open is stored but never shown.
- A law or measure dated before the recommendation is stored but never shown as a development.
- A URL already on file for that recommendation is ignored.

## Setting up the GPT

1. In ChatGPT, create a GPT. Name it, and set it to be visible only to you.
2. Paste the **Instructions** below into the instructions field.
3. Enable **web search** for the GPT.
4. Add an **Action**: paste the **OpenAPI schema** below; set authentication to API key, type Bearer, and paste the review-queue key.
5. Each week, after Monday's tracker run, open the GPT and write: `Run the weekly review`.

### Instructions

```text
You are the research assistant of the Human Rights Commitment Tracker (HRCT), Blue Human's evidence-first public record of human-rights recommendations addressed to Spain (UN Universal Periodic Review, fourth cycle). Your work is filed as "pending final confirmation" and is later checked by a person. Accuracy matters more than volume.

When asked to run the weekly review, do both parts in order.

PART 1 — REVIEW THE QUEUE
1. Call getPendingCandidates. If pending_total is 0, go to Part 2.
2. For every candidate decide how it relates to the recommendation it is listed under, judging only what its title and excerpt support.
3. Call submitVerdicts with one verdict per candidate, using each id exactly as received. Set reviewer to "chatgpt". Repeat until pending_total is 0.

PART 2 — RESEARCH EACH RECOMMENDATION
1. Call getRecommendations with from=1 and count=10. Work through all recommendations in pages of 10 (from=11, 21, 31) until you have covered "total".
2. For each recommendation, read its text and what is already_on_file. Then search the web for developments in Spain from the last 30 days:
   - legislation and official acts: Boletín Oficial del Estado (boe.es), Congreso, Senado, La Moncloa, ministries;
   - institutional reports and data: Defensor del Pueblo, OBERAXE, Ministerio del Interior, Fiscalía, Poder Judicial, INE, UN bodies, Council of Europe;
   - reporting by established national media and reports by recognised civil-society organisations.
   Search in Spanish. Prefer the primary or official source over coverage of it.
3. Keep only sources you have actually opened and that clearly concern this specific recommendation. Skip anything already on file, and file one source per event, not several reports of the same thing.
4. Call submitFindings after each page of recommendations. For each source give: public_id, the exact url you opened, the source's own title (not rewritten), publisher, date (YYYY-MM-DD), source_kind, category, relevance and note. Set reviewer to "chatgpt".
5. It is normal and correct to file nothing for a recommendation when nothing relevant happened.

CATEGORIES
- need_context: reporting, data or statements showing that the problem addressed by the recommendation persists in Spain. Says nothing about implementation.
- implementation_candidate: a law, plan, budget, programme, institutional measure or official report by Spanish authorities, dated after the recommendation, that may be a step toward what it asks. An announcement or a proposal is still only a candidate.
- contradiction: a development that may run against the recommendation (repeal, budget cut, rollback, a rejected proposal, an official finding of non-compliance).
- noise (queue only): not about Spain, not about this recommendation's subject, opinion or partisan exchange without facts, or too vague to tell.

RULES
- Never invent or guess a URL, title, date or fact. If you could not open a page, do not file it.
- When unsure, classify as noise or do not file. A false positive on a public human-rights record is worse than a missed item.
- relevance is 0 to 1: how directly the source concerns this specific recommendation, not the general topic. Use 0.8 or more only when it clearly does.
- note is one short neutral sentence in English saying what the source reports and why it is listed. No opinions, no conclusions about whether Spain complies, and no mention of how the item was found or classified.
- Do not treat statements by political parties about each other as evidence of anything.
- You do not change assessments. If what you found suggests that a recommendation's assessment_status may be out of date, say so in your final summary so a researcher can open it in Jira.

FINAL SUMMARY (in Spanish)
Report: candidates reviewed in the queue; sources filed per recommendation, with their category; sources the service kept hidden and why; and the recommendations whose assessment may deserve a human review, with one sentence each.
```

### OpenAPI schema

```yaml
openapi: 3.1.0
info:
  title: HRCT review queue
  version: "1.1"
servers:
  - url: https://gostbdmrzchccnydftgd.supabase.co/functions/v1
paths:
  /review-queue:
    get:
      operationId: getPendingCandidates
      summary: Candidates collected by the tracker that nobody has classified, grouped by recommendation
      parameters:
        - name: limit
          in: query
          schema: { type: integer, minimum: 1, maximum: 100, default: 40 }
      responses:
        "200":
          description: Pending candidates
          content:
            application/json:
              schema:
                type: object
                properties:
                  pending_total: { type: integer }
                  returned: { type: integer }
                  recommendations:
                    type: array
                    items:
                      type: object
                      properties:
                        public_id: { type: string }
                        number: { type: string }
                        title: { type: string }
                        text: { type: string }
                        candidates:
                          type: array
                          items:
                            type: object
                            properties:
                              id: { type: string }
                              title: { type: string }
                              publisher: { type: string }
                              date: { type: string }
                              source_type: { type: string }
                              excerpt: { type: string }
    post:
      operationId: submitVerdicts
      summary: Record a verdict for each queued candidate
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [verdicts]
              properties:
                reviewer: { type: string }
                verdicts:
                  type: array
                  maxItems: 100
                  items:
                    type: object
                    required: [id, category, relevance, note]
                    properties:
                      id: { type: string }
                      category:
                        type: string
                        enum: [need_context, implementation_candidate, contradiction, noise]
                      relevance: { type: number, minimum: 0, maximum: 1 }
                      note: { type: string }
      responses:
        "200":
          description: Result
          content:
            application/json:
              schema:
                type: object
                properties:
                  updated: { type: integer }
                  shown_publicly: { type: integer }
                  not_found_or_already_reviewed: { type: integer }
                  pending_total: { type: integer }
  /review-queue/recommendations:
    get:
      operationId: getRecommendations
      summary: Recommendations to research, with their text, current assessment and sources already on file
      parameters:
        - name: from
          in: query
          description: Position of the first recommendation to return, starting at 1
          schema: { type: integer, minimum: 1, default: 1 }
        - name: count
          in: query
          schema: { type: integer, minimum: 1, maximum: 40, default: 10 }
      responses:
        "200":
          description: A page of recommendations
          content:
            application/json:
              schema:
                type: object
                properties:
                  total: { type: integer }
                  from: { type: integer }
                  returned: { type: integer }
                  recommendations:
                    type: array
                    items:
                      type: object
                      properties:
                        public_id: { type: string }
                        number: { type: string }
                        title: { type: string }
                        text: { type: string }
                        state_response: { type: string }
                        assessment_status: { type: string }
                        already_on_file:
                          type: array
                          items:
                            type: object
                            properties:
                              title: { type: string }
                              url: { type: string }
                              date: { type: string }
  /review-queue/findings:
    post:
      operationId: submitFindings
      summary: File new sources found for recommendations
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [findings]
              properties:
                reviewer: { type: string }
                findings:
                  type: array
                  maxItems: 25
                  items:
                    type: object
                    required: [public_id, url, title, source_kind, category, relevance, note]
                    properties:
                      public_id: { type: string, description: "Recommendation id, e.g. ESP-UPR4-050.19" }
                      url: { type: string, description: "The exact page that was opened" }
                      title: { type: string, description: "The source's own title, not rewritten" }
                      publisher: { type: string }
                      date: { type: string, description: "Publication date, YYYY-MM-DD" }
                      source_kind:
                        type: string
                        enum: [news, official, legislation, un_body, civil_society]
                      category:
                        type: string
                        enum: [need_context, implementation_candidate, contradiction]
                      relevance: { type: number, minimum: 0, maximum: 1 }
                      note: { type: string }
      responses:
        "200":
          description: What happened to each source
          content:
            application/json:
              schema:
                type: object
                properties:
                  shown_publicly: { type: integer }
                  kept_for_research: { type: integer }
                  url_did_not_open: { type: integer }
                  already_on_file: { type: integer }
                  unknown_recommendation: { type: integer }
                  results:
                    type: array
                    items:
                      type: object
                      properties:
                        url: { type: string }
                        outcome: { type: string }
components:
  schemas: {}
  securitySchemes:
    bearer:
      type: http
      scheme: bearer
security:
  - bearer: []
```
