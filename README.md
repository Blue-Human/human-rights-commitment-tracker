# Human Rights Commitment Tracker

Public data interface for Blue Human's Human Rights Commitment Tracker (HRCT).

## Stack

- Next.js + TypeScript
- Material UI
- IBM Plex Sans
- Supabase public views

## Brand

- Primary: `#0a1e33`
- Accent: `#00a3e0`
- Typeface: IBM Plex Sans

## Public data contract

The frontend only consumes published data exposed through these Supabase views:

- `hrct_public_commitments`
- `hrct_public_evidence`
- `hrct_public_assessment_history`
- `hrct_public_human_security` (human-security dimensions of each recommendation, HRCT's reviewed classification; see `docs/human-security.md`)
- `hrct_public_monitoring`
- `hrct_public_sdgs` (goals and targets of the 2030 Agenda linked to each recommendation; see `docs/sdg.md`)
- `hrct_public_monitoring_status` and `hrct_public_monitoring_coverage` (optional; the UI omits "last source scan" until they exist)

Recommendations are managed from the in-app admin panel (see below). Jira is no longer part of the workflow.

## Admin panel

`/admin` is where the tracker is managed. It is protected by a single account set in the environment and talks to Supabase from the server with the service-role key, which is never sent to the browser.

- Overview: "implemented" proposals awaiting a decision, all recommendations with their status, and the log of periodic reviews.
- A recommendation: set its assessment (a new assessment is created, history is kept), confirm a provisional one, confirm or hide evidence, and approve, annotate or reject monitoring items.
- Monitoring items awaiting review, and the RSS sources.

Environment (see `.env.example`): `ADMIN_USER`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`. Every admin page and server action checks the session; the database operations are `hrct_admin_set_assessment` and `hrct_admin_confirm_assessment`, callable by the service role only.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set the public Supabase URL and anon/publishable key in `.env.local`.

## Live tracker

`supabase/functions/live-tracker` scans public sources for each recommendation and writes monitoring items. It never writes evidence or assessments.

- Cadence: daily (`.github/workflows/live-tracker.yml`, 05:00 UTC). The job calls the function until no recommendation is pending. A profile or feed sweep done in the last twelve hours counts as up to date, so extra calls do nothing. Sources already stored are not stored or classified again.
- Retention: hidden, unreviewed candidates are deleted after 45 days, and unreviewed public items leave the public lists after 90 days. Reviewed items stay.
- Review: candidates nobody has classified wait in the review queue (`supabase/functions/review-queue`, see `docs/review-agent.md`).

## Periodic research reviews

The assistant reaches this service through the MCP server in `supabase/functions/hrct-mcp` (six tools, one per operation); the ChatGPT plugin and its skill are described in `plugin/README.md`. Function secret: `HRCT_MCP_TOKEN`, which is part of the server URL.

`supabase/functions/review-queue` also serves the periodic review of assessments (`docs/review-agent.md`): a reviewer or an assistant takes the next batch of recommendations, least recently reviewed first, and files a review for each.

- A review may update the assessment. It is written in one transaction (`hrct_record_research_review`): new assessment, evidence, change record and a row in `research_reviews`. History is never overwritten.
- An update needs at least one source whose URL opens. Updated assessments are public and marked provisional ("pending final confirmation").
- "Implemented" is never applied by a review. It is stored as a proposal and listed in the admin panel, where a person confirms or rejects it (or does so through the assistant with `REVIEW_CONFIRMATION_CODE`).
- RSS/Atom feeds are rows in the `monitoring_feeds` table (name, url, source_type, spain_focused, enabled). Add or disable a feed there; no deploy is needed. Each run records `last_status` and `last_item_count` per feed.
- Other sources: Google News search feed for Spain and GDELT (news; GDELT rate-limits shared IPs heavily, so it is skipped for the rest of a run once it refuses twice), BOE consolidated legislation search, and the BOE daily gazette summary.
- Without semantic triage, only continuing-need news sharing three keywords with the profile is shown publicly; news about implementation waits in the research queue because keywords cannot tell progress from a setback.
- Profile keyword lists are sent to GDELT as alternatives restricted to Spanish media; a title must then share at least two keywords with the profile, or contain one of its quoted phrases.
- Legal candidates must be published after the recommendation was made.
- Items a person has reviewed or rejected are never reset by rediscovery.
- Each run records per-source request, rate-limit and error counts in `monitoring_runs.source_stats`.
- Optional function secrets: `GEMINI_API_KEY` enables semantic triage of new candidates (model set by `HRCT_CLASSIFIER_MODEL`, default `gemini-flash-latest`); `LIVE_TRACKER_SECRET` requires callers to send it as `x-hrct-tracker-secret`; `LIVE_TRACKER_ADMIN_SECRET` lets a caller sending it as `x-hrct-admin-secret` add `?force=1` to skip the cooldown (backfills).
- Public items are shown as reviewed or pending final confirmation, with a one-sentence reason for listing them.
- Before deploying, type-check and boot the function with Deno (`deno check index.ts`): a missing export stops the function from starting.

Deployed state: all migrations in `supabase/migrations` are applied and the function is deployed with `verify_jwt = false`.

Check the connectors against the real sources without writing anything (set `GEMINI_API_KEY` to also see the triage):

```bash
node supabase/functions/live-tracker/check.ts "igualdad de trato no discriminación"
```
