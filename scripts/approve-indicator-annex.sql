-- One-time editorial publication authorized explicitly by the HRCT owner in
-- the Codex conversation on 2026-10-04. Does not publish or invent measurements.
-- Run with service_role/administrative database access on the existing HRCT project.
begin;
do $$
declare
  approval_time timestamptz := now();
  approval_actor text := 'Responsable de HRCT · aprobación explícita';
  approval jsonb;
begin
  -- Lock the exact imported edition. A repeated execution is a no-op.
  perform 1 from public.indicators where import_metadata->>'version'='spain-upr4-v1' for update;
  perform 1 from public.recommendation_indicator_requirements where import_metadata->>'version'='spain-upr4-v1' for update;
  perform 1 from public.recommendation_indicators where import_metadata->>'version'='spain-upr4-v1' for update;
  perform 1 from public.indicator_components c join public.indicators i on i.id=c.indicator_id where i.import_metadata->>'version'='spain-upr4-v1' for update of c;

  if (select count(*) from public.indicators where import_metadata->>'version'='spain-upr4-v1' and import_metadata->>'origin'='HRCT_Spain_UPR4_indicator_system.xlsx' and active and editorial_status in ('proposed','published'))<>98
    or (select count(*) from public.indicator_components c join public.indicators i on i.id=c.indicator_id where i.import_metadata->>'version'='spain-upr4-v1' and c.editorial_status in ('proposed','published'))<>149
    or (select count(*) from public.recommendation_indicator_requirements r join public.commitments c on c.id=r.commitment_id join public.countries co on co.id=c.country_id join public.mechanisms m on m.id=c.mechanism_id join public.sources s on s.id=c.source_id where r.import_metadata->>'version'='spain-upr4-v1' and r.import_metadata->>'origin'='HRCT_Spain_UPR4_indicator_system.xlsx' and co.iso2='ES' and m.code='UPR' and s.document_reference='A/HRC/60/8' and c.publication_status='published' and c.public_id not ilike '%TEST%')<>324
    or (select count(*) from public.recommendation_indicators l join public.recommendation_indicator_requirements r on r.commitment_id=l.commitment_id join public.indicators i on i.id=l.indicator_id where l.import_metadata->>'version'='spain-upr4-v1' and l.import_metadata->>'origin'='HRCT_Spain_UPR4_indicator_system.xlsx' and r.import_metadata->>'version'='spain-upr4-v1' and i.import_metadata->>'version'='spain-upr4-v1' and l.editorial_status in ('proposed','published'))<>428 then
    raise exception 'The approved annex must contain exactly 98 active indicators, 149 components, 324 published recommendations and 428 active assignments';
  end if;

  approval := jsonb_build_object('approved_by',approval_actor,'approved_at',approval_time,
    'basis','Aprobación editorial explícita del responsable de HRCT en la conversación de Codex del 4 de octubre de 2026.',
    'scope','Catálogo, componentes, aplicabilidad y asignaciones de spain-upr4-v1; no incluye observaciones, baseline ni metas.');

  update public.indicators set editorial_status='published',reviewed_by=approval_actor,reviewed_at=approval_time,updated_at=approval_time,
    methodology=coalesce(nullif(methodology,''),'Sistema de indicadores de España · EPU, cuarto ciclo · Anexo spain-upr4-v1. Catálogo y asignaciones aprobados por el responsable de HRCT el 4 de octubre de 2026. Cada componente conserva su unidad y las poblaciones y territorios se consultan por separado.'),
    import_metadata=import_metadata||jsonb_build_object('approval',approval)
    where import_metadata->>'version'='spain-upr4-v1' and import_metadata->>'origin'='HRCT_Spain_UPR4_indicator_system.xlsx' and editorial_status='proposed' and active;

  update public.indicator_components c set editorial_status='published',
    definition=case when c.definition like 'Propuesta de componente (%' then i.description||' Este componente se expresa en '||c.unit||'.' else c.definition end
    from public.indicators i where i.id=c.indicator_id and i.import_metadata->>'version'='spain-upr4-v1' and i.import_metadata->>'origin'='HRCT_Spain_UPR4_indicator_system.xlsx' and c.editorial_status='proposed';

  update public.recommendation_indicator_requirements set editorial_status='published',reviewed_by=approval_actor,reviewed_at=approval_time,updated_at=approval_time,
    import_metadata=import_metadata||jsonb_build_object('approval',approval)
    where import_metadata->>'version'='spain-upr4-v1' and import_metadata->>'origin'='HRCT_Spain_UPR4_indicator_system.xlsx' and editorial_status='proposed';

  update public.recommendation_indicators set editorial_status='published',reviewed_by=approval_actor,reviewed_at=approval_time,updated_at=approval_time,
    import_metadata=import_metadata||jsonb_build_object('approval',approval)
    where import_metadata->>'version'='spain-upr4-v1' and import_metadata->>'origin'='HRCT_Spain_UPR4_indicator_system.xlsx' and editorial_status='proposed';
end $$;
commit;
