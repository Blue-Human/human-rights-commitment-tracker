-- Public monitoring view: neutral field names, and unreviewed items drop out of the public
-- lists after 90 days so the pages do not accumulate stale news. Reviewed items stay.
drop view if exists public.hrct_public_monitoring;

create view public.hrct_public_monitoring with (security_invoker = true) as
select c.public_id, mi.id, mi.kind, mi.relation, mi.title, mi.url, mi.publisher, mi.source_domain, mi.source_type,
       mi.published_at, mi.summary, mi.excerpt, mi.relevance_score, mi.status, mi.discovered_at,
       mi.last_seen_at, mi.connector, mi.classification, mi.classification_note as note
from public.monitoring_items mi
join public.commitments c on c.id=mi.commitment_id
where c.publication_status='published' and mi.is_public=true and mi.status <> 'rejected'
  and (mi.status='reviewed' or coalesce(mi.published_at, mi.discovered_at) > now() - interval '90 days');

grant select on public.hrct_public_monitoring to anon, authenticated;

-- Which tool or person classified an item is internal.
revoke select (classifier) on public.monitoring_items from anon, authenticated;
