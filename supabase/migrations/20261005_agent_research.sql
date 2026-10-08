-- Research assistant: assessments it files are provisional until a person confirms them, every
-- review is logged, and a proposal to mark a recommendation as implemented waits for confirmation.

alter table public.assessments add column if not exists provisional boolean not null default false;

-- Existing pilot assessments that carry the validation caveat in their rationale.
update public.assessments set provisional = true
where provisional = false and rationale ~ 'human validation remains required';

create table if not exists public.research_reviews (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  reviewed_at timestamptz not null default now(),
  reviewer text not null,
  outcome text not null check (outcome in ('no_change','updated','needs_confirmation','rejected_no_verified_evidence')),
  previous_status text,
  proposed_status text,
  confidence text,
  change_summary text,
  assessment_id uuid references public.assessments(id) on delete set null,
  resolution text check (resolution in ('confirmed','rejected')),
  resolved_at timestamptz,
  resolved_by text,
  jira jsonb not null default '{}'::jsonb
);
create index if not exists research_reviews_commitment_idx on public.research_reviews (commitment_id, reviewed_at desc);
alter table public.research_reviews enable row level security;
revoke all on public.research_reviews from anon, authenticated;

-- Records one review of one recommendation in a single transaction.
-- p: { public_id, reviewer, outcome: 'no_change'|'update', proposed_status, confidence, rationale,
--      change_summary, evidence: [{ url, title, publisher, date, source_type, evidence_type, finding, verified }] }
create or replace function public.hrct_record_research_review(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commitment public.commitments%rowtype;
  v_current public.assessments%rowtype;
  v_methodology uuid;
  v_status text := p->>'proposed_status';
  v_outcome text;
  v_gated boolean;
  v_assessment_id uuid;
  v_source_id uuid;
  v_evidence_id uuid;
  v_evidence_ids uuid[] := '{}';
  v_item jsonb;
  v_verified integer;
  v_review_id uuid;
begin
  select * into v_commitment from public.commitments where public_id = p->>'public_id' and publication_status = 'published';
  if not found then
    return jsonb_build_object('result', 'unknown_recommendation');
  end if;
  select * into v_current from public.assessments where commitment_id = v_commitment.id and is_current;

  if p->>'outcome' = 'no_change' then
    insert into public.research_reviews (commitment_id, reviewer, outcome, previous_status, change_summary)
    values (v_commitment.id, p->>'reviewer', 'no_change', v_current.status, p->>'change_summary')
    returning id into v_review_id;
    return jsonb_build_object('result', 'no_change', 'review_id', v_review_id, 'status', v_current.status);
  end if;

  if v_status is null or v_status not in ('unable_to_assess','not_implemented','limited_progress','substantially_implemented','implemented','regressed') then
    raise exception 'invalid proposed_status %', v_status;
  end if;
  if coalesce(p->>'confidence','') not in ('high','medium','low') then
    raise exception 'invalid confidence %', p->>'confidence';
  end if;
  if coalesce(trim(p->>'rationale'), '') = '' then
    raise exception 'rationale is required';
  end if;

  -- No finding without evidence that can actually be opened.
  select count(*) into v_verified from jsonb_array_elements(coalesce(p->'evidence','[]'::jsonb)) e where (e->>'verified')::boolean;
  if v_verified = 0 then
    insert into public.research_reviews (commitment_id, reviewer, outcome, previous_status, proposed_status, confidence, change_summary)
    values (v_commitment.id, p->>'reviewer', 'rejected_no_verified_evidence', v_current.status, v_status, p->>'confidence', p->>'change_summary')
    returning id into v_review_id;
    return jsonb_build_object('result', 'rejected_no_verified_evidence', 'review_id', v_review_id, 'status', v_current.status);
  end if;

  -- Marking a recommendation as implemented is never applied directly.
  v_gated := v_status = 'implemented';
  v_outcome := case when v_gated then 'needs_confirmation' else 'updated' end;
  select coalesce(v_current.methodology_version_id, (select id from public.methodology_versions order by effective_from desc nulls last limit 1)) into v_methodology;

  for v_item in select * from jsonb_array_elements(p->'evidence') loop
    continue when not (v_item->>'verified')::boolean;
    select id into v_source_id from public.sources where url = v_item->>'url' limit 1;
    if v_source_id is null then
      insert into public.sources (title, publisher, source_type, publication_date, url, language, accessed_at)
      values (v_item->>'title', v_item->>'publisher', coalesce(v_item->>'source_type','other'), nullif(v_item->>'date','')::date, v_item->>'url', v_item->>'language', current_date)
      returning id into v_source_id;
    end if;
    insert into public.evidence (commitment_id, source_id, evidence_type, finding, locator, evidence_date, is_public, jira_issue_key)
    values (v_commitment.id, v_source_id, coalesce(v_item->>'evidence_type','context'), v_item->>'finding', v_item->>'url', nullif(v_item->>'date','')::date, not v_gated, v_commitment.jira_issue_key)
    returning id into v_evidence_id;
    v_evidence_ids := v_evidence_ids || v_evidence_id;
  end loop;

  if not v_gated then
    update public.assessments set is_current = false where commitment_id = v_commitment.id and is_current;
  end if;
  insert into public.assessments (commitment_id, methodology_version_id, status, confidence, rationale, assessment_date, jira_issue_key, is_current, is_public, published_at, provisional)
  values (v_commitment.id, v_methodology, v_status, p->>'confidence', p->>'rationale', current_date, v_commitment.jira_issue_key,
          not v_gated, not v_gated, case when v_gated then null else now() end, true)
  returning id into v_assessment_id;
  insert into public.assessment_evidence (assessment_id, evidence_id) select v_assessment_id, unnest(v_evidence_ids);
  if not v_gated then
    insert into public.assessment_changes (commitment_id, previous_assessment_id, new_assessment_id, change_reason)
    values (v_commitment.id, v_current.id, v_assessment_id, coalesce(nullif(trim(p->>'change_summary'), ''), 'Periodic research review'));
  end if;

  insert into public.research_reviews (commitment_id, reviewer, outcome, previous_status, proposed_status, confidence, change_summary, assessment_id)
  values (v_commitment.id, p->>'reviewer', v_outcome, v_current.status, v_status, p->>'confidence', p->>'change_summary', v_assessment_id)
  returning id into v_review_id;

  return jsonb_build_object('result', v_outcome, 'review_id', v_review_id, 'assessment_id', v_assessment_id,
                            'previous_status', v_current.status, 'status', case when v_gated then v_current.status else v_status end,
                            'evidence_recorded', coalesce(array_length(v_evidence_ids, 1), 0));
end;
$$;

-- A person confirms or rejects a pending "implemented" proposal.
create or replace function public.hrct_resolve_research_review(p_public_id text, p_decision text, p_resolved_by text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commitment_id uuid;
  v_review public.research_reviews%rowtype;
  v_previous uuid;
begin
  if p_decision not in ('confirm','reject') then
    raise exception 'decision must be confirm or reject';
  end if;
  select id into v_commitment_id from public.commitments where public_id = p_public_id and publication_status = 'published';
  select * into v_review from public.research_reviews
  where commitment_id = v_commitment_id and outcome = 'needs_confirmation' and resolution is null
  order by reviewed_at desc limit 1;
  if not found then
    return jsonb_build_object('result', 'nothing_pending');
  end if;

  if p_decision = 'confirm' then
    select id into v_previous from public.assessments where commitment_id = v_commitment_id and is_current;
    update public.assessments set is_current = false where commitment_id = v_commitment_id and is_current;
    update public.assessments set is_current = true, is_public = true, published_at = now(), provisional = false, assessment_date = current_date
    where id = v_review.assessment_id;
    update public.evidence set is_public = true, reviewed_at = now()
    where id in (select evidence_id from public.assessment_evidence where assessment_id = v_review.assessment_id);
    insert into public.assessment_changes (commitment_id, previous_assessment_id, new_assessment_id, change_reason)
    values (v_commitment_id, v_previous, v_review.assessment_id, 'Implementation confirmed by Blue Human: ' || coalesce(v_review.change_summary, ''));
  end if;

  update public.research_reviews set resolution = case when p_decision = 'confirm' then 'confirmed' else 'rejected' end, resolved_at = now(), resolved_by = p_resolved_by
  where id = v_review.id;
  -- Other open proposals for the same recommendation are superseded by this decision.
  update public.research_reviews set resolution = 'rejected', resolved_at = now(), resolved_by = p_resolved_by
  where commitment_id = v_commitment_id and outcome = 'needs_confirmation' and resolution is null;

  return jsonb_build_object('result', case when p_decision = 'confirm' then 'confirmed' else 'rejected' end, 'assessment_id', v_review.assessment_id);
end;
$$;

revoke all on function public.hrct_record_research_review(jsonb) from public, anon, authenticated;
revoke all on function public.hrct_resolve_research_review(text, text, text) from public, anon, authenticated;
grant execute on function public.hrct_record_research_review(jsonb) to service_role;
grant execute on function public.hrct_resolve_research_review(text, text, text) to service_role;

-- Public views: expose whether the current assessment is provisional (column appended).
create or replace view public.hrct_public_commitments with (security_invoker = true) as
 select c.id, c.public_id, c.title, c.original_text, c.normalized_summary, c.recommendation_number, c.acceptance_status,
    c.commitment_date, c.deadline, c.original_language, c.published_at,
    co.iso2 as country_iso2, co.iso3 as country_iso3, co.name as country_name, co.slug as country_slug,
    m.code as mechanism_code, m.name as mechanism_name,
    s.title as authoritative_source_title, s.publisher as authoritative_source_publisher,
    s.document_reference as authoritative_source_reference, s.publication_date as authoritative_source_date, s.url as authoritative_source_url,
    a.id as current_assessment_id, a.status as assessment_status, a.confidence as assessment_confidence, a.rationale as assessment_rationale,
    a.assessment_date, a.published_at as assessment_published_at,
    mv.version as methodology_version, mv.title as methodology_title, mv.public_url as methodology_url,
    a.provisional as assessment_provisional
   from public.commitments c
     join public.countries co on co.id = c.country_id
     join public.mechanisms m on m.id = c.mechanism_id
     left join public.sources s on s.id = c.source_id
     left join public.assessments a on a.commitment_id = c.id and a.is_current = true and a.is_public = true
     left join public.methodology_versions mv on mv.id = a.methodology_version_id
  where c.publication_status = 'published';

create or replace view public.hrct_public_assessment_history with (security_invoker = true) as
 select a.id, a.commitment_id, c.public_id, a.status, a.confidence, a.rationale, a.assessment_date, a.is_current, a.published_at,
    mv.version as methodology_version, mv.title as methodology_title, mv.public_url as methodology_url,
    a.provisional
   from public.assessments a
     join public.commitments c on c.id = a.commitment_id
     join public.methodology_versions mv on mv.id = a.methodology_version_id
  where a.is_public = true and c.publication_status = 'published';
