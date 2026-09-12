# Phase 6.3 — Content brief: Pezhohesh Complex Portal case study

**Status:** D-06 resolved (12 Sep 2026) — Zakir owns both the Pezhohesh
Complex institute and the development work; no external client
relationship. Publication approved.
**Source verified against:** `github.com/artaveo/pezhohesh-portal`
@ `0ae2484` (3 Sep 2026) — `README.md`, `docs/admin-panel-roadmap.md`,
`vite.config.js`, `sql/phase3_admin_roles_and_rls.sql`.
**Written by:** mother chat (analysis/planning only). **Not yet
implemented** — this is the content package for a coding session,
same handoff pattern as `PHASE-6.2-content-brief.md`.

**Recommended sequencing:** implement 6.2 and 6.3 together in one coding
session (see note at the end of this brief) — both need the same
verification/build/completion-report cycle and the § 6.1 template already
supports both.

---

## Snapshot fields (existing `Project` fields — for reference, unchanged)
- year: **2026**
- status: currently unset in `home-content.ts` for this project — should be
  set explicitly (see open item 2 below)
- githubUrl: `https://github.com/artaveo/pezhohesh-portal` (unchanged)

---

## Context

**en:**
> A bilingual Dari/English portal I built for Pezhohesh Complex, an
> educational institute I run myself — a study lounge, academic advising,
> scholarship listings and student achievements, all manageable by
> non-developer staff through a custom admin panel.

**fa:**
> پورتالی دوزبانه (دری/انگلیسی) که برای مجتمع پژوهش ساختم — مؤسسه‌ای
> آموزشی که خودم اداره‌اش می‌کنم — شامل سالن مطالعه، مشاوره‌ی تحصیلی،
> بورسیه‌های فعال و دستاوردهای دانشجویی، همه از طریق یک پنل ادمین
> اختصاصی که کارکنانِ غیرتوسعه‌دهنده هم می‌توانند مدیریتش کنند.

## Problem & Goals

**en:**
> The institute needed a real content pipeline, not a static site someone
> has to ask a developer to update. Staff needed to publish scholarships,
> edit study-lounge rules, and review membership/advising requests
> themselves — with two different levels of access, since not everyone
> should be able to touch every part of the site. On top of that, visitors
> on unreliable connections needed pages they'd already seen to keep
> working, without the admin panel ever risking a stale view of pending
> requests.

**fa:**
> مؤسسه به یک content pipeline واقعی نیاز داشت، نه یک سایت استاتیک که هر
> بار برای آپدیت باید سراغ یه توسعه‌دهنده رفت. کارکنان باید می‌توانستند
> خودشان بورسیه منتشر کنند، قوانین سالن مطالعه را ویرایش کنند، و
> درخواست‌های عضویت/مشاوره را بررسی کنند — با دو سطح دسترسی متفاوت، چون
> قرار نبود همه بتوانند همه‌جای سایت را دست بزنند. علاوه بر این، بازدیدکننده‌هایی
> که اتصال اینترنت ناپایدار دارند باید صفحاتی که قبلاً دیده‌اند همچنان کار
> کند، بدون این‌که پنل ادمین هیچ‌وقت ریسک دیدن یک نسخه‌ی قدیمیِ درخواست‌های
> در‌انتظار را داشته باشد.

## Constraints

**en:**
> - Solo developer, built for an institute I run myself — real content and
>   real staff, not a demo dataset.
> - Deployed by building locally and uploading `dist/` directly, not a
>   Git-triggered CI/CD pipeline — a deliberate simplicity trade-off for a
>   small, single-maintainer project.
> - Admin panel is Dari-only by design; the public site is bilingual.
> - I'm not a service-worker specialist, so the PWA caching strategy was
>   deliberately built with Workbox's declarative `generateSW` routing
>   rather than a hand-written `injectManifest` fetch handler — simpler
>   and lower-risk to maintain alone, at the cost of less fine-grained
>   control if a future need arises.

**fa:**
> - توسعه‌دهنده‌ی یگانه، برای مؤسسه‌ای که خودم اداره می‌کنم — محتوا و
>   کارکنان واقعی، نه دیتای دمو.
> - استقرار با build محلی و آپلود مستقیم پوشه‌ی `dist/` انجام می‌شود، نه
>   یک پایپ‌لاین CI/CD متصل به Git — یک تصمیم آگاهانه برای سادگی، مناسب
>   یک پروژه‌ی کوچک با یک نگهدارنده.
> - پنل ادمین عمداً فقط دری است؛ سایت عمومی دوزبانه است.
> - چون متخصص service worker نیستم، استراتژی کش PWA عمداً با routing
>   اعلانی Workbox (`generateSW`) ساخته شد، نه یک fetch handler دستی
>   (`injectManifest`) — ساده‌تر و کم‌ریسک‌تر برای نگهداری تنها توسط خودم،
>   با هزینه‌ی کنترل کمتر اگر نیاز دقیق‌تری در آینده پیش بیاید.

## Architecture

**en:**
> A React/Vite single-page app backed by Supabase (PostgreSQL, Storage,
> Edge Functions). A single shared data-fetch function
> (`fetchPortalData()` in `portalService.js`) feeds both the public site
> (`PortalDataContext`) and the admin dashboard (`AdminDataContext`) — one
> source of truth instead of two parallel read paths that could drift.
> `PortalLayout.jsx` enforces role-based routing between the two admin
> experiences. Content follows a recurring "seed + admin list" pattern:
> sensible built-in defaults (rules, FAQs) stay editable rather than being
> silently overwritten by admin changes.

**fa:**
> یک اپلیکیشن تک‌صفحه‌ای (SPA) با React/Vite که روی Supabase (PostgreSQL،
> Storage، Edge Functions) سوار است. یک تابع واحد و مشترک برای خواندن داده
> (`fetchPortalData()` در `portalService.js`) هم سایت عمومی
> (`PortalDataContext`) و هم داشبورد ادمین (`AdminDataContext`) را تغذیه
> می‌کند — یک منبع حقیقت واحد، به‌جای دو مسیر خواندن موازی که ممکن است از
> هم فاصله بگیرند. `PortalLayout.jsx` مسیریابی بر پایه‌ی نقش را بین دو
> تجربه‌ی ادمین اجرا می‌کند. محتوا از یک الگوی تکرارشونده‌ی «پیش‌فرض +
> فهرست ادمین» پیروی می‌کند: پیش‌فرض‌های داخلی معقول (قوانین، سوالات
> متداول) قابل‌ویرایش می‌مانند، نه این‌که با تغییرات ادمین بی‌صدا بازنویسی
> شوند.

## Key Decisions (Decision Record cards)

**Card 1 — en:**
> **Context:** The PWA needed offline access to previously visited pages,
> but the admin panel must never show stale data — a pending request that
> was already approved must not reappear after a refresh.
> **Decision:** The service worker's navigation fallback (the offline
> "app shell") explicitly excludes every `/admin` route
> (`navigateFallbackDenylist`), and no Workbox runtime-caching rule was
> written for the Supabase REST calls the admin panel depends on — so
> those requests are never intercepted by the cache layer at all, online
> or offline.
> **Trade-off:** If an admin genuinely loses connection, they see a normal
> browser connection error instead of a (safe but confusing) cached shell
> — chosen deliberately over silently serving anything that could be
> mistaken for live data.

**Card 1 — fa:**
> **زمینه:** PWA باید دسترسی آفلاین به صفحات قبلاً دیده‌شده را می‌داشت،
> ولی پنل ادمین هرگز نباید دیتای قدیمی نشان بدهد — یک درخواست در‌انتظار
> که قبلاً تأیید شده، نباید بعد از رفرش دوباره ظاهر شود.
> **تصمیم:** navigation fallback سرویس‌ورکر (یعنی «پوسته‌ی آفلاین») به‌طور
> صریح هر مسیر `/admin` را مستثنی می‌کند (`navigateFallbackDenylist`)، و
> هیچ runtime-caching rule ای برای فراخوانی‌های REST سوپابیسی که پنل ادمین
> به آن‌ها وابسته است نوشته نشد — پس این درخواست‌ها اصلاً هیچ‌وقت، چه
> آنلاین چه آفلاین، توسط لایه‌ی کش رهگیری نمی‌شوند.
> **بده-بستان:** اگر ادمین واقعاً اتصالش قطع شود، خطای معمولی مرورگر را
> می‌بیند به‌جای یک پوسته‌ی کش‌شده (بی‌خطر ولی گیج‌کننده) — این آگاهانه
> انتخاب شد به‌جای سرو کردن بی‌صدای چیزی که ممکن است با دیتای زنده اشتباه
> گرفته شود.

**Card 2 — en:**
> **Context:** Portal content (settings, scholarships) already had a
> localStorage-backed stale-while-revalidate layer built into
> `portalService.js` — show the local copy instantly, refresh from the
> database in the background.
> **Decision:** Deliberately did not add a Workbox runtime-caching rule on
> top of that for the same data, since it would duplicate a
> stale-while-revalidate behaviour that already existed, with no added
> benefit and one more layer to keep in sync.
> **Trade-off:** Only uploaded images (Supabase Storage) get a Workbox
> `CacheFirst` rule (90-day / 300-entry cap, oldest purged first) — a
> narrower caching surface than "cache everything," but each caching
> decision maps to a specific, understood need rather than a blanket
> policy.

**Card 2 — fa:**
> **زمینه:** محتوای پورتال (تنظیمات، بورسیه‌ها) از قبل یک لایه‌ی
> stale-while-revalidate مبتنی بر localStorage داخل `portalService.js`
> داشت — نمایش فوری نسخه‌ی محلی، به‌روزرسانی از دیتابیس در پس‌زمینه.
> **تصمیم:** عمداً یک runtime-caching rule تازه‌ی Workbox روی همان داده
> اضافه نشد، چون همان رفتار stale-while-revalidate را که از قبل وجود
> داشت تکرار می‌کرد، بدون فایده‌ی اضافه و با یک لایه‌ی بیشتر برای
> هماهنگ‌نگه‌داشتن.
> **بده-بستان:** فقط عکس‌های آپلودشده (Supabase Storage) یک قانون
> `CacheFirst` در Workbox دارند (سقف ۹۰ روز / ۳۰۰ ورودی، قدیمی‌ترین اول
> پاک می‌شود) — سطح کشِ محدودتر از «همه‌چیز را کش کن»، ولی هر تصمیم کش
> دقیقاً به یک نیاز مشخص و فهمیده‌شده نگاشت می‌شود، نه یک سیاست یکسان
> برای همه.

## Engineering Highlight

**en:**
> The hardest problem wasn't making the PWA work offline — it was deciding
> what should *not* be cached. Three different kinds of data live behind
> the same Supabase project: public portal content, admin-only pending
> requests, and uploaded images. Caching all of it the same way would have
> been simpler to write but would have risked an admin seeing an approved
> request as still pending, or a public visitor seeing week-old
> scholarship data as current. Instead, each data type got its own rule:
> public content relies on the existing localStorage layer (no Workbox
> caching added), admin routes are excluded from the cache entirely at the
> navigation level, and only uploaded images get real HTTP caching with an
> expiration policy. The Department Admin role required the same
> "narrower than it looks" thinking on the database side: a fail-closed
> allow-list (`is_key_allowed_for_services_admin`) defines exactly which
> settings keys a scoped admin can write, so a new field added to that
> panel later is denied by default until it's explicitly added to the
> list — not silently allowed.

**fa:**
> سخت‌ترین بخش کار نه ساختن یک PWA آفلاین، بلکه تصمیم‌گیری درباره‌ی این
> بود که چه چیزی *نباید* کش شود. سه نوع داده‌ی متفاوت پشت یک پروژه‌ی
> Supabase یکسان زندگی می‌کنند: محتوای عمومی پورتال، درخواست‌های
> در‌انتظارِ فقط-ادمین، و تصاویر آپلودشده. کش‌کردن همه‌ی این‌ها به یک
> شکل، نوشتنش ساده‌تر بود ولی این ریسک را داشت که یک ادمین درخواستی را
> که قبلاً تأیید شده، همچنان «در‌انتظار» ببیند، یا یک بازدیدکننده‌ی
> عمومی دیتای بورسیه‌ی یک‌هفته‌پیش را به‌عنوان دیتای امروز ببیند. به‌جایش،
> هر نوع داده قانون خودش را گرفت: محتوای عمومی روی همان لایه‌ی
> localStorage موجود تکیه می‌کند (بدون کش تازه‌ی Workbox)، مسیرهای ادمین
> کلاً از سطح navigation از کش مستثنی هستند، و فقط تصاویر آپلودشده کش
> واقعی HTTP با سیاست انقضا می‌گیرند. نقش Department Admin هم همین طرز فکر
> «محدودتر از ظاهرش» را در سطح دیتابیس نیاز داشت: یک allow-list
> fail-closed (`is_key_allowed_for_services_admin`) دقیقاً مشخص می‌کند
> کدام کلیدهای تنظیمات برای یک ادمین محدود قابل‌نوشتن‌اند، پس یک فیلد تازه
> که بعداً به آن پنل اضافه شود به‌طور پیش‌فرض رد می‌شود تا زمانی که صریحاً
> به لیست اضافه شود — نه این‌که بی‌صدا مجاز باشد.

## Data Integrity & Security

**en:**
> - Two admin roles (`super_admin`, `services_admin`) enforced with a
>   database-level `check` constraint, not just an app-side assumption.
> - Department-scoped writes use a fail-closed allow-list function
>   (`is_key_allowed_for_services_admin`) — an unlisted key is denied, not
>   silently accepted, if the admin panel grows later.
> - Row-Level Security policies scope what each role can read and write.
> - Portal request submissions (membership, advising) go through a
>   server-side, rate-limited Supabase Edge Function rather than an
>   unthrottled client-side insert.

**fa:**
> - دو نقش ادمین (`super_admin`، `services_admin`) با یک `check
>   constraint` در سطح دیتابیس اجرا می‌شوند، نه فقط یک فرض در سمت اپ.
> - نوشتن‌های محدود به یک بخش، از یک تابع allow-list با رویکرد fail-closed
>   استفاده می‌کنند (`is_key_allowed_for_services_admin`) — کلید
>   فهرست‌نشده رد می‌شود، نه بی‌صدا پذیرفته، اگر پنل ادمین بعداً بزرگ‌تر
>   شود.
> - سیاست‌های Row-Level Security مشخص می‌کنند هر نقش چه چیزی را می‌تواند
>   بخواند و بنویسد.
> - ارسال درخواست‌های پورتال (عضویت، مشاوره) از یک Supabase Edge Function
>   با محدودیت نرخ درخواست (rate-limited) در سمت سرور عبور می‌کند، نه یک
>   insert بی‌محدودیت مستقیم از کلاینت.

## Responsive & RTL

**en:**
> RTL-first from the ground up — Tailwind logical properties and OKLCH
> color tokens rather than an LTR layout patched with `dir="rtl"`. Dari is
> the default language; English is available via a language-preference
> prompt shown once to first-time visitors.

**fa:**
> RTL از پایه و اول — با استفاده از logical properties در Tailwind و
> توکن‌های رنگ OKLCH، نه یک چیدمان LTR که بعداً با `dir="rtl"` وصله شده
> باشد. دری زبان پیش‌فرض است؛ انگلیسی از طریق یک پیام یک‌باره‌ی انتخاب
> زبان به بازدیدکننده‌های تازه در دسترس است.

## Quality

**en:**
> - The caching strategy was verified with a real production build +
>   preview (`npm run build && npm run preview`), not just in the Vite dev
>   server, since the service worker is intentionally disabled in dev.
> - Fail-closed permission checks (deny by default, allow explicitly) used
>   for the Department Admin role, rather than a broader access pattern
>   that would need remembering to lock down later.
> - No dedicated automated test suite or CI/CD pipeline — deployment is a
>   manual local build and upload, tracked here as a real limitation for a
>   single-maintainer project rather than hidden as if a pipeline exists.

**fa:**
> - استراتژی کش با یک build واقعی تولید + preview (`npm run build &&
>   npm run preview`) اعتبارسنجی شد، نه فقط در سرور توسعه‌ی Vite، چون
>   سرویس‌ورکر عمداً در حالت dev غیرفعال است.
> - برای نقش Department Admin از چک دسترسی fail-closed (پیش‌فرض رد،
>   مجاز فقط با تصریح) استفاده شد، نه یک الگوی دسترسی گسترده‌تر که بعداً
>   باید یادت می‌ماند محدودش کنی.
> - هیچ مجموعه‌ی تست خودکار اختصاصی یا پایپ‌لاین CI/CD وجود ندارد —
>   استقرار یک build محلی دستی و آپلود است، اینجا به‌عنوان یک محدودیت
>   واقعیِ یک پروژه‌ی تک‌نگهدارنده ثبت شده، نه پنهان‌شده طوری که انگار
>   پایپ‌لاینی وجود دارد.

## Current Status & Next

**en:**
> Finished: bilingual public portal, dual-role admin CMS, offline-first
> data layer, installable PWA with per-data-type caching, rate-limited
> request submissions. Per the project's own admin-panel roadmap, the next
> planned stages are richer content management (stage 2), a full
> scholarship model with status/search/filtering (stage 3), and
> operations/security work — user roles and audit logging, media uploads,
> notifications, backup, and a move off the current local-file content
> source toward the database as the sole source of truth (stage 4).

**fa:**
> انجام‌شده: پورتال عمومی دوزبانه، CMS ادمین دو-نقشی، لایه‌ی داده‌ی
> offline-first، PWA نصب‌شدنی با کش تنظیم‌شده به‌ازای هر نوع داده، و ارسال
> درخواست‌های با محدودیت نرخ. طبق خودِ نقشه‌ی توسعه‌ی پنل ادمین این پروژه،
> مراحل بعدیِ برنامه‌ریزی‌شده عبارت‌اند از مدیریت محتوای غنی‌تر (مرحله‌ی
> دوم)، مدل کامل بورسیه با وضعیت/جست‌وجو/فیلتر (مرحله‌ی سوم)، و کارهای
> عملیات/امنیت — نقش‌های کاربری و ثبت رویداد، بارگذاری رسانه، اعلان‌ها،
> پشتیبان‌گیری، و انتقال از منبع فعلیِ فایل محلی به دیتابیس به‌عنوان تنها
> منبع حقیقت (مرحله‌ی چهارم).

## Lessons Learned

**en:**
> Building an offline-first PWA taught me that the interesting design work
> isn't "add a service worker" — it's deciding, data type by data type,
> whether caching helps or actively creates a correctness risk. The
> instinct to cache everything for a snappier offline experience would
> have been wrong for at least two of the three data types in this
> project. I now start every caching decision by asking what happens if
> this specific piece of data is stale, rather than applying one caching
> policy to the whole app.

**fa:**
> ساختن یک PWA آفلاین‌فرست به من یاد داد که کار طراحیِ جالب «اضافه‌کردن
> یک سرویس‌ورکر» نیست — تصمیم‌گیری است، نوع‌به‌نوع داده، درباره‌ی این‌که
> کش‌کردن کمک می‌کند یا فعالانه یک ریسک صحت‌داده می‌سازد. غریزه‌ی «همه‌چیز
> را برای تجربه‌ی آفلاینِ سریع‌تر کش کن» برای دست‌کم دو تا از سه نوع داده‌ی
> این پروژه اشتباه از آب درمی‌آمد. الان هر تصمیم کش را با این سؤال شروع
> می‌کنم که اگر این تکه‌ی مشخص از داده قدیمی باشد چه اتفاقی می‌افتد، نه
> با اعمال یک سیاست کش یکسان روی کل اپ.

## Links
- Repository: `https://github.com/artaveo/pezhohesh-portal` (existing field, unchanged)
- Live demo: none listed in repo docs — omit field (no invented URL)
- Related service: link to the relevant Artaveo service slug once § 7 (Services) ships

---

## Open items for the coding session
1. Insert the above `{ en, fa }` content into the `pazhuhesh-portal` entry
   in `lib/home-content.ts` (same optional `Project` fields as § 6.2).
2. **`status` field is currently unset** for this project in
   `home-content.ts` — set it explicitly (`in-development` looks accurate
   given stage 2–4 of the admin roadmap are still open; confirm with
   Zakir rather than assuming `live`).
3. Add `year: 2026` if the `Project` type needs it for snapshot display.
4. **Screenshots:** no `Portfoli`-style screenshot folder was found in
   this repo during this review — `public/images` exists but wasn't
   audited for real student/staff PII. Review before using any as
   `coverImage`.
5. Run `node scripts/check-content-placeholders.mjs` after insertion.
6. Add entries to `docs/content/claims-ledger.md` for this case study (see
   companion additions drafted alongside this brief).
7. **Recommended: implement together with Phase 6.2.** Both case studies
   are independent content (per roadmap § 6.2/6.3 note — "not merged"),
   but running one build/typecheck/verification/completion-report cycle
   for both saves overhead versus two separate coding sessions. Roadmap
   still records them as separate sub-phases with separate completion
   entries per § 18.2 — only the coding session itself is combined.
