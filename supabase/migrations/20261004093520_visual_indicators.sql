-- Extend the existing catalogue; legacy action/commitment associations remain intact.
-- Legacy targets remain private until a reviewer documents their scope and provenance.
begin;
alter table public.indicators alter column commitment_id drop not null;
alter table public.indicators
  add column if not exists code text unique,
  add column if not exists topic text,
  add column if not exists methodology text,
  add column if not exists frequency text not null default 'irregular',
  add column if not exists orientation text not null default 'neutral' check (orientation in ('higher_is_better','lower_is_better','target_value','neutral')),
  add column if not exists preferred_sources text,
  add column if not exists recommended_disaggregation text,
  add column if not exists editorial_status text not null default 'draft' check (editorial_status in ('draft','proposed','published','archived')),
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists import_metadata jsonb not null default '{}';

create table public.indicator_components (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references public.indicators(id),
  code text not null,
  label text not null,
  unit text not null,
  value_type text not null check (value_type in ('numeric','boolean','text','category')),
  frequency text not null default 'irregular' check (frequency in ('annual','biennial','quarterly','monthly','irregular')),
  visualization text not null default 'line' check (visualization in ('line','bar','timeline')),
  definition text not null,
  formula text,
  editorial_status text not null default 'proposed' check (editorial_status in ('proposed','published','archived')),
  unique(indicator_id,code), unique(id,indicator_id)
);
create table public.recommendation_indicator_requirements (
  commitment_id uuid primary key references public.commitments(id),
  indicator_requirement text not null default 'pending_review' check (indicator_requirement in ('not_required','recommended','required','pending_review')),
  reason text not null,
  editorial_status text not null default 'proposed' check (editorial_status in ('proposed','published')),
  reviewed_by text, reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  import_metadata jsonb not null default '{}'
);
create table public.recommendation_indicators (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.commitments(id),
  indicator_id uuid not null references public.indicators(id),
  role text not null check (role in ('primary','supporting','contextual')),
  rationale text not null,
  rationale_kind text not null default 'specific' check (rationale_kind in ('specific','general')),
  -- Empty scope means all reviewed component/territory/population series, selectable separately.
  scope jsonb not null default '{}' check (jsonb_typeof(scope)='object'),
  component_id uuid,
  editorial_status text not null default 'proposed' check (editorial_status in ('proposed','published','archived')),
  baseline_value_id uuid,
  baseline_reason text,
  target_operator text check (target_operator in ('<=','>=','=','range')),
  target_type text check (target_type in ('absolute','relative')),
  target_value numeric,
  target_upper numeric,
  target_date date,
  target_source_url text,
  target_citation text,
  authored_by text, reviewed_by text, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  import_metadata jsonb not null default '{}',
  foreign key(component_id,indicator_id) references public.indicator_components(id,indicator_id),
  unique nulls not distinct(commitment_id,indicator_id,component_id,scope),
  check (target_value is null or coalesce((target_operator is not null and target_type is not null and component_id is not null and scope <> '{}' and target_date is not null and target_source_url ~ '^https?://' and length(trim(target_citation))>0),false)),
  check (target_operator is distinct from 'range' or (target_upper is not null and target_upper>=target_value)),
  check (baseline_value_id is null or coalesce(length(trim(baseline_reason))>0,false))
);
create table public.indicator_values (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references public.indicators(id),
  component_id uuid not null,
  country_iso2 text not null references public.countries(iso2),
  -- jsonb canonicalizes property order; scope never includes country or component.
  scope jsonb not null default '{"territory":"national","population":"all"}' check (jsonb_typeof(scope)='object' and scope ? 'territory' and scope ? 'population' and jsonb_typeof(scope->'territory')='string' and jsonb_typeof(scope->'population')='string' and length(scope->>'territory')>0 and length(scope->>'population')>0 and not scope ?| array['country','country_iso2','component_id']),
  period_start date not null, period_end date not null check (period_end>=period_start),
  numeric_value numeric check(numeric_value::text not in ('NaN','Infinity','-Infinity')), boolean_value boolean, text_value text,
  missing_reason text,
  unit text not null,
  source_url text not null check (source_url ~ '^https?://'), source_title text not null check(length(trim(source_title))>0), citation text not null check(length(trim(citation))>0),
  evidence_id uuid references public.evidence(id),
  publication_date date not null, retrieved_at timestamptz not null,
  series_key text not null check(length(trim(series_key))>0), methodology_version text not null check(length(trim(methodology_version))>0),
  comparability_notes text,
  break_before boolean not null default false,
  quality_notes text,
  editorial_status text not null default 'draft' check (editorial_status in ('draft','published','rejected')),
  is_current boolean not null default false,
  selection_reason text,
  supersedes_id uuid references public.indicator_values(id) check(supersedes_id is distinct from id),
  authored_by text not null, reviewed_by text, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(component_id,indicator_id) references public.indicator_components(id,indicator_id),
  check ((missing_reason is not null and length(trim(missing_reason))>0 and num_nonnulls(numeric_value,boolean_value,text_value)=0) or (missing_reason is null and num_nonnulls(numeric_value,boolean_value,text_value)=1)),
  check (not is_current or coalesce((editorial_status='published' and reviewed_at is not null and length(reviewed_by)>0 and length(trim(selection_reason))>0),false))
);
alter table public.recommendation_indicators add foreign key(baseline_value_id) references public.indicator_values(id);
create unique index indicator_values_current_period on public.indicator_values(component_id,country_iso2,scope,period_start,period_end) where is_current;
create index indicator_values_lookup on public.indicator_values(indicator_id,component_id,country_iso2,scope,period_end,editorial_status);
create index recommendation_indicators_lookup on public.recommendation_indicators(commitment_id,editorial_status);

-- Audit snapshots are private, including deletion/unlinking and corrections.
create table public.indicator_audit (
  id bigint generated always as identity primary key, entity text not null, entity_id text not null,
  operation text not null, before_record jsonb, after_record jsonb, recorded_at timestamptz not null default now()
);
create function public.hrct_indicator_audit() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.indicator_audit(entity,entity_id,operation,before_record,after_record)
  values (TG_TABLE_NAME, coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id',to_jsonb(new)->>'commitment_id',to_jsonb(old)->>'commitment_id'),TG_OP,
    case when TG_OP<>'INSERT' then to_jsonb(old) end,case when TG_OP<>'DELETE' then to_jsonb(new) end);
  if TG_OP='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.hrct_indicator_audit() from public,anon,authenticated;
create function public.hrct_validate_indicator_value() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare component public.indicator_components;
begin
  select * into strict component from public.indicator_components where id=new.component_id and indicator_id=new.indicator_id;
  if new.unit<>component.unit then raise exception 'Observation unit differs from component'; end if;
  if new.missing_reason is null and not (
    (component.value_type='numeric' and new.numeric_value is not null) or
    (component.value_type='boolean' and new.boolean_value is not null) or
    (component.value_type in ('text','category') and new.text_value is not null)) then raise exception 'Observation type differs from component'; end if;
  if TG_OP='UPDATE' and old.editorial_status='published' and
    (to_jsonb(old)-array['is_current','updated_at']) is distinct from (to_jsonb(new)-array['is_current','updated_at']) then
    raise exception 'Published observations are immutable: insert a correction and select it after review';
  end if;
  if component.visualization='timeline' and component.value_type='numeric' or component.visualization<>'timeline' and component.value_type<>'numeric' then raise exception 'Component visualization incompatible with value type'; end if;
  if TG_OP='INSERT' and new.editorial_status='published' then raise exception 'Create a draft before review'; end if;
  new.updated_at=now(); return new;
end $$;
create trigger validate_indicator_value before insert or update on public.indicator_values for each row execute function public.hrct_validate_indicator_value();

-- Public roles can read selected descriptive fields only. All writes go through the existing
-- session-protected Next.js admin server using service_role. No authenticated-user write policy.
drop policy if exists indicators_public_read on public.indicators;
create policy indicators_public_read on public.indicators for select to anon,authenticated using (editorial_status='published' and active);
alter table public.indicators enable row level security;
revoke all on public.indicators from anon,authenticated;
grant select(id,code,name,description,indicator_type,unit,topic,methodology,frequency,orientation,preferred_sources,recommended_disaggregation,editorial_status,active,updated_at) on public.indicators to anon,authenticated;

do $$ declare t text; begin
  foreach t in array array['indicator_components','recommendation_indicator_requirements','recommendation_indicators','indicator_values','indicator_audit'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
  foreach t in array array['indicators','indicator_components','recommendation_indicator_requirements','recommendation_indicators','indicator_values'] loop
    execute format('create trigger indicator_audit after insert or update or delete on public.%I for each row execute function public.hrct_indicator_audit()',t);
  end loop;
end $$;
grant usage,select on sequence public.indicator_audit_id_seq to service_role;
grant all on public.indicators to service_role;
create policy components_public_read on public.indicator_components for select to anon,authenticated using (editorial_status='published' and exists(select 1 from public.indicators i where i.id=indicator_id));
create policy requirements_public_read on public.recommendation_indicator_requirements for select to anon,authenticated using (editorial_status='published' and exists(select 1 from public.commitments c where c.id=commitment_id and c.publication_status='published' and c.public_id not ilike '%TEST%'));
create policy links_public_read on public.recommendation_indicators for select to anon,authenticated using (editorial_status='published' and exists(select 1 from public.indicators i where i.id=indicator_id) and exists(select 1 from public.commitments c where c.id=commitment_id and c.publication_status='published' and c.public_id not ilike '%TEST%'));
create policy values_public_read on public.indicator_values for select to anon,authenticated using (editorial_status='published' and is_current and exists(select 1 from public.indicator_components c where c.id=component_id));
grant select on public.indicator_components to anon,authenticated;
grant select(commitment_id,indicator_requirement,reason,editorial_status,updated_at) on public.recommendation_indicator_requirements to anon,authenticated;
grant select(id,commitment_id,indicator_id,role,rationale,rationale_kind,scope,component_id,editorial_status,baseline_value_id,baseline_reason,target_operator,target_type,target_value,target_upper,target_date,target_source_url,target_citation,updated_at) on public.recommendation_indicators to anon,authenticated;
grant select(id,indicator_id,component_id,country_iso2,scope,period_start,period_end,numeric_value,boolean_value,text_value,missing_reason,unit,source_url,source_title,citation,evidence_id,publication_date,retrieved_at,series_key,methodology_version,comparability_notes,break_before,quality_notes,editorial_status,is_current,selection_reason,supersedes_id,reviewed_at,updated_at) on public.indicator_values to anon,authenticated;

-- Batched public query: latest point and baseline independently of the requested window;
-- full historical series is loaded only on explicit request. Invoker rights enforce RLS.
create function public.hrct_public_indicators(p_public_id text,p_all_history boolean default false) returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
with rec as (
 select c.id,co.iso2 from public.commitments c join public.countries co on co.id=c.country_id
 where c.public_id=p_public_id and c.publication_status='published' and c.public_id not ilike '%TEST%'
), links as (
 select l.id,l.indicator_id,l.role,l.rationale,l.rationale_kind,l.scope,l.component_id,l.baseline_value_id,l.baseline_reason,l.target_operator,l.target_type,l.target_value,l.target_upper,l.target_date,l.target_source_url,l.target_citation,l.updated_at
 from public.recommendation_indicators l join rec on rec.id=l.commitment_id
), points as (
 select v.id,v.indicator_id,v.component_id,v.country_iso2,v.scope,v.period_start,v.period_end,v.numeric_value,v.boolean_value,v.text_value,v.missing_reason,v.unit,v.source_url,v.source_title,v.citation,v.publication_date,v.retrieved_at,v.series_key,v.methodology_version,v.comparability_notes,v.break_before,v.quality_notes,v.editorial_status,v.selection_reason,v.supersedes_id,v.reviewed_at,v.updated_at
 from public.indicator_values v join rec on rec.iso2=v.country_iso2
 where exists(select 1 from links l where l.indicator_id=v.indicator_id and (l.component_id is null or l.component_id=v.component_id) and v.scope @> l.scope)
), latest as (
 select distinct on(component_id,scope) * from points where missing_reason is null order by component_id,scope,period_end desc,period_start desc,id
)
select jsonb_build_object(
 'requirement',coalesce((select r.indicator_requirement from public.recommendation_indicator_requirements r join rec on r.commitment_id=rec.id),'pending_review'),
 'reason',(select r.reason from public.recommendation_indicator_requirements r join rec on r.commitment_id=rec.id),
 'links',coalesce((select jsonb_agg(to_jsonb(l) order by case l.role when 'primary' then 0 when 'supporting' then 1 else 2 end,l.id) from links l),'[]'),
 'indicators',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'code',i.code,'name',i.name,'description',i.description,'indicator_type',i.indicator_type,'topic',i.topic,'methodology',i.methodology,'orientation',i.orientation,'preferred_sources',i.preferred_sources,'recommended_disaggregation',i.recommended_disaggregation,'updated_at',i.updated_at)) from public.indicators i where i.id in (select indicator_id from links)),'[]'),
 'components',coalesce((select jsonb_agg(to_jsonb(c)) from public.indicator_components c where c.indicator_id in (select indicator_id from links)),'[]'),
 'values',coalesce((select jsonb_agg(to_jsonb(v) order by v.period_start,v.period_end,v.id) from points v where p_all_history or v.period_end>=make_date(extract(year from now() at time zone 'Europe/Madrid')::int-4,1,1)),'[]'),
 'latest',coalesce((select jsonb_agg(to_jsonb(v)) from latest v),'[]'),
 'baselines',coalesce((select jsonb_agg(to_jsonb(v)) from points v where v.id in (select baseline_value_id from links)),'[]'),
 'has_older',exists(select 1 from points v where v.period_end<make_date(extract(year from now() at time zone 'Europe/Madrid')::int-4,1,1))
) $$;
revoke all on function public.hrct_public_indicators(text,boolean) from public;
grant execute on function public.hrct_public_indicators(text,boolean) to anon,authenticated,service_role;

-- Preserve legacy associations privately; do not guess publication, units or targets.
insert into public.recommendation_indicators(commitment_id,indicator_id,role,rationale,rationale_kind,editorial_status,import_metadata)
select commitment_id,id,'supporting',coalesce(description,'Relación heredada pendiente de revisión'),'general','proposed',jsonb_build_object('origin','legacy-indicators','legacy_target_value',target_value,'legacy_target_date',target_date) from public.indicators where commitment_id is not null
on conflict do nothing;
commit;
