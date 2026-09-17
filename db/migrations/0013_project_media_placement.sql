-- Migration: 0013_project_media_placement
-- Roadmap: § 6.1 "Media" names the BrowserFrame/DeviceFrame pattern this
-- wires into; the migration itself and the public rendering it enables
-- are logged as out-of-sequence work (§ 23.1), not a roadmap phase — the
-- gap was disclosed in Phase 15's own revision 29 note, but Phase 15 is
-- already complete and Phase 16 is next in the sequence, so this isn't
-- filed as a "15.1". It wires the real
-- screenshot set captured for Transportation System and Pazhuhesh Portal
-- into the `project_media` / `media_assets` tables 0003/0007 already
-- defined but never populated (the Phase 12.2 selector layer only ever
-- read `projects.cover_image`, a single path, for cover art).
--
-- `project_media.kind` (0003) already distinguishes 'desktop' / 'mobile' /
-- 'diagram' — the two real mobile-viewport captures use 'mobile' as-is,
-- everything else here is 'desktop'. What's missing is a way to tell a
-- case study's hero carousel images apart from its supporting gallery
-- grid: `placement` adds that as a second closed vocabulary, independent
-- of `kind` (a shot can be a main desktop shot, a gallery desktop shot, a
-- main mobile shot, etc. — the two axes are orthogonal, not one enum).
--
-- Every `alt`/`caption` pair below states only what is visibly true in the
-- screenshot itself (verified against the running Transportation-System /
-- pezhohesh-portal repos before capture — see the phase's screenshot
-- manifest), never a claim the image doesn't actually show.
--
-- Also backfills `projects.cover_image` for both projects from their new
-- first `main` image — until now this column was `null` for both rows, so
-- `/work` and the homepage's Featured Work tiles were rendering the
-- neutral placeholder instead of a real screenshot.
--
-- ROLLBACK:
--   update public.projects set cover_image = null where slug in ('transportation-system', 'pazhuhesh-portal');
--   delete from public.project_media where project_id in (
--     select id from public.projects where slug in ('transportation-system', 'pazhuhesh-portal')
--   );
--   delete from public.media_assets where url like '/images/work/%';
--   alter table public.project_media drop column if exists placement;

alter table public.project_media
  add column if not exists placement text not null default 'gallery'
    check (placement in ('main', 'gallery'));

with new_media as (
  insert into public.media_assets (url, alt, width, height, type, size_bytes) values
    ('/images/work/transportation-system/main/01-home-overview.png',
     jsonb_build_object('en', 'Shabraw homepage hero with a Kabul to Herat trip search filled in', 'fa', 'صفحه‌ی اصلی Shabraw با فرم جستجوی سفر کابل به هرات پرشده'),
     1488, 811, 'image/png', 1227347),
    ('/images/work/transportation-system/main/02-trip-search-results.png',
     jsonb_build_object('en', 'Search results listing several real Kabul–Herat trips with times, prices and bus type', 'fa', 'لیست نتایج جستجو با چند سفر واقعی کابل-هرات، همراه زمان، قیمت و نوع بس'),
     1918, 996, 'image/png', 163708),
    ('/images/work/transportation-system/main/03-seat-selection.png',
     jsonb_build_object('en', 'Interactive seat map with a mix of available, booked and selected seats', 'fa', 'نقشه‌ی تعاملی صندلی با ترکیب صندلی‌های آزاد، رزروشده و انتخاب‌شده'),
     1486, 814, 'image/png', 68901),
    ('/images/work/transportation-system/main/04-booking-confirmation.png',
     jsonb_build_object('en', 'Completed booking confirmation with a real reference code and trip summary', 'fa', 'تأییدیه‌ی رزرو تکمیل‌شده با کد پیگیری واقعی و خلاصه‌ی سفر'),
     1491, 811, 'image/png', 73106),
    ('/images/work/transportation-system/main/05-admin-dashboard.png',
     jsonb_build_object('en', 'Admin dashboard with daily bookings, revenue, occupancy and upcoming trips', 'fa', 'داشبورد ادمین با رزرو روزانه، درآمد، اشغال و سفرهای پیشِ‌رو'),
     1488, 805, 'image/png', 112459),
    ('/images/work/transportation-system/main/06-admin-reports.png',
     jsonb_build_object('en', 'Reports view with a date and route filter applied, showing revenue and occupancy', 'fa', 'نمای گزارش‌ها با فیلتر تاریخ و مسیر، نمایش درآمد و اشغال'),
     1467, 813, 'image/png', 98095),
    ('/images/work/transportation-system/gallery/07-admin-bookings.png',
     jsonb_build_object('en', 'Bookings table filtered by status with a search term applied', 'fa', 'جدول رزروها با فیلتر وضعیت و یک عبارت جستجو'),
     1536, 1024, 'image/png', 1559824),
    ('/images/work/transportation-system/gallery/08-admin-trips.png',
     jsonb_build_object('en', 'Trip scheduler listing several scheduled trips', 'fa', 'زمان‌بند سفرها با چند سفر زمان‌بندی‌شده'),
     1918, 996, 'image/png', 170803),
    ('/images/work/transportation-system/gallery/09-admin-routes.png',
     jsonb_build_object('en', 'Route manager listing real origin-destination pairs with pricing', 'fa', 'مدیریت مسیرها با جفت‌های واقعی مبدأ-مقصد و قیمت‌گذاری'),
     1918, 997, 'image/png', 117053),
    ('/images/work/transportation-system/gallery/10-admin-buses.png',
     jsonb_build_object('en', 'Fleet manager listing buses by type, capacity and amenities', 'fa', 'مدیریت ناوگان با نوع بس، ظرفیت و امکانات'),
     1918, 997, 'image/png', 97853),
    ('/images/work/transportation-system/gallery/11-admin-drivers.png',
     jsonb_build_object('en', 'Driver manager listing drivers with contact and assignment details', 'fa', 'مدیریت رانندگان با اطلاعات تماس و تخصیص'),
     1918, 1003, 'image/png', 124356),
    ('/images/work/transportation-system/gallery/12-booking-tracking.png',
     jsonb_build_object('en', 'Public booking lookup showing a found reservation''s status and trip details', 'fa', 'پیگیری عمومی رزرو با نمایش وضعیت و جزئیات سفر'),
     1488, 817, 'image/png', 53195),
    ('/images/work/transportation-system/gallery/13-loyalty-coupons.png',
     jsonb_build_object('en', 'Loyalty program management with membership tiers and a coupon list', 'fa', 'مدیریت برنامه‌ی وفاداری با سطوح عضویت و لیست کوپن'),
     1483, 811, 'image/png', 68806),
    ('/images/work/transportation-system/gallery/14-responsive-mobile.png',
     jsonb_build_object('en', 'Homepage rendered natively on a mobile viewport', 'fa', 'صفحه‌ی اصلی رندرشده به‌صورت واقعی در ویوپورت موبایل'),
     324, 709, 'image/png', 48364),

    ('/images/work/pazhuhesh-portal/main/01-home-overview.png',
     jsonb_build_object('en', 'Pazhuhesh homepage hero section', 'fa', 'بخش هیرو صفحه‌ی اصلی مجتمع پژوهش'),
     565, 868, 'image/png', 264203),
    ('/images/work/pazhuhesh-portal/main/02-study-lounge.png',
     jsonb_build_object('en', 'Study Lounge page with amenities and gallery sections', 'fa', 'صفحه‌ی سالن مطالعه با بخش‌های امکانات و گالری'),
     564, 871, 'image/png', 358283),
    ('/images/work/pazhuhesh-portal/main/03-academic-services.png',
     jsonb_build_object('en', 'Academic Services catalogue with real service cards and an FAQ section', 'fa', 'کاتالوگ خدمات تحصیلی با کارت‌های خدمت واقعی و بخش سؤالات متداول'),
     562, 867, 'image/png', 207863),
    ('/images/work/pazhuhesh-portal/main/04-super-admin-dashboard.png',
     jsonb_build_object('en', 'Super admin dashboard with full CMS and image-management controls', 'fa', 'داشبورد ادمین ارشد با کنترل‌های کامل CMS و مدیریت تصویر'),
     1335, 861, 'image/png', 143080),
    ('/images/work/pazhuhesh-portal/main/05-department-admin.png',
     jsonb_build_object('en', 'Restricted department-admin panel scoped only to Academic Services and scholarships', 'fa', 'پنل محدود ادمین دپارتمانی، فقط محدود به خدمات تحصیلی و بورسیه‌ها'),
     1329, 862, 'image/png', 129681),
    ('/images/work/pazhuhesh-portal/gallery/06-active-scholarships.png',
     jsonb_build_object('en', 'Active Scholarships page listing real scholarship entries', 'fa', 'صفحه‌ی بورسیه‌های فعال با موارد واقعی'),
     562, 868, 'image/png', 278584),
    ('/images/work/pazhuhesh-portal/gallery/07-about-content.png',
     jsonb_build_object('en', 'A section of the About Us page', 'fa', 'بخشی از صفحه‌ی درباره‌ی ما'),
     559, 871, 'image/png', 386465),
    ('/images/work/pazhuhesh-portal/gallery/08-achievements.png',
     jsonb_build_object('en', 'Achievements page showcasing student results', 'fa', 'صفحه‌ی دستاوردها با نمایش نتایج دانش‌آموزان'),
     562, 867, 'image/png', 323911),
    ('/images/work/pazhuhesh-portal/gallery/09-admin-content-media.png',
     jsonb_build_object('en', 'Image-slot management grid for the About page, with dozens of named slots', 'fa', 'گرید مدیریت جایگاه‌های تصویر صفحه‌ی درباره، با ده‌ها جایگاه نام‌گذاری‌شده'),
     562, 867, 'image/png', 79028),
    ('/images/work/pazhuhesh-portal/gallery/10-responsive-mobile.png',
     jsonb_build_object('en', 'Pazhuhesh homepage rendered natively on a mobile viewport', 'fa', 'صفحه‌ی اصلی پژوهش رندرشده به‌صورت واقعی در ویوپورت موبایل'),
     328, 702, 'image/png', 132952),
    ('/images/work/pazhuhesh-portal/gallery/11-theme-or-bilingual.png',
     jsonb_build_object('en', 'Homepage rendered in dark mode', 'fa', 'صفحه‌ی اصلی رندرشده در حالت تیره'),
     559, 862, 'image/png', 256798)
  returning id, url
),
meta (url, kind, placement, sort_order, caption_en, caption_fa) as (
  values
    ('/images/work/transportation-system/main/01-home-overview.png', 'desktop', 'main', 1, 'Homepage — real trip search, no placeholder cities', 'صفحه‌ی اصلی — جستجوی واقعی سفر، بدون شهر ساختگی'),
    ('/images/work/transportation-system/main/02-trip-search-results.png', 'desktop', 'main', 2, 'Live search results, not a static list', 'نتایج جستجوی زنده، نه یک لیست ثابت'),
    ('/images/work/transportation-system/main/03-seat-selection.png', 'desktop', 'main', 3, 'Seat-level booking — the project''s most distinctive feature', 'رزرو در سطح صندلی — متمایزترین ویژگی این پروژه'),
    ('/images/work/transportation-system/main/04-booking-confirmation.png', 'desktop', 'main', 4, 'End-to-end booking, reaching a real confirmed state', 'رزرو سر تا ته، رسیدن به یک وضعیت واقعی تأییدشده'),
    ('/images/work/transportation-system/main/05-admin-dashboard.png', 'desktop', 'main', 5, 'The real operations system behind the public site', 'سیستم عملیاتی واقعی پشت سایت عمومی'),
    ('/images/work/transportation-system/main/06-admin-reports.png', 'desktop', 'main', 6, 'Business-intelligence reporting, not just basic record-keeping', 'گزارش‌گیری هوش تجاری، فراتر از ثبت ساده'),
    ('/images/work/transportation-system/gallery/07-admin-bookings.png', 'desktop', 'gallery', 7, 'Full booking lifecycle management', 'مدیریت کامل چرخه‌ی عمر رزرو'),
    ('/images/work/transportation-system/gallery/08-admin-trips.png', 'desktop', 'gallery', 8, 'Scheduling and operations control', 'کنترل زمان‌بندی و عملیات'),
    ('/images/work/transportation-system/gallery/09-admin-routes.png', 'desktop', 'gallery', 9, 'Route configuration', 'پیکربندی مسیر'),
    ('/images/work/transportation-system/gallery/10-admin-buses.png', 'desktop', 'gallery', 10, 'Fleet management depth', 'عمق مدیریت ناوگان'),
    ('/images/work/transportation-system/gallery/11-admin-drivers.png', 'desktop', 'gallery', 11, 'Staffing and operations management', 'مدیریت نیروی انسانی و عملیات'),
    ('/images/work/transportation-system/gallery/12-booking-tracking.png', 'desktop', 'gallery', 12, 'Self-service tracking, no account required', 'پیگیری خودسرویس، بدون نیاز به حساب کاربری'),
    ('/images/work/transportation-system/gallery/13-loyalty-coupons.png', 'desktop', 'gallery', 13, 'Retention and promotions, configurable without a code change', 'نگه‌داشت مشتری و تخفیف‌ها، قابل‌تنظیم بدون تغییر کد'),
    ('/images/work/transportation-system/gallery/14-responsive-mobile.png', 'mobile', 'gallery', 14, 'Real responsive layout, captured at native mobile width', 'چیدمان ریسپانسیو واقعی، گرفته‌شده در عرض موبایل'),

    ('/images/work/pazhuhesh-portal/main/01-home-overview.png', 'desktop', 'main', 1, 'Homepage — the study center''s public identity', 'صفحه‌ی اصلی — هویت عمومی مجتمع پژوهش'),
    ('/images/work/pazhuhesh-portal/main/02-study-lounge.png', 'desktop', 'main', 2, 'The distinctive physical-space offering', 'عرضه‌ی متمایز فضای فیزیکی'),
    ('/images/work/pazhuhesh-portal/main/03-academic-services.png', 'desktop', 'main', 3, 'The core content and services offering', 'عرضه‌ی اصلی محتوا و خدمات'),
    ('/images/work/pazhuhesh-portal/main/04-super-admin-dashboard.png', 'desktop', 'main', 4, 'A real CMS behind the public site, not a static build', 'یک CMS واقعی پشت سایت عمومی، نه یک ساخت ثابت'),
    ('/images/work/pazhuhesh-portal/main/05-department-admin.png', 'desktop', 'main', 5, 'Server-verified role-based access, not a UI-only restriction', 'دسترسی نقش‌محور تأییدشده سمت سرور، نه فقط محدودیت رابط کاربری'),
    ('/images/work/pazhuhesh-portal/gallery/06-active-scholarships.png', 'desktop', 'gallery', 6, 'Content depth beyond the homepage preview', 'عمق محتوا فراتر از پیش‌نمایش صفحه‌ی اصلی'),
    ('/images/work/pazhuhesh-portal/gallery/07-about-content.png', 'desktop', 'gallery', 7, 'Rich editorial content management', 'مدیریت محتوای ادیتوریال غنی'),
    ('/images/work/pazhuhesh-portal/gallery/08-achievements.png', 'desktop', 'gallery', 8, 'A distinct content area, tracked separately from About', 'یک بخش محتوایی متمایز، جدا از درباره‌ی ما'),
    ('/images/work/pazhuhesh-portal/gallery/09-admin-content-media.png', 'desktop', 'gallery', 9, 'Real, granular media management — not a generic upload button', 'مدیریت رسانه‌ی واقعی و دقیق — نه یک دکمه‌ی آپلود عمومی'),
    ('/images/work/pazhuhesh-portal/gallery/10-responsive-mobile.png', 'mobile', 'gallery', 10, 'Real responsive layout on mobile', 'چیدمان ریسپانسیو واقعی روی موبایل'),
    ('/images/work/pazhuhesh-portal/gallery/11-theme-or-bilingual.png', 'desktop', 'gallery', 11, 'A real theme system, light and dark', 'یک سیستم واقعی تم، حالت روشن و تیره')
)
insert into public.project_media (project_id, media_id, kind, placement, caption, sort_order)
select
  p.id,
  nm.id,
  meta.kind,
  meta.placement,
  jsonb_build_object('en', meta.caption_en, 'fa', meta.caption_fa),
  meta.sort_order
from new_media nm
join meta on meta.url = nm.url
join public.projects p
  on p.slug = case
    when meta.url like '/images/work/transportation-system/%' then 'transportation-system'
    else 'pazhuhesh-portal'
  end;

-- Backfill cover_image for both projects from their new first `main` image
-- (both were `null` before this migration — see header note).
update public.projects set cover_image = '/images/work/transportation-system/main/01-home-overview.png'
  where slug = 'transportation-system';
update public.projects set cover_image = '/images/work/pazhuhesh-portal/main/01-home-overview.png'
  where slug = 'pazhuhesh-portal';
