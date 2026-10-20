-- Test fixtures applied on top of the migrations and the imported site content.
-- Test data only — never applied to a real database, never shown on the real
-- site. Everything is keyed with an `e2e-` slug so it cannot be mistaken for
-- (or collide with) real content.

-- A published article in both languages: the Insights section (navigation
-- link, index, article page, feed) is invisible on the real site until an
-- article is published, so without one those routes could not be tested.
insert into public.articles (slug, status, published_at, title, excerpt, body, category)
values (
  'e2e-fixture-article',
  'published',
  '2026-09-01T06:00:00Z',
  '{"en": "A fixture article for the test suite", "fa": "یک مقاله آزمایشی برای مجموعه آزمون"}',
  '{"en": "Exists only in the test suite.", "fa": "فقط در مجموعه‌ی آزمون وجود دارد."}',
  '{"en": "## First heading\n\nA paragraph of test text.\n\n## Second heading\n\nMore test text.\n\n## Third heading\n\nEven more.", "fa": "## عنوان اول\n\nیک بند متن آزمایشی.\n\n## عنوان دوم\n\nمتن آزمایشی بیشتر.\n\n## عنوان سوم\n\nباز هم متن."}',
  '{"en": "Engineering", "fa": "مهندسی"}'
)
on conflict (slug) do nothing;

-- Phase 30 — a published product, so the product pages, the Products menu and
-- section, and the purchase and demo requests can be tested. Not in the
-- portfolio (`show_in_portfolio = false`), so /work is unchanged. Its ways to
-- get it: one with a price, one highlighted without a price, and one that is
-- NOT published — it must never appear anywhere public.
insert into public.projects (slug, title, category, summary, published, featured, show_in_portfolio, is_product, brand_color, accent_color, industry, platforms, outcome_line, features, sort_order)
values (
  'e2e-product',
  '{"en": "E2E Clinic System", "fa": "سیستم آزمایشی کلینیک"}',
  '{"en": "Product", "fa": "محصول"}',
  '{"en": "A fixture product that exists only in the test suite.", "fa": "محصولی آزمایشی که فقط در مجموعه‌ی آزمون وجود دارد."}',
  true, false, false, true,
  '#1B3A4B', '#E2B65C',
  '{"en": "Health care", "fa": "صحت"}',
  '{windows,offline}',
  '{"en": "Patients and appointments in one place.", "fa": "مریضان و نوبت‌ها در یک جا."}',
  '[{"en": "Patient records", "fa": "پرونده‌ی مریضان"}, {"en": "Appointments", "fa": "نوبت‌ها"}, {"en": "Prescriptions", "fa": "نسخه‌ها"}]',
  90
)
on conflict (slug) do nothing;

insert into public.project_blocks (project_id, type, title, body, published, sort_order)
select p.id, b.type, null, b.body::jsonb, true, b.sort_order
from public.projects p,
  (values
    ('features-by-role', '{"groups": [{"role": {"en": "Reception", "fa": "پذیرش"}, "items": [{"en": "Books appointments", "fa": "نوبت می‌دهد"}]}, {"role": {"en": "Doctor", "fa": "داکتر"}, "items": [{"en": "Writes prescriptions", "fa": "نسخه می‌نویسد"}]}]}', 1),
    ('audience', '{"items": [{"en": "Dental clinics", "fa": "کلینیک‌های دندان"}]}', 2),
    ('faq', '{"items": [{"question": {"en": "Does it work without internet?", "fa": "بدون انترنت کار می‌کند؟"}, "answer": {"en": "Yes.", "fa": "بلی."}}]}', 3)
  ) as b(type, body, sort_order)
where p.slug = 'e2e-product'
  and not exists (select 1 from public.project_blocks x where x.project_id = p.id);

insert into public.product_sale_options (project_id, kind, title, price_afn, price_usd, billing_period, maintenance, included, highlighted, cta, published, sort_order)
select p.id, o.kind, o.title::jsonb, o.afn, null, o.period, o.maintenance, o.included::jsonb, o.highlighted, o.cta, o.published, o.sort_order
from public.projects p,
  (values
    ('licence-yearly', '{"en": "E2E yearly licence", "fa": "لایسنس سالانه‌ی آزمایشی"}', 12000::numeric, 'year', 'included', '[{"en": "Set-up", "fa": "راه‌اندازی"}]', false, 'purchase-request', true, 1),
    ('custom-edition', '{"en": "E2E custom edition", "fa": "نسخه‌ی اختصاصی آزمایشی"}', null::numeric, 'once', 'not-offered', '[]', true, 'demo-request', true, 2),
    ('source-code', '{"en": "E2E hidden option", "fa": "روش پنهان آزمایشی"}', 99::numeric, 'once', 'not-offered', '[]', false, 'contact', false, 3)
  ) as o(kind, title, afn, period, maintenance, included, highlighted, cta, published, sort_order)
where p.slug = 'e2e-product'
  and not exists (select 1 from public.product_sale_options x where x.project_id = p.id);

insert into public.product_services (project_id, title, price_afn, period, published, sort_order)
select p.id, '{"en": "E2E staff training", "fa": "آموزش آزمایشی کارمندان"}', 3000, 'once', true, 1
from public.projects p
where p.slug = 'e2e-product'
  and not exists (select 1 from public.product_services x where x.project_id = p.id);

-- Phase 31: the five services of the seed have no packages or add-ons, so the
-- RLS test ("an unpublished service disappears — with its packages, add-ons,
-- steps and FAQs") gets one of each on `web-systems`. `show_packages` stays
-- off, so no public page shows them.
insert into public.service_packages (service_id, tier, name, summary, for_whom, price_type)
select id, 'starter', '{"en": "E2E package", "fa": "بسته‌ی آزمایشی"}', '{"en": "Test only.", "fa": "فقط آزمایشی."}', '{"en": "Tests", "fa": "آزمون"}', 'quote'
from public.services where slug = 'web-systems'
on conflict (service_id, tier) do nothing;
insert into public.service_addons (service_id, title, description, price_type)
select id, '{"en": "E2E add-on", "fa": "افزونه‌ی آزمایشی"}', '{"en": "Test only.", "fa": "فقط آزمایشی."}', 'quote'
from public.services where slug = 'web-systems' and not exists (select 1 from public.service_addons a join public.services s on s.id = a.service_id where s.slug = 'web-systems');
