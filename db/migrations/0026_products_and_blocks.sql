-- Migration: 0026_products_and_blocks
-- Roadmap: Phase 27 — Products, sale options & flexible content (§ 11A, D-16, D-21)
--
-- Everything the redesigned site shows becomes data the owner manages in the
-- admin (§ 2.22). Five parts, matching 27.1–27.6:
--
-- 27.1 projects: `show_in_portfolio` and `is_product` are independent switches
--      (a product may or may not also appear in the portfolio); `brand_color` /
--      `accent_color` (#RRGGBB, the project's own colour, § 14.1); `cover_media_id`
--      (the device mock-up, picked from the media library — `cover_image`, a bare
--      path, stays as the fallback for rows that have no library image);
--      `industry`, `platforms`, `outcome_line` and a customer-facing `features`
--      list. `status` and `role` stay in the table (history) but leave the public
--      types and the admin form: a project is draft or published, nothing else.
--      `projects` finally gets the `updated_at` touch trigger the other content
--      tables have had since 0011/0016.
--
-- 27.2 project_blocks: free, ordered, bilingual content blocks that build a project
--      page — intro, challenge, features (what was built), gallery, features by
--      role, audience (who it is for), result, FAQ, video — each published on its
--      own. `body` is a JSON object whose shape follows `type`; the admin write
--      boundary (`app/actions/products.ts`) validates it, the table only insists it
--      is an object. `project_sections` (0003) is ARCHIVED: its rows (the
--      engineering write-ups) stay in the database, nothing reads them any more,
--      and its public read policy is dropped so not even the Data API serves them.
--
-- 27.3 product_sale_options / product_services: the ways to get a product
--      (licence monthly / yearly / lifetime, source code, custom edition, other)
--      and its after-sales services. Prices per D-21: an amount in Afghani and/or
--      in dollars — the Dari site shows Afghani, the English site dollars, each
--      falling back to the other — and no amount at all means "price after a
--      short conversation" (D-04: nothing is invented). At most one highlighted
--      option per product (partial unique index). Public read: published rows of
--      a published product only.
--
-- 27.4 services: `kind` (the kind of software — services are organised by it,
--      § 2.5), optional "from" price (Afghani / dollars) and `show_packages`
--      (packages become optional per service; on for the services that have
--      packages today, so no public page changes by itself). `tagline` is the
--      one-line promise, `related_project_slugs` the related projects — both
--      exist since 0004. Engagement models stay in their table, unused publicly.
--
-- 27.5 inquiries: `inquiry_kind` — project (the Brief Builder), product purchase
--      request, demo request. A product request names the product, the chosen sale
--      option and after-sales services, and keeps a `product_snapshot` of their
--      titles and prices at the moment of the request, so editing or deleting an
--      option later never rewrites what the client asked for.
--
-- 27.6 site_settings / navigation_items: the e-mail address, WhatsApp number and
--      phone number move into `site_settings` (seeded with today's real values);
--      `navigation_items` learns the `products` key (hidden until Phase 30 builds
--      /products) and `consultation` (command palette only, as today).
--
-- Seed data (live database only — on the test stack the content import runs after
-- the migrations and writes the same values from lib/home-content.ts): the two
-- projects get their colour, industry, platforms and a customer-facing features
-- list, their library cover, and one published "features" block each.
--
-- ROLLBACK:
--   alter table public.inquiries drop constraint if exists inquiries_product_snapshot_check,
--     drop column if exists product_snapshot, drop column if exists product_service_ids,
--     drop column if exists product_sale_option_id, drop column if exists product_project_id,
--     drop column if exists inquiry_kind;
--   drop table if exists public.product_services;
--   drop table if exists public.product_sale_options;
--   drop table if exists public.project_blocks;
--   create policy "sections of published projects are publicly readable" on public.project_sections
--     for select to anon, authenticated using (exists (select 1 from public.projects p
--     where p.id = project_sections.project_id and p.published = true));
--   alter table public.services drop column if exists show_packages, drop column if exists from_price_usd,
--     drop column if exists from_price_afn, drop column if exists kind;
--   drop trigger if exists set_projects_updated_at on public.projects;
--   alter table public.projects drop column if exists features, drop column if exists outcome_line,
--     drop column if exists platforms, drop column if exists industry, drop column if exists cover_media_id,
--     drop column if exists accent_color, drop column if exists brand_color, drop column if exists is_product,
--     drop column if exists show_in_portfolio;
--   alter table public.site_settings drop column if exists phone_number, drop column if exists whatsapp_number,
--     drop column if exists contact_email;
--   delete from public.navigation_items where key in ('products', 'consultation');
--   update public.navigation_items set sort_order = sort_order - 1 where sort_order >= 2;
--   update public.navigation_items set sort_order = sort_order - 1 where key in ('privacy', 'terms');
--   (then restore navigation_items_key_check to 0007's list)

-- ---------------------------------------------------------------------------
-- 27.1 projects
-- ---------------------------------------------------------------------------

alter table public.projects
  add column if not exists show_in_portfolio boolean not null default true,
  add column if not exists is_product boolean not null default false,
  add column if not exists brand_color text,
  add column if not exists accent_color text,
  add column if not exists cover_media_id uuid references public.media_assets (id) on delete set null,
  add column if not exists industry jsonb,
  add column if not exists platforms text[] not null default '{}',
  add column if not exists outcome_line jsonb,
  add column if not exists features jsonb not null default '[]';

alter table public.projects
  add constraint projects_brand_color_check check (brand_color is null or brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint projects_accent_color_check check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint projects_industry_check check (industry is null or (industry ? 'en' and industry ? 'fa')),
  add constraint projects_outcome_line_check check (outcome_line is null or (outcome_line ? 'en' and outcome_line ? 'fa')),
  add constraint projects_features_check check (jsonb_typeof(features) = 'array'),
  add constraint projects_platforms_check check (platforms <@ array['web', 'android', 'ios', 'windows', 'mac', 'offline']::text[]);

create index if not exists projects_is_product_idx on public.projects (is_product) where is_product;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 27.2 project_blocks (and the archive of project_sections)
-- ---------------------------------------------------------------------------

create table if not exists public.project_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type text not null check (type in (
    'intro', 'challenge', 'features', 'gallery', 'features-by-role', 'audience', 'result', 'faq', 'video'
  )),
  title jsonb check (title is null or (title ? 'en' and title ? 'fa')),
  body jsonb not null default '{}' check (jsonb_typeof(body) = 'object'),
  published boolean not null default false,
  sort_order int not null default 0
);

create index if not exists project_blocks_project_id_idx on public.project_blocks (project_id, sort_order);

alter table public.project_blocks enable row level security;
create policy "published blocks of published projects are publicly readable"
  on public.project_blocks for select
  to anon, authenticated
  using (published = true and exists (
    select 1 from public.projects p
    where p.id = project_blocks.project_id and p.published = true
  ));

drop trigger if exists set_project_blocks_updated_at on public.project_blocks;
create trigger set_project_blocks_updated_at
  before update on public.project_blocks
  for each row
  execute function public.set_updated_at();

-- Archived: kept, never rendered, no longer publicly readable.
drop policy if exists "sections of published projects are publicly readable" on public.project_sections;
comment on table public.project_sections is
  'ARCHIVED in Phase 27 (migration 0026): the engineering case-study sections of revisions 1-44. Kept for history; nothing reads them. Project pages are built from project_blocks.';

-- ---------------------------------------------------------------------------
-- 27.3 product_sale_options, product_services
-- ---------------------------------------------------------------------------

create table if not exists public.product_sale_options (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in (
    'licence-monthly', 'licence-yearly', 'licence-lifetime', 'source-code', 'custom-edition', 'other'
  )),
  title jsonb not null check (title ? 'en' and title ? 'fa'),
  summary jsonb check (summary is null or (summary ? 'en' and summary ? 'fa')),
  -- D-21: Afghani for the Dari site, dollars for the English site; either may be
  -- missing (the other is shown), both missing = "price after a short conversation".
  price_afn numeric(14, 2) check (price_afn is null or price_afn >= 0),
  price_usd numeric(14, 2) check (price_usd is null or price_usd >= 0),
  price_from boolean not null default false,
  billing_period text not null default 'once' check (billing_period in ('once', 'month', 'year')),
  maintenance text not null default 'not-offered' check (maintenance in ('included', 'optional', 'not-offered')),
  maintenance_price_afn numeric(14, 2) check (maintenance_price_afn is null or maintenance_price_afn >= 0),
  maintenance_price_usd numeric(14, 2) check (maintenance_price_usd is null or maintenance_price_usd >= 0),
  maintenance_period text check (maintenance_period is null or maintenance_period in ('month', 'year')),
  included jsonb not null default '[]' check (jsonb_typeof(included) = 'array'),
  highlighted boolean not null default false,
  cta text not null default 'purchase-request' check (cta in ('purchase-request', 'demo-request', 'contact')),
  published boolean not null default false,
  sort_order int not null default 0,

  -- A maintenance price only exists for optional maintenance, and a price needs its period.
  constraint product_sale_options_maintenance_price_check check (
    (maintenance = 'optional' or (maintenance_price_afn is null and maintenance_price_usd is null and maintenance_period is null))
    and ((maintenance_price_afn is null and maintenance_price_usd is null) or maintenance_period is not null)
  )
);

create index if not exists product_sale_options_project_id_idx on public.product_sale_options (project_id, sort_order);
create unique index if not exists product_sale_options_one_highlighted_idx
  on public.product_sale_options (project_id) where highlighted;

alter table public.product_sale_options enable row level security;
create policy "published sale options of published products are public"
  on public.product_sale_options for select
  to anon, authenticated
  using (published = true and exists (
    select 1 from public.projects p
    where p.id = product_sale_options.project_id and p.published = true and p.is_product = true
  ));

drop trigger if exists set_product_sale_options_updated_at on public.product_sale_options;
create trigger set_product_sale_options_updated_at
  before update on public.product_sale_options
  for each row
  execute function public.set_updated_at();

create table if not exists public.product_services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title jsonb not null check (title ? 'en' and title ? 'fa'),
  description jsonb check (description is null or (description ? 'en' and description ? 'fa')),
  price_afn numeric(14, 2) check (price_afn is null or price_afn >= 0),
  price_usd numeric(14, 2) check (price_usd is null or price_usd >= 0),
  price_from boolean not null default false,
  period text not null default 'once' check (period in ('once', 'month', 'year')),
  published boolean not null default false,
  sort_order int not null default 0
);

create index if not exists product_services_project_id_idx on public.product_services (project_id, sort_order);

alter table public.product_services enable row level security;
create policy "published after-sales services of published products are public"
  on public.product_services for select
  to anon, authenticated
  using (published = true and exists (
    select 1 from public.projects p
    where p.id = product_services.project_id and p.published = true and p.is_product = true
  ));

drop trigger if exists set_product_services_updated_at on public.product_services;
create trigger set_product_services_updated_at
  before update on public.product_services
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 27.4 services by kind of software
-- ---------------------------------------------------------------------------

alter table public.services
  add column if not exists kind text,
  add column if not exists from_price_afn numeric(14, 2),
  add column if not exists from_price_usd numeric(14, 2),
  add column if not exists show_packages boolean not null default false;

alter table public.services
  add constraint services_kind_check check (kind is null or kind in (
    'website', 'web-system', 'mobile-app', 'desktop-software', 'offline-system', 'support', 'other'
  )),
  add constraint services_from_price_check check (
    (from_price_afn is null or from_price_afn >= 0) and (from_price_usd is null or from_price_usd >= 0)
  );

update public.services s set show_packages = true
  where exists (select 1 from public.service_packages p where p.service_id = s.id);

update public.services set kind = case slug
    when 'business-website' then 'website'
    when 'web-application-mvp' then 'web-system'
    when 'admin-dashboards' then 'web-system'
    when 'backend-api-database' then 'web-system'
    when 'performance-accessibility-seo' then 'support'
    when 'bug-fix-rescue' then 'support'
    when 'care-plan' then 'support'
  end
  where kind is null;

-- ---------------------------------------------------------------------------
-- 27.5 inquiries: product purchase and demo requests
-- ---------------------------------------------------------------------------

alter table public.inquiries
  add column if not exists inquiry_kind text not null default 'project',
  add column if not exists product_project_id uuid references public.projects (id) on delete set null,
  add column if not exists product_sale_option_id uuid references public.product_sale_options (id) on delete set null,
  add column if not exists product_service_ids uuid[] not null default '{}',
  add column if not exists product_snapshot jsonb;

alter table public.inquiries
  add constraint inquiries_inquiry_kind_check check (inquiry_kind in ('project', 'product-purchase', 'product-demo')),
  add constraint inquiries_product_snapshot_check check (inquiry_kind = 'project' or product_snapshot is not null);

create index if not exists inquiries_inquiry_kind_idx on public.inquiries (inquiry_kind);

-- ---------------------------------------------------------------------------
-- 27.6 shell settings
-- ---------------------------------------------------------------------------

alter table public.site_settings
  add column if not exists contact_email text,
  add column if not exists whatsapp_number text,
  add column if not exists phone_number text;

alter table public.site_settings
  add constraint site_settings_contact_email_check check (contact_email is null or contact_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  add constraint site_settings_whatsapp_number_check check (whatsapp_number is null or whatsapp_number ~ '^\+[1-9][0-9]{6,14}$'),
  add constraint site_settings_phone_number_check check (phone_number is null or phone_number ~ '^\+[1-9][0-9]{6,14}$');

-- Today's real, owner-confirmed values (lib/site.ts until now).
update public.site_settings
  set contact_email = 'artaveo.dev@gmail.com', whatsapp_number = '+93790685832', phone_number = '+93790685832'
  where id and contact_email is null;

alter table public.navigation_items drop constraint if exists navigation_items_key_check;
alter table public.navigation_items add constraint navigation_items_key_check check (key in (
  'home', 'products', 'work', 'services', 'process', 'about', 'insights',
  'designSystem', 'contact', 'start', 'consultation', 'privacy', 'terms'
));

update public.navigation_items set sort_order = sort_order + 1
  where sort_order >= 1 and not exists (select 1 from public.navigation_items where key = 'products');
insert into public.navigation_items (key, href, surfaces, has_description, has_content, sort_order) values
  ('products', '/products', '{header,footer,mobile,command-palette}', true, false, 1)
on conflict (key) do nothing;
-- 'privacy' / 'terms' sit right after 'start'; make room for 'consultation' between them.
update public.navigation_items set sort_order = sort_order + 1
  where key in ('privacy', 'terms')
    and not exists (select 1 from public.navigation_items where key = 'consultation');
insert into public.navigation_items (key, href, surfaces, has_description, has_content, sort_order)
  select 'consultation', '/consultation', '{command-palette}', false, true,
         coalesce((select sort_order from public.navigation_items where key = 'start'), 9) + 1
  where not exists (select 1 from public.navigation_items where key = 'consultation');

-- ---------------------------------------------------------------------------
-- Seed: the two existing projects (live database; see header)
-- ---------------------------------------------------------------------------

update public.projects p set cover_media_id = m.id
  from public.media_assets m
  where m.url = p.cover_image and p.cover_media_id is null;

update public.projects set
  brand_color = '#14243D',
  accent_color = '#F2A93B',
  industry = jsonb_build_object('en', 'Passenger transport', 'fa', 'ترانسپورت مسافربری'),
  platforms = '{web}',
  features = jsonb_build_array(
    jsonb_build_object('en', 'Passengers search trips and buy tickets online', 'fa', 'مسافران سفر را جست‌وجو می‌کنند و تکت را آنلاین می‌خرند'),
    jsonb_build_object('en', 'Each passenger picks their own seat on the bus seat map', 'fa', 'هر مسافر چوکی خود را روی نقشه‌ی چوکی‌های بس انتخاب می‌کند'),
    jsonb_build_object('en', 'A ticket can be checked any time with its reference code', 'fa', 'تکت هر وقت با کد آن قابل پیگیری است'),
    jsonb_build_object('en', 'Routes, buses, drivers and trips managed from one panel', 'fa', 'مسیرها، بس‌ها، رانندگان و سفرها از یک پنل مدیریت می‌شوند'),
    jsonb_build_object('en', 'Sales reports by date and route', 'fa', 'گزارش فروش بر اساس تاریخ و مسیر'),
    jsonb_build_object('en', 'Loyalty levels and discount coupons', 'fa', 'سطح‌های وفاداری و کوپن‌های تخفیف')
  )
  where slug = 'transportation-system' and features = '[]'::jsonb;

update public.projects set
  brand_color = '#123B2C',
  accent_color = '#7FD8B0',
  industry = jsonb_build_object('en', 'Education', 'fa', 'آموزش'),
  platforms = '{web}',
  features = jsonb_build_array(
    jsonb_build_object('en', 'Study lounge page with its facilities and rules', 'fa', 'صفحه‌ی سالون مطالعه با امکانات و مقررات آن'),
    jsonb_build_object('en', 'Scholarships the staff publish themselves', 'fa', 'بورسیه‌هایی که کارمندان خودشان نشر می‌کنند'),
    jsonb_build_object('en', 'Academic services and advising requests', 'fa', 'خدمات تحصیلی و درخواست مشوره'),
    jsonb_build_object('en', 'A page for student achievements', 'fa', 'صفحه‌ی دستاوردهای محصلان'),
    jsonb_build_object('en', 'Two admin levels: full control and a department admin', 'fa', 'دو سطح مدیریت: مدیر کل و مدیر بخش'),
    jsonb_build_object('en', 'Light and dark appearance', 'fa', 'نمای روشن و تاریک')
  )
  where slug = 'pazhuhesh-portal' and features = '[]'::jsonb;

insert into public.project_blocks (project_id, type, title, body, published, sort_order)
  select p.id, 'features',
         jsonb_build_object('en', 'What it does', 'fa', 'کارهایی که انجام می‌دهد'),
         '{}'::jsonb, true, 0
  from public.projects p
  where p.slug in ('transportation-system', 'pazhuhesh-portal')
    and not exists (select 1 from public.project_blocks b where b.project_id = p.id);
