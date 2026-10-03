# Periodic research reviews with an external assistant

Blue Human cannot review every recommendation by hand. An assistant (a ChatGPT plugin, or any MCP client) does the periodic review instead: each time it is triggered it takes the next batch of recommendations, checks what has happened at official and institutional level since the last review, and updates the record.

## What the assistant can and cannot do

| It does | It cannot do |
|---|---|
| Take the next recommendations due for review, 40 per run by default, those reviewed longest ago first | Mark a recommendation as **implemented**: it can only propose it; Blue Human confirms or rejects |
| Update the assessment status, confidence and rationale, with evidence | Publish a change without at least one source whose URL actually opens |
| Record the evidence and the assessment history in Supabase | Overwrite history: every change is a new assessment, the previous one stays |
| Record "no change" when nothing relevant happened | Touch anything a person has reviewed or rejected |

An assessment the assistant updates is public immediately and marked "pending final confirmation". A proposal of "implemented" is not public: it appears in the admin panel (`/admin`), and the record changes only when a person confirms it there, or through the assistant with the confirmation code.

Every review is logged in `research_reviews` (who, when, previous and proposed status, outcome) and shown in the admin panel.

## The service

- Base URL: `https://gostbdmrzchccnydftgd.supabase.co/functions/v1`
- Auth: `Authorization: Bearer <REVIEW_QUEUE_API_KEY>` (a Supabase function secret)

| Operation | What it does |
|---|---|
| `GET /review-queue/batch?count=10` | The next recommendations due for review, with text, current assessment, evidence on file and the date to look from |
| `POST /review-queue/reviews` | One review per recommendation (max 10 per call) |
| `GET /review-queue/confirmations` | "Implemented" proposals waiting for a decision |
| `POST /review-queue/confirmations` | Confirm or reject one; needs `REVIEW_CONFIRMATION_CODE`, which only Blue Human staff know |
| `GET /review-queue`, `POST /review-queue` | Monitoring candidates collected by the weekly tracker: list and classify |
| `POST /review-queue/findings` | File a context source (news, statement) under a recommendation |

Rotation: a recommendation that has just been reviewed goes to the back of the line, so each run continues where the last one stopped. Confirmed "implemented" records and ones waiting for a confirmation decision are skipped.

## Using it from ChatGPT

The assistant runs as a ChatGPT plugin: an MCP server (`supabase/functions/hrct-mcp`) exposes the operations above as tools, and a skill carries the analyst's instructions. Setup steps, the tool list and how access is protected are in `plugin/README.md`; the instructions are in `plugin/skills/hrct-periodic-review/SKILL.md`.

- To run it: `@HRCT Run the periodic review`, or `... for 10 recommendations`.
- To decide on a proposal: `@HRCT Confirm 50.19 as implemented, code XXXX` or `Reject 50.19, code XXXX`. The code is never stored in the plugin.

## Service reference (OpenAPI)

The MCP tools map one to one onto these operations. The schema is kept as the reference for the service and for clients that call it directly.

```yaml
openapi: 3.1.0
info:
  title: HRCT review service
  version: "2.0"
servers:
  - url: https://gostbdmrzchccnydftgd.supabase.co/functions/v1
paths:
  /review-queue/batch:
    get:
      operationId: getResearchBatch
      summary: The next recommendations due for a research review, least recently reviewed first
      parameters:
        - name: count
          in: query
          schema: { type: integer, minimum: 1, maximum: 40, default: 10 }
      responses:
        "200":
          description: A batch of recommendations
          content:
            application/json:
              schema:
                type: object
                properties:
                  eligible_total: { type: integer }
                  never_reviewed: { type: integer }
                  awaiting_confirmation: { type: integer }
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
                        recommendation_date: { type: string }
                        current_assessment:
                          type: object
                          properties:
                            status: { type: string }
                            confidence: { type: string }
                            date: { type: string }
                            provisional: { type: boolean }
                            rationale: { type: string }
                        last_reviewed: { type: string }
                        look_for_developments_since: { type: string }
                        evidence_on_file:
                          type: array
                          items:
                            type: object
                            properties:
                              title: { type: string }
                              url: { type: string }
                              date: { type: string }
                              type: { type: string }
                              finding: { type: string }
                        context_on_file:
                          type: array
                          items:
                            type: object
                            properties:
                              title: { type: string }
                              url: { type: string }
                              date: { type: string }
  /review-queue/reviews:
    post:
      operationId: submitReviews
      summary: File one review per recommendation; may update its assessment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [reviews]
              properties:
                reviewer: { type: string }
                reviews:
                  type: array
                  maxItems: 10
                  items:
                    type: object
                    required: [public_id, outcome, change_summary]
                    properties:
                      public_id: { type: string }
                      outcome: { type: string, enum: [no_change, update] }
                      change_summary: { type: string }
                      proposed_status:
                        type: string
                        enum: [unable_to_assess, not_implemented, limited_progress, substantially_implemented, implemented, regressed]
                      confidence: { type: string, enum: [high, medium, low] }
                      rationale: { type: string }
                      evidence:
                        type: array
                        maxItems: 10
                        items:
                          type: object
                          required: [url, title, source_type, evidence_type, finding]
                          properties:
                            url: { type: string }
                            title: { type: string }
                            publisher: { type: string }
                            date: { type: string, description: "YYYY-MM-DD" }
                            language: { type: string }
                            source_type:
                              type: string
                              enum: [legislation, official_gazette, government_policy, government_release, official_budget, official_statistics, parliamentary_record, judicial_decision, independent_institution, un_body, civil_society, academic, media]
                            evidence_type:
                              type: string
                              enum: [supports_progress, contradicts_progress, context, mixed]
                            finding: { type: string }
      responses:
        "200":
          description: What happened to each review
          content:
            application/json:
              schema:
                type: object
                properties:
                  updated: { type: integer }
                  needs_confirmation: { type: integer }
                  no_change: { type: integer }
                  rejected_no_verified_evidence: { type: integer }
                  unknown_recommendation: { type: integer }
                  results:
                    type: array
                    items:
                      type: object
                      properties:
                        public_id: { type: string }
                        result: { type: string }
                        public_status: { type: string }
                        evidence_recorded: { type: integer }
                        evidence_urls_that_did_not_open:
                          type: array
                          items: { type: string }
  /review-queue/confirmations:
    get:
      operationId: getPendingConfirmations
      summary: Proposals to mark a recommendation as implemented that await a decision by Blue Human
      responses:
        "200":
          description: Pending proposals
          content:
            application/json:
              schema:
                type: object
                properties:
                  pending: { type: integer }
                  proposals:
                    type: array
                    items:
                      type: object
                      properties:
                        public_id: { type: string }
                        number: { type: string }
                        title: { type: string }
                        proposed_on: { type: string }
                        current_public_status: { type: string }
                        confidence: { type: string }
                        change_summary: { type: string }
                        rationale: { type: string }
    post:
      operationId: resolveConfirmation
      summary: Confirm or reject an "implemented" proposal, on a Blue Human reviewer's explicit instruction
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [public_id, decision, confirmation_code]
              properties:
                public_id: { type: string }
                decision: { type: string, enum: [confirm, reject] }
                confirmation_code: { type: string, description: "Given by the reviewer in the conversation" }
                confirmed_by: { type: string, description: "Name of the reviewer" }
      responses:
        "200":
          description: Result
          content:
            application/json:
              schema:
                type: object
                properties:
                  public_id: { type: string }
                  result: { type: string }
  /review-queue:
    get:
      operationId: getPendingCandidates
      summary: Monitoring candidates collected by the tracker that nobody has classified
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
      summary: Classify monitoring candidates
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
                      category: { type: string, enum: [need_context, implementation_candidate, contradiction, noise] }
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
  schemas: {}
  securitySchemes:
    bearer:
      type: http
      scheme: bearer
security:
  - bearer: []
```

The `POST /review-queue/findings` operation is still available for filing a context source by hand; it is not exposed as a tool, to keep the assistant focused on assessment.
