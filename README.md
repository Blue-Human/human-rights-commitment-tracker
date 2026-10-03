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

Jira remains the research and peer-review workspace; it is never queried by the public UI.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Set the public Supabase URL and anon/publishable key in `.env.local`.

## Live monitoring

See [live-monitoring.md](docs/live-monitoring.md) for the signal/evidence boundary, Human Security taxonomy, providers, private review queue, schedules, configuration and exact deployment order. New routes: `/human-security`, `/human-security/[dimension]`, `/signals`.

Run `npm ci`, `npm run test`, `npm run typecheck` and `npm run build`. Monitoring changes are checked with the pinned Deno command in CI.
