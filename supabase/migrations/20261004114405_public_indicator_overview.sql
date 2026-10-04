begin;
-- Reuse the public recommendation contract and its RLS; no service credentials
-- or private editorial fields in this country-level view.
create function public.hrct_public_indicator_overview(p_all_history boolean default false) returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
with eligible as (
  select distinct l.indicator_id,l.component_id,l.scope,c.id commitment_id,c.public_id,l.role
  from public.recommendation_indicators l join public.commitments c on c.id=l.commitment_id
  join public.countries co on co.id=c.country_id
  where co.iso2='ES' and c.publication_status='published' and c.public_id not ilike '%TEST%' and l.editorial_status='published'
), points as (
  select v.id,v.indicator_id,v.component_id,v.scope,v.period_start,v.period_end from public.indicator_values v
  where v.country_iso2='ES' and v.editorial_status='published' and v.is_current
  and exists(select 1 from eligible e where e.indicator_id=v.indicator_id and (e.component_id is null or e.component_id=v.component_id) and v.scope @> e.scope)
), measured_links as (
  select e.* from eligible e where exists(select 1 from points v where v.indicator_id=e.indicator_id and (e.component_id is null or e.component_id=v.component_id) and v.scope @> e.scope)
), samples as (
  select distinct on(indicator_id) indicator_id,public_id from measured_links
  order by indicator_id,case role when 'primary' then 0 else 1 end,public_id
)
select jsonb_build_object(
  'observation_count',(select count(*) from points),
  'indicator_count',(select count(distinct indicator_id) from points),
  'recommendation_count',(select count(distinct commitment_id) from measured_links),
  'first_period',(select min(period_start) from points),
  'last_period',(select max(period_end) from points),
  'cards',coalesce((select jsonb_agg(jsonb_build_object('indicator_id',s.indicator_id,'public_id',s.public_id,'bundle',public.hrct_public_indicators(s.public_id,p_all_history)) order by s.public_id) from samples s),'[]'::jsonb)
) $$;
revoke all on function public.hrct_public_indicator_overview(boolean) from public;
grant execute on function public.hrct_public_indicator_overview(boolean) to anon,authenticated,service_role;
commit;
