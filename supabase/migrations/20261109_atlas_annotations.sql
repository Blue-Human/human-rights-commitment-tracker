-- Human Rights Atlas: editorial annotations of Blue Human.
-- Workflow: draft -> in_review -> approved -> published -> archived (and back to draft from review).
-- Tables are private (RLS on, no policy for anon/authenticated); the admin panel writes with the
-- service role. Visitors read only published notes through atlas_public_annotations.

create table if not exists public.atlas_annotations (
  id uuid primary key default gen_random_uuid(),
  instrument_id text not null check (instrument_id ~ '^[a-z0-9-]+$'),
  article text,
  paragraph text,
  kind text not null check (kind in ('case_law_reference','institutional_interpretation','general_comment','documented_relation',
                                     'academic_note','editorial_comment','bibliography','documentary_correction')),
  title text not null check (length(title) between 3 and 300),
  body text not null check (length(body) >= 10),
  author_name text not null check (length(author_name) >= 2),
  sources jsonb not null default '[]'::jsonb,
  doc_references jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','in_review','approved','published','archived')),
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atlas_published_needs_approval check (status not in ('approved','published') or (approved_by is not null and approved_at is not null)),
  constraint atlas_published_needs_sources check (status <> 'published' or jsonb_array_length(sources) > 0)
);

create table if not exists public.atlas_annotation_versions (
  id bigint generated always as identity primary key,
  annotation_id uuid not null references public.atlas_annotations(id) on delete cascade,
  version integer not null,
  status text not null,
  snapshot jsonb not null,
  changed_by text,
  changed_at timestamptz not null default now()
);
create index if not exists atlas_annotation_versions_annotation on public.atlas_annotation_versions(annotation_id);
create index if not exists atlas_annotations_target on public.atlas_annotations(instrument_id, article);

alter table public.atlas_annotations enable row level security;
alter table public.atlas_annotation_versions enable row level security;
revoke all on public.atlas_annotations, public.atlas_annotation_versions from anon, authenticated;
grant select, insert, update on public.atlas_annotations to service_role;
grant select, insert on public.atlas_annotation_versions to service_role;

-- Allowed transitions, version number and history, enforced in the database.
create or replace function public.atlas_annotation_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.status <> old.status and not (
      (old.status = 'draft' and new.status = 'in_review') or
      (old.status = 'in_review' and new.status in ('draft','approved')) or
      (old.status = 'approved' and new.status in ('published','draft')) or
      (old.status = 'published' and new.status = 'archived') or
      (old.status = 'archived' and new.status = 'draft')) then
      raise exception 'Transición no permitida: % -> %', old.status, new.status;
    end if;
    -- Editing the content sends an approved or published note back to draft.
    if (new.title, new.body, new.kind, new.sources, new.doc_references) is distinct from (old.title, old.body, old.kind, old.sources, old.doc_references)
       and old.status in ('approved','published') and new.status = old.status then
      new.status := 'draft'; new.approved_by := null; new.approved_at := null;
    end if;
    if new.status = 'draft' then new.approved_by := null; new.approved_at := null; end if;
    if new.status = 'published' and old.status <> 'published' then new.published_at := now(); end if;
    new.version := old.version + 1;
    new.updated_at := now();
  elsif new.status <> 'draft' then
    raise exception 'Una anotación nueva empieza como borrador';
  end if;
  return new;
end $$;

create or replace function public.atlas_annotation_history() returns trigger language plpgsql set search_path = public as $$
begin
  insert into public.atlas_annotation_versions(annotation_id, version, status, snapshot, changed_by)
  values (new.id, new.version, new.status, to_jsonb(new), coalesce(new.approved_by, new.author_name));
  return new;
end $$;

drop trigger if exists atlas_annotation_guard on public.atlas_annotations;
create trigger atlas_annotation_guard before insert or update on public.atlas_annotations for each row execute function public.atlas_annotation_guard();
drop trigger if exists atlas_annotation_history on public.atlas_annotations;
create trigger atlas_annotation_history after insert or update on public.atlas_annotations for each row execute function public.atlas_annotation_history();

-- Public view: published notes only, without review metadata.
create or replace view public.atlas_public_annotations as
  select id, instrument_id, article, paragraph, kind, title, body, author_name, sources, doc_references,
         created_at, published_at, updated_at, version
  from public.atlas_annotations where status = 'published';
grant select on public.atlas_public_annotations to anon, authenticated;
