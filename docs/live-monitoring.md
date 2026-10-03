# HRCT living monitoring

This change extends the existing Spain UPR pilot; it does not import additional recommendations or manufacture implementation findings. The inspected production dataset contained 40 published recommendations, 40 monitoring profiles and seven human-security dimensions. Dashboard counts always come from published database records.

## Responsibilities

- Supabase is the canonical record and runs the scheduled monitoring jobs.
- The Next.js public application reads RLS-protected projections.
- Jira receives qualifying institutional-source review candidates, when configured.
- Confluence continues to own methodology and governance. This change does not publish internal notes to Confluence or expose them publicly.

## Data and publication

`signals` stores each normalized source URL once. `signal_commitments` relates a source to several recommendations; `signal_clusters` groups precise normalized headlines observed on the same day. This conservative grouping avoids claiming unrelated or contradictory stories concern the same event. Different headlines about the same incident can remain separate: semantic event identification is not claimed.

Signals remain distinct from the existing `evidence` and `assessments` tables. Context can publish only if the matching score is at least 0.8, the recommendation is enabled and published, the source is institutional or a curated media domain, and the publication/observation time is within the configured lookback. Unknown or unsafe URLs remain unpublished. No news story automatically establishes compliance or a violation.

The initial matcher uses documented bilingual keyword/concept rules. Scores are lexical matching scores, not probabilities or AI confidence. No existing AI integration was found, and no new paid AI dependency is introduced. Profile query expansions are stored in Spanish and English; languages/topics rotate daily to bound provider requests. Manually configured query lists and keywords take precedence.

GDELT is discovery only. Its `seendate` is stored as `observed_at`, never as a fabricated publication date. RSS can supply explicit publication dates. Unverified summaries, quotations and findings are not generated. A bounded enrichment step looks for a single institutional reference in a curated media page and checks that it is reachable. Ambiguous references remain unset; a reachable link is not verification of its contents.

Human-security classifications support all seven dimensions. Existing classifications retain their original rationale and are labelled `legacy_unspecified` and unreviewed, because their review provenance was not recorded. New proposals use transparent keyword rules with null confidence. Existing dimension links are not overwritten.

`hrct_assessment_watch` identifies strongly matching institutional implementation candidates for human review. It does not infer contradictions, status changes or substantive implementation from titles alone. It never creates evidence or changes assessments. Historical published assessment content cannot be overwritten; publishing a new assessment and changing `is_current` remains possible.

Review candidates, search configuration, run errors, Jira keys and scheduler credential hashes are private. Only freshness columns are readable from monitoring profiles. New projections use `security_invoker`; public roles receive SELECT rather than mutation/truncate privileges.

## Jobs

- `hrct-discover`: hourly at minute 17, oldest profiles first, up to six per invocation. For the current 40 profiles, a healthy complete rotation takes approximately seven hourly runs.
- `hrct-process`: daily at 04:37 UTC. Discovery and processing occur in one bounded transaction pipeline; this is an idempotent supplemental pass, not a separate unprocessed backlog.
- `hrct-assessment-watch`: Monday at 05:47 UTC.

The database takes an atomic job lease. Interrupted jobs become eligible again after ten minutes. URL and link uniqueness make replay safe. Reviewed/rejected links are retained. A failed provider cannot mark its profile as successfully scanned; errors stay in private run logs. Supabase Cron, pg_net and Vault are available in the inspected project, but extension activation/live job execution were not performed while preparing this PR.

Newly published recommendations acquire monitoring profiles automatically. Suggested human-security links are added without replacing existing links. Candidate evidence and routine news do not automatically create Jira tickets.

## Configuration

Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into the Edge Function. Neither goes into client code.

The scheduler activation migration generates a credential in Vault, stores only its SHA-256 hash in an RLS-protected table, and sets the project's function URL in Vault. No repository secret is required for scheduled execution. For another project, change `hrct_monitoring_url` in Vault before activating its jobs.

Optional settings:

- `HRCT_RSS_FEEDS`: comma-separated HTTPS feed URLs from the provider allowlist (BOE, Defensor del Pueblo, OHCHR, RTVE, INE). Empty means GDELT only. Feeds are not invented or enabled without a verified URL.
- `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`, `JIRA_REVIEW_ISSUE_TYPE` (default `Task`). Only server-side configuration. Jira lookup uses a deterministic candidate label to recover after a failed database acknowledgment. On weekly watch runs, tasks in Jira’s Done status category are marked reviewed in the private queue without changing assessments. Without credentials the private review queue remains usable, but no Jira issues are sent.
- `HRCT_MONITORING_SECRET`: optional manual-invocation secret. Existing `HRCT_WEBHOOK_SECRET` is accepted as a compatibility fallback. Scheduled Vault tokens remain accepted independently.

GitHub's previous unauthenticated hourly invocation is replaced with a manual fallback. It needs the optional monitoring secret in GitHub and the same secret in the Edge Function environment. `scripts/run-monitoring.mjs` reads credentials from environment variables and fails on partial/error responses.

## Deployment order

The PR does not merge or deploy itself. Do not deploy the new public UI against a database missing the new views.

1. Apply `20261003112506_normalized_live_monitoring.sql` through the Supabase migration workflow to project `gostbdmrzchccnydftgd` after reviewing it. It is additive and keeps the original views compatible. Do not re-run the pre-existing initial migration on production.
2. Deploy `supabase/functions/live-tracker` using the checked-in `supabase/config.toml`. JWT verification is disabled only because the handler requires a verified scheduler/manual credential.
3. Apply `20261003113506_monitoring_scheduler.sql` to activate the three authenticated jobs. The migration assumes this HRCT project's URL; the token is generated securely, never hardcoded.
4. Merge/deploy the frontend with its existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Inspect private `monitoring_runs`, `monitoring_profiles.last_success_at` and the Cron run history. Verify an unauthorized POST returns 401 and a valid scheduled scan records an actual successful run before calling monitoring active.
6. Configure Jira credentials if direct Jira exception delivery is desired. Confirm the deterministic review label is searchable and issue type exists. The internal queue works without these credentials.

To pause monitoring: set the profile's `enabled=false`, or unschedule `hrct-discover`, `hrct-process` and `hrct-assessment-watch`. Public assessments remain unchanged. Restoring only old frontend code keeps the original public views available; do not delete research/history tables as a rollback.

## Verification

- `npm ci`, `npm run test`, `npm run typecheck`, `npm run build`.
- `npx --yes deno@2.9.6 check --node-modules-dir=manual --config supabase/functions/live-tracker/deno.json supabase/functions/live-tracker/index.ts`.
- `npx --yes deno@2.9.6 test --node-modules-dir=manual --config supabase/functions/live-tracker/deno.json --allow-env supabase/functions/live-tracker/tests`.

Node tests execute the migrations against a disposable PostgreSQL-compatible PGlite instance, covering legacy import, many-to-many links, reviewed decisions, RLS, restricted secrets, disabled/draft recommendations, leases, idempotent review creation and immutable published findings. The activation SQL is executed with local Vault/Cron API stubs: this verifies its token and scheduling wiring, not actual pg_net delivery. Edge tests use mocked upstream responses and exercise authentication, RSS parsing, institutional-link validation and the discovery pipeline. Live GDELT/RSS delivery and Jira writes require post-deployment smoke checks; they are not reported as verified here.
