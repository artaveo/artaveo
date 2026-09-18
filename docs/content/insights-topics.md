# Insights — topic backlog

Roadmap Phase 17: "seed topics from real work". These are **topics with
evidence pointers, not articles.** Nothing here is published, nothing here
is in the database, and no claim below may be repeated on the site until the
"check before writing" item for that topic has been done (§ 16.4, § 16.5).

The first three are the planned topics that used to live, unpublished, in
`lib/home-content.ts` (`insightsData`, removed in Phase 17); their titles and
excerpts are kept here so nothing is lost. The fourth is named in the
roadmap.

How to use this: pick a topic, do its "check before writing" step, write the
article in the admin (`/admin/content/articles`, both languages), preview it,
and add each factual claim to `docs/content/claims-ledger.md` when it goes
live.

---

## 1. Keeping seat bookings correct under concurrent requests

- **slug:** `concurrent-seat-booking` · **category:** Backend / بک‌اند
- **EN excerpt:** Why the database, not the browser, has to decide who owns a
  seat — and how holds and confirmations are modeled.
- **FA excerpt:** چرا این پایگاه داده است، نه مرورگر، که باید تعیین کند صندلی
  مال کیست — و مدل‌سازی رزرو موقت و تأیید نهایی چطور انجام می‌شود.
- **Related work:** Transportation System case study.

**Evidence already in the source** (`github.com/artaveo/Transportation-System`,
read 18 Sep 2026):

- `app/api/bookings/hold/route.ts` — a Route Handler, not a Client Component,
  calls the Postgres function `hold_seats` (`p_trip_id`, `p_seat_ids`,
  `p_hold_minutes`) through a service-role client; `HOLD_MINUTES = 10`; the
  seat count is capped (`MAX_SEATS_PER_BOOKING`); a `SEATS_UNAVAILABLE` error
  from the function becomes HTTP 409.
- `phase-4_3-schema-additions.sql` — `hold_seats`, `release_seats` and
  `confirm_booking` are `revoke`d from `public, anon, authenticated` and
  granted to `service_role` only. Its own header says the Phase 4.2 README had
  claimed this was already done, and that inspecting `pg_proc.proacl` on the
  live project showed the revoke had never actually run — meaning anyone with
  the public anon key could have called the functions directly. Fixed in 4.3.
  (A real, checkable engineering story about verifying a claim against the
  live database.)
- Claims-ledger rows already cover: seat holds and confirmation enforced
  server-side, never in the browser.

**Status: WRITTEN as a draft (18 Sep 2026)** — in the database
(`concurrent-seat-booking`, Backend, linked to the Transportation System case
study and the Backend, API & Database service) and in
`docs/content/articles/concurrent-seat-booking.{en,fa}.md`. Not published.
Its claims and their evidence are in `docs/content/claims-ledger.md`.

**Verified against the live Transportation System database (18 Sep 2026):**
the owner ran `pg_get_functiondef` and the `proacl` query in production and
sent the output; the article's description of `hold_seats` was corrected to
match the real function (one `UPDATE`, row-count check, `SEATS_UNAVAILABLE`,
rollback — and no `RETURNING`), and the permissions claim was confirmed (only
`postgres` and `service_role`). Details: `docs/content/claims-ledger.md`.

## 2. RLS and server-side authorization

- **Related work:** Transportation System; Pazhuhesh Portal. **Related
  service:** Backend, API & Database.

**Evidence already in the source:** claims-ledger rows for Transportation
System — PostgreSQL Row-Level Security combined with server-side
authorization (`README.md` "Authentication & Authorization"; `ROAD-MAP.md`
§ 2 items 3–4); the payment state machine enforced by a database trigger; the
`REVOKE` finding above. Artaveo's own backend follows the same pattern and is
documented: `db/migrations/0001_inquiries.sql` and `0009_schema_lint_fixes.sql`
(RLS enabled with no policy on service-role-only tables, and the advisor
findings that were found and fixed), and roadmap § 2 principle 12.

**Check before writing:** decide whether the article is about the
Transportation System, about Artaveo's own backend, or the contrast — each has
different evidence. Re-run `get_advisors` on the live project the day you
write it rather than quoting a past result.

## 3. Offline-first data loading for content-driven sites

- **slug:** `offline-first-content` · **category:** Architecture / معماری
- **EN excerpt:** Rendering instantly from a local cache, then hydrating from
  the live database without showing stale state as truth.
- **FA excerpt:** نمایش فوری از cache محلی، و سپس هیدریت شدن از پایگاه داده‌ی
  زنده، بدون نمایش وضعیت قدیمی به‌جای واقعیت.
- **Related work:** this site (Artaveo). **Related service:** the PWA / frontend
  service if one applies.

**Evidence already in the source (this repository):**
`scripts/generate-sw.mjs` — cache-first for static assets, stale-while-revalidate
for content pages, and *no* interception of anything else; the generated
`BUILD_ID` versions both caches and is what lets the browser see a new deploy.
`docs/phases/PHASE-10.1-README.md`, `-10.2-`, `-10.3-` — the reasoning and the
known limits (e.g. a fully offline client-side link click is not guaranteed;
the live-deployment pass is still open). `lib/inquiry-offline-queue.ts` — the
Brief Builder's offline behaviour ("never fake success").

**Check before writing:** the excerpt above describes hydrating "from the live
database"; the site's actual approach is page-level caching with a service
worker. Rewrite the title/excerpt to match what is really built before
publishing (§ 16.1: prefer the specific true sentence to the impressive one).

## 4. Running bilingual RTL products

- **slug:** `rtl-first-interfaces` · **category:** Frontend / فرانت‌اند
- **EN excerpt:** Practical notes on layouts that work in Persian and English
  without maintaining two sets of components.
- **FA excerpt:** نکاتی عملی درباره‌ی چیدمان‌هایی که در فارسی و انگلیسی کار
  می‌کنند، بدون نیاز به دو مجموعه کامپوننت جداگانه.
- **Related work:** both case studies (each has a "Responsive & RTL" section).

**Evidence already in the source:** roadmap § 2 principle 11 (RTL first-class,
Latin terms bidi-isolated, code always LTR); ROAD-MAP-ARTAVEO.md § 7 D-03 (Persian
register, Gregorian dates); logical-property discipline checked by grep in
every phase README; `docs/updates/2026-09-17-copy-localization-refinement.md`
(a real record of what "translated-feeling" Persian looked like and how it was
found and fixed, including the register slips in the live database);
`components/site/latin-term.tsx` and, since Phase 17, the automatic `<bdi>`
isolation in `components/insights/article-body.tsx`.

**Check before writing:** note the open Phase 17 finding that `formatDate`
renders the Solar Hijri calendar for `fa` although D-03 says Gregorian — decide
that first, or the article would describe behaviour the site does not have.
