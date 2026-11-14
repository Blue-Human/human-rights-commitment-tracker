-- Invitation-only partner portal. No anonymous/authenticated database grants or public data changes.
begin;
alter table public.project_partners add column portal_access boolean not null default false;
alter table public.project_outputs add column partner_visibility boolean not null default false;
alter table public.project_outcomes add column partner_visibility boolean not null default false;
alter table public.project_indicators add column partner_visibility boolean not null default false;
alter table public.project_evidence add column partner_visibility boolean not null default false;
alter table public.project_evidence add constraint evidence_partner_sharing check(not partner_visibility or (confidentiality in ('public','partner') and verification_status='verified'));

create table public.partner_accounts (
 id uuid primary key references auth.users(id) on delete restrict,
 partner_id uuid not null references public.partners(id) on delete restrict,
 email text not null unique check(email=lower(trim(email))), display_name text not null check(length(trim(display_name))>0),
 active boolean not null default true, activated_at timestamptz, session_version integer not null default 0 check(session_version>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by text not null, updated_by text not null, archived_at timestamptz
);
create index partner_accounts_partner_id_idx on public.partner_accounts(partner_id);
create table public.partner_invitations (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.partner_accounts(id) on delete restrict,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'), expires_at timestamptz not null,
 used_at timestamptz, claim_hash text, claimed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by text not null, updated_by text not null, archived_at timestamptz
);
create index partner_invitations_account_id_idx on public.partner_invitations(account_id);
alter table public.project_evidence add column submitted_by_partner_user uuid references public.partner_accounts(id) on delete restrict;
create index project_evidence_submitted_by_partner_user_idx on public.project_evidence(submitted_by_partner_user);
do $$ declare t text; begin
 foreach t in array array['partner_accounts','partner_invitations'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update on public.%I to service_role',t);
  execute format('create trigger programme_stamp before insert or update or delete on public.%I for each row execute function public.hrct_programme_stamp()',t);
  execute format('create trigger programme_audit after insert or update on public.%I for each row execute function public.hrct_programme_audit()',t);
 end loop;
end $$;

create or replace function public.hrct_project_evidence_review() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare actor text:=current_setting('hrct.programme_actor',true);
begin
 if TG_OP='INSERT' then
  new.uploaded_by=actor;
  new.submitted_by_partner_user=nullif(current_setting('hrct.partner_submission',true),'')::uuid;
 else
  new.uploaded_by=old.uploaded_by; new.submitted_by_partner_user=old.submitted_by_partner_user;
  if old.verification_status='verified' and new.verification_status='verified' and
   (to_jsonb(new)-array['public_visibility','partner_visibility','updated_at','updated_by','archived_at','verified_at','verified_by']) is distinct from
   (to_jsonb(old)-array['public_visibility','partner_visibility','updated_at','updated_by','archived_at','verified_at','verified_by']) then
   new.verification_status='requires_review'; new.public_visibility=false; new.partner_visibility=false;
  end if;
 end if;
 if new.verification_status='verified' then
  if TG_OP='INSERT' or old.verification_status<>'verified' then new.verified_by=actor; new.verified_at=clock_timestamp(); end if;
 else new.verified_by=null; new.verified_at=null; new.partner_visibility=false;
 end if;
 return new;
end $$;

-- Server-only access gate; called again for every read/write, including existing sessions.
create function public.hrct_partner_can_access(p_account uuid,p_project uuid) returns boolean
language sql stable security invoker set search_path=public,pg_temp as $$
 select exists(select 1 from public.partner_accounts a join public.partners o on o.id=a.partner_id
 join public.project_partners pp on pp.partner_id=o.id join public.projects p on p.id=pp.project_id
 join public.programmes g on g.id=p.programme_id
 where a.id=p_account and a.active and a.activated_at is not null and a.archived_at is null and o.archived_at is null
 and pp.archived_at is null and pp.portal_access and (pp.start_date is null or pp.start_date<=current_date)
 and (pp.end_date is null or pp.end_date>=current_date) and p.id=p_project and p.archived_at is null and g.archived_at is null);
$$;
create function public.hrct_partner_projects(p_account uuid) returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'project_code',p.project_code,'title',p.title,'country',p.country,'status',p.status,'public_summary',p.public_summary) order by p.title),'[]'::jsonb)
 from public.projects p where public.hrct_partner_can_access(p_account,p.id);
$$;
create function public.hrct_partner_project(p_account uuid,p_project uuid) returns jsonb
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare org uuid; result jsonb;
begin
 if not public.hrct_partner_can_access(p_account,p_project) then return null; end if;
 select partner_id into org from public.partner_accounts where id=p_account;
 select jsonb_build_object('project',jsonb_build_object('id',p.id,'project_code',p.project_code,'title',p.title,'country',p.country,'status',p.status,'public_summary',p.public_summary,'overall_objective',p.overall_objective,'start_date',p.start_date,'end_date',p.end_date),
 'activities',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'status',a.status,'public_summary',a.public_summary,'planned_start_date',a.planned_start_date,'planned_end_date',a.planned_end_date) order by a.activity_code),'[]'::jsonb) from public.project_activities a where a.project_id=p.id and a.archived_at is null and a.responsible_partner_id=org),
 'outputs',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'title',o.title,'description',o.description,'status',o.status,'planned_value',o.planned_value,'achieved_value',o.achieved_value,'unit',o.unit) order by o.title),'[]'::jsonb) from public.project_outputs o where o.project_id=p.id and o.archived_at is null and o.partner_visibility),
 'outcomes',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'title',o.title,'description',o.description,'status',o.status) order by o.title),'[]'::jsonb) from public.project_outcomes o where o.project_id=p.id and o.archived_at is null and o.partner_visibility),
 'indicators',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'name',i.name,'description',i.description,'unit',i.unit,'baseline_value',i.baseline_value,'target_value',i.target_value,'current_value',m.value,'measurement_date',m.measurement_date) order by i.name),'[]'::jsonb) from public.project_indicators i left join lateral (select v.value,v.measurement_date from public.project_indicator_measurements v where v.indicator_id=i.id and v.archived_at is null and not exists(select 1 from public.project_indicator_measurements correction where correction.supersedes_id=v.id) order by v.measurement_date desc,v.created_at desc,v.id desc limit 1) m on true where i.project_id=p.id and i.archived_at is null and i.partner_visibility),
 'evidence',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'description',e.description,'source',e.source,'source_url',e.source_url,'evidence_date',e.evidence_date,'verification_status',e.verification_status) order by e.evidence_date desc),'[]'::jsonb) from public.project_evidence e where e.project_id=p.id and e.archived_at is null and e.partner_visibility and e.confidentiality in ('public','partner') and e.verification_status='verified'),
 'submissions',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'evidence_date',e.evidence_date,'verification_status',e.verification_status) order by e.created_at desc),'[]'::jsonb) from public.project_evidence e where e.project_id=p.id and e.archived_at is null and e.submitted_by_partner_user=p_account)) into result from public.projects p where p.id=p_project;
 return result;
end $$;

create function public.hrct_partner_invite(p_id uuid,p_partner uuid,p_email text,p_name text,p_hash text,p_actor text) returns uuid
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 perform set_config('hrct.programme_actor',p_actor,true);
 if not exists(select 1 from public.partners where id=p_partner and archived_at is null) then raise exception 'Active partner required'; end if;
 insert into public.partner_accounts(id,partner_id,email,display_name) values(p_id,p_partner,lower(trim(p_email)),p_name)
 on conflict(id) do update set display_name=excluded.display_name,session_version=partner_accounts.session_version+1
 where partner_accounts.partner_id=excluded.partner_id and partner_accounts.email=excluded.email and partner_accounts.active and partner_accounts.archived_at is null;
 if not found then raise exception 'Account cannot be invited'; end if;
 update public.partner_invitations set used_at=clock_timestamp() where account_id=p_id and used_at is null;
 insert into public.partner_invitations(account_id,token_hash,expires_at) values(p_id,p_hash,clock_timestamp()+interval '7 days');
 return p_id;
end $$;
-- A short lease coordinates the password change with one-use invitation consumption.
create function public.hrct_partner_activation(p_hash text,p_claim text,p_operation text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare i public.partner_invitations; a public.partner_accounts;
begin
 select * into i from public.partner_invitations where token_hash=p_hash and used_at is null and expires_at>clock_timestamp() and archived_at is null for update;
 if not found then raise exception 'Invitation unavailable'; end if;
 select * into a from public.partner_accounts where id=i.account_id and active and archived_at is null for update;
 if not found or not exists(select 1 from public.partners where id=a.partner_id and archived_at is null) then raise exception 'Account unavailable'; end if;
 perform set_config('hrct.programme_actor','partner:'||a.id::text,true);
 if p_operation='claim' then
  if i.claimed_at>clock_timestamp()-interval '5 minutes' then raise exception 'Invitation busy'; end if;
  update public.partner_invitations set claim_hash=p_claim,claimed_at=clock_timestamp() where id=i.id;
 elsif p_operation in ('finish','release') and i.claim_hash=p_claim then
  if p_operation='finish' then
   update public.partner_invitations set used_at=clock_timestamp() where id=i.id;
   update public.partner_accounts set activated_at=coalesce(activated_at,clock_timestamp()),session_version=session_version+1 where id=a.id returning * into a;
  else update public.partner_invitations set claim_hash=null,claimed_at=null where id=i.id;
  end if;
 else raise exception 'Invalid invitation claim'; end if;
 return jsonb_build_object('id',a.id,'email',a.email,'session_version',a.session_version);
end $$;
create function public.hrct_partner_account_status(p_id uuid,p_partner uuid,p_active boolean,p_actor text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 perform set_config('hrct.programme_actor',p_actor,true);
 update public.partner_accounts set active=p_active,session_version=session_version+1 where id=p_id and partner_id=p_partner and archived_at is null;
 if not found then raise exception 'Account unavailable'; end if;
 -- Reactivation does not revive old invitation links.
 update public.partner_invitations set used_at=clock_timestamp() where account_id=p_id and used_at is null;
end $$;
create function public.hrct_partner_submit_evidence(p_account uuid,p_project uuid,p_values jsonb) returns uuid
language plpgsql security invoker set search_path=public,pg_temp as $$
declare org uuid; activity uuid; result uuid; allowed text[]:=array['title','description','evidence_type','source','source_url','evidence_date','activity_id'];
begin
 if not public.hrct_partner_can_access(p_account,p_project) then raise exception 'Project access denied'; end if;
 if jsonb_typeof(p_values) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_values) k where k<>all(allowed)) then raise exception 'Unsupported evidence fields'; end if;
 select partner_id into org from public.partner_accounts where id=p_account;
 activity=(p_values->>'activity_id')::uuid;
 if activity is not null and not exists(select 1 from public.project_activities where id=activity and project_id=p_project and responsible_partner_id=org and archived_at is null) then raise exception 'Activity access denied'; end if;
 perform set_config('hrct.partner_submission',p_account::text,true);
 result=public.hrct_programmes_write('project_evidence',null,p_values||jsonb_build_object('project_id',p_project,'confidentiality','partner','verification_status','pending','public_visibility',false,'partner_visibility',false),'partner:'||p_account::text);
 perform set_config('hrct.partner_submission','',true);
 return result;
end $$;
-- Every portal RPC is server-only, using invoker rights and explicit authorization predicates.
do $$ declare r record; begin
 for r in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname like 'hrct_partner_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',r.signature);
  execute format('grant execute on function %s to service_role',r.signature);
 end loop;
end $$;
commit;
