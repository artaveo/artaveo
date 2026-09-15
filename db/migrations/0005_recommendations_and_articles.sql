-- Migration: 0005_recommendations_and_articles
-- Roadmap: § 12 "Data Model & Migrations" — core entities table, rows 11–12
-- ADR: docs/adr/ADR-001-bilingual-storage.md
--
-- `recommendations` powers Phase 16 (Verified Evidence) — moderation
-- queue: pending -> approved | rejected, only 'approved' rows are public.
-- `articles` powers Phase 17 (Insights). Neither phase has started; these
-- tables are created empty now (principle 9 — the schema exists ahead of
-- the CMS that will populate it, same relationship § 12 already has with
-- Phase 15). `articles.category` stays an inline `jsonb` field, matching
-- the current `ArticlePreview.category: LocalizedText` — no separate
-- categories table, since nothing in the live code normalizes categories
-- yet; a real multi-category taxonomy is a Phase 17 concern, not invented
-- here ahead of need.
--
-- RLS: `recommendations` — public select only for status = 'approved'
-- (§ 16 "Verified Evidence" — meaning is never edited without consent, and
-- nothing unapproved is ever shown). `articles` — public select only for
-- status = 'published'.
--
-- ROLLBACK:
--   drop table if exists public.articles;
--   drop table if exists public.recommendations;

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  person_name text not null,
  person_title text,
  company text,
  relationship text not null,
  statement jsonb not null check (statement ? 'en' and statement ? 'fa'),
  recommendation_date date,
  source_url text,
  -- Roadmap § 16 "verification labels shown publicly: Submitted via
  -- verified request · Linked to platform review · Linked public profile".
  verification text check (verification in ('verified-request', 'platform-review', 'public-profile')),
  related_project_id uuid references public.projects (id) on delete set null,

  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  sort_order int not null default 0
);

create index if not exists recommendations_status_idx on public.recommendations (status);

alter table public.recommendations enable row level security;
create policy "approved recommendations are publicly readable"
  on public.recommendations for select
  to anon, authenticated
  using (status = 'approved');

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  slug text not null unique,
  title jsonb not null check (title ? 'en' and title ? 'fa'),
  excerpt jsonb not null check (excerpt ? 'en' and excerpt ? 'fa'),
  body jsonb not null check (body ? 'en' and body ? 'fa'),
  category jsonb check (category is null or (category ? 'en' and category ? 'fa')),

  status text not null default 'draft' check (status in ('draft', 'review', 'scheduled', 'published', 'archived')),
  published_at timestamptz,
  reading_time_minutes int,
  sort_order int not null default 0
);

create index if not exists articles_status_idx on public.articles (status);
create index if not exists articles_published_at_idx on public.articles (published_at desc);

alter table public.articles enable row level security;
create policy "published articles are publicly readable"
  on public.articles for select
  to anon, authenticated
  using (status = 'published');
