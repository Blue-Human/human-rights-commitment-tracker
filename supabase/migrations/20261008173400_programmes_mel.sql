-- Private cooperation / MEL layer. The State commitment model and public views are unchanged.
begin;

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  code text not null unique check(length(trim(code))>0), name text not null check(length(trim(name))>0),
  description text not null default '', status text not null default 'draft' check(status in ('draft','planned','active','paused','completed','cancelled')),
  start_date date, end_date date, geographic_scope text not null default '', thematic_scope text not null default '',
  programme_manager text, public_summary text not null default '', internal_notes text,
  check(end_date is null or start_date is null or end_date>=start_date)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  programme_id uuid not null references public.programmes(id) on delete restrict,
  project_code text not null unique check(length(trim(project_code))>0), title text not null check(length(trim(title))>0), short_title text,
  country text not null, country_code text not null check(country_code ~ '^[A-Z]{2}$'),
  description text not null default '', context text not null default '', overall_objective text not null default '',
  status text not null default 'concept' check(status in ('concept','design','proposed','approved','active','paused','completed','cancelled')),
  start_date date, end_date date, project_manager text, funding_status text not null default 'unfunded' check(funding_status in ('unfunded','pending','partial','funded')),
  donor text, currency text not null default 'EUR' check(currency ~ '^[A-Z]{3}$'),
  total_budget numeric check(total_budget>=0 and total_budget::text not in ('NaN','Infinity','-Infinity')),
  public_summary text not null default '', internal_notes text,
  check(end_date is null or start_date is null or end_date>=start_date)
);
create index projects_programme_id_idx on public.projects(programme_id);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  legal_name text not null check(length(trim(legal_name))>0), display_name text not null check(length(trim(display_name))>0),
  partner_type text not null check(partner_type in ('NGO','civil_society','university','research_institution','public_institution','international_organization','donor','network','other')),
  country text not null, website text check(website ~ '^https?://'), description text not null default '',
  relationship_status text not null default 'prospective' check(relationship_status in ('prospective','active','inactive','ended')),
  contact_name text, contact_email text, contact_phone text, internal_notes text, public_visibility boolean not null default false
);

create table public.project_partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict,
  partner_id uuid not null references public.partners(id) on delete restrict,
  role text not null check(role in ('implementing','research','technical','academic','funding','civil_society')),
  start_date date, end_date date, lead_partner boolean not null default false, public_visibility boolean not null default false, notes text,
  unique(project_id,partner_id), check(end_date is null or start_date is null or end_date>=start_date)
);
create index project_partners_partner_id_idx on public.project_partners(partner_id);
create index project_partners_project_id_idx on public.project_partners(project_id);

create table public.project_specific_objectives (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict,
  title text not null check(length(trim(title))>0), description text not null default '', position integer not null default 0,
  unique(id,project_id)
);
create index project_specific_objectives_project_id_idx on public.project_specific_objectives(project_id);

create table public.project_activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict,
  activity_code text not null check(length(trim(activity_code))>0), title text not null check(length(trim(title))>0), description text not null default '',
  activity_type text not null check(activity_type in ('research','workshop','training','consultation','meeting','field_activity','evidence_collection','publication','advocacy','stakeholder_engagement','assessment','data_collection','other')),
  status text not null default 'planned' check(status in ('planned','in_progress','completed','delayed','cancelled')),
  planned_start_date date, planned_end_date date, actual_start_date date, actual_end_date date,
  country text not null, location text, responsible_partner_id uuid, responsible_user_id text,
  target_group_description text, planned_participants integer check(planned_participants>=0), actual_participants integer check(actual_participants>=0),
  public_summary text, internal_notes text,
  unique(project_id,activity_code), unique(id,project_id),
  foreign key(project_id,responsible_partner_id) references public.project_partners(project_id,partner_id) on delete restrict,
  check(planned_end_date is null or planned_start_date is null or planned_end_date>=planned_start_date),
  check(actual_end_date is null or actual_start_date is null or actual_end_date>=actual_start_date)
);
create index project_activities_responsible_partner_id_idx on public.project_activities(responsible_partner_id);
create index project_activities_project_id_idx on public.project_activities(project_id);

create table public.project_outputs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict,
  activity_id uuid, title text not null check(length(trim(title))>0), description text not null default '',
  planned_value numeric check(planned_value::text not in ('NaN','Infinity','-Infinity')), achieved_value numeric check(achieved_value::text not in ('NaN','Infinity','-Infinity')), unit text,
  status text not null default 'planned' check(status in ('planned','in_progress','completed','cancelled')),
  completion_date date, verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected','requires_review')),
  public_visibility boolean not null default false, unique(id,project_id),
  foreign key(activity_id,project_id) references public.project_activities(id,project_id) on delete restrict,
  check((planned_value is null and achieved_value is null) or coalesce(length(trim(unit))>0,false))
);
create index project_outputs_activity_id_idx on public.project_outputs(activity_id);
create index project_outputs_project_id_idx on public.project_outputs(project_id);

create table public.project_outcomes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict,
  specific_objective_id uuid, title text not null check(length(trim(title))>0), description text not null default '',
  level text not null default 'immediate' check(level in ('immediate','intermediate','long_term')),
  assumptions text, risks text, status text not null default 'planned' check(status in ('planned','in_progress','observed','not_observed')),
  public_visibility boolean not null default false, unique(id,project_id),
  foreign key(specific_objective_id,project_id) references public.project_specific_objectives(id,project_id) on delete restrict
);
create index project_outcomes_specific_objective_id_idx on public.project_outcomes(specific_objective_id);
create index project_outcomes_project_id_idx on public.project_outcomes(project_id);

create table public.project_output_outcomes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict,
  output_id uuid not null, outcome_id uuid not null,
  foreign key(output_id,project_id) references public.project_outputs(id,project_id) on delete restrict,
  foreign key(outcome_id,project_id) references public.project_outcomes(id,project_id) on delete restrict
);

create unique index project_output_outcomes_active_unique on public.project_output_outcomes(output_id,outcome_id) where archived_at is null;
create index project_output_outcomes_outcome_id_idx on public.project_output_outcomes(outcome_id);
create index project_output_outcomes_output_id_idx on public.project_output_outcomes(output_id);
create index project_output_outcomes_project_id_idx on public.project_output_outcomes(project_id);

create table public.project_indicators (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict, outcome_id uuid, output_id uuid,
  name text not null check(length(trim(name))>0), description text not null default '',
  indicator_type text not null check(indicator_type in ('output','outcome','process')), unit text not null check(length(trim(unit))>0),
  baseline_value numeric check(baseline_value::text not in ('NaN','Infinity','-Infinity')), baseline_date date,
  target_value numeric check(target_value::text not in ('NaN','Infinity','-Infinity')), target_date date,
  progress_method text not null default 'none' check(progress_method in ('none','linear')),
  measurement_frequency text, source_of_verification text not null check(length(trim(source_of_verification))>0), responsible_user_id text,
  unique(id,project_id),
  foreign key(outcome_id,project_id) references public.project_outcomes(id,project_id) on delete restrict,
  foreign key(output_id,project_id) references public.project_outputs(id,project_id) on delete restrict,
  check(num_nonnulls(outcome_id,output_id)<=1),
  check((indicator_type='process' and num_nonnulls(outcome_id,output_id)=0) or (indicator_type='output' and outcome_id is null) or (indicator_type='outcome' and output_id is null)),
  check(progress_method='none' or (baseline_value is not null and target_value is not null and baseline_value<>target_value))
);
create index project_indicators_outcome_id_idx on public.project_indicators(outcome_id);
create index project_indicators_output_id_idx on public.project_indicators(output_id);
create index project_indicators_project_id_idx on public.project_indicators(project_id);

create table public.project_evidence (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict,
  activity_id uuid, output_id uuid, outcome_id uuid, indicator_id uuid,
  title text not null check(length(trim(title))>0), description text not null default '',
  evidence_type text not null check(evidence_type in ('attendance_record','report','publication','dataset','meeting_minutes','partner_confirmation','photograph','survey','evaluation','training_material','official_document','other')),
  source text not null check(length(trim(source))>0), source_url text check(source_url ~ '^https?://'),
  file_reference text, evidence_date date not null, uploaded_by text not null,
  verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected','requires_review')),
  verified_by text, verified_at timestamptz,
  confidentiality text not null default 'internal' check(confidentiality in ('public','partner','internal','restricted')),
  public_visibility boolean not null default false, notes text, unique(id,project_id),
  foreign key(activity_id,project_id) references public.project_activities(id,project_id) on delete restrict,
  foreign key(output_id,project_id) references public.project_outputs(id,project_id) on delete restrict,
  foreign key(outcome_id,project_id) references public.project_outcomes(id,project_id) on delete restrict,
  foreign key(indicator_id,project_id) references public.project_indicators(id,project_id) on delete restrict,
  check(not public_visibility or (confidentiality='public' and verification_status='verified')),
  check(verification_status<>'verified' or (verified_by is not null and verified_at is not null))
);
create index project_evidence_outcome_id_idx on public.project_evidence(outcome_id);
create index project_evidence_output_id_idx on public.project_evidence(output_id);
create index project_evidence_activity_id_idx on public.project_evidence(activity_id);
create index project_evidence_project_id_idx on public.project_evidence(project_id);
create index project_evidence_indicator_id_idx on public.project_evidence(indicator_id);

create table public.project_indicator_measurements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict,
  indicator_id uuid not null, value numeric not null check(value::text not in ('NaN','Infinity','-Infinity')),
  measurement_date date not null, source text not null check(length(trim(source))>0), evidence_id uuid, notes text, recorded_by text not null,
  supersedes_id uuid unique references public.project_indicator_measurements(id) on delete restrict check(supersedes_id is distinct from id),
  foreign key(indicator_id,project_id) references public.project_indicators(id,project_id) on delete restrict,
  foreign key(evidence_id,project_id) references public.project_evidence(id,project_id) on delete restrict
);
create index project_indicator_measurements_evidence_id_idx on public.project_indicator_measurements(evidence_id);
create index project_indicator_measurements_indicator_id_idx on public.project_indicator_measurements(indicator_id);
create index project_indicator_measurements_project_id_idx on public.project_indicator_measurements(project_id);

create table public.programme_target_groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  name text not null unique check(length(trim(name))>0), description text not null default ''
);

create table public.project_target_groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict,
  target_group_id uuid not null references public.programme_target_groups(id) on delete restrict
);

create unique index project_target_groups_active_unique on public.project_target_groups(project_id,target_group_id) where archived_at is null;
create index project_target_groups_target_group_id_idx on public.project_target_groups(target_group_id);
create index project_target_groups_project_id_idx on public.project_target_groups(project_id);

create table public.activity_target_groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict, activity_id uuid not null,
  target_group_id uuid not null references public.programme_target_groups(id) on delete restrict,
  foreign key(activity_id,project_id) references public.project_activities(id,project_id) on delete restrict
);

create unique index activity_target_groups_active_unique on public.activity_target_groups(activity_id,target_group_id) where archived_at is null;
create index activity_target_groups_target_group_id_idx on public.activity_target_groups(target_group_id);
create index activity_target_groups_activity_id_idx on public.activity_target_groups(activity_id);
create index activity_target_groups_project_id_idx on public.activity_target_groups(project_id);

create table public.project_commitments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict,
  commitment_id uuid not null references public.commitments(id) on delete restrict,
  contribution_description text not null check(length(trim(contribution_description))>0)
);

create unique index project_commitments_active_unique on public.project_commitments(project_id,commitment_id) where archived_at is null;
create index project_commitments_commitment_id_idx on public.project_commitments(commitment_id);
create index project_commitments_project_id_idx on public.project_commitments(project_id);

create table public.activity_commitments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict, activity_id uuid not null,
  commitment_id uuid not null references public.commitments(id) on delete restrict,
  contribution_description text not null check(length(trim(contribution_description))>0),
  foreign key(activity_id,project_id) references public.project_activities(id,project_id) on delete restrict
);

create unique index activity_commitments_active_unique on public.activity_commitments(activity_id,commitment_id) where archived_at is null;
create index activity_commitments_commitment_id_idx on public.activity_commitments(commitment_id);
create index activity_commitments_activity_id_idx on public.activity_commitments(activity_id);
create index activity_commitments_project_id_idx on public.activity_commitments(project_id);

create table public.output_commitments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by text not null, updated_by text not null,
  archived_at timestamptz,
  project_id uuid not null references public.projects(id) on delete restrict, output_id uuid not null,
  commitment_id uuid not null references public.commitments(id) on delete restrict,
  contribution_description text not null check(length(trim(contribution_description))>0),
  foreign key(output_id,project_id) references public.project_outputs(id,project_id) on delete restrict
);

create unique index output_commitments_active_unique on public.output_commitments(output_id,commitment_id) where archived_at is null;
create index output_commitments_commitment_id_idx on public.output_commitments(commitment_id);
create index output_commitments_output_id_idx on public.output_commitments(output_id);
create index output_commitments_project_id_idx on public.output_commitments(project_id);

create function public.hrct_project_indicator_history_guard() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if (new.unit,new.indicator_type) is distinct from (old.unit,old.indicator_type) and
    exists(select 1 from public.project_indicator_measurements m where m.indicator_id=old.id) then
    raise exception 'Indicator unit and type are immutable after measurement; create a new indicator';
  end if;
  return new;
end $$;
create trigger zz_project_indicator_history_guard before update on public.project_indicators
for each row execute function public.hrct_project_indicator_history_guard();
revoke all on function public.hrct_project_indicator_history_guard() from public,anon,authenticated;
grant execute on function public.hrct_project_indicator_history_guard() to service_role;

create index project_activities_schedule_idx on public.project_activities(planned_start_date) where archived_at is null;
create index project_measurements_latest_idx on public.project_indicator_measurements(indicator_id,measurement_date desc,created_at desc);
create index project_evidence_date_idx on public.project_evidence(project_id,evidence_date desc);

-- Same private snapshot-audit pattern as indicator_audit, with the existing admin account as actor.
create table public.programme_audit (
  id bigint generated always as identity primary key, entity text not null, entity_id uuid not null,
  operation text not null, before_record jsonb, after_record jsonb,
  recorded_by text not null, recorded_at timestamptz not null default now()
);
create index programme_audit_entity_idx on public.programme_audit(entity,entity_id,recorded_at desc);

create function public.hrct_programme_stamp() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare actor text := nullif(current_setting('hrct.programme_actor',true),'');
begin
  if actor is null then raise exception 'Use the session-protected programme write operation'; end if;
  if TG_OP='DELETE' then raise exception 'Archive records to retain programme history'; end if;
  if TG_OP='UPDATE' then
    if TG_TABLE_NAME='project_indicator_measurements' then raise exception 'Measurements are immutable; insert a correction'; end if;
    if new.id<>old.id then raise exception 'Record identity is immutable'; end if;
    if old.archived_at is not null then raise exception 'Archived records are immutable'; end if;
    if to_jsonb(new)->>'project_id' is distinct from to_jsonb(old)->>'project_id' then raise exception 'Project ownership is immutable'; end if;
    new.created_at=old.created_at; new.created_by=old.created_by;
  else new.created_at=clock_timestamp(); new.created_by=actor;
  end if;
  new.updated_at=clock_timestamp(); new.updated_by=actor;
  return new;
end $$;
create function public.hrct_programme_audit() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  insert into public.programme_audit(entity,entity_id,operation,before_record,after_record,recorded_by)
  values(TG_TABLE_NAME,new.id,TG_OP,case when TG_OP='UPDATE' then to_jsonb(old) end,to_jsonb(new),new.updated_by);
  return new;
end $$;
create function public.hrct_programme_audit_immutable() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin raise exception 'Audit history is immutable'; end $$;
create trigger programme_audit_immutable before update or delete on public.programme_audit
for each row execute function public.hrct_programme_audit_immutable();

-- Metadata is stamped by the database, never supplied by a browser. Editing verified content
-- requires review again unless the same save explicitly verifies the edited version.
create function public.hrct_project_evidence_review() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare actor text:=current_setting('hrct.programme_actor',true);
begin
  if TG_OP='INSERT' then new.uploaded_by=actor;
  else
    new.uploaded_by=old.uploaded_by;
    if old.verification_status='verified' and new.verification_status='verified' and
       (to_jsonb(new)-array['public_visibility','updated_at','updated_by','archived_at','verified_at','verified_by']) is distinct from
       (to_jsonb(old)-array['public_visibility','updated_at','updated_by','archived_at','verified_at','verified_by']) then
      new.verification_status='requires_review'; new.public_visibility=false;
    end if;
  end if;
  if new.verification_status='verified' then
    if TG_OP='INSERT' or old.verification_status<>'verified' then new.verified_by=actor; new.verified_at=clock_timestamp(); end if;
  else new.verified_by=null; new.verified_at=null;
  end if;
  return new;
end $$;
create trigger zz_project_evidence_review before insert or update on public.project_evidence
for each row execute function public.hrct_project_evidence_review();

create function public.hrct_project_measurement_validate() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  new.recorded_by=current_setting('hrct.programme_actor',true);
  if new.measurement_date>current_date then raise exception 'Measurement date cannot be in the future'; end if;
  if new.supersedes_id is not null and not exists(
    select 1 from public.project_indicator_measurements m where m.id=new.supersedes_id and m.indicator_id=new.indicator_id and m.measurement_date=new.measurement_date
  ) then raise exception 'Correction must refer to the same indicator and measurement date'; end if;
  return new;
end $$;
create trigger zz_project_measurement_validate before insert on public.project_indicator_measurements
for each row execute function public.hrct_project_measurement_validate();

do $$ declare t text; begin
  foreach t in array array['programmes','projects','partners','project_partners','project_specific_objectives','project_activities','project_outputs','project_outcomes','project_output_outcomes','project_indicators','project_evidence','project_indicator_measurements','programme_target_groups','project_target_groups','activity_target_groups','project_commitments','activity_commitments','output_commitments'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update on public.%I to service_role',t);
    execute format('create trigger programme_stamp before insert or update or delete on public.%I for each row execute function public.hrct_programme_stamp()',t);
    execute format('create trigger programme_audit after insert or update on public.%I for each row execute function public.hrct_programme_audit()',t);
  end loop;
end $$;
alter table public.programme_audit enable row level security;
revoke all on public.programme_audit from public,anon,authenticated;
grant select,insert on public.programme_audit to service_role;
revoke all on sequence public.programme_audit_id_seq from public,anon,authenticated;
grant usage,select on sequence public.programme_audit_id_seq to service_role;

-- A single atomic, allowlisted write contract follows hrct_admin_* RPCs. It does not touch
-- commitments, evidence, assessments, or the public indicator catalogue. Invoker rights only.
create function public.hrct_programmes_write(p_entity text,p_id uuid,p_values jsonb,p_actor text,p_operation text default 'save')
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare fields text; selections text; assignments text; k text; result uuid;
begin
  if p_entity<>all(array['programmes','projects','partners','project_partners','project_specific_objectives','project_activities','project_outputs','project_outcomes','project_output_outcomes','project_indicators','project_evidence','project_indicator_measurements','programme_target_groups','project_target_groups','activity_target_groups','project_commitments','activity_commitments','output_commitments']) then raise exception 'Unknown programme entity'; end if;
  if p_actor is null or length(trim(p_actor))=0 then raise exception 'An accountable actor is required'; end if;
  perform set_config('hrct.programme_actor',p_actor,true);
  if p_operation='archive' then
    if p_entity='project_indicator_measurements' then raise exception 'Measurements are immutable'; end if;
    execute format('update public.%I set archived_at=clock_timestamp() where id=$1 and archived_at is null returning id',p_entity) into result using p_id;
  elsif p_operation='save' then
    if jsonb_typeof(p_values) is distinct from 'object' or p_values='{}'::jsonb then raise exception 'Values must be a nonempty object'; end if;
    for k in select jsonb_object_keys(p_values) loop
      if k=any(array['id','created_at','updated_at','created_by','updated_by','archived_at','uploaded_by','recorded_by','verified_by','verified_at']) or
        not exists(select 1 from information_schema.columns where table_schema='public' and table_name=p_entity and column_name=k) then
        raise exception 'Unsupported field: %',k;
      end if;
    end loop;
    select string_agg(format('%I',key),',' order by key),string_agg(format('r.%I',key),',' order by key),string_agg(format('%I=r.%I',key,key),',' order by key)
    into fields,selections,assignments from jsonb_object_keys(p_values) key;
    if p_id is null then
      execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) r returning id',p_entity,fields,selections,p_entity) into result using p_values;
    else
      execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) r where t.id=$2 and t.archived_at is null returning t.id',p_entity,assignments,p_entity) into result using p_values,p_id;
    end if;
  else raise exception 'Unsupported operation';
  end if;
  if result is null then raise exception 'Active record not found'; end if;
  return result;
end $$;
revoke all on function public.hrct_programmes_write(text,uuid,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.hrct_programmes_write(text,uuid,jsonb,text,text) to service_role;
revoke all on function public.hrct_programme_stamp(),public.hrct_programme_audit(),public.hrct_programme_audit_immutable(),public.hrct_project_evidence_review(),public.hrct_project_measurement_validate() from public,anon,authenticated;
grant execute on function public.hrct_programme_stamp(),public.hrct_programme_audit(),public.hrct_project_evidence_review(),public.hrct_project_measurement_validate() to service_role;
commit;
