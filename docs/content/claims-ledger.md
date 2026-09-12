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

