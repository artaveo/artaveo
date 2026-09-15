-- Migration: 0004_services_and_packages
-- Roadmap: § 12 "Data Model & Migrations" — core entities table, rows 6–10
-- ADR: docs/adr/ADR-001-bilingual-storage.md
--
-- Mirrors types/content.ts#Service, #ServicePackage, #ServiceAddon,
-- #FaqItem, #EngagementModel. `service_process_steps` is an addition beyond
-- the roadmap § 12 summary table — the live `Service.process:
-- ServiceProcessStep[]` field (a per-service process breakdown, distinct
-- from the sitewide `ProcessPhase` on `/process`) needs a home; recorded
-- here rather than silently folded into another table (principle 9: the
-- table must actually match the shape that exists in code today).
--
-- RLS: same "published = true" gating pattern as 0003. `faqs` has two
-- scopes: 'global' (always public) and 'service' (gated on the parent
-- service's published flag).
--
-- ROLLBACK:
--   drop table if exists public.faqs;
--   drop table if exists public.engagement_models;
--   drop table if exists public.service_technologies;
--   drop table if exists public.service_addons;
--   drop table if exists public.service_packages;
--   drop table if exists public.service_process_steps;
--   drop table if exists public.services;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  slug text not null unique,
  -- Proper-noun icon name (lucide-react), same convention as other icon fields in this schema.
  icon text not null,
  title jsonb not null check (title ? 'en' and title ? 'fa'),
  description jsonb not null check (description ? 'en' and description ? 'fa'),
  deliverables jsonb not null default '[]' check (jsonb_typeof(deliverables) = 'array'),

  type text check (type in ('productized', 'custom', 'productized-custom', 'monthly')),
  -- Roadmap § 12's table calls this field "promise"; the current Service
  -- type (types/content.ts) calls the equivalent field "tagline". Column
  -- named after the live code, same reasoning as projects.summary in 0003.
  tagline jsonb check (tagline is null or (tagline ? 'en' and tagline ? 'fa')),
  for_whom jsonb not null default '[]' check (jsonb_typeof(for_whom) = 'array'),
  not_for_whom jsonb not null default '[]' check (jsonb_typeof(not_for_whom) = 'array'),
  problem jsonb check (problem is null or (problem ? 'en' and problem ? 'fa')),
  what_i_do jsonb not null default '[]' check (jsonb_typeof(what_i_do) = 'array'),
  included jsonb not null default '[]' check (jsonb_typeof(included) = 'array'),
  not_included jsonb not null default '[]' check (jsonb_typeof(not_included) = 'array'),
  timeline jsonb check (timeline is null or (timeline ? 'en' and timeline ? 'fa')),
  requirements jsonb not null default '[]' check (jsonb_typeof(requirements) = 'array'),
  related_project_slugs text[] not null default '{}',
  what_drives_cost jsonb not null default '[]' check (jsonb_typeof(what_drives_cost) = 'array'),
  payment_schedule_note jsonb check (payment_schedule_note is null or (payment_schedule_note ? 'en' and payment_schedule_note ? 'fa')),

  published boolean not null default false,
  sort_order int not null default 0
);

create index if not exists services_published_idx on public.services (published);

alter table public.services enable row level security;
create policy "published services are publicly readable"
  on public.services for select
  to anon, authenticated
  using (published = true);

create table if not exists public.service_process_steps (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  title jsonb not null check (title ? 'en' and title ? 'fa'),
  description jsonb not null check (description ? 'en' and description ? 'fa'),
  sort_order int not null default 0
);

create index if not exists service_process_steps_service_id_idx on public.service_process_steps (service_id);

alter table public.service_process_steps enable row level security;
create policy "process steps of published services are publicly readable"
  on public.service_process_steps for select
  to anon, authenticated
  using (exists (
    select 1 from public.services s
    where s.id = service_process_steps.service_id and s.published = true
  ));

create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  -- Convention (types/content.ts#ServicePackage doc comment): tier 'custom'
  -- always means "scoped after discovery" — price_type is always 'quote'
  -- for that tier, delivery/revisions/support columns are left null rather
  -- than guessed.
  tier text not null check (tier in ('starter', 'standard', 'custom')),
  name jsonb not null check (name ? 'en' and name ? 'fa'),
  summary jsonb not null check (summary ? 'en' and summary ? 'fa'),
  for_whom jsonb not null check (for_whom ? 'en' and for_whom ? 'fa'),
  included jsonb not null default '[]' check (jsonb_typeof(included) = 'array'),
  not_included jsonb not null default '[]' check (jsonb_typeof(not_included) = 'array'),
  deliverables jsonb not null default '[]' check (jsonb_typeof(deliverables) = 'array'),
  delivery_days_min int,
  delivery_days_max int,
  revisions int,
  support_days int,
  requirements jsonb not null default '[]' check (jsonb_typeof(requirements) = 'array'),
  price_type text not null check (price_type in ('fixed', 'from', 'quote')),
  price_amount numeric,
  price_currency text,
  sort_order int not null default 0,

  unique (service_id, tier)
);

create index if not exists service_packages_service_id_idx on public.service_packages (service_id);

alter table public.service_packages enable row level security;
create policy "packages of published services are publicly readable"
  on public.service_packages for select
  to anon, authenticated
  using (exists (
    select 1 from public.services s
    where s.id = service_packages.service_id and s.published = true
  ));

create table if not exists public.service_addons (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  title jsonb not null check (title ? 'en' and title ? 'fa'),
  description jsonb not null check (description ? 'en' and description ? 'fa'),
  price_type text not null check (price_type in ('fixed', 'from', 'quote')),
  price_amount numeric,
  price_currency text,
  delivery_impact_days int,
  sort_order int not null default 0
);

create index if not exists service_addons_service_id_idx on public.service_addons (service_id);

alter table public.service_addons enable row level security;
create policy "add-ons of published services are publicly readable"
  on public.service_addons for select
  to anon, authenticated
  using (exists (
    select 1 from public.services s
    where s.id = service_addons.service_id and s.published = true
  ));

create table if not exists public.service_technologies (
  service_id uuid not null references public.services (id) on delete cascade,
  technology_id uuid not null references public.technologies (id) on delete cascade,
  primary key (service_id, technology_id)
);

alter table public.service_technologies enable row level security;
create policy "technology links of published services are publicly readable"
  on public.service_technologies for select
  to anon, authenticated
  using (exists (
    select 1 from public.services s
    where s.id = service_technologies.service_id and s.published = true
  ));

create table if not exists public.engagement_models (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title jsonb not null check (title ? 'en' and title ? 'fa'),
  when_it_fits jsonb not null check (when_it_fits ? 'en' and when_it_fits ? 'fa'),
  billing jsonb not null check (billing ? 'en' and billing ? 'fa'),
  published boolean not null default true,
  sort_order int not null default 0
);

alter table public.engagement_models enable row level security;
create policy "published engagement models are publicly readable"
  on public.engagement_models for select
  to anon, authenticated
  using (published = true);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global', 'service')),
  service_id uuid references public.services (id) on delete cascade,
  question jsonb not null check (question ? 'en' and question ? 'fa'),
  answer jsonb not null check (answer ? 'en' and answer ? 'fa'),
  sort_order int not null default 0,

  constraint faqs_service_scope_consistency check (
    (scope = 'service' and service_id is not null) or
    (scope = 'global' and service_id is null)
  )
);

create index if not exists faqs_service_id_idx on public.faqs (service_id);

alter table public.faqs enable row level security;
create policy "global faqs are publicly readable"
  on public.faqs for select
  to anon, authenticated
  using (scope = 'global');
create policy "faqs of published services are publicly readable"
  on public.faqs for select
  to anon, authenticated
  using (scope = 'service' and exists (
    select 1 from public.services s
    where s.id = faqs.service_id and s.published = true
  ));
