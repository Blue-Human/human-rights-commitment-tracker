-- Tighten what the public (anon / authenticated) roles can reach directly.
-- The public site reads only the hrct_public_* views; none of this changes their output.

-- 1. Internal workflow columns of commitments (approver name, Jira keys, review state)
--    are readable for published rows. Public roles keep the descriptive columns only.
revoke select on public.commitments from anon, authenticated;
grant select (
  id, public_id, country_id, mechanism_id, source_id, title, original_text, normalized_summary,
  recommendation_number, acceptance_status, legal_character, commitment_date, deadline,
  original_language, publication_status, published_at, created_at, updated_at
) on public.commitments to anon, authenticated;

-- 2. Automated-triage notes on monitoring items are internal.
revoke select on public.monitoring_items from anon, authenticated;
grant select (
  id, commitment_id, kind, relation, title, url, publisher, source_domain, source_type, published_at,
  summary, excerpt, relevance_score, status, is_public, discovered_at, last_seen_at, connector, classifier
) on public.monitoring_items to anon, authenticated;

-- 3. Tables and views created after the initial schema inherited full default privileges.
--    RLS already blocks writes; remove the grants as well.
revoke insert, update, delete, truncate, references, trigger on
  public.commitment_human_security, public.human_security_dimensions,
  public.monitoring_items, public.monitoring_profiles, public.monitoring_runs,
  public.hrct_public_commitments, public.hrct_public_evidence, public.hrct_public_assessment_history,
  public.hrct_public_human_security, public.hrct_public_monitoring,
  public.hrct_public_monitoring_status, public.hrct_public_monitoring_coverage
from anon, authenticated;
revoke select on public.monitoring_profiles, public.monitoring_runs from anon, authenticated;

-- 4. These two views only read rows the caller may already read under RLS, so they
--    can run with the caller's rights like the other hrct_public_* views.
alter view public.hrct_public_monitoring set (security_invoker = true);
alter view public.hrct_public_human_security set (security_invoker = true);

-- hrct_public_monitoring_status and hrct_public_monitoring_coverage stay owner-rights on
-- purpose: they publish aggregates and scan times from tables the public cannot read.
