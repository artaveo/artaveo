-- Migration: 0016_insights
-- Roadmap: Phase 17 "Insights / Engineering Journal"
--
-- `articles` itself already exists (0005) with the full status enum
-- (draft · review · scheduled · published · archived) and Phase 15
-- shipped the admin CRUD for it. What Phase 17 adds to the schema is
-- only what the public journal genuinely needs and 0005 did not have:
--
-- 1. Related projects / services / articles — three small join tables,
--    same shape as `project_technologies` (composite primary key, one
--    covering index for the *other* column, RLS enabled with no policy:
--    they are read and written only through server code, so there is
--    nothing for `anon` to select — the same trust model `inquiries` and
--    `recommendation_requests` already use).
--
--    `article_related` is stored symmetrically by the admin action
--    (A→B and B→A are always written together), so a "related articles"
--    read never has to union two directions and an article's related set
--    is the same from either side.
--
-- 2. `scheduled` must mean something. Until now a row could sit in
--    `scheduled` with no date — nothing could ever act on it. The check
--    below makes "scheduled ⇒ published_at is not null" a database rule.
--    It is added NOT VALID on purpose: it is enforced for every new or
--    updated row from now on, but does not fail the migration if an old
--    hand-made row somehow violates it. (Run
--    `alter table public.articles validate constraint
--    articles_scheduled_requires_date;` once you have confirmed there are
--    none — expected: the table is empty.)
--
--    The partial index makes the daily "publish what is due" sweep
--    (`lib/insights-scheduler.ts`) a cheap index scan even once the
--    table grows.
--
-- 3. `articles.updated_at` had no touch trigger (0011 covered `services`
--    and `engagement_models` only), so `updated_at` never moved after
--    insert. It now feeds `dateModified` in structured data and
--    `lastModified` in the sitemap, so it has to be real. Reuses
--    `public.set_updated_at()` from 0011 (search_path pinned in 0011b).
--
-- `articles.reading_time_minutes` is left in place but is no longer read
-- or written: reading time is computed per locale from the body at read
-- time (`lib/articles/reading-time.ts`), so it can never go stale and
-- can differ between `en` and `fa`. Dropping the column is a separate,
-- destructive step and is deliberately not taken here.
--
-- ROLLBACK:
--   drop trigger if exists set_articles_updated_at on public.articles;
--   drop index if exists public.articles_scheduled_due_idx;
--   alter table public.articles drop constraint if exists articles_scheduled_requires_date;
--   drop table if exists public.article_related;
--   drop table if exists public.article_services;
--   drop table if exists public.article_projects;

alter table public.articles
  add constraint articles_scheduled_requires_date
  check (status <> 'scheduled' or published_at is not null) not valid;

create index if not exists articles_scheduled_due_idx
  on public.articles (published_at)
  where status = 'scheduled';

create trigger set_articles_updated_at
  before update on public.articles
  for each row
  execute function public.set_updated_at();

create table if not exists public.article_projects (
  article_id uuid not null references public.articles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  sort_order int not null default 0,
  primary key (article_id, project_id)
);
create index if not exists article_projects_project_id_idx on public.article_projects (project_id);
alter table public.article_projects enable row level security;

create table if not exists public.article_services (
  article_id uuid not null references public.articles (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  sort_order int not null default 0,
  primary key (article_id, service_id)
);
create index if not exists article_services_service_id_idx on public.article_services (service_id);
alter table public.article_services enable row level security;

create table if not exists public.article_related (
  article_id uuid not null references public.articles (id) on delete cascade,
  related_article_id uuid not null references public.articles (id) on delete cascade,
  primary key (article_id, related_article_id),
  check (article_id <> related_article_id)
);
create index if not exists article_related_related_article_id_idx on public.article_related (related_article_id);
alter table public.article_related enable row level security;
