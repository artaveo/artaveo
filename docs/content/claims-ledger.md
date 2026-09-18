# Claims ledger

Per ROAD-MAP-ARTAVEO.md § 16.4: every factual public claim, with its
evidence and the date checked. A claim without evidence is removed before
publishing.

---

## Transportation System case study (Phase 6.2)

Source repo: `github.com/artaveo/Transportation-System`
Checked against commit `55ad93d` (2026-09-10), checked on 2026-09-12.

| Claim | Evidence | Checked |
|---|---|---|
| Seat holds and booking confirmation enforced server-side, never in browser | `README.md` "Booking Integrity" section; `ROAD-MAP.md` architectural principles §2 | 2026-09-12 |
| PostgreSQL Row-Level Security combined with server-side authorization | `README.md` "Authentication & Authorization"; `ROAD-MAP.md` §2 items 3–4 | 2026-09-12 |
| Payment state machine enforced by a database trigger (`pending→confirmed/failed`, `confirmed→refunded`) | `ROAD-MAP.md` §8 Phase 6.1 bullet 1; `PHASE-6_1-README.md` migration item 5 (`enforce_payment_status_transition`) | 2026-09-12 |
| Payment audit trail table (`payment_status_events`), write-restricted to one internal function | `PHASE-6_1-README.md` migration items 3–4 and "security note" section | 2026-09-12 |
| Security review found `log_payment_status_event` was directly callable by `anon`/`authenticated`, fixed via explicit `REVOKE` | `PHASE-6_1-README.md` "نکتهٔ امنیتی" section | 2026-09-12 |
| Bug: `admin_cancel_booking` allowed cancelling a booking with an already-confirmed payment, no effect on `payments` row | `PHASE-6_1-README.md` "بررسی وضعیت موجود قبل از کد نوشتن" — "باگ واقعی موجود" | 2026-09-12 |
| Fix: `admin_cancel_booking` now rejects with `PAYMENT_ALREADY_CONFIRMED_USE_REFUND`, routes through `admin_refund_payment` | `PHASE-6_1-README.md` change item 7 | 2026-09-12 |
| Partial refunds (admin-entered amount ≤ total) implemented | `PHASE-6_2-README.md` "تصمیم‌های کسب‌وکاری" and DB changes item 2 | 2026-09-12 |
| Coupon is released (not marked used) when its booking is refunded | `PHASE-6_2-README.md` DB changes item 2 | 2026-09-12 |
| Wallet refund logic intentionally not built — wallet debit was never wired into `confirm_booking`, confirmed by checking real data (12 existing bookings, `wallet_amount_used = 0` on all) | `PHASE-6_2-README.md` "تصمیم‌های کسب‌وکاری" bullet 3 | 2026-09-12 |
| Operations admin covers routes, buses, drivers, trips, bookings, reports, CSV export | `README.md` "Current Admin Capabilities" | 2026-09-12 |
| Loyalty tiers, referral rewards, coupon CRUD exist in admin | `README.md` "Loyalty & Coupons" | 2026-09-12 |
| Public CMS lite and in-site responsive image cropping shipped (Phases 5.13–5.14) | `ROAD-MAP.md` §5 phase history rows 5.13–5.14 | 2026-09-12 |
| No live payment gateway; HesabPay integration blocked on developer/sandbox credentials from the provider | `ROAD-MAP.md` §8 "فاز ۶.۳" — explicit blocker statement | 2026-09-12 |
| Five responsive breakpoints (mobile <768px through ultra-wide 2560px+) | `README.md` "Responsive Design" table | 2026-09-12 |
| Bilingual Dari/English, RTL/LTR-aware layout | `README.md` product scope; `ROAD-MAP.md` §3 localization standard | 2026-09-12 |
| Migrations validated against real data inside a rolled-back transaction before shipping | `PHASE-6_1-README.md` and `PHASE-6_2-README.md` "اعتبارسنجی منطق" sections | 2026-09-12 |
| No dedicated automated test suite / CI pipeline yet (tracked as debt) | `README.md` "Historical architectural debt" — "incomplete CI/typecheck/lint/test/security release gates" | 2026-09-12 |
| Sole developer: architecture, schema, frontend, backend, admin all built by one person | Confirmed directly by Zakir (D-06 resolution, 2026-09-12); consistent with single-author git history in the repo | 2026-09-12 |

### Removed / not used (insufficient evidence)
- Any specific launch date beyond "2026" — repo history spans 2026-09-03 to
  2026-09-10 only; not using a more specific date since the project may
  continue past this snapshot.
- Screenshot-based claims — `Portfoli/` screenshots not yet reviewed for
  demo-data-only compliance; none used as evidence here.

## Pezhohesh Complex Portal case study (Phase 6.3)

Source repo: `github.com/artaveo/pezhohesh-portal`
Checked against commit `0ae2484` (2026-09-03), checked on 2026-09-12.

| Claim | Evidence | Checked |
|---|---|---|
| Bilingual Dari/English portal, Dari default | `README.md` "Internationalization" section | 2026-09-12 |
| Two admin roles (`super_admin`, `services_admin`) enforced with a DB-level check constraint | `sql/phase3_admin_roles_and_rls.sql` — `admin_users_role_check` constraint | 2026-09-12 |
| Department-scoped writes use a fail-closed allow-list function | `sql/phase3_admin_roles_and_rls.sql` — `is_key_allowed_for_services_admin()` and its inline comment | 2026-09-12 |
| Offline-first data layer: instant render from localStorage, background hydration from DB | `README.md` "Resilience & Performance"; `vite.config.js` runtimeCaching comments referencing `portalService.js` | 2026-09-12 |
| Installable PWA, per-data-type Workbox caching strategy | `vite.config.js` — `VitePWA` config, `runtimeCaching` block | 2026-09-12 |
| Admin routes (`/admin`) excluded from service-worker navigation fallback entirely | `vite.config.js` — `navigateFallbackDenylist: [/^\/admin/]` and accompanying comment | 2026-09-12 |
| No Workbox caching rule added for portal_settings/portal_scholarships REST calls — relies on existing localStorage stale-while-revalidate layer instead | `vite.config.js` — comment block above `runtimeCaching` explaining the decision | 2026-09-12 |
| Only Supabase Storage images get `CacheFirst` caching (90-day / 300-entry cap, purge on quota) | `vite.config.js` — `runtimeCaching` array, `supabase-storage-images` cache entry | 2026-09-12 |
| Server-side rate-limited request submissions via a Supabase Edge Function | `README.md` "Admin CMS" bullet — "Server-side anti-spam protection (rate-limited request submissions via a Supabase Edge Function)" | 2026-09-12 |
| `generateSW` (declarative Workbox routing) chosen over `injectManifest` deliberately, for maintainability by a non-specialist solo developer | `vite.config.js` inline comment above `VitePWA` config | 2026-09-12 |
| Deployment is a manual local build + upload to hosting, not a Git-triggered CI/CD pipeline | `README.md` "Production Build" section | 2026-09-12 |
| No dedicated automated test suite or CI/CD pipeline | Absence of test config/CI files in repo listing; confirmed by manual deployment description above | 2026-09-12 |
| Sole developer; Zakir owns both the Pezhohesh Complex institute and the development work (no external client) | Confirmed directly by Zakir (D-06 resolution, 2026-09-12) | 2026-09-12 |
| Admin panel-roadmap defines 4 stages; stages 2–4 (richer content mgmt, full scholarship model, ops/security/audit/DB migration) still open | `docs/admin-panel-roadmap.md` — "مراحل اجرا" | 2026-09-12 |

### Removed / not used (insufficient evidence)
- No `Portfoli`-style screenshot folder found in this repo during review —
  no screenshot-based claims used; `public/images` not audited for PII.
- Exact current project `status` (live vs. in-development) — not set in
  `lib/home-content.ts` yet; needs Zakir's confirmation, not assumed.

## About, Process & Quality baseline (Phase 8.1)

Source: this repository (`lib/about-content.ts`, `lib/home-content.ts`,
`ROAD-MAP-ARTAVEO.md`). Checked on 2026-09-12.

| Claim | Evidence | Checked |
|---|---|---|
| Sole developer plans, designs, builds and deploys every project end to end | Already established (D-06 resolutions above); consistent with single-author git history on both case-study repos | 2026-09-12 |
| Two real products back the "not a CV" story (Transportation System, Pezhohesh Portal) | `lib/home-content.ts` — both projects' full case-study fields; linked from `/work` | 2026-09-12 |
| Works in Dari/Persian and English | This site's own bilingual content — `messages/fa.json` and `messages/en.json` are both real, directly-written copy (not machine-translated), per § 16.2 | 2026-09-12 |
| Technical focus, tools & technologies listed on `/about` | `lib/home-content.ts` — `getDeveloperProfile().focus` and `getTechStack()`, both already verified for Phase 3/Home | 2026-09-12 |
| "How I work" differentiators | `lib/home-content.ts` — `getDifferentiators()`, already verified for Phase 3/Home's "Why Artaveo" section; reused unmodified, not re-invented | 2026-09-12 |
| Timezone UTC, no city published | D-02 resolution (11 Sep 2026), Decision Register | 2026-09-12 |
| Response commitment: "replies within a few hours, same day" | D-08 resolution (11 Sep 2026), Decision Register | 2026-09-12 |
| Quality baseline commitments (typed code, server-enforced mutations, WCAG 2.2 AA target, both locales verified, data validated before shipping, documented handover) | `ROAD-MAP-ARTAVEO.md` § 2 (architecture principles), § 3 (target standards), § 17 (Definition of Done) — each commitment quotes an existing roadmap standard, not a new promise | 2026-09-12 |
| No dedicated automated test suite exists today (stated on the Test process phase) | Already established fact, consistent with both case studies' own "no dedicated automated test suite" claims above | 2026-09-12 |
| Warranty window / change-request pricing specifics deferred to the Working Agreement (§ 8.2, not yet published) | `ROAD-MAP-ARTAVEO.md` § 8.2 — page doesn't exist yet; the Support process phase states this deferral explicitly rather than inventing figures | 2026-09-12 |

### Removed / not used (insufficient evidence)
- Any specific years-of-experience count, client list, testimonial, or
  rating on the About story — banned outright by § 16.5, not just
  unevidenced.
- Self-rated language fluency levels ("native", "fluent", "conversational")
  — replaced with the checkable fact of which language each `messages/*.json`
  file is written in, since a proficiency self-rating isn't independently
  verifiable.
- Specific overlap-hour ranges (e.g. "9am–5pm CET") — not published;
  `/about` states the timezone (D-02) and points to the Availability card's
  response commitment (D-08) instead of an invented overlap window.

## Working Agreement (Phase 8.2)

Source: this repository (`lib/about-content.ts`, `ROAD-MAP-ARTAVEO.md`
§ 8.2, § 7.2's `engagementModelsData`). Checked on 2026-09-12.

| Claim | Evidence | Checked |
|---|---|---|
| Communication cadence: weekly written update, demo per milestone, no account manager | `ROAD-MAP-ARTAVEO.md` § 8.1's own Build-phase content (`lib/about-content.ts` `processPhasesData.build`), quoted consistently rather than re-invented | 2026-09-12 |
| Response commitment: "replies within a few hours, same day" | D-08 resolution (11 Sep 2026), Decision Register — restated verbatim, not reworded | 2026-09-12 |
| Payment billed per engagement model (Discovery Sprint fixed/upfront, Fixed-scope milestone-billed, Productized Service package-priced, Care Plan/Long-term Part-time monthly) | `lib/services-content.ts` — `engagementModelsData`, already published and verified on `/services` (Phase 7.2) | 2026-09-12 |
| No sitewide deposit percentage or warranty day-count published — decided per engagement during Define instead | D-13 (new, this phase), Decision Register — explicit, disclosed non-invention, same pattern as D-04/§ 7.2 | 2026-09-12 |
| No online payment gateway wired into this site yet | Absence of any payment-provider integration in the repo; consistent with Phase 9 (Inquiry v1) not yet started | 2026-09-12 |
| Ownership: code/IP transfers to client on payment; third-party accounts created in client's name | `ROAD-MAP-ARTAVEO.md` § 8.2's own roadmap bullet, quoted directly | 2026-09-12 |
| Handover package: repository, documentation, environment template, runbook, credentials transfer | `ROAD-MAP-ARTAVEO.md` § 8.2's own roadmap bullet, quoted directly | 2026-09-12 |
| Warranty covers defects against agreed scope; anything else is a priced change request | `ROAD-MAP-ARTAVEO.md` § 8.2's own roadmap bullet ("warranty window for defects... what counts as a change request and how it is priced") | 2026-09-12 |
| An NDA is available on request before Discover begins | Stated capability, not requiring third-party evidence — any independent developer can offer to sign an NDA without further infrastructure | 2026-09-12 |

### Removed / not used (insufficient evidence)
- Any specific deposit percentage (e.g. "50% upfront") — not approved by
  the owner anywhere in this codebase; recorded as open in D-13 rather
  than invented.
- Any specific warranty window length (e.g. "30 days") — same reasoning;
  open in D-13.
- Any claim about how quickly a signed NDA can be turned around — not
  stated; "available on request" is the only claim made.

## Hire channels (Phase 8.3)

Source: this repository (`lib/contact-content.ts`, `lib/site.ts`,
`ROAD-MAP-ARTAVEO.md` § 8.3 and § 7 Decision Register D-05). Checked on
2026-09-12.

| Claim | Evidence | Checked |
|---|---|---|
| Direct channel: email and WhatsApp, no platform fee | `lib/site.ts#siteConfig.email` (`artaveo.dev@gmail.com`, D-01 interim) and `#socialLinks` (`wa.me/93790685832`) — both real, already-verified channels since Phase 3/5.2 | 2026-09-12 |
| Via-platform channel: Fiverr only, with escrow/buyer-protection and platform fees | `lib/site.ts#socialLinks` — the only real platform profile in the codebase; no Contra/Toptal/Upwork profile exists, so none is claimed | 2026-09-12 |
| "The website stays canonical; platform profiles link back to it" | `ROAD-MAP-ARTAVEO.md` § 8.3's own roadmap line, quoted directly — not a new claim | 2026-09-12 |
| D-05 not yet formally "Resolved" — this phase applies its recommended default, doesn't invent a new one | `ROAD-MAP-ARTAVEO.md` § 7 Decision Register — D-05 row has no resolution date, unlike D-02/D-08/D-12 | 2026-09-12 |

### Removed / not used (insufficient evidence)
- Any third hire channel (e.g. Contra, Toptal, Upwork) — no such profile
  exists for Zakir; § 16.5 forbids inventing one to make the comparison
  look more populated.
- Any claim that D-05 is formally resolved — it isn't; the Decision
  Register still shows it open pending owner sign-off in
  `docs/decisions.md`.


---

## Insights / journal (Phase 17)

### Draft article `concurrent-seat-booking` — NOT YET PUBLISHED

The first journal article exists as a **draft** in the database
(`articles.slug = 'concurrent-seat-booking'`, both languages; source text in
`docs/content/articles/concurrent-seat-booking.{en,fa}.md`, byte-identical to
the stored rows). These claims go live only when it is published.

**Checked against the live Transportation System database on 2026-09-18** —
the owner ran the two queries at the bottom of this section in that project's
SQL Editor (production) and supplied the output (the full `hold_seats`
definition and the `proacl` of all three functions). That check corrected one
sentence (see the `hold_seats` row) and confirmed the permissions claim.

Source repo: `github.com/artaveo/Transportation-System`, `main` at `55ad93d`
(read 2026-09-18).

| Claim | Evidence | Checked |
|---|---|---|
| Seat holds are taken by a server Route Handler that calls the Postgres function `hold_seats` through a service-role client; hold length is 10 minutes; a `SEATS_UNAVAILABLE` error becomes HTTP 409 | `app/api/bookings/hold/route.ts` (code excerpt in the article is verbatim from it) | 2026-09-18 |
| Seat count is capped at 6, on the server as well as in the UI | `lib/booking-data.ts` (`MAX_SEATS_PER_BOOKING = 6`); `app/api/bookings/hold/route.ts` (`TOO_MANY_SEATS`); `components/transport/seat-selection.tsx` (`limitNotice`) | 2026-09-18 |
| Seats have three states (`available`/`held`/`booked`), a `held_until` deadline, and a unique `(trip_id, seat_number)` | `phase-3.1-supabase-schema.sql` (SQL excerpt in the article is verbatim, comments dropped) | 2026-09-18 |
| `hold_seats` is a single `UPDATE` touching only the requested seats that are available (or whose hold has expired); it then compares `row_count` with the number of seats requested — a mismatch raises `SEATS_UNAVAILABLE` and the whole operation rolls back, a match returns the seats. It does **not** use `RETURNING`: it returns the seats with a separate `select` after the check (the first draft of the article said it "returns the rows it changed" — corrected) | **Live function definition** (`pg_get_functiondef`, run by the owner on the production database, 2026-09-18): `update trip_seats … where trip_id = p_trip_id and id = any(p_seat_ids) and (status = 'available' or (status = 'held' and held_until < now()))`, `get diagnostics v_count = row_count`, `if v_count <> v_requested then raise exception 'SEATS_UNAVAILABLE'`, `return query select * from trip_seats …`; empty input raises `NO_SEATS_REQUESTED` | 2026-09-18 |
| A held seat whose `held_until` has passed counts as free in the seat map, in the seats-left count, and inside `hold_seats` | `lib/supabase/queries.ts` (seat map and seats-left, lines ~138–143 and ~229 — read directly); the live `hold_seats` definition (`status = 'held' and held_until < now()` in its `where`) | 2026-09-18 |
| `release_seats` frees held seats immediately when the traveler leaves checkout | `PHASE-4_2-README.md` § 3 decision 3 (the function body was not part of the live check) | 2026-09-18 |
| No scheduled sweep exists for expired holds, so an exact live count of held seats is not available from the table | `PHASE-4_2-README.md` § 4 (explicitly not done) | 2026-09-18 |
| The Phase 4.2 write-up said the three functions were revoked from `anon`/`authenticated`; a direct `pg_proc.proacl` check on the live project found that revoke had never run; fixed in Phase 4.3 with `revoke … from public, anon, authenticated` + `grant … to service_role` | `phase-4_3-schema-additions.sql` § 0 (header comment and the `revoke`/`grant` lines, which the article quotes verbatim for `hold_seats`). **Fix confirmed live, 2026-09-18:** `proacl` is `{postgres=X/postgres,service_role=X/postgres}` for `hold_seats`, `release_seats` and `confirm_booking` — no `anon`, `authenticated` or public entry | 2026-09-18 |
| The project has no live payment gateway | existing claims-ledger row (Transportation System case study): HesabPay blocked on provider credentials | 2026-09-12 |

The two queries used for the check (read-only), kept so it can be repeated
after any change to those functions:

```sql
select pg_get_functiondef('public.hold_seats(uuid, uuid[], integer)'::regprocedure);
select proname, proacl from pg_proc where proname in ('hold_seats','release_seats','confirm_booking');
```
