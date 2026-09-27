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
