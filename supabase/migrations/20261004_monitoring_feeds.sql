-- RSS/Atom sources for the live tracker. Add, disable or correct a feed here; no deploy needed.
create table if not exists public.monitoring_feeds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  source_type text not null default 'news' check (source_type in ('news','official_web','un_body','civil_society')),
  -- false for feeds that also cover other countries: their items must mention Spain.
  spain_focused boolean not null default true,
  enabled boolean not null default true,
  last_fetched_at timestamptz,
  last_status text,
  last_item_count integer,
  created_at timestamptz not null default now()
);

alter table public.monitoring_feeds enable row level security;
revoke all on public.monitoring_feeds from anon, authenticated;

insert into public.monitoring_feeds (name, url, source_type, spain_focused) values
('La Moncloa — Consejo de Ministros', 'https://www.lamoncloa.gob.es/Paginas/rss.aspx?tipo=15', 'official_web', true),
('La Moncloa — Ministerios', 'https://www.lamoncloa.gob.es/Paginas/rss.aspx?tipo=2', 'official_web', true),
('La Moncloa — Presidente del Gobierno', 'https://www.lamoncloa.gob.es/Paginas/rss.aspx?tipo=1', 'official_web', true),
('Ministerio de Igualdad', 'https://www.igualdad.gob.es/feed/', 'official_web', true),
('Noticias ONU', 'https://news.un.org/feed/subscribe/es/news/all/rss.xml', 'un_body', false),
('Human Rights Watch', 'https://www.hrw.org/es/rss/news', 'civil_society', false),
('Amnistía Internacional España', 'https://www.es.amnesty.org/feed/', 'civil_society', false),
('Irídia', 'https://iridia.cat/feed/', 'civil_society', true),
('El País — España', 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/espana/portada', 'news', true),
('El País — Sociedad', 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/sociedad/portada', 'news', true),
('elDiario.es', 'https://www.eldiario.es/rss/', 'news', true),
('elDiario.es — Desalambre', 'https://www.eldiario.es/rss/desalambre/', 'news', true),
('Europa Press — Nacional', 'https://www.europapress.es/rss/rss.aspx?ch=00066', 'news', true),
('Europa Press — Sociedad', 'https://www.europapress.es/rss/rss.aspx?ch=00313', 'news', true),
('El Mundo — España', 'https://e00-elmundo.uecdn.es/elmundo/rss/espana.xml', 'news', true),
('ABC — España', 'https://www.abc.es/rss/2.0/espana/', 'news', true),
('La Vanguardia — Política', 'https://www.lavanguardia.com/rss/politica.xml', 'news', true),
('La Vanguardia — Vida', 'https://www.lavanguardia.com/rss/vida.xml', 'news', true),
('El Confidencial — España', 'https://rss.elconfidencial.com/espana/', 'news', true),
('20minutos — Nacional', 'https://www.20minutos.es/rss/nacional/', 'news', true),
('El Español', 'https://www.elespanol.com/rss/', 'news', true),
('infoLibre', 'https://www.infolibre.es/rss/', 'news', true),
('El Salto', 'https://www.elsaltodiario.com/general/feed', 'news', true),
('Maldita.es', 'https://maldita.es/feed/', 'news', true),
('Newtral', 'https://www.newtral.es/feed/', 'news', true)
on conflict (url) do nothing;

-- Number of sources, appended to the public status row.
create or replace view public.hrct_public_monitoring_status as
select
  (select max(finished_at) from public.monitoring_runs where status='success') as last_successful_run_at,
  (select count(*) from public.monitoring_runs where status='success' and started_at > now() - interval '24 hours') as runs_last_24h,
  (select count(*) from public.monitoring_profiles p join public.commitments c on c.id=p.commitment_id
    where p.enabled and c.publication_status='published') as recommendations_monitored,
  (select count(*) from public.monitoring_items mi join public.commitments c on c.id=mi.commitment_id
    where c.publication_status='published' and mi.is_public and mi.status <> 'rejected') as public_items,
  (select max(mi.discovered_at) from public.monitoring_items mi join public.commitments c on c.id=mi.commitment_id
    where c.publication_status='published' and mi.is_public and mi.status <> 'rejected') as last_item_discovered_at,
  (select count(*) from public.monitoring_feeds where enabled) as feeds_monitored;
