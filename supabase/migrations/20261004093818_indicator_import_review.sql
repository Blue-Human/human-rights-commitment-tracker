begin;
-- Service-role only import. Validate everything before any insert; never update human work.
create function public.hrct_import_indicators(p_seed jsonb,p_write boolean default false) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare errors jsonb='[]'; r jsonb; i jsonb; l jsonb; component jsonb; indicator_uuid uuid; commitment_uuid uuid; matches int; inserted int=0;
begin
  if jsonb_typeof(p_seed) is distinct from 'object' or jsonb_typeof(p_seed->'recommendations') is distinct from 'array' or jsonb_typeof(p_seed->'indicators') is distinct from 'array' or jsonb_typeof(p_seed->'links') is distinct from 'array' or coalesce(length(p_seed->>'version'),0)=0 or coalesce(length(p_seed->>'origin'),0)=0 then return jsonb_build_object('validated',false,'written',false,'errors',jsonb_build_array('Malformed seed payload')); end if;
  if jsonb_array_length(p_seed->'recommendations')<>324 or (select count(distinct x->>'recommendation_number') from jsonb_array_elements(p_seed->'recommendations') x)<>324 then errors=errors||'"Se requieren 324 números únicos"'; end if;
  if jsonb_array_length(p_seed->'indicators')<>98 or (select count(distinct x->>'indicator_code') from jsonb_array_elements(p_seed->'indicators') x)<>98 then errors=errors||'"Se requieren 98 códigos únicos"'; end if;
  if jsonb_array_length(p_seed->'links')<>428 or (select count(distinct (x->>'recommendation_number',x->>'indicator_code')) from jsonb_array_elements(p_seed->'links') x)<>428 then errors=errors||'"Se requieren 428 pares únicos"'; end if;
  if (select count(*) from jsonb_array_elements(p_seed->'recommendations') x where x->>'indicator_requirement'='required')<>253 or
     (select count(*) from jsonb_array_elements(p_seed->'recommendations') x where x->>'indicator_requirement'='recommended')<>30 or
     (select count(*) from jsonb_array_elements(p_seed->'recommendations') x where x->>'indicator_requirement'='not_required')<>41 then errors=errors||'"Conteos de aplicabilidad incorrectos"'; end if;
  if (select count(*) from jsonb_array_elements(p_seed->'links') x where x->>'role'='primary')<>283 or
     (select count(*) from jsonb_array_elements(p_seed->'links') x where x->>'role'='supporting')<>145 then errors=errors||'"Conteos de roles incorrectos"'; end if;
  for r in select value from jsonb_array_elements(p_seed->'recommendations') loop
    select count(*) into matches from public.commitments c join public.countries co on co.id=c.country_id join public.mechanisms m on m.id=c.mechanism_id join public.sources s on s.id=c.source_id
      where co.iso2='ES' and m.code='UPR' and s.document_reference='A/HRC/60/8' and c.recommendation_number=r->>'recommendation_number' and c.public_id not ilike '%TEST%';
    if matches<>1 then errors=errors||jsonb_build_array(jsonb_build_object('recommendation',r->>'recommendation_number','matches',matches)); end if;
  end loop;
  for l in select value from jsonb_array_elements(p_seed->'links') loop
    if not exists(select 1 from jsonb_array_elements(p_seed->'recommendations') x where x->>'recommendation_number'=l->>'recommendation_number') or
       not exists(select 1 from jsonb_array_elements(p_seed->'indicators') x where x->>'indicator_code'=l->>'indicator_code') then errors=errors||jsonb_build_array(jsonb_build_object('invalid_link',l)); end if;
  end loop;
  for i in select value from jsonb_array_elements(p_seed->'indicators') loop
    if exists(select 1 from public.indicators where code=i->>'indicator_code' and import_metadata->>'version' is distinct from p_seed->>'version') then errors=errors||jsonb_build_array('Colisión de código: '||(i->>'indicator_code')); end if;
  end loop;
  if errors<>'[]' or not p_write then return jsonb_build_object('errors',errors,'validated',errors='[]','written',false,'version',p_seed->>'version'); end if;
  for i in select value from jsonb_array_elements(p_seed->'indicators') loop
    insert into public.indicators(code,name,description,indicator_type,unit,topic,frequency,orientation,preferred_sources,recommended_disaggregation,editorial_status,import_metadata)
      values(i->>'indicator_code',i->>'indicator_name',i->>'definition',i->'normalizations'->>'indicator_type',i->>'unit',split_part(i->>'indicator_code','-',1),i->>'frequency',i->'normalizations'->>'orientation',i->>'preferred_source',i->>'recommended_disaggregation','proposed',jsonb_build_object('origin',p_seed->>'origin','version',p_seed->>'version','original',i,'methodology_sources',p_seed->'methodology_sources'))
      on conflict(code) do nothing returning id into indicator_uuid;
    if indicator_uuid is not null then
      inserted=inserted+1;
      for component in select value from jsonb_array_elements(i->'components') loop
        insert into public.indicator_components(indicator_id,code,label,unit,value_type,frequency,visualization,definition) values(indicator_uuid,component->>'code',component->>'label',component->>'unit',component->>'value_type',component->>'frequency',component->>'visualization',component->>'definition');
      end loop;
    end if;
  end loop;
  for r in select value from jsonb_array_elements(p_seed->'recommendations') loop
    select c.id into strict commitment_uuid from public.commitments c join public.countries co on co.id=c.country_id join public.mechanisms m on m.id=c.mechanism_id join public.sources s on s.id=c.source_id
      where co.iso2='ES' and m.code='UPR' and s.document_reference='A/HRC/60/8' and c.recommendation_number=r->>'recommendation_number' and c.public_id not ilike '%TEST%';
    insert into public.recommendation_indicator_requirements(commitment_id,indicator_requirement,reason,import_metadata) values(commitment_uuid,r->>'indicator_requirement',r->>'measurement_rationale',jsonb_build_object('origin',p_seed->>'origin','version',p_seed->>'version','original',r)) on conflict do nothing;
    for l in select value from jsonb_array_elements(p_seed->'links') x where x->>'recommendation_number'=r->>'recommendation_number' loop
      insert into public.recommendation_indicators(commitment_id,indicator_id,role,rationale,rationale_kind,import_metadata)
        select commitment_uuid,id,l->>'role',r->>'measurement_rationale','general',jsonb_build_object('origin',p_seed->>'origin','version',p_seed->>'version','original',l) from public.indicators where code=l->>'indicator_code' on conflict do nothing;
    end loop;
  end loop;
  return jsonb_build_object('errors',errors,'validated',true,'written',true,'inserted_indicators',inserted,'version',p_seed->>'version');
end $$;
revoke all on function public.hrct_import_indicators(jsonb,boolean) from public,anon,authenticated;
grant execute on function public.hrct_import_indicators(jsonb,boolean) to service_role;

-- Publication is a deliberate, transactional selection, never latest-row-wins.
create function public.hrct_publish_indicator_value(p_id uuid,p_reviewer text,p_reason text) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare v public.indicator_values;
begin
  if length(trim(p_reviewer))=0 or length(trim(p_reason))=0 then raise exception 'Reviewer and selection reason required'; end if;
  select * into strict v from public.indicator_values where id=p_id for update;
  perform pg_advisory_xact_lock(hashtextextended(v.component_id::text||v.country_iso2||v.scope::text,0));
  if v.editorial_status<>'draft' then raise exception 'Review a draft observation'; end if;
  if not exists(select 1 from public.indicator_components c join public.indicators i on i.id=c.indicator_id where c.id=v.component_id and c.editorial_status='published' and i.editorial_status='published' and i.active) then raise exception 'Publish reviewed catalogue and component first'; end if;
  if v.break_before and (coalesce(length(trim(v.comparability_notes)),0)=0 or exists(select 1 from public.indicator_values x where x.component_id=v.component_id and x.country_iso2=v.country_iso2 and x.scope=v.scope and x.is_current and x.period_end<v.period_start and x.series_key=v.series_key and x.methodology_version=v.methodology_version)) then raise exception 'Document a break and start a new comparable series key or methodology version'; end if;
  if exists(select 1 from public.indicator_values x where x.component_id=v.component_id and x.country_iso2=v.country_iso2 and x.scope=v.scope and x.is_current and x.period_end<v.period_start and x.source_url<>v.source_url and x.series_key=v.series_key and x.methodology_version=v.methodology_version) and coalesce(length(trim(v.comparability_notes)),0)=0 then raise exception 'Document the comparability assessment when the source changes'; end if;
  if v.supersedes_id is not null and not exists(select 1 from public.indicator_values x where x.id=v.supersedes_id and x.component_id=v.component_id and x.country_iso2=v.country_iso2 and x.scope=v.scope and x.period_start=v.period_start and x.period_end=v.period_end) then raise exception 'Correction must reference the same series and period'; end if;
  update public.indicator_values set is_current=false,updated_at=now() where component_id=v.component_id and country_iso2=v.country_iso2 and scope=v.scope and period_start=v.period_start and period_end=v.period_end and is_current;
  update public.indicator_values set editorial_status='published',is_current=true,selection_reason=p_reason,reviewed_by=p_reviewer,reviewed_at=now(),updated_at=now() where id=p_id;
end $$;
revoke all on function public.hrct_publish_indicator_value(uuid,text,text) from public,anon,authenticated;
grant execute on function public.hrct_publish_indicator_value(uuid,text,text) to service_role;

create function public.hrct_validate_indicator_link() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare b public.indicator_values; country text;
begin
  select co.iso2 into country from public.commitments c join public.countries co on co.id=c.country_id where c.id=new.commitment_id;
  if new.baseline_value_id is not null then
    select * into strict b from public.indicator_values where id=new.baseline_value_id;
    if b.indicator_id<>new.indicator_id or b.component_id is distinct from new.component_id or b.country_iso2<>country or b.scope<>new.scope or b.numeric_value is null or not b.is_current or b.editorial_status<>'published' then raise exception 'Baseline must be a published comparable observation for the exact scope'; end if;
  end if;
  if new.target_type='relative' and new.target_value is not null and (new.baseline_value_id is null or b.numeric_value=0) then raise exception 'Relative target requires a documented baseline'; end if;
  if new.target_value is not null and not exists(select 1 from public.indicator_components where id=new.component_id and value_type='numeric') then raise exception 'Numeric target requires numeric component'; end if;
  if new.editorial_status='published' and (new.reviewed_at is null or coalesce(length(trim(new.reviewed_by)),0)=0 or not exists(select 1 from public.indicators where id=new.indicator_id and editorial_status='published' and active)) then raise exception 'Review and publish the catalogue before publishing a link'; end if;
  if new.editorial_status='published' and new.component_id is not null and not exists(select 1 from public.indicator_components where id=new.component_id and editorial_status='published') then raise exception 'Review and publish the scoped component before its link'; end if;
  new.updated_at=now(); return new;
end $$;
create trigger validate_indicator_link before insert or update on public.recommendation_indicators for each row execute function public.hrct_validate_indicator_link();

-- Guard published editorial content, and keep historical component definitions stable.
alter table public.indicators add constraint indicator_review_required check(editorial_status<>'published' or (reviewed_at is not null and coalesce(length(trim(reviewed_by)),0)>0));
alter table public.recommendation_indicator_requirements add constraint requirement_review_required check(editorial_status<>'published' or (reviewed_at is not null and coalesce(length(trim(reviewed_by)),0)>0));
create function public.hrct_validate_indicator_component() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if (new.value_type='numeric' and new.visualization='timeline') or (new.value_type<>'numeric' and new.visualization<>'timeline') then raise exception 'Choose timeline for nonnumeric observations, line or bars for numeric ones'; end if;
  if TG_OP='UPDATE' and exists(select 1 from public.indicator_values where component_id=old.id and editorial_status='published') and
    (old.unit,old.value_type,old.frequency,old.definition,old.formula) is distinct from (new.unit,new.value_type,new.frequency,new.definition,new.formula) then
    raise exception 'Published component definition is immutable: create a new component';
  end if;
  if new.editorial_status='published' and not exists(select 1 from public.indicators where id=new.indicator_id and editorial_status='published' and active) then raise exception 'Review and publish the catalogue first'; end if;
  return new;
end $$;
create trigger validate_indicator_component before insert or update on public.indicator_components for each row execute function public.hrct_validate_indicator_component();

commit;
