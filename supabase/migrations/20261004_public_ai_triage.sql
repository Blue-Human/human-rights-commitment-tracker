-- Show the automated triage of public monitoring items: which channel the classifier
-- chose and its one-sentence reason. Only rows already public are exposed.
grant select (classification, classification_note) on public.monitoring_items to anon, authenticated;

create or replace view public.hrct_public_monitoring with (security_invoker = true) as
select c.public_id, mi.id, mi.kind, mi.relation, mi.title, mi.url, mi.publisher, mi.source_domain, mi.source_type,
       mi.published_at, mi.summary, mi.excerpt, mi.relevance_score, mi.status, mi.discovered_at,
       mi.last_seen_at, mi.connector, (mi.classifier is not null) as ai_classified,
       mi.classification, mi.classification_note as ai_note
from public.monitoring_items mi
join public.commitments c on c.id=mi.commitment_id
where c.publication_status='published' and mi.is_public=true and mi.status <> 'rejected';
