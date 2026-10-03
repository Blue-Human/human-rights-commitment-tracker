create table if not exists public.human_security_dimensions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0
);

create table if not exists public.commitment_human_security (
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  dimension_id uuid not null references public.human_security_dimensions(id) on delete cascade,
  is_primary boolean not null default false,
  rationale text,
  created_at timestamptz not null default now(),
  primary key (commitment_id, dimension_id)
);

create table if not exists public.monitoring_profiles (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null unique references public.commitments(id) on delete cascade,
  enabled boolean not null default true,
  news_query text not null,
  implementation_query text,
  boe_query text,
  language text not null default 'es',
  lookback_days integer not null default 7,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monitoring_items (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  kind text not null check (kind in ('need_context','implementation_candidate','legal_change','statement','news')),
  relation text not null check (relation in ('supports_need','supports_progress','contradicts_progress','context')),
  title text not null,
  url text not null,
  publisher text,
  source_domain text,
  source_type text not null default 'news',
  published_at timestamptz,
  summary text,
  excerpt text,
  relevance_score numeric(4,3) not null default 0.700,
  status text not null default 'auto' check (status in ('auto','reviewed','rejected')),
  is_public boolean not null default false,
  discovered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (commitment_id, url)
);

create table if not exists public.monitoring_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  profiles_processed integer not null default 0,
  items_found integer not null default 0,
  items_inserted integer not null default 0,
  status text not null default 'running',
  error text
);

insert into public.human_security_dimensions (code,name,description,sort_order) values
('economic','Economic security','Protection from persistent poverty, livelihood insecurity and severe economic deprivation.',1),
('food','Food security','Reliable physical and economic access to basic food.',2),
('health','Health security','Protection from disease, unhealthy lifestyles and inadequate access to health protection.',3),
('environmental','Environmental security','Protection from environmental degradation and environmental threats to human life and wellbeing.',4),
('personal','Personal security','Protection from physical violence, abuse, crime and other direct threats to personal safety.',5),
('community','Community security','Protection of cultural identity, social cohesion, minority communities and people from sectarian or communal violence and discrimination.',6),
('political','Political security','Protection of basic human rights, civil liberties and freedom from political repression or institutional abuse.',7)
on conflict (code) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order;

alter table public.human_security_dimensions enable row level security;
alter table public.commitment_human_security enable row level security;
alter table public.monitoring_profiles enable row level security;
alter table public.monitoring_items enable row level security;
alter table public.monitoring_runs enable row level security;

drop policy if exists human_security_public_read on public.human_security_dimensions;
create policy human_security_public_read on public.human_security_dimensions for select using (true);
drop policy if exists commitment_human_security_public_read on public.commitment_human_security;
create policy commitment_human_security_public_read on public.commitment_human_security for select using (exists (select 1 from public.commitments c where c.id=commitment_id and c.publication_status='published'));
drop policy if exists monitoring_items_public_read on public.monitoring_items;
create policy monitoring_items_public_read on public.monitoring_items for select using (is_public = true and status <> 'rejected');

create or replace view public.hrct_public_human_security as
select c.public_id, d.code, d.name, d.description, chs.is_primary, chs.rationale
from public.commitment_human_security chs
join public.commitments c on c.id=chs.commitment_id
join public.human_security_dimensions d on d.id=chs.dimension_id
where c.publication_status='published';

create or replace view public.hrct_public_monitoring as
select c.public_id, mi.id, mi.kind, mi.relation, mi.title, mi.url, mi.publisher, mi.source_domain, mi.source_type,
       mi.published_at, mi.summary, mi.excerpt, mi.relevance_score, mi.status, mi.discovered_at
from public.monitoring_items mi
join public.commitments c on c.id=mi.commitment_id
where c.publication_status='published' and mi.is_public=true and mi.status <> 'rejected';

grant select on public.hrct_public_human_security to anon, authenticated;
grant select on public.hrct_public_monitoring to anon, authenticated;
