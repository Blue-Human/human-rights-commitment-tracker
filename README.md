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

- Sources: GDELT (news, throttled to its one-request-per-five-seconds limit), BOE consolidated legislation search, and the BOE daily gazette summary.
- Items a person has reviewed or rejected are never reset by rediscovery.
- Each run records per-source request, rate-limit and error counts in `monitoring_runs.source_stats`.
- Optional function secrets: `ANTHROPIC_API_KEY` enables semantic triage of new candidates (model set by `HRCT_CLASSIFIER_MODEL`, default `claude-opus-5-5`); `LIVE_TRACKER_SECRET` requires callers to send it as `x-hrct-tracker-secret`.

Deploy order: apply `supabase/migrations/20261004_live_tracker_v3.sql`, then deploy the function.

Check the connectors against the real sources without writing anything:

```bash
node supabase/functions/live-tracker/check.ts "igualdad de trato no discriminación"
```
