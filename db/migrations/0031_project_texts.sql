-- Migration: 0031_project_texts
-- Roadmap: Phase 32.5 (§ 11A) — project texts in the database, in the customer's words.
--
-- Every project's title, kind, summary, industry, outcome line and features is
-- rewritten in both languages by the customer rule (§ 16.1) and the Dari
-- glossary (§ 16.3): no «دوزبانه» / "bilingual", no «CMS», no
-- «غیرتوسعه‌دهنده» / "non-developer staff", no server, database or browser
-- talk, nothing defensive («…، نه …», "not a static list"). The old
-- engineering highlights are emptied — the features say what users can do. Every
-- screenshot caption and image description is rewritten the same way (no
-- «ریسپانسیو», «رندر», "UI", the unconfirmed "Shabraw" brand, D-20).
-- Same texts as the seed `lib/home-content.ts` for the two published projects.
-- Artaveo Dental (the owner's own entry, unpublished) keeps its meaning; its
-- spelling and wording are corrected.
--
-- The texts before this migration are kept in `audit_log`
-- (actor 'migration:0031'), one row per changed row.
--
-- ROLLBACK:
--   update public.projects p set title = a.before->'title', category = a.before->'category',
--       summary = a.before->'summary', highlights = a.before->'highlights', industry = a.before->'industry',
--       outcome_line = a.before->'outcome_line', features = a.before->'features'
--     from public.audit_log a where a.actor = 'migration:0031' and a.entity = 'projects' and a.entity_id = p.id::text;
--   update public.project_media m set caption = a.before->'caption'
--     from public.audit_log a where a.actor = 'migration:0031' and a.entity = 'project_media' and a.entity_id = m.id::text;
--   update public.media_assets m set alt = a.before->'alt'
--     from public.audit_log a where a.actor = 'migration:0031' and a.entity = 'media_assets' and a.entity_id = m.id::text;

-- the texts as they were -----------------------------------------------------------------
insert into public.audit_log (actor, action, entity, entity_id, before)
select 'migration:0031', 'content.rewrite', 'projects', id::text,
       jsonb_build_object('title', title, 'category', category, 'summary', summary, 'highlights', highlights,
                          'industry', industry, 'outcome_line', outcome_line, 'features', features)
  from public.projects
 where slug in ('transportation-system', 'pazhuhesh-portal', 'artaveo-dental');

insert into public.audit_log (actor, action, entity, entity_id, before)
select 'migration:0031', 'content.rewrite', 'project_media', m.id::text, jsonb_build_object('caption', m.caption)
  from public.project_media m join public.projects p on p.id = m.project_id
 where p.slug in ('transportation-system', 'pazhuhesh-portal');

insert into public.audit_log (actor, action, entity, entity_id, before)
select 'migration:0031', 'content.rewrite', 'media_assets', a.id::text, jsonb_build_object('alt', a.alt)
  from public.media_assets a
 where a.id in (select media_id from public.project_media m join public.projects p on p.id = m.project_id
                 where p.slug in ('transportation-system', 'pazhuhesh-portal'))
    or a.id = '00a3a5ad-0bfb-4a1b-aec4-cc9b7b348549';

-- projects ----------------------------------------------------------------------------------
update public.projects set
  title = '{"en": "Ticket Sales & Transport Management", "fa": "سیستم فروش تکت و مدیریت ترانسپورت"}',
  category = '{"en": "Web system", "fa": "سیستم تحت وب"}',
  summary = '{"en": "Ticket sales and day-to-day management for intercity transport companies. Passengers find a trip, buy their ticket online and pick their own seat; the company runs routes, buses, drivers, trips and sales from one panel.", "fa": "سیستم فروش تکت و مدیریت برای شرکت‌های ترانسپورتی بین‌شهری. مسافر سفر را پیدا می‌کند، تکتش را آنلاین می‌گیرد و چوکی‌اش را خودش انتخاب می‌کند؛ شرکت مسیرها، بس‌ها، رانندگان، سفرها و فروش را از یک پنل اداره می‌کند."}',
  highlights = '[]',
  industry = '{"en": "Passenger transport", "fa": "ترانسپورت مسافربری"}',
  outcome_line = null,
  features = '[
    {"en": "Passengers find a trip and buy the ticket online", "fa": "مسافر سفر را پیدا می‌کند و تکت را آنلاین می‌خرد"},
    {"en": "Each passenger picks their seat on the bus seat map", "fa": "هر مسافر چوکی خود را روی نقشه‌ی چوکی‌های بس انتخاب می‌کند"},
    {"en": "Passengers look up their ticket any time with its code", "fa": "مسافر تکت خود را هر وقت با کد آن پیدا می‌کند"},
    {"en": "Routes, buses, drivers and trips run from one panel", "fa": "مسیرها، بس‌ها، رانندگان و سفرها از یک پنل اداره می‌شوند"},
    {"en": "Sales reports by date and route", "fa": "گزارش فروش بر اساس تاریخ و مسیر"},
    {"en": "Loyalty levels and discount coupons", "fa": "سطح‌های وفاداری و کوپن‌های تخفیف"}
  ]'
where slug = 'transportation-system';

update public.projects set
  title = '{"en": "Pezhohesh Complex Website", "fa": "وب‌سایت مجتمع پژوهش"}',
  category = '{"en": "Website and admin panel", "fa": "وب‌سایت و پنل مدیریت"}',
  summary = '{"en": "The website and admin panel of an education centre: its study lounge, academic advising, scholarships and student achievements. The centre''s staff keep everything up to date themselves.", "fa": "وب‌سایت و پنل مدیریت یک مرکز آموزشی: سالون مطالعه، مشوره‌ی تحصیلی، بورسیه‌ها و دستاوردهای محصلان. کارمندان مرکز همه‌چیز را خودشان به‌روز می‌کنند."}',
  highlights = '[]',
  industry = '{"en": "Education", "fa": "آموزش"}',
  outcome_line = null,
  features = '[
    {"en": "A study lounge page with its facilities and rules", "fa": "صفحه‌ی سالون مطالعه با امکانات و مقررات آن"},
    {"en": "Scholarships the staff publish themselves", "fa": "بورسیه‌هایی که کارمندان خودشان نشر می‌کنند"},
    {"en": "Academic services and advising requests", "fa": "خدمات تحصیلی و درخواست مشوره"},
    {"en": "A page for student achievements", "fa": "صفحه‌ی دستاوردهای محصلان"},
    {"en": "Separate access for the director and each department head", "fa": "دسترسی جدا برای مدیر کل و مدیر هر بخش"},
    {"en": "Light and dark appearance", "fa": "نمای روشن و تاریک"}
  ]'
where slug = 'pazhuhesh-portal';

-- The owner's own entry (unpublished): same meaning, corrected wording.
update public.projects set
  category = '{"en": "Desktop software", "fa": "نرم‌افزار کمپیوتری"}',
  summary = '{"en": "Management software for dental clinics: patients, appointments, doctors, the front desk and prescriptions in one place. The clinic owner gives each staff member their own role and keeps everything in view.", "fa": "سیستم مدیریت کلینیک دندان: مریضان، نوبت‌ها، داکتران، پذیرش و نسخه‌ها در یک جا. مالک کلینیک برای هر کارمند نقش جداگانه تعیین می‌کند و همه‌چیز را زیر نظر دارد."}',
  industry = '{"en": "Dental clinics", "fa": "کلینیک‌های دندان"}',
  outcome_line = '{"en": "Patients, appointments, doctors and prescriptions are now run in one orderly, precise system.", "fa": "مریضان، نوبت‌ها، داکتران و نسخه‌ها حالا منظم و دقیق در یک سیستم اداره می‌شوند."}'
where slug = 'artaveo-dental';

-- screenshot captions and image descriptions ---------------------------------------------------
create temporary table phase32_media (id uuid primary key, caption jsonb, alt jsonb) on commit drop;
insert into phase32_media (id, caption, alt) values
  -- transportation-system
  ('193796f4-1a85-4689-8dad-34364d521d3a', '{"en": "Passengers search for a trip from the home page", "fa": "مسافر از صفحه‌ی اصلی سفر خود را جستجو می‌کند"}', '{"en": "Home page with a Kabul to Herat trip search filled in", "fa": "صفحه‌ی اصلی با جستجوی سفر کابل به هرات"}'),
  ('a4631a7c-5fcb-4601-913f-09f5f1360f2d', '{"en": "Every trip of the day, with time, price and bus type", "fa": "همه‌ی سفرهای روز با ساعت، قیمت و نوع بس"}', '{"en": "Search results with several Kabul–Herat trips, their times, prices and bus types", "fa": "نتیجه‌ی جستجو با چند سفر کابل–هرات و ساعت، قیمت و نوع بس هر کدام"}'),
  ('26e26058-2c53-4f51-a224-8c9eb8b09584', '{"en": "Passengers pick their own seat", "fa": "مسافر چوکی خود را انتخاب می‌کند"}', '{"en": "Seat map showing free, taken and selected seats", "fa": "نقشه‌ی چوکی‌ها با چوکی‌های خالی، فروخته‌شده و انتخاب‌شده"}'),
  ('2d7bb54e-95bd-4669-8fe0-91bd30ec1f70', '{"en": "The ticket is confirmed, with its own code", "fa": "تکت تأیید می‌شود و کد خودش را می‌گیرد"}', '{"en": "Confirmed ticket with its code and a summary of the trip", "fa": "تکت تأییدشده با کد و خلاصه‌ی سفر"}'),
  ('62529ffa-9fcf-4769-a701-e6fbc9c50849', '{"en": "The company sees its day at a glance", "fa": "شرکت کار روز خود را یک‌جا می‌بیند"}', '{"en": "Admin panel with today''s tickets, income, filled seats and upcoming trips", "fa": "صفحه‌ی اول پنل مدیریت با تکت‌های امروز، درآمد، چوکی‌های پرشده و سفرهای پیش رو"}'),
  ('076eb0fe-cd3d-466a-aa9b-8546d0745013', '{"en": "Sales and filled seats by date and route", "fa": "فروش و چوکی‌های پرشده بر اساس تاریخ و مسیر"}', '{"en": "Reports filtered by date and route, showing income and filled seats", "fa": "گزارش‌ها با فیلتر تاریخ و مسیر، همراه درآمد و چوکی‌های پرشده"}'),
  ('b073695c-54bc-4bdd-9a30-c25849d2f73c', '{"en": "Every ticket, from sale to travel", "fa": "همه‌ی تکت‌ها، از فروش تا سفر"}', '{"en": "Ticket list filtered by status, with a search", "fa": "فهرست تکت‌ها با فیلتر وضعیت و جستجو"}'),
  ('d5d086e0-0989-4af1-b774-5acab6516d1f', '{"en": "Trips planned ahead", "fa": "سفرها از پیش برنامه‌ریزی می‌شوند"}', '{"en": "Trip schedule with several planned trips", "fa": "برنامه‌ی سفرها با چند سفر برنامه‌ریزی‌شده"}'),
  ('9801649d-d974-4e8e-ac76-7c537fea46f9', '{"en": "Routes and their prices", "fa": "مسیرها و قیمت هر کدام"}', '{"en": "Route list with origins, destinations and prices", "fa": "فهرست مسیرها با مبدأ، مقصد و قیمت"}'),
  ('abc211be-3a31-4b01-a965-4c1a3ef67cc9', '{"en": "Every bus with its type, seats and amenities", "fa": "هر بس با نوع، شمار چوکی و امکانات آن"}', '{"en": "Bus list by type, number of seats and amenities", "fa": "فهرست بس‌ها بر اساس نوع، شمار چوکی و امکانات"}'),
  ('2a5b5ae0-c1d3-4957-810e-71ec5ee3bfb6', '{"en": "Drivers and their trips", "fa": "رانندگان و سفرهای هر کدام"}', '{"en": "Driver list with contact numbers and the trips given to each", "fa": "فهرست رانندگان با شماره‌ی تماس و سفرهایی که به هر کدام سپرده شده"}'),
  ('0a50d697-4abc-47f9-94dd-f60c13e64af7', '{"en": "Passengers find their ticket without an account", "fa": "مسافر بدون ساختن حساب، تکت خود را پیدا می‌کند"}', '{"en": "Ticket lookup showing a ticket''s status and trip details", "fa": "پیدا کردن تکت، با وضعیت و جزئیات سفر"}'),
  ('be2abc12-b717-4211-938f-9d32a9703cbc', '{"en": "Loyalty levels and discount coupons, set by the company", "fa": "سطح‌های وفاداری و کوپن تخفیف، به انتخاب خود شرکت"}', '{"en": "Loyalty programme with membership levels and a list of coupons", "fa": "برنامه‌ی وفاداری با سطح‌های عضویت و فهرست کوپن‌ها"}'),
  ('1669a0e4-188f-4f8a-9db2-ff10766520e5', '{"en": "Just as easy on a phone", "fa": "روی موبایل هم به همین آسانی"}', '{"en": "Home page on a phone", "fa": "صفحه‌ی اصلی روی موبایل"}'),
  -- pazhuhesh-portal
  ('aad28803-65c2-42bd-a225-0dd388fa8e2e', '{"en": "The centre''s home page", "fa": "صفحه‌ی اصلی مجتمع پژوهش"}', '{"en": "Pezhohesh Complex home page", "fa": "صفحه‌ی اصلی مجتمع پژوهش"}'),
  ('b07e1115-34a9-467d-9adc-706b67a5c1ac', '{"en": "The study lounge, its facilities and photos", "fa": "سالون مطالعه با امکانات و عکس‌های آن"}', '{"en": "Study lounge page with its facilities and a photo gallery", "fa": "صفحه‌ی سالون مطالعه با امکانات و گالری عکس"}'),
  ('ef63ce3b-f05a-4088-a6ad-47aca7ae495b', '{"en": "Academic services, with answers to common questions", "fa": "خدمات تحصیلی همراه با جواب سؤال‌های رایج"}', '{"en": "Academic services page with a card for each service and a questions section", "fa": "صفحه‌ی خدمات تحصیلی با کارت هر خدمت و بخش سؤال‌ها"}'),
  ('a20f69c2-5fd6-45f9-b582-2286636b5366', '{"en": "Staff update the whole site from one panel", "fa": "کارمندان همه‌ی سایت را از یک پنل به‌روز می‌کنند"}', '{"en": "The director''s admin panel with its content and photo sections", "fa": "پنل مدیر کل با بخش‌های محتوا و عکس"}'),
  ('a6b5071f-f60b-4b75-8326-bbac5c20117e', '{"en": "Each department head sees only their own part", "fa": "مدیر هر بخش فقط بخش خود را می‌بیند"}', '{"en": "A department head''s panel, limited to academic services and scholarships", "fa": "پنل مدیر بخش، فقط برای خدمات تحصیلی و بورسیه‌ها"}'),
  ('e585364e-6ef0-4967-9878-1826267420df', '{"en": "Open scholarships, kept up to date by the staff", "fa": "بورسیه‌های باز، به‌روزشده به دست کارمندان"}', '{"en": "Open scholarships page with the current scholarships", "fa": "صفحه‌ی بورسیه‌های باز با بورسیه‌های فعلی"}'),
  ('0b64e5a6-f997-4f99-8c4d-4420156123f8', '{"en": "The centre''s story, in its own words", "fa": "معرفی مجتمع، به زبان خودش"}', '{"en": "A section of the About page", "fa": "بخشی از صفحه‌ی درباره‌ی ما"}'),
  ('ccf4420a-b3fe-4132-8aa4-93b69040faca', '{"en": "Student achievements on a page of their own", "fa": "دستاوردهای محصلان در صفحه‌ی خودشان"}', '{"en": "Achievements page with student results", "fa": "صفحه‌ی دستاوردها با نتیجه‌های محصلان"}'),
  ('4aaaf516-cc5a-432b-8aee-43e61fb89dd9', '{"en": "Every photo on the site, changed in its own place", "fa": "هر عکس سایت در جای خودش عوض می‌شود"}', '{"en": "Photo manager for the About page, with a named place for each photo", "fa": "بخش مدیریت عکس‌های صفحه‌ی درباره، با جای نام‌دار برای هر عکس"}'),
  ('ecb5ec93-ca68-4065-808c-1e1b56581cb0', '{"en": "Just as easy on a phone", "fa": "روی موبایل هم به همین آسانی"}', '{"en": "Pezhohesh home page on a phone", "fa": "صفحه‌ی اصلی مجتمع پژوهش روی موبایل"}'),
  ('cb7e1724-cd8d-48cd-ae56-a4df58b2dd9f', '{"en": "Light and dark appearance", "fa": "نمای روشن و تاریک"}', '{"en": "Home page in the dark appearance", "fa": "صفحه‌ی اصلی در نمای تاریک"}');

update public.project_media m set caption = x.caption from phase32_media x where x.id = m.id;
update public.media_assets a set alt = x.alt from public.project_media m join phase32_media x on x.id = m.id where m.media_id = a.id;

-- Artaveo Dental's screenshot (in the media library, not yet placed on the project)
update public.media_assets set alt = '{"en": "Dental chart and treatment plans", "fa": "چارت دندان و پلان‌های تداوی"}'
 where id = '00a3a5ad-0bfb-4a1b-aec4-cc9b7b348549';
