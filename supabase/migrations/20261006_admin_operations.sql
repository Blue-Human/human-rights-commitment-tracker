-- Operations used by the in-app admin panel. They are callable with the service role only,
-- which the Next.js server uses after checking the admin session.

-- A person sets the assessment of a recommendation. Any status is allowed, including
-- implemented. History is kept: the previous assessment stays and the change is recorded.
create or replace function public.hrct_admin_set_assessment(p_public_id text, p_status text, p_confidence text, p_rationale text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commitment public.commitments%rowtype;
  v_current public.assessments%rowtype;
  v_methodology uuid;
  v_new uuid;
begin
  select * into v_commitment from public.commitments where public_id = p_public_id and publication_status = 'published';
  if not found then
    raise exception 'unknown recommendation %', p_public_id;
  end if;
  if p_status not in ('not_assessed','unable_to_assess','not_implemented','limited_progress','substantially_implemented','implemented','regressed') then
    raise exception 'invalid status %', p_status;
  end if;
  if p_confidence not in ('high','medium','low') then
    raise exception 'invalid confidence %', p_confidence;
  end if;
  if coalesce(trim(p_rationale), '') = '' then
    raise exception 'rationale is required';
  end if;

  select * into v_current from public.assessments where commitment_id = v_commitment.id and is_current;
  select coalesce(v_current.methodology_version_id, (select id from public.methodology_versions order by effective_from desc nulls last limit 1)) into v_methodology;

  update public.assessments set is_current = false where commitment_id = v_commitment.id and is_current;
  insert into public.assessments (commitment_id, methodology_version_id, status, confidence, rationale, assessment_date, is_current, is_public, published_at, provisional)
  values (v_commitment.id, v_methodology, p_status, p_confidence, trim(p_rationale), current_date, true, true, now(), false)
  returning id into v_new;
  insert into public.assessment_evidence (assessment_id, evidence_id)
  select v_new, id from public.evidence where commitment_id = v_commitment.id and is_public;
  insert into public.assessment_changes (commitment_id, previous_assessment_id, new_assessment_id, change_reason)
  values (v_commitment.id, v_current.id, v_new, coalesce(nullif(trim(p_reason), ''), 'Assessment updated by Blue Human'));

  -- An open "implemented" proposal is settled by this decision.
  update public.research_reviews set resolution = case when p_status = 'implemented' then 'confirmed' else 'rejected' end, resolved_at = now(), resolved_by = 'admin'
  where commitment_id = v_commitment.id and outcome = 'needs_confirmation' and resolution is null;

  return jsonb_build_object('assessment_id', v_new, 'previous_status', v_current.status, 'status', p_status);
end;
$$;

-- A person confirms the current provisional assessment as it stands.
create or replace function public.hrct_admin_confirm_assessment(p_public_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assessment uuid;
begin
  update public.assessments a set provisional = false
  from public.commitments c
  where c.id = a.commitment_id and c.public_id = p_public_id and a.is_current
  returning a.id into v_assessment;
  if v_assessment is null then
    raise exception 'no current assessment for %', p_public_id;
  end if;
  update public.evidence set reviewed_at = now()
  where reviewed_at is null and id in (select evidence_id from public.assessment_evidence where assessment_id = v_assessment);
  return jsonb_build_object('assessment_id', v_assessment);
end;
$$;

revoke all on function public.hrct_admin_set_assessment(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.hrct_admin_confirm_assessment(text) from public, anon, authenticated;
grant execute on function public.hrct_admin_set_assessment(text, text, text, text, text) to service_role;
grant execute on function public.hrct_admin_confirm_assessment(text) to service_role;
