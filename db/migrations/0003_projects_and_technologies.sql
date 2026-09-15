-- Migration: 0003_projects_and_technologies
-- Roadmap: § 12 "Data Model & Migrations" — core entities table, row 1–5
-- ADR: docs/adr/ADR-001-bilingual-storage.md (jsonb localized-value columns)
--
-- Mirrors types/content.ts#Project and #TechCategory's `items` (proper-noun
-- technology names). The case-study body (`context`, `problemAndGoals`,
-- `constraints`, `architecture`, `keyDecisions`, `engineeringHighlight`,
-- `dataIntegrityAndSecurity`, `responsiveAndRtl`, `quality`,
-- `currentStatusAndNext`, `lessonsLearned`) is normalized into
-- `project_sections` per the roadmap's own § 12 table ("project_sections |
-- projectId, type (context, problem, architecture, decision, highlight…),
-- body*, sortOrder") rather than kept as flat columns — this is the
-- restructuring principle 9 anticipated ("no rewrites at Phase 12" refers
-- to the shape components read, not the storage layout underneath it; the
-- Phase 12.2 selector layer reassembles the flat `Project` shape from these
-- rows before it reaches a component).
--
-- `project_sections.body` is `jsonb` for every type: a plain
-- `{en, fa}` object for the nine singular prose sections (one row each,
-- `sort_order` fixed at 0), a `{en, fa}` object per row for `constraint`
-- (one row per bullet, ordered by `sort_order`), and a
-- `{context: {en,fa}, decision: {en,fa}, tradeoff: {en,fa}}` object per row
-- for `key-decision` (one row per decision record, ordered by
-- `sort_order`) — this one `type` + `body jsonb` + `sort_order` shape
-- covers every case in `types/content.ts#Project` without a separate table
-- per field.
--
-- RLS: § 12 — "public reads only for published = true rows; writes only
-- through server code". `technologies` has no publish concept (it is a
-- curated stack list, always public, same as it is today in
-- `lib/home-content.ts#getTechStack`), so it gets an unconditional public
-- select policy. `project_sections`, `project_media` and
-- `project_technologies` gate through their parent `projects.published`.
--
-- ROLLBACK:
--   drop table if exists public.project_technologies;
--   drop table if exists public.project_media;
--   drop table if exists public.project_sections;
--   drop table if exists public.projects;
--   drop table if exists public.technologies;

create table if not exists public.technologies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text not null unique,
  -- Proper noun — never translated (types/content.ts#Project.technologies doc comment).
  name text not null,
  category text not null,
  learning boolean not null default false
);

alter table public.technologies enable row level security;
create policy "technologies are publicly readable"
  on public.technologies for select
  to anon, authenticated
  using (true);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  slug text not null unique,
  title jsonb not null check (title ? 'en' and title ? 'fa'),
  category jsonb not null check (category ? 'en' and category ? 'fa'),
  -- Roadmap § 12's table calls this field "excerpt"; the current
  -- Project type (types/content.ts) calls the equivalent field "summary".
  -- Column named after the live code, per principle 9 — see
  -- docs/phases/PHASE-12-README.md's "Schema notes" for the mapping.
  summary jsonb not null check (summary ? 'en' and summary ? 'fa'),
  highlights jsonb not null default '[]' check (jsonb_typeof(highlights) = 'array'),

  status text check (status in ('live', 'in-development', 'private', 'archived', 'concept')),
  cover_image text,
  github_url text,
  live_url text,
  year text,
  role jsonb check (role is null or (role ? 'en' and role ? 'fa')),
  related_service_slug text,

  featured boolean not null default false,
  published boolean not null default false,
  sort_order int not null default 0
);

create index if not exists projects_published_idx on public.projects (published);
create index if not exists projects_featured_idx on public.projects (featured);

alter table public.projects enable row level security;
create policy "published projects are publicly readable"
  on public.projects for select
  to anon, authenticated
  using (published = true);

create table if not exists public.project_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- Closed vocabulary mirroring types/content.ts#Project's optional
  -- case-study fields, plus 'constraint' and 'key-decision' for the two
  -- array-shaped fields (one row per array item).
  type text not null check (type in (
    'context', 'problem-and-goals', 'constraint', 'architecture',
    'key-decision', 'engineering-highlight', 'data-integrity-and-security',
    'responsive-and-rtl', 'quality', 'current-status-and-next', 'lessons-learned'
  )),
  body jsonb not null,
  sort_order int not null default 0
);

create index if not exists project_sections_project_id_idx on public.project_sections (project_id);

alter table public.project_sections enable row level security;
create policy "sections of published projects are publicly readable"
  on public.project_sections for select
  to anon, authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = project_sections.project_id and p.published = true
  ));

create table if not exists public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  media_id uuid, -- references public.media_assets(id), added as a foreign key in 0007 once that table exists
  kind text not null check (kind in ('desktop', 'mobile', 'diagram')),
  caption jsonb check (caption is null or (caption ? 'en' and caption ? 'fa')),
  sort_order int not null default 0
);

create index if not exists project_media_project_id_idx on public.project_media (project_id);

alter table public.project_media enable row level security;
create policy "media of published projects are publicly readable"
  on public.project_media for select
  to anon, authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = project_media.project_id and p.published = true
  ));

create table if not exists public.project_technologies (
  project_id uuid not null references public.projects (id) on delete cascade,
  technology_id uuid not null references public.technologies (id) on delete cascade,
  primary key (project_id, technology_id)
);

alter table public.project_technologies enable row level security;
create policy "technology links of published projects are publicly readable"
  on public.project_technologies for select
  to anon, authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = project_technologies.project_id and p.published = true
  ));
