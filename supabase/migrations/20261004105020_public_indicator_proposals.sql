begin;

-- The public annex preview is distinct from editorial publication. Table RLS and
-- column grants remain unchanged: drafts, review notes, targets and observations
-- are never exposed here. Only the whitelisted original annex fields are shown.
create schema hrct_indicator_private;
revoke all on schema hrct_indicator_private from public;
grant usage on schema hrct_indicator_private to anon,authenticated,service_role;

create function hrct_indicator_private.annex_preview(p_public_id text) returns jsonb
language sql stable security definer set search_path='' as $$
with rec as (
  select c.id,c.recommendation_number,r.import_metadata->'original' as original
  from public.commitments c
  join public.countries co on co.id=c.country_id
  join public.mechanisms m on m.id=c.mechanism_id
  join public.sources s on s.id=c.source_id
  join public.recommendation_indicator_requirements r on r.commitment_id=c.id
  where c.public_id=p_public_id and c.publication_status='published'
    and c.public_id not ilike '%TEST%' and co.iso2='ES' and m.code='UPR'
    and s.document_reference='A/HRC/60/8'
    and r.editorial_status in ('proposed','published')
    and not (r.editorial_status='published' and r.indicator_requirement='not_required')
    and r.import_metadata->>'version'='spain-upr4-v1'
    and r.import_metadata->>'origin'='HRCT_Spain_UPR4_indicator_system.xlsx'
    and r.import_metadata->'original'->>'recommendation_number'=c.recommendation_number
), proposals as (
  select distinct on (i.code) i.code,i.import_metadata->'original' as original,
    l.import_metadata->'original'->>'role' as role
  from rec
  join public.recommendation_indicators l on l.commitment_id=rec.id
  join public.indicators i on i.id=l.indicator_id
  where l.editorial_status='proposed' and i.active
    and i.editorial_status in ('proposed','published')
    and l.import_metadata->>'version'='spain-upr4-v1'
    and l.import_metadata->>'origin'='HRCT_Spain_UPR4_indicator_system.xlsx'
    and i.import_metadata->>'version'='spain-upr4-v1'
    and i.import_metadata->>'origin'='HRCT_Spain_UPR4_indicator_system.xlsx'
    and i.import_metadata->'original'->>'indicator_code'=i.code
    and l.import_metadata->'original'->>'indicator_code'=i.code
    and l.import_metadata->'original'->>'recommendation_number'=rec.recommendation_number
    and l.import_metadata->'original'->>'role' in ('primary','supporting','contextual')
  order by i.code,l.id
)
select (select jsonb_build_object(
  'origin','HRCT_Spain_UPR4_indicator_system.xlsx',
  'version','spain-upr4-v1',
  'requirement',rec.original->>'indicator_requirement',
  'reason',rec.original->>'measurement_rationale',
  'indicators',coalesce((select jsonb_agg(jsonb_build_object(
    'code',p.code,'name',p.original->>'indicator_name',
    'description',p.original->>'definition',
    'indicator_type',case when p.original->>'indicator_type'='input' then 'process' else p.original->>'indicator_type' end,
    'unit',p.original->>'unit','frequency',p.original->>'frequency',
    'preferred_sources',p.original->>'preferred_source',
    'recommended_disaggregation',p.original->>'recommended_disaggregation',
    'role',p.role
  ) order by case p.role when 'primary' then 0 when 'supporting' then 1 else 2 end,p.code) from proposals p),'[]'::jsonb)
) from rec);
$$;
revoke all on function hrct_indicator_private.annex_preview(text) from public;
grant execute on function hrct_indicator_private.annex_preview(text) to anon,authenticated,service_role;

-- Preserve the existing invoker/RLS query and one grouped public RPC call.
alter function public.hrct_public_indicators(text,boolean) set schema hrct_indicator_private;
revoke all on function hrct_indicator_private.hrct_public_indicators(text,boolean) from public;
grant execute on function hrct_indicator_private.hrct_public_indicators(text,boolean) to anon,authenticated,service_role;
create function public.hrct_public_indicators(p_public_id text,p_all_history boolean default false) returns jsonb
language sql stable security invoker set search_path='' as $$
  select hrct_indicator_private.hrct_public_indicators(p_public_id,p_all_history)
    || jsonb_build_object('annex',hrct_indicator_private.annex_preview(p_public_id));
$$;
revoke all on function public.hrct_public_indicators(text,boolean) from public;
grant execute on function public.hrct_public_indicators(text,boolean) to anon,authenticated,service_role;
-- Preserve human scope changes and archives when the original seed is reimported.
create or replace function public.hrct_import_indicators(p_seed jsonb,p_write boolean default false) returns jsonb
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
        select commitment_uuid,id,l->>'role',r->>'measurement_rationale','general',jsonb_build_object('origin',p_seed->>'origin','version',p_seed->>'version','original',l) from public.indicators seed_catalog where seed_catalog.code=l->>'indicator_code'
          and not exists(select 1 from public.recommendation_indicators existing where existing.commitment_id=commitment_uuid and existing.indicator_id=seed_catalog.id)
        on conflict do nothing;
    end loop;
  end loop;
  return jsonb_build_object('errors',errors,'validated',true,'written',true,'inserted_indicators',inserted,'version',p_seed->>'version');
end $$;
revoke all on function public.hrct_import_indicators(jsonb,boolean) from public,anon,authenticated;
grant execute on function public.hrct_import_indicators(jsonb,boolean) to service_role;

commit;
