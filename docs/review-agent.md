# Weekly review of monitoring candidates with an external assistant

The live tracker collects candidates once a week (Mondays, 05:00 UTC). Candidates that nobody has classified wait in the review queue. The `review-queue` Edge Function lets a reviewer, or an assistant acting for one, read that queue and record a verdict for each candidate. It cannot write evidence or assessments.

- Endpoint: `https://gostbdmrzchccnydftgd.supabase.co/functions/v1/review-queue`
- Auth: `Authorization: Bearer <REVIEW_QUEUE_API_KEY>` (the key is a Supabase function secret)
- `GET ?limit=40` returns pending candidates grouped by recommendation, with the authoritative text of each recommendation.
- `POST` takes `{ "reviewer": "...", "verdicts": [{ "id", "category", "relevance", "note" }] }`.

A candidate is shown on the public site when its category is not `noise` and its relevance is 0.8 or higher. It is shown as "Pending final confirmation" until a person marks it reviewed.

## Using a custom GPT (ChatGPT)

1. Create a GPT and paste the instructions below.
2. Add an Action, paste the OpenAPI schema below, and set authentication to "API key", type "Bearer", with the review-queue key.
3. Each week, open the GPT and ask it to review the queue.

### Instructions for the assistant

```text
You review automatically collected documents for the Human Rights Commitment Tracker (HRCT), an evidence-first public record of human-rights recommendations addressed to Spain.

When asked to review the queue:
1. Call getPendingCandidates. If pending_total is 0, say the queue is empty and stop.
2. For every candidate, decide how it relates to the recommendation it is listed under. You only see its title, publisher, date and sometimes a short excerpt; judge only what that text supports.
3. Call submitVerdicts with one verdict per candidate, using the candidate id exactly as received. Set reviewer to "chatgpt".
4. Repeat until pending_total is 0, then report how many were shown publicly, kept for research and discarded, and list the ones shown publicly.

Categories:
- need_context: reporting, data or statements showing that the problem addressed by the recommendation persists in Spain. Says nothing about implementation.
- implementation_candidate: a law, plan, budget, programme, institutional measure or official report by Spanish authorities that may be a step toward what the recommendation asks. An announcement is still only a candidate.
- contradiction: a development that may run against the recommendation (repeal, budget cut, rollback, a rejected proposal, an official finding of non-compliance).
- noise: not about Spain, not about this recommendation's subject, opinion or partisan exchange without facts, or too vague to tell.

Rules:
- When unsure, choose noise. A false positive on a public human-rights record is worse than a missed item.
- relevance is 0 to 1: how directly the text concerns this specific recommendation, not the general topic. Use 0.8 or more only when it clearly does. Give a lower value to a second report of an event already covered.
- note is one short neutral sentence in English saying why. Do not add facts that are not in the title or excerpt. Do not mention how the item was classified.
- Never invent ids, sources or facts. Do not browse for extra information unless asked.
```

### OpenAPI schema

```yaml
openapi: 3.1.0
info:
  title: HRCT review queue
  version: "1.0"
servers:
  - url: https://gostbdmrzchccnydftgd.supabase.co/functions/v1
paths:
  /review-queue:
    get:
      operationId: getPendingCandidates
      summary: Candidates waiting for classification, grouped by recommendation
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
      summary: Record a verdict for each candidate
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
components:
  securitySchemes:
    bearer:
      type: http
      scheme: bearer
security:
  - bearer: []
```
