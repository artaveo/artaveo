# Phase 6.2 — Content brief: Transportation System case study

**Status:** D-06 resolved (12 Sep 2026) — sole ownership confirmed by Zakir, no
external client, publication approved.
**Source verified against:** `github.com/artaveo/Transportation-System`
@ `55ad93d` (10 Sep 2026) — `README.md`, `ROAD-MAP.md`, `PHASE-6_1-README.md`,
`PHASE-6_2-README.md`.
**Written by:** mother chat (analysis/planning only). **Not yet implemented**
in code — this is the content package for a coding session to drop into the
`Project` object for `transportation-system` in `lib/home-content.ts`
(fields already exist on the `Project` type from § 6.1, currently empty for
this slug).

Every section below is `{ en, fa }`. Persian is written for Persian readers
(§ 16.2), not translated word-for-word. Nothing here is invented — see the
companion claims ledger (`docs/content/claims-ledger.md`) for evidence per
claim. Where the source repo's own docs use a term like "client" (e.g. the
README's license line), that is boilerplate carried over from a template,
not evidence of an external client — confirmed directly with Zakir.

---

## Snapshot fields (existing `Project` fields — for reference, unchanged)
- year: **2026**
- status: `in-development` (unchanged — accurate; no live payment provider yet)
- githubUrl: `https://github.com/artaveo/Transportation-System` (unchanged)

---

## Context

**en:**
> A booking and operations platform built for intercity bus companies in
> Afghanistan. The market runs on manual ticket counters and phone-based
> booking, with no shared system connecting passenger sales to fleet and
> trip operations. I built this as a real product bet: passengers get a
> live seat map and a bookable trip search, and operators get a database-
> backed admin for routes, fleet, drivers, trips and reporting — the two
> sides of the same booking, in one system.

**fa:**
> پلتفرمی برای رزرو و مدیریت عملیات شرکت‌های اتوبوس‌رانی بین‌شهری در
> افغانستان. این بازار هنوز عمدتاً با گیشه‌های فروش دستی و رزرو تلفنی
> اداره می‌شود، بدون هیچ سامانه‌ی مشترکی که فروش بلیت را به عملیات ناوگان
> و سفرها متصل کند. این پروژه را به‌عنوان یک محصول واقعی ساختم: مسافران
> نقشه‌ی زنده‌ی صندلی‌ها و جست‌وجوی سفر دارند، و اپراتورها یک پنل مدیریت
> متصل به پایگاه‌داده برای مسیرها، ناوگان، رانندگان، سفرها و گزارش‌ها —
> دو طرف یک رزرو، در یک سیستم واحد.

## Problem & Goals

**en:**
> The core problem: seat availability and payment status are business-
> critical state that a booking site cannot let the browser decide. If two
> people can claim the same seat, or a cancelled booking can silently keep
> its payment marked as taken, the platform is unusable for a real
> operator. The goal was a passenger booking flow and an operations admin
> where every sensitive decision — holding a seat, confirming a booking,
> changing a payment's status — is made and enforced by the database, not
> the UI.

**fa:**
> مسئله‌ی اصلی این بود: در دسترس بودن صندلی و وضعیت پرداخت، داده‌ی حیاتیِ
> کسب‌وکار هستند که نباید تصمیم‌گیری‌شان به مرورگر سپرده شود. اگر دو نفر
> بتوانند یک صندلی را هم‌زمان بگیرند، یا رزروی که لغو شده هنوز پرداختش
> «گرفته‌شده» ثبت بماند، سامانه برای یک اپراتور واقعی قابل‌استفاده نیست.
> هدف این بود که در مسیر رزرو مسافر و پنل عملیات، هر تصمیم حساس — نگه‌داشتن
> موقت صندلی، تأیید رزرو، تغییر وضعیت پرداخت — توسط پایگاه‌داده گرفته و
> اجرا شود، نه توسط رابط کاربری.

## Constraints

**en:**
> - Solo developer — architecture, schema, frontend, backend and admin all
>   planned and built by one person, so decisions were scoped to what could
>   be verified and maintained alone.
> - No live payment provider yet: HesabPay (the target gateway) integration
>   is blocked on getting developer/sandbox credentials from the provider —
>   an external dependency outside my control, not a technical gap.
> - Built for a bilingual Dari/English market with RTL as the primary
>   reading direction, not an English-first product with translation
>   bolted on.
> - No dedicated QA or security team — security review relies on Supabase's
>   own advisory tooling plus manual verification against a rolled-back
>   transaction on real data before any migration ships.

**fa:**
> - توسعه‌دهنده‌ی یگانه — معماری، طرح پایگاه‌داده، فرانت‌اند، بک‌اند و پنل
>   مدیریت همه توسط یک نفر برنامه‌ریزی و ساخته شده، پس تصمیم‌ها به چیزی
>   محدود ماندند که یک نفر بتواند به‌تنهایی اعتبارسنجی و نگهداری کند.
> - هنوز هیچ درگاه پرداخت زنده‌ای وصل نیست: اتصال حساب‌پی (درگاه هدف) روی
>   دریافت اطلاعات دولوپر/sandbox از خودِ حساب‌پی بلاک است — یک وابستگی
>   بیرونی، نه یک خلأ فنی.
> - این پروژه برای یک بازار دوزبانه‌ی دری/انگلیسی با RTL به‌عنوان جهت اصلی
>   خواندن ساخته شده، نه یک محصول انگلیسی‌محور که بعداً ترجمه شده باشد.
> - تیم اختصاصی QA یا امنیت وجود ندارد — بررسی امنیتی روی ابزار advisory
>   خودِ Supabase به‌علاوه اعتبارسنجی دستی روی داده‌ی واقعی (در تراکنشی که
>   در پایان rollback می‌شود) پیش از هر migration انجام می‌گیرد.

## Architecture

**en:**
> Next.js (App Router) talks to PostgreSQL through Supabase for both the
> passenger app and the operations admin. Supabase Auth handles sessions;
> every privileged read or write additionally passes through PostgreSQL
> Row-Level Security plus explicit server-side authorization checks — a
> service-role client is never treated as an authorization decision by
> itself. Seat availability follows a strict state machine (`AVAILABLE →
> HELD → BOOKED`, with holds expiring back to `AVAILABLE`), and payment
> status follows its own database-enforced state machine (below). The
> browser only ever displays state; it never originates it.

**fa:**
> فرانت‌اند Next.js (App Router) برای هم مسیر مسافر و هم پنل عملیات، از
> طریق Supabase با PostgreSQL صحبت می‌کند. نشست‌ها با Supabase Auth مدیریت
> می‌شوند؛ هر خواندن یا نوشتنِ حساس، علاوه بر آن، از Row-Level Security در
> PostgreSQL و بررسی صریح دسترسی در سمت سرور هم عبور می‌کند — صرفِ داشتن
> کلاینت service-role هرگز به‌تنهایی یک تصمیم دسترسی حساب نمی‌شود. در
> دسترس‌بودن صندلی از یک state machine دقیق پیروی می‌کند
> (`AVAILABLE → HELD → BOOKED`، با انقضای نگه‌داشت‌ها به `AVAILABLE`)، و
> وضعیت پرداخت هم state machine مستقل خودش را دارد (پایین‌تر). مرورگر فقط
> وضعیت را نمایش می‌دهد، هرگز آن را تولید نمی‌کند.

## Key Decisions (Decision Record cards)

**Card 1 — en:**
> **Context:** A payment could move between statuses (`pending`,
> `confirmed`, `refunded`, `failed`) through direct database writes, since
> admins already had write access to the `payments` table from an earlier
> phase.
> **Decision:** Added a database trigger that enforces the payment state
> machine at the row level — only `pending→confirmed`, `pending→failed`,
> and `confirmed→refunded` are allowed, rejected even on a direct `UPDATE`,
> not just through the app's own functions.
> **Trade-off:** Any future legitimate transition (e.g. a `failed` retry)
> needs an explicit trigger change, not just an app-side code change — more
> friction, but the state can no longer drift silently.

**Card 1 — fa:**
> **زمینه:** پرداخت می‌توانست از طریق نوشتن مستقیم روی جدول، بین وضعیت‌ها
> (`pending`، `confirmed`، `refunded`، `failed`) جابه‌جا شود، چون ادمین‌ها
> از یک فاز قبلی‌تر، از قبل دسترسی نوشتن روی جدول `payments` داشتند.
> **تصمیم:** یک تریگر سطح دیتابیس اضافه شد که state machine پرداخت را در
> سطح ردیف اجرا می‌کند — فقط `pending→confirmed`، `pending→failed`، و
> `confirmed→refunded` مجازند، حتی روی یک `UPDATE` مستقیم رد می‌شوند، نه
> فقط از مسیر توابع خودِ اپلیکیشن.
> **بده-بستان:** هر گذار مشروع تازه در آینده (مثلاً تلاش دوباره روی
> `failed`) نیاز به تغییر صریح تریگر دارد، نه فقط تغییر کد اپ — اصطکاک
> بیشتر، اما وضعیت دیگر نمی‌تواند بی‌سروصدا منحرف شود.

**Card 2 — en:**
> **Context:** Partial refunds needed to release any coupon used on the
> booking, but wallet balance was also in scope for "what should a refund
> touch."
> **Decision:** Checked real data before writing any logic — every existing
> booking had a zero wallet deduction, because wallet debiting was never
> wired into the booking-confirmation path in the first place. Built coupon
> release only; left wallet refund logic undone rather than building a
> return path for money that was never actually taken.
> **Trade-off:** The refund feature is incomplete until wallet debiting
> ships — documented as open debt rather than papered over with unused
> code.

**Card 2 — fa:**
> **زمینه:** بازپرداخت جزئی باید کوپن استفاده‌شده روی رزرو را آزاد می‌کرد،
> ولی موجودی wallet هم در محدوده‌ی «بازپرداخت باید چه چیزهایی را برگرداند»
> بود.
> **تصمیم:** قبل از نوشتن هر منطقی، داده‌ی واقعی چک شد — همه‌ی رزروهای
> موجود کسر wallet صفر داشتند، چون خودِ کسر از wallet هیچ‌وقت در مسیر
> تأیید رزرو wire نشده بود. فقط آزادسازی کوپن ساخته شد؛ منطق بازگرداندن
> wallet عمداً ساخته‌نشده ماند، به‌جای ساختن یک مسیر بازگشتِ پولی که
> هیچ‌وقت واقعاً گرفته نشده بود.
> **بده-بستان:** فیچر بازپرداخت تا زمانی که کسر از wallet ساخته شود ناقص
> می‌ماند — این به‌عنوان بدهی باز مستند شد، نه با کدی بلااستفاده پنهان.

## Engineering Highlight

**en:**
> While building the refund path, a security review with Supabase's
> advisory tooling turned up a real gap: the function that writes to the
> payment audit-trail table was callable directly by any authenticated (or
> even anonymous) client, with no permission check of its own — because it
> was only ever meant to be called internally, from inside other trusted
> functions. That meant anyone could have written fake entries into the
> audit history and undermined the one table meant to make payment changes
> reviewable. I revoked execute permission on that function from every
> role except its owner, then re-verified with a direct privilege check
> (not just the advisory tool) that only trusted internal callers could
> reach it. The same review also caught a real functional bug: an admin
> could "cancel" a booking whose payment was already confirmed, leaving
> the booking cancelled but the payment still marked as taken — money in,
> booking gone. I closed that path with an explicit error and routed it
> through the new refund function instead, so a paid booking can only be
> unwound by actually refunding it.

**fa:**
> در حین ساخت مسیر بازپرداخت، یک بررسی امنیتی با ابزار advisory خودِ
> Supabase یک خلأ واقعی را نشان داد: تابعی که در جدول تاریخچه‌ی پرداخت‌ها
> می‌نوشت، بدون هیچ چک دسترسی مستقلی، مستقیماً توسط هر کلاینتِ
> احراز‌هویت‌شده (حتی مهمان) قابل‌فراخوانی بود — چون قرار بود فقط از
> داخل توابع مورد‌اعتماد دیگر صدا زده شود. این یعنی هرکسی می‌توانست
> رویدادهای جعلی در تاریخچه‌ی audit بنویسد و کل ارزش تنها جدولی که قرار
> بود تغییرات پرداخت را قابل‌بازبینی کند، از بین ببرد. دسترسی اجرای آن
> تابع از همه‌ی نقش‌ها جز مالکش سلب شد، و بعد با یک بررسی مستقیم سطح
> دسترسی (نه فقط ابزار advisory) تأیید شد که فقط فراخوان‌های داخلیِ
> مورد‌اعتماد به آن دسترسی دارند. همین بررسی یک باگ واقعی دیگر را هم پیدا
> کرد: ادمین می‌توانست رزروی را که پرداختش قبلاً تأیید شده بود «لغو» کند،
> در حالی که رزرو لغو می‌شد ولی پرداخت همچنان «دریافت‌شده» می‌ماند — پول
> گرفته‌شده، رزرو حذف‌شده. این مسیر با یک خطای صریح بسته شد و به‌جایش از
> تابع تازه‌ی بازپرداخت عبور می‌کند، پس یک رزروِ پرداخت‌شده فقط با
> بازپرداختِ واقعی قابل‌لغو است.

## Data Integrity & Security

**en:**
> - PostgreSQL Row-Level Security on every business table, paired with
>   server-side authorization checks — not RLS alone.
> - A database trigger enforces the payment state machine at the row
>   level, closing off direct-`UPDATE` bypasses.
> - A dedicated `payment_status_events` audit trail, writable only through
>   one internal function, gives every payment status change a reviewable
>   history (who, when, why).
> - Permission-center model for limited admins: access is scoped per
>   section (bookings, payments, etc.), not all-or-nothing.
> - Security reviews use Supabase's advisory tooling plus direct privilege
>   checks (`has_function_privilege`) rather than trusting the advisory
>   output alone.

**fa:**
> - Row-Level Security در PostgreSQL روی هر جدول کسب‌وکاری، همراه با
>   بررسی دسترسی سمت سرور — نه صرفاً تکیه بر RLS.
> - یک تریگر دیتابیس، state machine پرداخت را در سطح ردیف اجرا می‌کند و
>   مسیر دورزدن از طریق `UPDATE` مستقیم را می‌بندد.
> - جدول اختصاصی `payment_status_events` که فقط از طریق یک تابع داخلی
>   قابل‌نوشتن است، به هر تغییر وضعیت پرداخت یک تاریخچه‌ی قابل‌بازبینی
>   می‌دهد (چه‌کسی، چه‌زمانی، چرا).
> - مدل مرکز دسترسی برای ادمین‌های محدود: دسترسی به‌ازای هر بخش (رزروها،
>   پرداخت‌ها و…) مشخص می‌شود، نه همه‌یا‌هیچ.
> - بررسی‌های امنیتی هم از ابزار advisory خودِ Supabase و هم از چک مستقیم
>   دسترسی (`has_function_privilege`) استفاده می‌کنند، نه اتکای صرف به
>   خروجی ابزار advisory.

## Responsive & RTL

**en:**
> Built with five responsive tiers from mobile (<768px) through
> ultra-wide (2560px+), covering both the passenger booking flow and the
> admin's wide data tables. RTL/LTR behaviour is treated as a layout
> requirement from the start (Dari/English), not a late pass — including
> RTL-aware admin navigation and wide-table handling.

**fa:**
> با پنج سطح واکنش‌گرا از موبایل (کمتر از ۷۶۸ پیکسل) تا فوق‌عریض (۲۵۶۰+
> پیکسل) ساخته شده، هم برای مسیر رزرو مسافر و هم جدول‌های عریض پنل ادمین.
> رفتار RTL/LTR (دری/انگلیسی) از همان ابتدا یک نیاز معماری بوده، نه یک
> پاس اضافه در پایان — شامل ناوبری ادمین سازگار با RTL و مدیریت جدول‌های
> عریض.

## Quality

**en:**
> - Every migration validated against real production data inside a
>   transaction that is rolled back afterward — never tested only in
>   theory.
> - `tsc --noEmit` and a full `next build` run after each phase; the
>   project tracks a known TypeScript baseline count so new errors are
>   never silently absorbed into "pre-existing" noise.
> - Security posture re-checked after schema changes with Supabase's
>   advisory tooling and direct privilege queries.
> - No dedicated automated test suite or CI pipeline yet — tracked
>   explicitly as debt, not hidden.

**fa:**
> - هر migration روی داده‌ی واقعیِ تولید، داخل تراکنشی که در پایان
>   rollback می‌شود، اعتبارسنجی شده — هرگز فقط در تئوری تست نشده.
> - `tsc --noEmit` و یک `next build` کامل بعد از هر فاز اجرا می‌شود؛
>   پروژه یک شمارش پایه‌ی شناخته‌شده از خطاهای TypeScript موجود را ردیابی
>   می‌کند تا خطای تازه هیچ‌وقت بی‌صدا داخل نویزِ «از قبل بوده» گم نشود.
> - وضعیت امنیتی بعد از هر تغییر schema با ابزار advisory Supabase و
>   کوئری مستقیم سطح دسترسی دوباره چک می‌شود.
> - هنوز هیچ مجموعه‌ی تست خودکار اختصاصی یا پایپ‌لاین CI وجود ندارد — این
>   به‌صراحت به‌عنوان بدهی ثبت شده، نه پنهان‌شده.

## Current Status & Next

**en:**
> Finished: passenger booking with server-enforced seat holds, operations
> admin (routes/fleet/drivers/trips/bookings/reports/CSV), loyalty and
> coupon foundations, a public CMS lite with in-site responsive image
> cropping, and a full payment-status state machine with audit trail and
> partial refunds — all running on manual/offline payment confirmation.
> Not finished: a live payment gateway. HesabPay integration is the next
> planned step and is blocked on getting developer/sandbox credentials
> from the provider — until that's resolved, online bookings are recorded
> but stay in a pending payment state rather than auto-confirming.

**fa:**
> انجام‌شده: رزرو مسافر با نگه‌داشت صندلی که سمت سرور اجرا می‌شود، پنل
> عملیات (مسیرها/ناوگان/رانندگان/سفرها/رزروها/گزارش‌ها/CSV)، پایه‌های
> loyalty و کوپن، یک CMS lite عمومی با کراپ تصویر واکنش‌گرای درون‌سایتی،
> و یک state machine کامل برای وضعیت پرداخت همراه با تاریخچه‌ی audit و
> بازپرداخت جزئی — همه روی تأیید دستی/آفلاینِ پرداخت. انجام‌نشده: درگاه
> پرداخت زنده. اتصال حساب‌پی گام بعدی برنامه‌ریزی‌شده است و روی دریافت
> اطلاعات دولوپر/sandbox از خودِ حساب‌پی بلاک مانده — تا حل آن، رزروهای
> آنلاین ثبت می‌شوند اما در وضعیت پرداختِ در‌انتظار می‌مانند، نه تأیید
> خودکار.

## Lessons Learned

**en:**
> The most valuable finding in this phase wasn't a new feature — it was
> what a security review turned up in code that already shipped: a
> function with no permission check of its own, reachable because it was
> assumed to only ever be called from trusted places. Assumptions about
> "who calls this" are not access control. I now treat every
> database function as if it will be called directly by an untrusted
> client, and check that assumption explicitly rather than inferring it
> from how the function is currently used in the app.

**fa:**
> ارزشمندترین یافته‌ی این فاز یک فیچر تازه نبود — چیزی بود که یک بررسی
> امنیتی در کدی که از قبل منتشر شده بود پیدا کرد: تابعی بدون هیچ چک
> دسترسی مستقل، قابل‌دسترس چون فرض شده بود فقط از جاهای مورد‌اعتماد صدا
> زده می‌شود. فرض «چه‌کسی این را صدا می‌زند» کنترل دسترسی نیست. اکنون با
> هر تابع دیتابیس طوری رفتار می‌کنم که انگار مستقیماً توسط یک کلاینت
> غیرقابل‌اعتماد فراخوانی خواهد شد، و این فرض را صریحاً چک می‌کنم، نه از
> روی نحوه‌ی استفاده‌ی فعلی تابع در اپ حدس می‌زنم.

## Links
- Repository: `https://github.com/artaveo/Transportation-System` (existing field, unchanged)
- Live demo: none yet — omit field (no invented URL)
- Related service: link to the relevant Artaveo service slug once § 7 (Services) ships

---

## Open items for the coding session
1. Insert the above `{ en, fa }` content into the `transportation-system`
   entry in `lib/home-content.ts` (fields already exist on `Project`, per
   § 6.1: `context`, `problemAndGoals`, `constraints`, `architecture`,
   `keyDecisions` (`DecisionRecord[]`), `engineeringHighlight`,
   `dataIntegrityAndSecurity`, `responsiveAndRtl`, `quality`,
   `currentStatusAndNext`, `lessonsLearned`).
2. Add a `year: 2026` field if the `Project` type doesn't already carry one
   for snapshot display (check `types/content.ts`).
3. **Screenshots:** the `Transportation-System` repo has a `Portfoli/`
   folder of screenshots (9 images, 9 Sep 2026) not yet reviewed for D-06
   compliance (demo data only, no real customer PII). Review each before
   using any as `coverImage` — this was not done as part of this content
   brief.
4. Run `node scripts/check-content-placeholders.mjs` after insertion.
5. Write `docs/content/claims-ledger.md` entries for this case study (see
   companion file `docs/content/claims-ledger.md` drafted alongside this
   brief — verify and extend, don't just copy blindly).
6. Update `docs/phases/PHASE-6.1-README.md`'s "what's deferred" note and
   the roadmap phase-6 status once 6.2 content actually ships in code
   (per § 18.2 — this brief is not itself a completion report).
