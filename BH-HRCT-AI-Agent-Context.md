# Blue Human — Human Rights Commitment Tracker (HRCT)
## Complete AI Agent Project Context

**Organization:** Blue Human  
**Website:** https://bluehuman.org  
**Project:** Human Rights Commitment Tracker (HRCT)  
**Project type:** Public human-rights accountability / civic-technology platform  
**Current pilot:** Spain — United Nations Universal Periodic Review (UPR), fourth cycle  
**Primary public dataset:** Spain recommendations 50.1–50.40 from UN document A/HRC/60/8  
**Current architecture:** Jira + Confluence + Supabase + GitHub/Next.js + automated live monitoring  
**Primary language for implementation work:** English in code/data-model; Spanish may be used in operator instructions and internal discussion.

---

# 1. Purpose of this file

This document is the master operating context for any AI agent working on HRCT.

The agent should be able to understand from this file:

- what HRCT is and why it exists;
- what is public and what is internal;
- what Jira is responsible for;
- what Confluence is responsible for;
- what Supabase is responsible for;
- what GitHub / the frontend are responsible for;
- how a commitment moves from UN source to public record;
- how evidence and assessments are stored;
- how the automated live tracker works;
- how human-security dimensions are attached;
- how AI may assist research without silently replacing methodological review;
- which identifiers, fields, workflows and technical conventions are already in use;
- which parts must not be redesigned casually.

The guiding principle is:

> **HRCT converts fragmented human-rights commitments into structured, evidence-based, traceable and continuously monitored public records.**

---

# 2. Blue Human mission and product philosophy

Blue Human is an NGO focused on **human security and human rights**, using technology as an enabling tool.

HRCT is intended to become independent public accountability infrastructure. It should allow civil society, journalists, researchers, institutions and citizens to understand:

1. what a government or institution was asked or committed to do;
2. whether that recommendation or commitment was accepted;
3. what implementation measures followed;
4. what evidence exists;
5. what remains outstanding;
6. how the situation has evolved over time;
7. why the recommendation remains relevant in the real world.

HRCT must not become:

- a partisan scorecard;
- an election tracker;
- an automated political ranking system;
- an AI system that invents human-rights violations;
- a database of unsupported advocacy claims;
- a simple government-activity tracker that equates activity with outcomes.

The platform must remain evidence-first, neutral in presentation and transparent about methodology.

---

# 3. Core conceptual distinctions

HRCT must preserve the difference between:

- **legal obligations** — duties arising from binding legal instruments;
- **formal commitments** — explicit undertakings formally accepted or announced;
- **recommendations** — proposals made by external bodies, which may or may not be accepted;
- **policy objectives** — goals contained in strategies, plans or programmes.

A recommendation is not automatically a legal obligation.  
A government statement is not automatically implementation.  
A plan being adopted is not automatically proof of an outcome.

The system must distinguish **outputs** from **outcomes** whenever possible.

---

# 4. Current pilot scope

The current working pilot is intentionally narrow:

- **Country:** Spain
- **Mechanism:** Universal Periodic Review (UPR)
- **Cycle:** fourth cycle
- **Primary UN source:** A/HRC/60/8
- **State response source:** A/HRC/60/8/Add.1
- **Current public pilot records:** 40 recommendations, 50.1 through 50.40

This pilot is being used to validate:

- the assessment methodology;
- the publication workflow;
- the public UI;
- AI-assisted research;
- automated evidence discovery;
- human-security classification;
- live monitoring.

The system is not yet meant to cover all countries or all UN mechanisms.

---

# 5. System architecture at a glance

```text
                         UNITED NATIONS / PUBLIC SOURCES
                                      │
                                      ▼
                            COMMITMENT INGESTION
                                      │
                     ┌────────────────┴───────────────┐
                     │                                │
                     ▼                                ▼
              JIRA RESEARCH                    LIVE TRACKER
          human research workflow       automated source monitoring
                     │                                │
                     ▼                                ▼
                CONFLUENCE                    MONITORING ITEMS
          methodology / governance        candidates + live context
                     │                                │
                     └───────────────┬────────────────┘
                                     ▼
                                 SUPABASE
                       canonical structured database
                                     │
                ┌────────────────────┼────────────────────┐
                │                    │                    │
                ▼                    ▼                    ▼
         PUBLIC COMMITMENTS      PUBLIC EVIDENCE      HISTORY / CONTEXT
                │                    │                    │
                └────────────────────┴────────────────────┘
                                     ▼
                            NEXT.JS / MATERIAL UI
                              PUBLIC HRCT WEBSITE
```

## Source-of-truth rule

- **Jira is the primary human workflow record.**
- **Confluence is the methodology/governance record.**
- **Supabase is the canonical structured data store.**
- **GitHub is the canonical code/schema/migration/frontend repository.**
- **The public web reads Supabase, never Jira directly.**

---

# 6. Atlassian environment

## Atlassian site

- **Cloud ID:** `41142df4-cbe8-4f0a-aae8-577a93d5df3f`
- **Site:** `https://bluehuman.atlassian.net`

---

# 7. Jira project

## Project

- **Project name:** Human Rights Commitment Tracker
- **Key:** `HRCT`
- **Project ID:** `10200`
- **Type:** company-managed Jira Software project

Jira is used for **human research and review**, not as the public database.

Normal researchers/reviewers should work in Jira, not directly in Supabase.

## Main Jira issue type

**Commitment Review**

- **Issue type ID:** `10215`
- **Description:** `Research, evidence assessment and peer-review record for a Human Rights Commitment Tracker commitment.`

Each real commitment being researched should have one Commitment Review issue when it enters the human workflow.

---

# 8. Jira workflow

The intended workflow is:

```text
Backlog
  ↓
Research
  ↓
Peer Review
  ├──→ Changes Requested ──→ Research
  └──→ Approved
            ↓
         Published
```

## Status meanings

### Backlog
Commitment exists but active research has not started.

### Research
Researcher is gathering evidence, interpreting scope, defining actions/indicators and drafting a proposed assessment.

### Peer Review
Research package is ready for methodological review.

### Changes Requested
Reviewer found changes required before approval.

### Approved
Human research/methodological review is approved. This is separate from technical publication.

### Published
The record has successfully passed publication validation and the canonical public dataset is exposed.

## Important semantic rule

> **Approved ≠ Published.**

Approved means the assessment is methodologically approved.  
Published means technical validation/persistence/public exposure succeeded.

## Known transition IDs

- Backlog → Research: `Start Research`, transition ID `2`
- Research → Peer Review: `Submit for Peer Review`, transition ID `3`
- Peer Review → Approved: `Approve Assessment`, transition ID `5`
- Approved → Published: `Mark as Published`, historically transition ID `7`

Additional workflow transitions include:

- Peer Review → Changes Requested: `Request Changes`
- Changes Requested → Research: `Resume Research`
- Peer Review → Research: `Return to Research`

There are no intended global “Any status” transitions.

## Board columns

```text
BACKLOG | RESEARCH | PEER REVIEW | CHANGES REQUESTED | APPROVED | PUBLISHED
```

---

# 9. Jira custom fields

These fields are already part of the integration contract.

| Meaning | Jira field | Notes |
|---|---|---|
| HRCT Public ID | `customfield_10331` | String |
| Country | `customfield_10332` | Spain option `10101` |
| Mechanism | `customfield_10333` | UPR `10102`; Treaty Body `10103`; National Action Plan `10104`; Other `10105` |
| Acceptance Status | `customfield_10334` | Accepted `10106`; Partially accepted `10107`; Noted `10108`; Rejected `10109`; Not applicable `10110` |
| Proposed Assessment | `customfield_10335` | See status mapping below |
| Confidence | `customfield_10336` | Low `10118`; Medium `10119`; High `10120` |
| Methodology Version | `customfield_10337` | HRCT v1.0 option `10121` |
| Peer Reviewer | `customfield_10338` | Jira user field |

## Proposed Assessment Jira options

- Not assessed — `10111`
- Insufficient evidence — `10112`
- No implementation — `10113`
- Limited progress — `10114`
- Substantial progress — `10115`
- Implemented — `10116`
- Regressed — `10117`

## Canonical database mapping

| Jira label | Canonical assessment status |
|---|---|
| Not assessed | `unable_to_assess` or operational `not_assessed` depending on record stage |
| Insufficient evidence | `unable_to_assess` |
| No implementation | `not_implemented` |
| Limited progress | `limited_progress` |
| Substantial progress | `substantially_implemented` |
| Implemented | `implemented` |
| Regressed | `regressed` |

The database also currently permits `in_progress` for compatibility with the broader status taxonomy.

---

# 10. Commitment Review template

A Commitment Review issue should contain the following research sections:

1. **Commitment identity**
2. **Scope and interpretation**
3. **Expected actions**
4. **Indicators**
5. **Evidence register**
6. **Researcher's proposed assessment**
7. **Research completion checklist**
8. **Peer Review**
9. **Publication result — SYSTEM MANAGED**

The Edge Function parser is designed to convert the Jira-rendered HTML description back into structured text, so the shape of these sections matters.

---

# 11. Existing Jira pilot issues

Key issues created during the pilot include:

- `HRCT-1` — Epic: HRCT Pilot — Spain / Universal Periodic Review
- `HRCT-2` — Task: Define Jira → Supabase publication contract
- `HRCT-3` — Task: Select first Spain UPR commitments for pilot
- `HRCT-4` — Task: Validate assessment vocabulary
- `HRCT-5` — Task: Build first public commitment detail view
- `HRCT-6` — UPR 50.10 — Ombudsman resources — published pilot assessment
- `HRCT-7` — UPR 50.11 — OBERAXE means
- `HRCT-8` — UPR 50.12 — Femicide Observatory / firearm data
- `HRCT-9` — UPR 50.13 — anti-racism / hate strategy
- `HRCT-10` — UPR 50.9 — ESC technical assistance
- `HRCT-11` — TEMPLATE — do-not-publish template issue

Numerous later `TEST-HRCT-FLOW4-*` issues were created only for automation validation. They are test artefacts and must never be treated as substantive human-rights records.

---

# 12. Jira Automation

## Rule 1 — Initialize Commitment Review

When a Commitment Review is created:

- injects the standard research template;
- sets Proposed Assessment to `Not assessed`;
- sets Methodology Version to `HRCT v1.0`;
- adds label `commitment`.

## Rule 2 — Peer Review reminder

When an issue enters Peer Review it reminds the reviewer to verify:

- original commitment;
- material evidence;
- contradictory evidence;
- proposed assessment;
- confidence;
- methodology.

## Rule 3 — Approval support

Approval flow applies the `peer-review-approved` label and historically supported approval comments/metadata.

## Rule 4 — Approve and Publish Commitment

This is the key Jira → Supabase integration.

Trigger:

- issue transitions to **Approved**

Conditions:

- issue type = Commitment Review
- labels do not contain `do-not-publish`

Flow:

1. add `peer-review-approved`;
2. POST to `sync-commitment`;
3. if synchronization succeeds, POST to `publish-commitment`;
4. technical publication makes the Supabase record public;
5. Jira may transition to Published where the final response branch succeeds.

The automation currently sends the Jira description using:

```text
{{issue.description.html.jsonEncode}}
```

This is intentional: the Supabase parser accepts Jira HTML.

Do not revert it to raw Atlassian serialization without re-testing the parser.

---

# 13. Confluence

## Space

- **Space name:** Human Rights Commitment Tracker
- **Key:** `HRCT`
- **Space ID:** `14942259`
- **Homepage ID:** `14942422`

## Methodology page

- **Title:** `HRCT — Methodology v1.0`
- **Page ID:** `14942437`

Confluence is for:

- methodology;
- governance;
- research handbook;
- status definitions;
- evidence standards;
- source hierarchy;
- AI usage policy;
- correction procedure;
- version history;
- reviewer guidance.

It should not become the canonical structured database.

---

# 14. HRCT methodology principles

## Current methodology version

- **Version:** `1.0`
- **Database ID:** `a7b640d7-488b-447e-9a43-ff76c47d3de5`
- **Effective from:** `2026-09-27`

## Current public assessment vocabulary

- Not assessed
- Insufficient evidence
- No implementation
- Limited progress
- Substantial progress
- Implemented
- Regressed

## Evidence-first rule

No implementation finding should be presented without evidence.

Relevant evidence may include:

- legislation;
- BOE / official gazettes;
- government reports;
- budget records;
- budget execution;
- administrative data;
- official statistics;
- parliamentary records;
- judicial decisions;
- UN reports;
- ombudsman / national human-rights institutions;
- NGO reports;
- academic research;
- credible investigative journalism.

Contradictory evidence must be preserved rather than hidden.

## Human review rule

AI may assist research, classification, discovery and drafting. It should not silently turn uncertain automated evidence into a final sensitive assessment.

During the current internal pilot, AI-assisted assessments are allowed for product testing, but should be labelled as requiring human validation before an external launch.

---

# 15. Supabase project

## Supabase organization

- **Organization:** PeaceOSv2
- **Organization ID:** `axiykrhyyvomfhnsxtzy`

## Project

- **Project:** Human Rights Commitment Tracker
- **Project ref:** `gostbdmrzchccnydftgd`
- **Region:** `eu-west-1`

Supabase is the canonical database and backend integration layer.

---

# 16. Core Supabase data model

The original HRCT schema contains the following core tables:

- `countries`
- `mechanisms`
- `institutions`
- `rights_areas`
- `methodology_versions`
- `sources`
- `commitments`
- `commitment_rights_areas`
- `commitment_institutions`
- `actions`
- `indicators`
- `evidence`
- `assessments`
- `assessment_evidence`
- `assessment_changes`
- `external_submissions`

The live tracker layer adds additional monitoring / classification structures, including:

- monitoring profiles;
- monitoring items;
- monitoring runs;
- human-security dimensions;
- commitment-to-human-security-dimension links;
- public views for live context and research candidates.

Do not remove these layers merely because they are not part of the original MVP schema.

---

# 17. Important commitment fields

`commitments` includes, among others:

- `id`
- `public_id`
- `country_id`
- `mechanism_id`
- `source_id`
- `title`
- `original_text`
- `normalized_summary`
- `recommendation_number`
- `acceptance_status`
- `legal_character`
- `commitment_date`
- `deadline`
- `original_language`
- `publication_status`
- `published_at`
- `created_at`
- `updated_at`
- `jira_issue_key`
- `jira_issue_id`
- `review_status`
- `approved_at`
- `approved_by`

Operational `review_status` values include:

- `research`
- `peer_review`
- `changes_requested`
- `approved`

Public publication is separately represented by `publication_status`.

---

# 18. Assessment history

`assessments` is append-oriented and contains:

- `id`
- `commitment_id`
- `methodology_version_id`
- `status`
- `confidence`
- `rationale`
- `assessment_date`
- `jira_issue_key`
- `is_current`
- `is_public`
- `published_at`
- `created_at`

Valid status values currently include:

- `not_assessed`
- `implemented`
- `substantially_implemented`
- `in_progress`
- `limited_progress`
- `not_implemented`
- `unable_to_assess`
- `regressed`

Valid confidence values:

- `high`
- `medium`
- `low`

## Critical historical rule

Published assessments must not be overwritten destructively.

When an assessment changes:

1. previous assessment remains;
2. new assessment becomes current;
3. `assessment_changes` records the transition and reason.

The public product is meant to behave like a transparent research record, not a mutable dashboard with erased history.

---

# 19. Evidence model

`evidence` contains:

- `id`
- `commitment_id`
- `source_id`
- `evidence_type`
- `finding`
- `excerpt`
- `locator`
- `reliability_notes`
- `evidence_date`
- `is_public`
- `created_at`
- `jira_issue_key`
- `reviewed_at`

Allowed evidence types include:

- `supports_progress`
- `contradicts_progress`
- `context`
- `mixed`

Every evidence record must point to a `sources` record.

---

# 20. Source model

`sources` contains:

- `id`
- `title`
- `publisher`
- `source_type`
- `document_reference`
- `publication_date`
- `url`
- `language`
- `accessed_at`
- `created_at`

Examples of source types already used during the pilot include:

- `primary_official`
- `state_response`
- `government_policy`
- `government_release`
- `official_budget`
- `official_budget_execution`
- `official_monitoring_output`
- other structured source categories used by research scripts.

---

# 21. Official UN sources currently seeded

## A/HRC/60/8

- source ID: `86c7a0cf-4dcc-4dcf-af6e-f7c9066d7503`
- official URL: `https://digitallibrary.un.org/record/4087094/files/A_HRC_60_8-EN.pdf`

## A/HRC/60/8/Add.1

- source ID: `98da68ad-5438-4d92-a200-eb458fc821b0`
- official URL: `https://digitallibrary.un.org/record/4087088/files/A_HRC_60_8_Add.1-EN.pdf`

These provide the recommendation text and Spain's formal response context for the fourth-cycle pilot.

---

# 22. Key pilot commitment IDs

Known canonical IDs include:

- UPR 50.10 — `2ac296ef-1333-46e6-88c8-e1bbf1097d09`
- UPR 50.11 — `d1a25684-b8fa-4f02-9b48-aafeb185aa2e`
- UPR 50.12 — `4669fc52-0c0d-43af-becb-60a80d45d735`
- UPR 50.13 — `4e134544-0349-4298-abaa-2ac463703756`
- UPR 50.9 — `cace3c20-804d-441d-b668-87fa994b4420`

Do not hard-code these unnecessarily in new migrations. Prefer lookup by stable public identifiers when possible.

---

# 23. Public views

The public frontend relies on Supabase views rather than direct unrestricted table access.

Core public views include:

- `hrct_public_commitments`
- `hrct_public_evidence`
- `hrct_public_assessment_history`

The live tracker additionally exposes public views for:

- human-security dimensions attached to each commitment;
- reviewed/public monitoring context;
- automated monitoring candidates where appropriate.

RLS/public exposure is intended to show published data only.

---

# 24. Supabase Edge Functions

## `sync-commitment`

- active
- current known version: v5
- `verify_jwt = true`

Purpose:

- receive Jira Commitment Review payloads;
- authenticate webhook secret;
- parse Jira-rendered HTML description;
- normalize commitment identity;
- sync sources, actions, indicators and evidence;
- validate approval requirements;
- create/update current assessment;
- preserve append-only history for already-public assessments;
- set canonical review status.

It uses the service-role key internally. The service-role key must never be exposed to Jira or the browser.

## `publish-commitment`

- active
- current known version: v7
- `verify_jwt = true`

Purpose:

- accept a commitment ID or Jira issue key;
- require approved review state;
- validate required commitment fields;
- validate current assessment;
- validate evidence requirements where applicable;
- make evidence public;
- make assessment public;
- set commitment `publication_status = published`;
- set publication timestamps.

The function can use approval metadata already recorded during synchronization if Jira does not pass an `approved_by` value reliably.

## `live-tracker`

- active
- current known deployed version: v2
- `verify_jwt = false`

Purpose:

- maintain the project with minimal manual intervention;
- process commitment-specific monitoring profiles;
- discover recent news / public reporting;
- discover potential implementation developments;
- query BOE for legal changes;
- deduplicate URLs;
- assign relevance scores;
- update monitoring run history;
- feed public contextual sections and internal research candidates.

The source for this function is versioned in the GitHub repository under:

```text
supabase/functions/live-tracker/index.ts
```

---

# 25. Live Tracker philosophy

The live tracker is a central strategic feature because Blue Human currently has very limited human capacity.

The objective is:

> **Keep HRCT alive without requiring a researcher to manually search every recommendation every day.**

It should continuously discover potentially relevant material while keeping different evidentiary purposes separate.

---

# 26. Two distinct live-monitoring channels

## A. Why this recommendation remains relevant

This section is not an implementation assessment.

It contains current reporting, incidents, public statements, monitoring reports or other material that illustrates that the underlying human-rights problem continues to exist.

Example:

```text
Recommendation: combat hate speech
        ↓
Recent hate-speech incident / official monitoring data / credible reporting
        ↓
Why this recommendation remains relevant
```

Such items may support the **need** for the recommendation but do not prove implementation or non-implementation by themselves.

Typical relation:

- `supports_need`
- `context`

## B. Potential implementation developments

This is a separate automated research queue.

Examples:

- new legislation;
- new government plan;
- budget allocation;
- implementation programme;
- monitoring commission;
- public report;
- administrative change;
- new official dataset.

These items may later become implementation evidence after review.

They must not silently alter the formal assessment.

---

# 27. Live Tracker data behaviour

Current behaviour includes:

- one monitoring profile per pilot recommendation;
- 40 profiles for Spain recommendations 50.1–50.40;
- automatic discovery via GDELT;
- BOE consolidated-legislation discovery;
- source-domain classification;
- official-source recognition for relevant Spanish public institutions;
- URL-level deduplication;
- relevance scoring;
- `last_seen_at` updates;
- monitoring-run history;
- cooldown / concurrency protection;
- periodic processing of profiles ordered by oldest `last_run_at`.

Known official domains recognized in the current implementation include examples such as:

- `boe.es`
- `interior.gob.es`
- `inclusion.gob.es`
- `igualdad.gob.es`
- `lamoncloa.gob.es`
- `defensordelpueblo.es`
- `congreso.es`
- `senado.es`
- `poderjudicial.es`

This list may be expanded carefully.

---

# 28. Monitoring schedule

The repository contains:

```text
.github/workflows/live-tracker.yml
```

It schedules live-tracker runs approximately hourly.

The current design processes the profiles that have gone longest without a scan, so all 40 pilot recommendations rotate through the monitoring queue rather than trying to perform a large expensive scan in every single run.

The live tracker should remain lightweight and self-maintaining.

---

# 29. Human-security dimensions

Each recommendation is also classified against the **UNDP human-security framework**.

Current dimensions:

1. Economic security
2. Food security
3. Health security
4. Environmental security
5. Personal security
6. Community security
7. Political security

Every commitment may affect multiple dimensions.

The schema supports:

- multiple dimensions per commitment;
- identification of a primary dimension;
- rationale for the mapping.

Current pilot state:

- 40 recommendations classified;
- 121 commitment-to-human-security-dimension links created.

These classifications should be visible in the public commitment detail page.

The dimension mapping is interpretive context, not an implementation score.

---

# 30. Current live-context seed state

The project already contains reviewed/seeded context items demonstrating the concept, including material related to:

- OBERAXE monitoring of hate speech;
- Ministry of the Interior / hate-crime monitoring;
- current public reporting on racist incidents;
- implementation-related official material for selected recommendations.

At one verified point in the pilot there were:

- 40 monitoring profiles;
- 121 dimension links;
- 40 commitments classified for human security;
- 11 public monitoring items.

Counts will change over time as the tracker runs.

---

# 31. AI-assisted assessment pilot

Several recommendations have already been used to test AI-assisted research using real public sources.

Examples include:

## Recommendation 50.11 — OBERAXE means

Current pilot assessment:

- status: `unable_to_assess`
- public interpretation: Insufficient evidence
- confidence: medium

Reasoning: operational capacity exists, but available public material did not allow a reliable determination that overall means are adequate for the full mandate.

## Recommendation 50.17 — Strategic Framework against racism and xenophobia

Current pilot assessment:

- `substantially_implemented`
- confidence: medium

Reasoning: concrete monitoring and accountability mechanisms exist, but the available evidence did not prove full effective implementation across the whole framework.

## Recommendation 50.19 — Third Action Plan to Combat Hate Crimes

Current pilot assessment:

- `implemented`
- confidence: high

Reasoning: the narrow recommendation asked Spain to advance adoption of the third Action Plan, and the 2025–2028 plan was adopted and operating.

## Recommendation 50.21 — Second National Human Rights Plan

Current pilot assessment:

- `limited_progress`
- confidence: medium

Reasoning: implementation and civil-society participation structures exist, but public evidence did not support a conclusion of substantial/full implementation across the whole plan.

These are pilot AI-assisted findings and should retain transparent human-validation caveats until formally reviewed.

---

# 32. GitHub repository

## Repository

- **Organization:** `Blue-Human`
- **Repository:** `human-rights-commitment-tracker`
- **Full name:** `Blue-Human/human-rights-commitment-tracker`
- **Default branch:** `main`
- **Visibility:** public

GitHub stores:

- frontend code;
- backend function source;
- migrations/schema documentation;
- workflows;
- research-pilot documentation;
- public assets;
- CI.

Do not treat GitHub issues as the main human-rights research workflow. Jira has that role.

---

# 33. Frontend stack

The public UI uses:

- **Next.js 15**
- **TypeScript**
- **Material UI (MUI)**
- **IBM Plex Sans**
- Supabase REST/public views

UI constraints:

- use Material UI components rather than raw browser-native UI where practical;
- institutional, sober, publication-style visual language;
- do not drift toward generic SaaS dashboard aesthetics;
- accessibility from the beginning;
- textual labels must accompany status colour;
- avoid excessive gradients, shadows, decorative blobs and dashboard gimmicks.

---

# 34. Blue Human / HRCT visual brand

Current approved visual direction:

- **Primary:** `#0a1e33`
- **Current emphasis:** also `#0a1e33` rather than bright cyan as the dominant interface accent
- **Typeface:** IBM Plex Sans
- **Navbar:** `#0a1e33`
- **Navbar text:** white
- **Logo asset:** `/public/images/HRCT.png`

The global header displays:

- smaller HRCT logo;
- “Human Rights Commitment Tracker” directly beneath it in IBM Plex Sans;
- navigation to Recommendations and About.

The desired tone is closer to an international institutional / UN-style publication portal than to a startup/SaaS dashboard.

---

# 35. Public UI structure

## Homepage / explorer

The homepage should present:

- clear institutional project explanation;
- pilot scope;
- public summary statistics;
- filters/search;
- recommendation register;
- status labels;
- country/mechanism context.

## Commitment detail page

A commitment page includes or is intended to include:

1. recommendation identity;
2. normalized summary;
3. implementation assessment;
4. confidence/date/methodology;
5. authoritative UN text;
6. reviewed implementation evidence;
7. Human Security dimensions;
8. **Why this recommendation remains relevant** live-context section;
9. **Potential implementation developments** automated research queue;
10. authoritative source metadata.

The page should make it clear which material is:

- reviewed evidence;
- context showing continued need;
- automatically discovered candidate information.

These categories must not be visually or semantically conflated.

---

# 36. Frontend data access

The frontend uses public Supabase REST views with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Important rule:

> Never put the Supabase service-role key in the frontend.

The current data helper lives at:

```text
src/lib/hrct.ts
```

It retrieves public commitments and evidence from Supabase and has been expanded to support human-security and monitoring data.

---

# 37. Repository structure — conceptual

Key paths include:

```text
src/
  app/
    commitments/[publicId]/page.tsx
  components/
    SiteHeader.tsx
    StatusChip.tsx
  lib/
    hrct.ts

public/
  images/
    HRCT.png

supabase/
  functions/
    live-tracker/
      index.ts
  migrations/
    ...

docs/
  research-pilot-2026-10.md
  ...

.github/
  workflows/
    ci.yml
    live-tracker.yml
```

The exact migration filename may change, but schema changes for the live tracker and human-security framework are versioned in the repo.

---

# 38. CI and build behaviour

The project uses GitHub Actions for frontend CI.

The build performs approximately:

```text
npm install
npm run build
```

The root Next.js TypeScript configuration excludes the Supabase Deno function folder so Next.js does not try to type-check `Deno` globals as browser/server TypeScript.

This separation is intentional.

If changing `tsconfig.json`, do not accidentally re-include `supabase/functions/**` in the Next.js type-checking scope.

---

# 39. Publication contract: Jira → Supabase

Conceptually:

```text
Researcher works in Jira
        ↓
Peer reviewer approves
        ↓
Jira transition → Approved
        ↓
sync-commitment
        ↓
Structured commitment / sources / evidence / assessment stored
        ↓
publish-commitment
        ↓
Validation succeeds
        ↓
Supabase publication_status = published
        ↓
Public views expose record
        ↓
Next.js displays it
```

The public site must never infer publication merely from Jira status.

Canonical publication state lives in Supabase.

---

# 40. Security model

## Jira → Edge Functions

Jira webhooks use:

- Bearer authentication compatible with function JWT verification;
- custom `X-HRCT-Webhook-Secret` validation.

A webhook secret was exposed during development and should be treated as a credential that may require rotation before external production launch.

Do not print or commit secrets into documentation, source code or logs.

## Supabase

- service-role key is internal only;
- public frontend uses anon/public key;
- published data is exposed through controlled views / RLS;
- draft research data should remain non-public.

## Live Tracker

The current live-tracker Edge Function is configured with `verify_jwt=false` because it is designed for unattended scheduled execution and contains its own operational safeguards. If public invocation becomes a concern, add a dedicated scheduler secret or move scheduling to a protected internal mechanism.

---

# 41. Research integrity rules for AI agents

An AI agent working on this repository MUST follow these rules:

1. Do not fabricate sources.
2. Do not fabricate recommendation text.
3. Do not invent dates, institutions, deadlines or legal obligations.
4. Do not equate an announcement with completed implementation.
5. Preserve contradictory evidence.
6. Prefer primary/official sources where available.
7. Treat media as context unless it is genuinely the best available evidence for the proposition.
8. Use `unable_to_assess` / Insufficient evidence when the evidence cannot support a responsible conclusion.
9. Keep automatically discovered context separate from reviewed implementation evidence.
10. Do not silently overwrite published assessment history.
11. Do not expose internal secrets.
12. Do not publish test records.
13. Do not treat AI inference as a source.
14. Human validation remains required for sensitive final findings unless Blue Human explicitly changes that policy.

---

# 42. Source hierarchy

The default hierarchy is:

## Primary evidence

- legislation;
- official gazettes;
- government administrative records;
- official statistical data;
- budget allocation/execution;
- judicial decisions;
- formal implementation documents.

## Independent institutional evidence

- UN bodies;
- treaty mechanisms;
- national human-rights institutions;
- ombudsman institutions;
- recognized international monitoring mechanisms.

## Civil-society evidence

- NGO reports;
- watchdog reports;
- documented field research.

## Secondary evidence

- academic publications;
- reputable journalism;
- expert analysis.

A lower-level source is not automatically “bad”; the relevance depends on the claim being assessed.

---

# 43. Why the live tracker does not directly change assessments

Automated search is inherently noisy.

A news article can show:

- that a problem exists;
- that an incident occurred;
- that an institution made a statement;
- that a law was announced;
- that a public debate exists.

It does not necessarily prove:

- effective implementation;
- national coverage;
- causal impact;
- fulfilment of all recommendation elements.

Therefore the automated layer produces:

- context;
- candidates;
- signals;

while reviewed evidence and assessments remain a separate methodological layer.

---

# 44. Human Security interpretation

The Human Security dimension layer exists because Blue Human's organizational mission is broader than formal human-rights legal classification.

A recommendation can affect more than one security dimension.

Example:

```text
Anti-hate-speech recommendation
  ├─ Community security
  ├─ Personal security
  └─ Political security
```

This layer helps explain the real-world human-security implications of recommendations.

It must not be used as a simplistic score or political label.

---

# 45. Test and non-production records

Records whose `public_id` or Jira labels indicate `TEST`, `automation-e2e-test`, or `do-not-publish` must be treated as test artefacts.

They must not contaminate production analytics or public datasets.

Before adding any automated smoke tests that technically publish, ensure there is a clear test-record exclusion or cleanup strategy.

---

# 46. Current strategic goal

The project is no longer just a static tracker.

The intended product is now:

> **A living human-rights commitment monitoring system that continuously discovers new evidence, contextual developments and legal/policy changes while preserving transparent human review and assessment history.**

This is particularly important because Blue Human currently has very limited staff capacity.

The software should reduce ongoing manual monitoring overhead.

---

# 47. Near-term priorities

The next development priorities should be considered roughly in this order:

1. improve monitoring quality and reduce false positives;
2. expand official-source connectors beyond GDELT/BOE;
3. add better AI semantic classification of monitoring candidates;
4. distinguish “need context”, “implementation evidence”, “contradiction” and “noise” more accurately;
5. expose live data cleanly in the public UI;
6. improve timeline/history visualization;
7. publish methodology and AI-use explanation publicly;
8. add correction/right-of-response workflow;
9. introduce alerts for high-confidence new implementation evidence;
10. later expand beyond Spain/UPR only after methodology is validated.

Potential future connectors include:

- BOE;
- Congreso / Senado;
- Spanish ministries;
- Defensor del Pueblo;
- Poder Judicial;
- INE;
- EUR-Lex;
- OHCHR / UN documents;
- official RSS feeds;
- selected institutional APIs;
- high-quality news discovery.

---

# 48. Things an AI agent should NOT redesign without explicit instruction

Do not casually replace:

- Jira as the human workflow layer;
- Confluence as the methodology/governance layer;
- Supabase as the canonical database;
- append-only assessment history;
- the Approved vs Published distinction;
- Material UI / IBM Plex Sans public design direction;
- Blue Human primary colour `#0a1e33`;
- Human Security dimension model;
- separation between live context and implementation evidence;
- the public-ID convention;
- the Jira custom-field contract;
- the Edge Function publication contract.

Any breaking change here requires explicit architectural reasoning and migration planning.

---

# 49. Operational style for future AI agents

When working on HRCT:

- execute safe backend/code changes directly when access is available;
- prefer complete end-to-end implementations over partial instructions;
- do not ask the operator to repeatedly edit configuration when the change can be made programmatically;
- test changes before claiming they are complete;
- use branches and pull requests for frontend/repository changes;
- check CI before merging;
- never claim UI has changed if the code was not actually merged/deployed;
- clearly state when a change exists in GitHub but still requires hosting redeployment;
- keep production and test data separate;
- prefer robust architecture over brittle Jira smart-value dependencies.

---

# 50. Definition of “done” for a substantive HRCT feature

A feature is not considered done merely because code exists.

For a normal feature, the expected completion path is:

```text
schema/data model updated if needed
        ↓
backend implementation
        ↓
frontend implementation
        ↓
branch + PR
        ↓
CI succeeds
        ↓
merge to main
        ↓
production/deployment path verified
        ↓
real data tested
        ↓
methodological meaning checked
```

For research automation, add:

```text
real source discovery
        ↓
source provenance recorded
        ↓
relevance / evidence-type separation
        ↓
no silent assessment mutation
```

---

# 51. Core project statement

> **Human Rights Commitment Tracker is Blue Human's public accountability platform for transforming human-rights recommendations and commitments into structured, evidence-based, traceable and continuously monitored records. It combines human research, transparent methodology, structured canonical data, automated source monitoring and a public institutional interface so users can understand what was recommended or promised, what implementation has occurred, what evidence exists, why the issue remains relevant, and how the assessment changes over time.**

---

# 52. One-sentence architecture summary

> **Jira manages human research, Confluence manages methodology, Supabase stores the canonical structured record and live-monitoring data, GitHub stores and tests the code, and the Next.js public website exposes only controlled public data while automated monitoring continuously enriches the research pipeline.**

---

# 53. Agent handoff checklist

Before an AI agent begins making changes, it should answer these questions from this file:

- Am I changing research workflow, methodology, structured data, automation or public UI?
- Which system is the correct source of truth for that change?
- Does the change affect the Jira → Supabase publication contract?
- Does it preserve assessment history?
- Does it preserve the separation between context and evidence?
- Does it require human validation?
- Does it affect public data exposure/RLS?
- Does it require a database migration?
- Does it require a GitHub PR?
- Has CI passed?
- Is a hosting redeploy still needed?
- Am I accidentally using test records as real data?
- Am I introducing secrets into code or logs?
- Am I making a human-rights conclusion that the available evidence cannot support?

If these are handled correctly, the agent is operating consistently with HRCT's architecture and methodology.
