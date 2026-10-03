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
- `hrct_public_human_security`
- `hrct_public_monitoring`
- `hrct_public_monitoring_status` and `hrct_public_monitoring_coverage` (optional; the UI omits "last source scan" until they exist)

Jira remains the research and peer-review workspace; it is never queried by the public UI.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set the public Supabase URL and anon/publishable key in `.env.local`.

## Live tracker

`supabase/functions/live-tracker` scans public sources for each recommendation and writes monitoring items. It never writes evidence or assessments.

- Sources: Google News search feed for Spain and GDELT (news; GDELT rate-limits shared IPs heavily, so it is skipped for the rest of a run once it refuses twice), BOE consolidated legislation search, and the BOE daily gazette summary.
- Without semantic triage, only continuing-need news sharing three keywords with the profile is shown publicly; news about implementation waits in the research queue because keywords cannot tell progress from a setback.
- Profile keyword lists are sent to GDELT as alternatives restricted to Spanish media; a title must then share at least two keywords with the profile, or contain one of its quoted phrases.
- Legal candidates must be published after the recommendation was made.
- Items a person has reviewed or rejected are never reset by rediscovery.
- Each run records per-source request, rate-limit and error counts in `monitoring_runs.source_stats`.
- Optional function secrets: `GEMINI_API_KEY` enables semantic triage of new candidates (model set by `HRCT_CLASSIFIER_MODEL`, default `gemini-flash-latest`); `LIVE_TRACKER_SECRET` requires callers to send it as `x-hrct-tracker-secret`.

Deployed state: both `20261004_*` migrations are applied and the function is deployed with `verify_jwt = false`.

Check the connectors against the real sources without writing anything (set `GEMINI_API_KEY` to also see the triage):

```bash
node supabase/functions/live-tracker/check.ts "igualdad de trato no discriminación"
```
