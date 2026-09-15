-- Migration: 0007_media_settings_and_navigation
-- Roadmap: § 12 "Data Model & Migrations" — core entities table, rows 15–17
-- ADR: docs/adr/ADR-001-bilingual-storage.md
--
-- `media_assets` backs Phase 15's upload pipeline; `project_media.media_id`
-- (0003) now gets its real foreign key. `site_settings` is a singleton
-- table (enforced by the `id boolean primary key default true` + check
-- pattern below) holding the availability/response-commitment/profile data
-- that is genuinely public today (rendered on every page via the
-- Availability Card, D-08) — seeded from the current
-- `lib/home-content.ts#getDeveloperProfile().availability` and
-- `lib/about-content.ts#getWorkingLanguages()` /
-- `lib/site.ts#socialLinks` values so the seed itself is not invented
-- content, just today's real values in a new location. `navigation_items`
-- is seeded from `lib/site.ts#mainNav`/`utilityNav`/`legalNav` the same
-- way. `redirects` is created empty — nothing redirects yet.
--
-- RLS: `site_settings` and `navigation_items` are public-facing structural
-- data with no draft/publish concept (same reasoning as `technologies` in
-- 0003) — unconditional public select. `media_assets` and `redirects` have
-- no public read need yet (media is only ever reached through
-- `project_media`/`articles`, which already carry their own gated
-- policies; redirects are resolved server-side) — no public policies,
-- service-role only, same default as 0001.
--
-- ROLLBACK:
--   drop table if exists public.redirects;
--   drop table if exists public.navigation_items;
--   drop table if exists public.site_settings;
--   alter table public.project_media drop constraint if exists project_media_media_id_fkey;
--   drop table if exists public.media_assets;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  url text not null,
  alt jsonb check (alt is null or (alt ? 'en' and alt ? 'fa')),
  width int,
  height int,
  type text,
  size_bytes int,
  focal_x numeric,
  focal_y numeric
);

alter table public.media_assets enable row level security;
-- No policies created — service_role only (see header note).

alter table public.project_media
  add constraint project_media_media_id_fkey
  foreign key (media_id) references public.media_assets (id) on delete set null;

create table if not exists public.site_settings (
  -- Singleton row pattern: `id` can only ever be `true`, so a second
  -- `insert` collides with the primary key instead of creating a second
  -- row.
  id boolean primary key default true check (id),
  updated_at timestamptz not null default now(),

  availability_state text not null check (availability_state in ('available', 'limited', 'unavailable')),
  next_opening date,
  response_commitment jsonb not null check (response_commitment ? 'en' and response_commitment ? 'fa'),
  timezone text not null,
  -- jsonb array of { name: {en,fa}, note: {en,fa} } — types/content.ts#WorkingLanguage.
  languages jsonb not null default '[]' check (jsonb_typeof(languages) = 'array'),
  -- jsonb array of { href, label } — lib/site.ts#socialLinks (proper nouns, not translated).
  external_profiles jsonb not null default '[]' check (jsonb_typeof(external_profiles) = 'array')
);

alter table public.site_settings enable row level security;
create policy "site settings are publicly readable"
  on public.site_settings for select
  to anon, authenticated
  using (true);

-- Seed: today's real, owner-confirmed values (D-08, D-02, D-05) — not
-- placeholder or invented content.
insert into public.site_settings (
  id, availability_state, response_commitment, timezone, languages, external_profiles
) values (
  true,
  'available',
  jsonb_build_object(
    'en', 'Replies within a few hours, same day.',
    'fa', 'در همان روز و ظرف چند ساعت پاسخ داده می‌شود.'
  ),
  'UTC',
  jsonb_build_array(
    jsonb_build_object(
      'name', jsonb_build_object('en', 'Dari / Persian', 'fa', 'دری / فارسی'),
      'note', jsonb_build_object(
        'en', 'Artaveo''s Persian content is written directly, not machine-translated.',
        'fa', 'محتوای فارسی آرتاویو مستقیم نوشته می‌شود، نه ترجمه‌ی ماشینی.'
      )
    ),
    jsonb_build_object(
      'name', jsonb_build_object('en', 'English', 'fa', 'انگلیسی'),
      'note', jsonb_build_object(
        'en', 'Used for code, documentation, and every English page of this site.',
        'fa', 'برای کد، مستندات و تمام صفحات انگلیسی این سایت استفاده می‌شود.'
      )
    )
  ),
  jsonb_build_array(
    jsonb_build_object('href', 'https://github.com/artaveo', 'label', 'GitHub'),
    jsonb_build_object('href', 'https://www.linkedin.com/in/artaveodevelops', 'label', 'LinkedIn'),
    jsonb_build_object('href', 'https://www.fiverr.com/zakir_naseri', 'label', 'Fiverr'),
    jsonb_build_object('href', 'https://wa.me/93790685832', 'label', 'WhatsApp')
  )
)
on conflict (id) do nothing;

create table if not exists public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  -- Matches lib/site.ts#NavKey today; extend this check when a new nav key is added there.
  key text not null unique check (key in (
    'home', 'work', 'services', 'process', 'about', 'insights',
    'designSystem', 'contact', 'start', 'privacy', 'terms'
  )),
  href text not null,
  surfaces text[] not null default '{header,footer,mobile,command-palette}',
  has_description boolean not null default false,
  -- Same hiding rule as lib/site.ts#NavItem.hasContent (§ 5.2).
  has_content boolean not null default true,
  sort_order int not null default 0
);

alter table public.navigation_items enable row level security;
create policy "navigation items are publicly readable"
  on public.navigation_items for select
  to anon, authenticated
  using (true);

insert into public.navigation_items (key, href, surfaces, has_description, has_content, sort_order) values
  ('home', '/', '{header,footer,mobile,command-palette}', false, true, 0),
  ('work', '/work', '{header,footer,mobile,command-palette}', true, true, 1),
  ('services', '/services', '{header,footer,mobile,command-palette}', true, true, 2),
  ('process', '/process', '{header,footer,mobile,command-palette}', true, true, 3),
  ('about', '/about', '{header,footer,mobile,command-palette}', true, true, 4),
  ('insights', '/insights', '{header,footer,mobile,command-palette}', true, false, 5),
  ('designSystem', '/design-system', '{footer,command-palette}', false, true, 6),
  ('contact', '/contact', '{footer,command-palette}', false, true, 7),
  ('start', '/start', '{command-palette}', false, true, 8),
  ('privacy', '/privacy', '{footer,command-palette}', false, true, 9),
  ('terms', '/terms', '{footer,command-palette}', false, true, 10)
on conflict (key) do nothing;

create table if not exists public.redirects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source_path text not null unique,
  destination_path text not null,
  permanent boolean not null default true
);

alter table public.redirects enable row level security;
-- No policies created — service_role only (redirects are resolved server-side, not fetched by the client).
