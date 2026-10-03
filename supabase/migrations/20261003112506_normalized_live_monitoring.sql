-- Additive upgrade for the existing HRCT pilot. Legacy records remain intact.
alter table public.commitment_human_security
 add column confidence numeric(4,3) check (confidence between 0 and 1),
 add column classification_method text not null default 'legacy_unspecified',
 add column reviewed boolean not null default false;
alter table public.monitoring_profiles add column keywords text[] not null default '{}',
 add column last_success_at timestamptz, add column last_error text,
 add column topics text[] not null default '{}', add column queries_es text[] not null default '{}',
 add column queries_en text[] not null default '{}', add column query_method text not null default 'legacy',
 add column entities text[] not null default array['Spain','España'];
alter table public.monitoring_runs add column job_type text not null default 'discover',
 add column errors jsonb not null default '[]', add column records_rejected integer not null default 0;

create table public.signal_clusters (
 id uuid primary key default gen_random_uuid(), event_key text unique not null,
 title text not null, created_at timestamptz not null default now()
);
create table public.signals (
 id uuid primary key default gen_random_uuid(), canonical_url text unique not null check (canonical_url ~ '^https?://'),
 title text not null, summary text, source_domain text not null, source_type text not null,
 source_tier int not null check (source_tier between 1 and 4),
 published_at timestamptz, observed_at timestamptz, discovered_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(), provider text not null, language text,
 cluster_id uuid references public.signal_clusters(id),
 original_source_url text check (original_source_url is null or original_source_url ~ '^https?://')
);
create index signals_cluster_idx on public.signals(cluster_id);
create table public.signal_commitments (
 signal_id uuid references public.signals(id) on delete cascade,
 commitment_id uuid references public.commitments(id) on delete cascade,
 relevance_score numeric(4,3) not null check (relevance_score between 0 and 1),
 rationale text not null, potential_implementation boolean not null default false, kind text not null check (kind in ('context','implementation_candidate')),
 publication_status text not null default 'candidate' check (publication_status in ('candidate','published','reviewed','rejected')),
 discovered_at timestamptz not null default now(), primary key(signal_id,commitment_id)
);
create index signal_commitments_commitment_idx on public.signal_commitments(commitment_id);
create table public.signal_human_security (
 signal_id uuid references public.signals(id) on delete cascade,
 dimension_id uuid references public.human_security_dimensions(id),
 rationale text not null, classification_method text not null default 'rules_v1',
 reviewed boolean not null default false, primary key(signal_id,dimension_id)
);
create index signal_human_security_dimension_idx on public.signal_human_security(dimension_id);
create table public.monitoring_review_candidates (
 id uuid primary key default gen_random_uuid(), commitment_id uuid not null references public.commitments(id),
 signal_id uuid not null references public.signals(id), current_assessment_id uuid references public.assessments(id),
 trigger text not null, rationale text not null, source_url text not null,
 status text not null default 'open' check(status in ('open','reviewed','dismissed')),
 jira_issue_key text, created_at timestamptz not null default now(), unique(commitment_id,signal_id)
);
create index monitoring_review_candidates_signal_idx on public.monitoring_review_candidates(signal_id);
create index monitoring_review_candidates_assessment_idx on public.monitoring_review_candidates(current_assessment_id);

-- Preserve legacy classifications as unreviewed until provenance is established.
-- Import legacy links once; never promote legacy implementation candidates to evidence.
insert into public.signals(canonical_url,title,summary,source_domain,source_type,source_tier,published_at,discovered_at,provider)
select distinct on (url) url,title,summary,coalesce(source_domain,'unknown'),
 case when source_type in ('official_web','legislation') then 'official' else 'media' end,
 case when source_type in ('official_web','legislation') then 1 else 4 end,
 published_at,discovered_at,'legacy'
from public.monitoring_items where url ~ '^https?://' order by url,discovered_at;
insert into public.signal_commitments(signal_id,commitment_id,relevance_score,rationale,potential_implementation,kind,publication_status,discovered_at)
select s.id,m.commitment_id,least(1,greatest(0,m.relevance_score)),'Imported from the legacy monitoring record.',m.kind in ('implementation_candidate','legal_change'),
 case when m.kind in ('implementation_candidate','legal_change') then 'implementation_candidate' else 'context' end,
 case when m.status='rejected' then 'rejected' when m.status='reviewed' then 'reviewed'
 when m.is_public and m.kind not in ('implementation_candidate','legal_change') then 'published' else 'candidate' end,m.discovered_at
from public.monitoring_items m join public.signals s on s.canonical_url=m.url;

alter table public.signal_clusters enable row level security;
alter table public.signals enable row level security;
alter table public.signal_commitments enable row level security;
alter table public.signal_human_security enable row level security;
alter table public.monitoring_review_candidates enable row level security;
create policy signal_links_read on public.signal_commitments for select to anon,authenticated using (
 publication_status in ('published','reviewed') and kind='context' and exists(select 1 from public.commitments c where c.id=commitment_id and c.publication_status='published'));
create policy signals_read on public.signals for select to anon,authenticated using (exists(select 1 from public.signal_commitments l where l.signal_id=signals.id));
create policy clusters_read on public.signal_clusters for select to anon,authenticated using (exists(select 1 from public.signals s where s.cluster_id=signal_clusters.id));
create policy signal_dimensions_read on public.signal_human_security for select to anon,authenticated using (exists(select 1 from public.signals s where s.id=signal_id));
create policy profile_freshness_read on public.monitoring_profiles for select to anon,authenticated using (exists(select 1 from public.commitments c where c.id=commitment_id and c.publication_status='published'));
-- Only freshness columns are public. Search configuration and operational errors stay private.
revoke all on public.monitoring_profiles from anon,authenticated;
grant select(commitment_id,enabled,last_run_at,last_success_at) on public.monitoring_profiles to anon,authenticated;
revoke all on public.monitoring_review_candidates,public.monitoring_runs,public.monitoring_items from anon,authenticated;
grant select on public.monitoring_items to anon,authenticated;
revoke all on public.signals,public.signal_commitments,public.signal_clusters,public.signal_human_security,public.commitment_human_security,public.human_security_dimensions from anon,authenticated;
grant select on public.signals,public.signal_commitments,public.signal_clusters,public.signal_human_security,
 public.commitment_human_security,public.human_security_dimensions to anon,authenticated;
grant all on public.signals,public.signal_commitments,public.signal_clusters,public.signal_human_security,
 public.monitoring_review_candidates,public.monitoring_profiles,public.monitoring_runs to service_role;

create or replace view public.hrct_public_human_security with(security_invoker=true) as
select c.public_id,d.code,d.name,d.description,h.is_primary,h.rationale,h.confidence,h.classification_method,h.reviewed
from public.commitment_human_security h join public.commitments c on c.id=h.commitment_id
join public.human_security_dimensions d on d.id=h.dimension_id where c.publication_status='published';
create view public.hrct_public_signals with(security_invoker=true) as
select c.public_id,s.id,s.title,s.summary,s.canonical_url as url,s.source_domain,s.source_type,s.source_tier,
 s.published_at,s.observed_at,s.discovered_at,s.cluster_id,s.original_source_url,l.rationale,l.relevance_score,
 l.publication_status,
 (select count(*) from public.signals x where x.cluster_id=s.cluster_id) as source_count
from public.signal_commitments l join public.signals s on s.id=l.signal_id join public.commitments c on c.id=l.commitment_id
where l.kind='context' and l.publication_status in ('published','reviewed') and c.publication_status='published';
create view public.hrct_public_freshness with(security_invoker=true) as
select c.public_id,p.enabled,p.last_run_at,p.last_success_at,
 (select max(s.discovered_at) from public.signal_commitments l join public.signals s on s.id=l.signal_id where l.commitment_id=c.id) as last_signal_at,
 (select max(e.evidence_date) from public.evidence e where e.commitment_id=c.id and e.is_public) as last_evidence_at
from public.commitments c left join public.monitoring_profiles p on p.commitment_id=c.id where c.publication_status='published';
grant select on public.hrct_public_signals,public.hrct_public_freshness to anon,authenticated;
-- The old UI remains compatible and RLS now applies to these existing views.
alter view public.hrct_public_monitoring set(security_invoker=true);
alter view public.hrct_public_assessment_history set(security_invoker=true);

-- Atomic job lease. A stale lease is marked failed so interrupted jobs can recover.
create function public.hrct_start_monitoring(p_job text) returns uuid language plpgsql security invoker set search_path=public as $$
declare v_id uuid;
begin
 perform pg_advisory_xact_lock(784116);
 update public.monitoring_runs set status='error',finished_at=now(),error='Lease expired' where status='running' and started_at<now()-interval '10 minutes';
 if exists(select 1 from public.monitoring_runs where status='running') then return null; end if;
 if exists(select 1 from public.monitoring_runs where status='success' and job_type=p_job and started_at>now()-interval '45 minutes') then return null; end if;
 insert into public.monitoring_runs(job_type) values(p_job) returning id into v_id;return v_id;
end $$;

-- One transaction per discovered source and recommendation link. Reviewed decisions are never overwritten.
create function public.hrct_store_signal(p_signal jsonb,p_link jsonb,p_dimensions text[]) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare v_cluster uuid;v_signal uuid;v_new boolean;v_existing uuid;
begin
 if not exists(select 1 from public.monitoring_profiles p join public.commitments c on c.id=p.commitment_id
 where p.commitment_id=(p_link->>'commitment_id')::uuid and p.enabled and c.publication_status='published') then
 return jsonb_build_object('skipped',true,'inserted',false);end if;
 insert into public.signal_clusters(event_key,title) values(p_signal->>'event_key',p_signal->>'title') on conflict(event_key) do update set event_key=excluded.event_key returning id into v_cluster;
 select id into v_existing from public.signals where canonical_url=p_signal->>'url';
 insert into public.signals(canonical_url,title,summary,source_domain,source_type,source_tier,published_at,observed_at,provider,language,cluster_id,original_source_url)
 values(p_signal->>'url',p_signal->>'title',p_signal->>'summary',p_signal->>'source_domain',p_signal->>'source_type',(p_signal->>'source_tier')::int,
 (p_signal->>'published_at')::timestamptz,(p_signal->>'observed_at')::timestamptz,p_signal->>'provider',p_signal->>'language',v_cluster,p_signal->>'original_source_url')
 on conflict(canonical_url) do update set last_seen_at=now() returning id into v_signal;
 v_new:=v_existing is null;
 insert into public.signal_commitments(signal_id,commitment_id,relevance_score,rationale,potential_implementation,kind,publication_status)
 values(v_signal,(p_link->>'commitment_id')::uuid,(p_link->>'score')::numeric,p_link->>'rationale',(p_link->>'kind')='implementation_candidate',p_link->>'kind',p_link->>'publication_status')
 on conflict(signal_id,commitment_id) do update set potential_implementation=signal_commitments.potential_implementation or excluded.potential_implementation where signal_commitments.publication_status not in ('reviewed','rejected');
 insert into public.signal_human_security(signal_id,dimension_id,rationale)
 select v_signal,d.id,'Proposed by documented keyword rules applied to the source title.' from public.human_security_dimensions d where d.code=any(p_dimensions)
 on conflict(signal_id,dimension_id) do nothing;
 return jsonb_build_object('id',v_signal,'inserted',v_new);
end $$;
-- Weekly watch creates only private review candidates; it never writes assessments or evidence.
create function public.hrct_assessment_watch() returns integer language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 insert into public.monitoring_review_candidates(commitment_id,signal_id,current_assessment_id,trigger,rationale,source_url)
 select l.commitment_id,s.id,a.id,'major_new_official_source',
 'A relevant institutional source was discovered. Verify its contents and compare with the current assessment; source type alone does not establish implementation.',s.canonical_url
 from public.signal_commitments l join public.signals s on s.id=l.signal_id
 join public.monitoring_profiles p on p.commitment_id=l.commitment_id and p.enabled
 join public.commitments c on c.id=l.commitment_id and c.publication_status='published'
 left join public.assessments a on a.commitment_id=l.commitment_id and a.is_current
 where l.potential_implementation and l.publication_status<>'rejected' and l.relevance_score>=.8
 and s.source_type in ('official','un','nhri','court','statistics') and s.discovered_at>now()-interval '30 days'
 on conflict(commitment_id,signal_id) do nothing;
 get diagnostics n=row_count;return n;
end $$;
revoke all on function public.hrct_start_monitoring(text),public.hrct_store_signal(jsonb,jsonb,text[]),public.hrct_assessment_watch() from public,anon,authenticated;
grant execute on function public.hrct_start_monitoring(text),public.hrct_store_signal(jsonb,jsonb,text[]),public.hrct_assessment_watch() to service_role;

create function public.hrct_preserve_published_assessment() returns trigger language plpgsql set search_path=public as $$
begin
 if old.is_public and (tg_op='DELETE') then raise exception 'Published assessments must be retained'; end if;
 if old.is_public and (new.status,new.confidence,new.rationale,new.assessment_date,new.methodology_version_id,new.commitment_id)
 is distinct from (old.status,old.confidence,old.rationale,old.assessment_date,old.methodology_version_id,old.commitment_id)
 then raise exception 'Create a new assessment revision instead of overwriting published findings';end if;
 if tg_op='DELETE' then return old;end if;
 return new;
end $$;
create trigger hrct_assessment_history_guard before update or delete on public.assessments for each row execute function public.hrct_preserve_published_assessment();
revoke all on function public.hrct_preserve_published_assessment() from public,anon,authenticated;

-- Read-only projection privileges, including legacy default grants.
revoke all on public.hrct_public_signals,public.hrct_public_freshness,public.hrct_public_human_security,public.hrct_public_monitoring,public.hrct_public_assessment_history from anon,authenticated;
grant select on public.hrct_public_signals,public.hrct_public_freshness,public.hrct_public_human_security,public.hrct_public_monitoring,public.hrct_public_assessment_history to anon,authenticated;

-- Scheduler credentials are inaccessible through the public API.
create table public.hrct_monitoring_tokens(token_hash text primary key,created_at timestamptz not null default now());
alter table public.hrct_monitoring_tokens enable row level security;
revoke all on public.hrct_monitoring_tokens from anon,authenticated;
grant select on public.hrct_monitoring_tokens to service_role;
create function public.hrct_valid_monitoring_token(p_token text) returns boolean language sql security invoker set search_path=public as $$
 select exists(select 1 from public.hrct_monitoring_tokens where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex'));
$$;
revoke all on function public.hrct_valid_monitoring_token(text) from public,anon,authenticated;
grant execute on function public.hrct_valid_monitoring_token(text) to service_role;

-- Newly published recommendations join monitoring automatically without daily setup.
create function public.hrct_prepare_profiles() returns integer language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 insert into public.monitoring_profiles(commitment_id,news_query)
 select id,title||' Spain' from public.commitments where publication_status='published'
 on conflict(commitment_id) do nothing;
 get diagnostics n=row_count;return n;
end $$;
revoke all on function public.hrct_prepare_profiles() from public,anon,authenticated;
grant execute on function public.hrct_prepare_profiles() to service_role;
