-- Blue Human can mark recommendations as priorities so that the public site highlights them.
-- The flag is managed from the admin panel and says nothing about compliance.

alter table public.commitments add column if not exists is_priority boolean not null default false;

-- Public roles read commitments through column grants.
grant select (is_priority) on public.commitments to anon, authenticated;

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
    a.provisional as assessment_provisional,
    c.is_priority
   from public.commitments c
     join public.countries co on co.id = c.country_id
     join public.mechanisms m on m.id = c.mechanism_id
     left join public.sources s on s.id = c.source_id
     left join public.assessments a on a.commitment_id = c.id and a.is_current = true and a.is_public = true
     left join public.methodology_versions mv on mv.id = a.methodology_version_id
  where c.publication_status = 'published';

-- Initial selection of 14 priorities, chosen for the severity of the harm at stake, how pressing
-- the issue is in Spain and how concrete the requested measure is. Applied only while nothing
-- is marked, so running this again keeps the choices made later in the admin panel.
update public.commitments set is_priority = true
where public_id in (
  'ESP-UPR4-050.27',  -- perfiles raciales en los controles de identidad
  'ESP-UPR4-050.62',  -- no devolución y devoluciones colectivas
  'ESP-UPR4-050.63',  -- régimen de incomunicación y aislamiento
  'ESP-UPR4-050.79',  -- Ley Orgánica de Protección de la Seguridad Ciudadana
  'ESP-UPR4-050.95',  -- Ley Orgánica Integral contra la Trata
  'ESP-UPR4-050.137', -- crisis de la vivienda y parque público
  'ESP-UPR4-050.142', -- pobreza infantil y prestación universal por hijo a cargo
  'ESP-UPR4-050.146', -- Ley Orgánica 1/2023 en todas las regiones
  'ESP-UPR4-050.152', -- universalidad del Sistema Nacional de Salud
  'ESP-UPR4-050.157', -- salud mental de niños y adolescentes
  'ESP-UPR4-050.176', -- riesgo de catástrofes y alerta temprana
  'ESP-UPR4-050.218', -- muertes de mujeres a manos de parejas y exparejas
  'ESP-UPR4-050.252', -- reubicación de menores no acompañados
  'ESP-UPR4-050.277'  -- segregación educativa del alumnado con discapacidad
) and not exists (select 1 from public.commitments where is_priority);
