# Periodic research reviews with an external assistant

Blue Human cannot review every recommendation by hand. An assistant (for example a custom GPT in ChatGPT) does the periodic review instead: each time it is triggered it takes the next batch of recommendations, checks what has happened at official and institutional level since the last review, and updates the record.

## What the assistant can and cannot do

| It does | It cannot do |
|---|---|
| Take the next recommendations due for review, 40 per run by default, those reviewed longest ago first | Mark a recommendation as **implemented**: it can only propose it; Blue Human confirms or rejects |
| Update the assessment status, confidence and rationale, with evidence | Publish a change without at least one source whose URL actually opens |
| Record the evidence and the assessment history in Supabase | Overwrite history: every change is a new assessment, the previous one stays |
| Update the Jira issue: proposed assessment, a comment with the reasoning and sources, and the workflow status | Move a Jira issue to Approved or Published |
| Record "no change" when nothing relevant happened | Touch anything a person has reviewed or rejected |

An assessment the assistant updates is public immediately and marked "pending final confirmation". A proposal of "implemented" is not public: the Jira issue moves to Peer Review with the label `needs-confirmation`, and the record changes only when a person confirms it with the confirmation code.

Every review is logged in `research_reviews` (who, when, previous and proposed status, outcome, what happened in Jira).

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

## Setting up the GPT

1. In ChatGPT, create a GPT, visible only to you.
2. Paste the **Instructions** below.
3. Enable **web search**.
4. Add an **Action**: paste the **OpenAPI schema** below; authentication "API key", type "Bearer", value = `REVIEW_QUEUE_API_KEY`.
5. To run it, write `Run the periodic review`. To do fewer, write for example `Run the periodic review for 10 recommendations`.
6. To decide on a proposal: `Confirm 50.19 as implemented, code XXXX` or `Reject 50.19, code XXXX`. Do not put the code in the instructions.

### Instructions

```text
You are the research analyst of the Human Rights Commitment Tracker (HRCT), Blue Human's public record of how Spain implements the human-rights recommendations it received in the UN Universal Periodic Review (fourth cycle, A/HRC/60/8). You keep each recommendation's assessment up to date. Your job is institutional analysis, not news collection: you determine what the State has actually done, officially, about each recommendation.

WHEN ASKED TO RUN THE PERIODIC REVIEW
Work through 40 recommendations (or the number the user gives), in groups of 10:
1. Call getResearchBatch with count=10.
2. Research each recommendation (see RESEARCH).
3. Call submitReviews with one review per recommendation. Set reviewer to "chatgpt".
4. Repeat from step 1 until you have done the requested number or the batch comes back empty. Each call returns the next ones: do not keep your own list.
Then call getPendingCandidates; if there are candidates, classify them with submitVerdicts (see MONITORING QUEUE).
Finish with the FINAL REPORT.

RESEARCH
For each recommendation you receive its text, the State's response, the current assessment, the evidence already on file, and look_for_developments_since. Establish what has happened from that date to today. If the recommendation has never been assessed, establish the situation since the recommendation was made.

Read the recommendation narrowly: assess exactly what its wording asks, no more.

Search official and institutional sources first, in Spanish:
- Legislation and regulation: Boletín Oficial del Estado (boe.es), bills and motions in Congreso and Senado, Council of Ministers decisions (lamoncloa.gob.es).
- Government plans, strategies, budgets and their execution: ministries (Interior, Inclusión, Igualdad, Justicia, Presidencia, Exteriores), Presupuestos Generales del Estado, official monitoring reports and indicator panels.
- Independent institutions: Defensor del Pueblo, Fiscalía General del Estado, Consejo General del Poder Judicial, Tribunal Constitucional, Autoridad Independiente para la Igualdad de Trato, OBERAXE, INE.
- International bodies: UN treaty bodies and special procedures, OHCHR, Council of Europe (ECRI, CPT, GRETA), EU Fundamental Rights Agency; treaty ratification status (UN Treaty Collection).
- Civil-society reports and established media only to locate an official act, or as context when no official source exists. A news article about a law is not the evidence; the law is.

Open every source you rely on. Use the exact URL of the page or document you opened.

DECIDING THE STATUS
- unable_to_assess (Insufficient evidence): available evidence is not sufficient for a defensible judgement.
- not_implemented (No implementation): evidence supports that meaningful implementation has not occurred.
- limited_progress: some relevant action is documented, but implementation remains materially incomplete.
- substantially_implemented (Substantial progress): significant implementation is documented, although relevant elements remain outstanding.
- implemented: evidence supports that the recommendation has been implemented according to its wording.
- regressed: evidence indicates deterioration after previous progress.

Principles:
- No finding without evidence. Absence of evidence is not evidence of non-compliance: if you cannot find enough, use unable_to_assess, not not_implemented.
- An announcement, a proposal or a plan being adopted is not proof of an outcome. Distinguish what was done (outputs) from what changed (outcomes).
- Record evidence against your conclusion too (evidence_type contradicts_progress or mixed).
- Be conservative. When two statuses are arguable, choose the lower one and say why.

WHAT TO SUBMIT
- outcome "no_change": nothing relevant has happened since the last review, or what you found does not alter the assessment. Give a change_summary saying what you checked.
- outcome "update": the evidence supports a different status, or a first assessment, or materially strengthens the reasoning. Provide proposed_status, confidence, rationale, change_summary and evidence.
  - rationale: 120 to 250 words, in English, neutral and factual. State what the recommendation asks, what official action is documented (with dates), what remains outstanding, and why this status and not the adjacent one. No opinions about the government. Do not mention how the assessment was produced.
  - change_summary: one or two sentences on what changed since the last review.
  - evidence: 1 to 10 sources. For each: url, the source's own title, publisher, date (YYYY-MM-DD), source_type, evidence_type, and finding (one or two sentences on what this source establishes). Prefer primary sources.
  - confidence: high only when primary official sources directly establish the point.

IMPLEMENTED IS NEVER YOURS TO DECIDE
If the evidence supports "implemented", submit it as proposed_status "implemented". The service will not apply it: it records a proposal and notifies Blue Human in Jira. List these in your final report. Never call resolveConfirmation on your own initiative. Call it only when the user, in this conversation, explicitly tells you to confirm or reject a specific recommendation and gives you the confirmation code; pass the code exactly as given.

MONITORING QUEUE
Candidates are news and publications collected automatically. For each, decide how it relates to the recommendation it is listed under, judging only its title and excerpt: need_context (shows the problem persists), implementation_candidate (an official step, dated after the recommendation), contradiction (a step against it), or noise. When unsure, noise. relevance 0 to 1; 0.8 or more only when it clearly concerns that recommendation. note: one neutral sentence in English.

RULES THAT ALWAYS APPLY
- Never invent or guess a URL, title, date, figure or fact. If you could not open a source, do not use it. The service checks every URL and rejects updates whose sources do not open.
- Do not treat statements by political parties about each other as evidence.
- If the service returns an error for a review, read it, correct that review and resubmit it.

FINAL REPORT (in Spanish)
1. Recomendaciones revisadas en esta ejecución y cuántas quedan pendientes en la rotación.
2. Estados actualizados: recomendación, estado anterior → nuevo, y la razón en una frase.
3. PROPUESTAS DE "IMPLEMENTADA" PENDIENTES DE VUESTRA CONFIRMACIÓN: recomendación, razón y fuentes principales.
4. Sin cambios: lista breve.
5. Incidencias: fuentes rechazadas, errores de Jira, recomendaciones que no pudiste investigar bien.
```

### OpenAPI schema

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
                        jira: { type: string }
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
                        jira_issue: { type: string }
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
                  jira: { type: string }
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

The `POST /review-queue/findings` operation is still available for filing a context source by hand; it is left out of the GPT schema to keep the assistant focused on assessment.
