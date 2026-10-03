-- Live tracker v3: provenance of automated triage, per-source run statistics and
-- public monitoring-status views. Additive only; apply before deploying live-tracker v3.

alter table public.monitoring_items
  add column if not exists connector text,
  add column if not exists classification text check (classification in ('need_context','implementation_candidate','contradiction','noise')),
  add column if not exists classification_note text,
  add column if not exists classifier text,
  add column if not exists classified_at timestamptz;

alter table public.monitoring_runs
  add column if not exists source_stats jsonb not null default '{}'::jsonb;

create index if not exists monitoring_items_public_recent_idx
  on public.monitoring_items (published_at desc nulls last, discovered_at desc)
  where is_public = true and status <> 'rejected';

-- New columns are appended so the existing column order of the view is preserved.
create or replace view public.hrct_public_monitoring as
select c.public_id, mi.id, mi.kind, mi.relation, mi.title, mi.url, mi.publisher, mi.source_domain, mi.source_type,
       mi.published_at, mi.summary, mi.excerpt, mi.relevance_score, mi.status, mi.discovered_at,
       mi.last_seen_at, mi.connector, (mi.classifier is not null) as ai_classified
from public.monitoring_items mi
join public.commitments c on c.id=mi.commitment_id
where c.publication_status='published' and mi.is_public=true and mi.status <> 'rejected';

-- One row: is the tracker alive, and how much does it cover. Exposes aggregates only;
-- monitoring_runs and monitoring_profiles themselves stay non-public.
create or replace view public.hrct_public_monitoring_status as
select
  (select max(finished_at) from public.monitoring_runs where status='success') as last_successful_run_at,
  (select count(*) from public.monitoring_runs where status='success' and started_at > now() - interval '24 hours') as runs_last_24h,
  (select count(*) from public.monitoring_profiles p join public.commitments c on c.id=p.commitment_id
    where p.enabled and c.publication_status='published') as recommendations_monitored,
  (select count(*) from public.monitoring_items mi join public.commitments c on c.id=mi.commitment_id
    where c.publication_status='published' and mi.is_public and mi.status <> 'rejected') as public_items,
  (select max(mi.discovered_at) from public.monitoring_items mi join public.commitments c on c.id=mi.commitment_id
    where c.publication_status='published' and mi.is_public and mi.status <> 'rejected') as last_item_discovered_at;

-- Per recommendation: when its sources were last scanned.
create or replace view public.hrct_public_monitoring_coverage as
select c.public_id, p.last_run_at as last_scanned_at
from public.monitoring_profiles p
join public.commitments c on c.id=p.commitment_id
where p.enabled and c.publication_status='published';

grant select on public.hrct_public_monitoring_status to anon, authenticated;
grant select on public.hrct_public_monitoring_coverage to anon, authenticated;
