# Phase 26 — Live-site corrections

**Status:** ✅ COMPLETE — 17 October 2026 (roadmap § 11A, revision 46).
**Migration:** `0024_live_site_corrections.sql` — two content rows, no schema change, **applied on Neon** (`calm-breeze-36870180`, branch `main`) and checked afterwards.
**Goal (roadmap):** stop the live site from hurting sales while the redesign is built. Small, low-risk fixes on the current design — nothing here is redesign work.

## What was done

| Item | What changed |
|---|---|
| **26.1 Persian font** | `<body>` now gets `font-persian` on RTL pages and `font-sans` on LTR (`app/[locale]/layout.tsx`). The old `font-sans` class outranked the `[dir='rtl'] body` rule, so Persian rendered in the device's fallback font and Vazirmatn was never even downloaded. Mono labels (eyebrows, field labels) fall back to Vazirmatn for Arabic-script glyphs on RTL pages instead of the device font (`app/globals.css`, utilities layer). |
| **26.2 Dari formatting** | `lib/format.ts`: `fa` → `fa-AF-u-ca-persian` — Solar Hijri with the Afghan month names («۲۵ میزان ۱۴۰۵»). Dates with a written month are assembled in Dari order (weekday, day, month, year, then the time after «، »), because ICU's own `fa-AF` patterns put the year first for some option sets and use a Latin comma; «سنبلهٔ» loses its ezafe mark. Amounts: «۱۵٬۰۰۰ افغانی», «۵۰۰ دالر» (D-21); other currencies fall back to `Intl`. `lib/pricing.ts` (was `fa-IR`) and the availability chip (was `fa-u-ca-gregory`) now go through these helpers. `en` is unchanged (Gregorian). |
| **26.3 Mobile overflow** | `min-w-0` on the case-study grid items (`components/work/case-study.tsx`), on every evidence figure (`components/work/case-study-media.tsx`), on the Home featured-work columns and the `/work` cards. Every public route checked at 360, 375 and 414 px — see *Verification*. |
| **26.4 No internal references** | Every "§", decision id ("D-08", "D-13"), phase number and roadmap term removed from public strings in `lib/about-content.ts` (Process and Working Agreement — 17 strings, both languages) and from the one database row that had one (a business-website FAQ: "Phase 15 on this roadmap"; also its seed in `lib/services-content.ts`). Where a sentence existed only to state a limitation plus a phase number ("No online payment gateway is wired into this site yet (Phase 9)"), the limitation went too and the useful half stayed. |
| **26.5 Hide what hurts now** | **Unpublished** the article `concurrent-seat-booking` (back to draft, migration `0024`). The case study no longer renders *constraints, key decisions, engineering highlight, data integrity & security, quality, current status, lessons learned* or the *role* field (the data stays in the database for Phase 27.2's blocks). **No repository links** anywhere public (case study, Home). **No project status badges** (case study, `/work` cards, Home). **Insights** is out of the header, mobile menu, footer, command palette and search index whether or not an article is published, and its Home preview is gone. Story screenshots that were anchored to a hidden section still appear at that point in the page. |
| **26.6 Work grid** | Two columns while there are four projects or fewer (`WORK_TWO_COLUMN_MAX = 4`, `lib/site.ts`); three only from five. Filters still appear only from six projects (`WORK_FILTER_THRESHOLD`, unchanged). Image `sizes` follow the column count. |
| **26.7 Phase 3.5 leftovers** | Deleted the three AI-generated screenshots of the removed fictional projects (`public/images/work-*.png`) and the five unused v0 placeholders (`public/placeholder*.{png,svg,jpg}`). The Phase 3 document said they were deleted on 10 September; they were still in the repository. The rest of § 3.5 — see *Phase 3.5 check* below. |
| **26.8 Backups for real** | `.github/workflows/backup.yml` committed (Phase 25's design, on Neon): `pg_dump` + `scripts/backup/collect.mjs` + manifest, restore test into a throw-away PostgreSQL 17, `age` encryption (v1.3.2, checksum-pinned), 35-day artifact, report to `/api/ops/backup-report`. Its secrets are named in `docs/runbooks/backup-restore.md` § 4 and `docs/security.md` § 6. A **self-test** mode runs the whole pipeline on a throw-away database (no secrets) on every push that touches the workflow, the backup scripts or a migration — this is the dry run. The first real run is owner action **O-4**. |

### Also fixed — CI had been red since 21 September

The exit criteria need CI green. It was not: every gate had been failing on `main` since `96c302b` (and every deploy kept going, because nothing required the check — O-5).

- **Dependency gate — a critical advisory.** Next.js 16.3.3 had a **remote-code-execution advisory in `next/og`** (GHSA-vcvr-r3jv-pc5j; this site serves `/api/og`) and an SSRF in image optimisation (GHSA-cjq9-62q9-8jv4), among others. `next` and `eslint-config-next` → **16.3.8** (released 30 September). Four transitive packages with published fixes are pinned up in `pnpm-workspace.yaml` → `overrides` (`fast-uri` ≥ 3.1.8, `source-map-js` ≥ 1.2.2, `sharp` ≥ 0.35.5, and `proxy-addr` ≥ 2.0.8 — a critical advisory in development tooling, which the gate also blocks), with a note to drop each once its parent requires the fix.
- **Unit tests — two real findings from the Neon move.** A component (`components/home/recommendations.tsx`) imported `lib/db` directly; it now reads through `lib/recommendations.ts`, the rule the secret-inventory test enforces. The TOTP replay guard interpolated a number into a PostgREST `.or()` filter; it now goes through the new `assertSafeInteger` (`lib/postgrest.ts`), which the filter-injection test accepts.
- **The suites run on Windows now** (the owner's machine): two static tests built paths with `\`, the i18n test read its files through a URL `pathname`, and `scripts/audit-gate.mjs` compared `import.meta.url` with a hand-built `file://` string — on Windows the gate silently did nothing and exited 0 — and started `pnpm` without the shell Windows needs for it.
- **Two more mobile-overflow causes**, found by the 26.3 check on `/design-system`: `CodeBlock` and `Callout` (`components/ui/content.tsx`) now shrink inside a grid and wrap long words.
- **Less data in public pages:** the `/work` grid now receives only what a card shows (`toProjectCardData`), not whole projects with their repository URLs and engineering sections; two stale admin notices ("… added in a later phase", untrue since Phase 15) removed and two admin strings without "(D-01)" / "this phase" — every page carries the whole dictionary (known issue below).

## Decisions

1. **Hide, don't delete.** Role, status, repository URLs and the engineering sections stay in the database and in the admin; only the public templates stopped rendering them. Phase 27 replaces them with customer-facing blocks and removes `role`/public `status` from the types — deleting data now would be a redesign decision taken early.
2. **Insights hidden by a static rule, not by the article count.** With `contentFlag` the link would come back the moment anything was published. `hasContent: false` keeps it out of every nav surface and the search index until Phase 33 decides (a footer link first). The flag plumbing in the root layout is left in place for that.
3. **Architecture and Responsive & RTL sections still render** — they are not on 26.5's list. They are engineering text too ("Next.js … PostgreSQL through Supabase"); Phase 27.2 archives every engineering section and Phase 32 rewrites the copy. Recorded as a known issue, not silently widened.
4. **Dari dates are assembled from parts**, not taken from ICU's `fa-AF` pattern: ICU gives «۱۴۰۵ میزان ۲, پنجشنبه» for a full date. A numeric month (`۱۴۰۴/۱۱/۱۱`) is left as ICU writes it.
5. **A backup that is not set up does not pretend.** A scheduled run without `NEON_DATABASE_URL` and `BACKUP_AGE_PUBLIC_KEY` shows a notice and a skipped backup job; half a setup fails. Same "only if it ever ran" rule the `backup.*` alerts already follow.
6. **The restore test checks more tables** (31, was 21): the join tables, process steps, attachments, redirects and delivery attempts are now counted too (`scripts/backup/tables.mjs`, shared by `collect.mjs` and the self-test). Row counts are taken right after the dump, before the files are downloaded, so less can change in between; the count query uses `*`, because join tables have no `id` column.

## Database

`db/migrations/0024_live_site_corrections.sql` — content only, guarded by each row's current value (re-running it, or applying it to the test stack, changes nothing). Applied on Neon on 17 October 2026 and checked: `concurrent-seat-booking` is `draft`, **0** published articles, the FAQ's English answer reads "The content is structured for editing from day one, so adding self-service editing later does not mean rebuilding the site." Rollback statements are in the file's header.

## Phase 3.5 check

| § 3.5 item | State |
|---|---|
| `lib/site.ts`: no `hello@artaveo.studio`, real GitHub/LinkedIn links, no X | ✅ done (`siteConfig.email` is the owner-confirmed inbox, `socialLinks` are real profiles) |
| Voice of nav descriptions, tagline, Home metadata, Hero CTA | Superseded — the voice itself changed in revision 45 (D-15); rewritten in Phase 32 |
| Delete unused `public/images/work-*.png` and v0 placeholders | ✅ done in this phase (they were still tracked) |
| `/design-system` `noindex, nofollow` | ✅ done (`app/[locale]/design-system/page.tsx`) |
| Insights Preview hidden while nothing is published | ✅ done — and since 26.5 it is not on Home at all |
| Placeholder guard | ✅ done (`scripts/check-content-placeholders.mjs`, part of `build` and CI) |
| Bilingual shape and selectors | ✅ done |
| Phase 3 document | ✅ `docs/phases/PHASE-3-README.md` |

`public/icon.svg` is kept: it is a byte-identical copy of `public/artaveo-icon.svg` (the brand favicon), not a v0 default, and the service worker precaches it (`scripts/generate-sw.mjs`).

## Verification

All on 17 October 2026, on this Windows machine, against a production build (`next build` + `next start`) reading the live Neon data, unless stated otherwise.

| Check | Result |
|---|---|
| Typecheck (`tsc --noEmit`) | 0 errors |
| Lint (`eslint . --max-warnings=82`) | 0 errors, 82 warnings — the existing cap, nothing new |
| Unit tests (`scripts/test-*.mjs`, `tests/unit/*.test.mjs`) | **450 / 450** (new: Dari dates, all twelve Afghan months, Dari order, «افغانی»/«دالر», add-on prices) |
| Content placeholder check | passes |
| Dependency gate (`scripts/audit-gate.mjs`) | **passes** — 0 blocking (was: 1 critical + 14 high in production, 1 critical in development tooling); one allowlist entry (sharp) removed as no longer needed |
| `next build` with Next 16.3.8 | passes, 95 pages |
| **26.1** `/fa` | computed `font-family` of `<body>` and `<h1>`: **Vazirmatn**; `document.fonts` has Vazirmatn `loaded`; its `.woff2` subsets are requested. Persian mono labels: `"Geist Mono", …, Vazirmatn, …`. `/en`: Geist, Vazirmatn not loaded. |
| **26.2** `/fa/privacy` | «آخرین به‌روزرسانی ۲۴ میزان ۱۴۰۵»; no Iranian or Gregorian month name anywhere on the page. A consultation time reads «پنجشنبه ۲ میزان ۱۴۰۵». |
| **26.3** overflow | Every public route — Home, Work, both case studies, Services and all seven service pages, Process, About, Contact, Start, Consultation, Privacy, Terms, Design System — in **both languages × light and dark × 360, 375 and 414 px**: **240 checks, 0 overflow** (`scrollWidth` ≤ `clientWidth`, Edge headless). The first run found two more causes on `/design-system`: `CodeBlock` and `Callout` (`components/ui/content.tsx`) grew to their longest line inside a grid — both now shrink and wrap (`min-w-0`), which also protects article bodies. |
| **26.4** internal references | Raw HTML of all 38 public routes searched for "§", "Phase n", «فاز n», "(D-nn)", "roadmap": **none**. The search found two things first, both fixed: (1) every page carries the whole message dictionary, admin included, and two admin strings said "(D-01)" / "since this phase went live" — reworded; two stale admin notices ("… are added in a later phase", untrue since Phase 15) removed; (2) `/work` sent whole project objects to its client-side grid — see 26.5. |
| **26.5** hidden | Case-study pages: none of the hidden headings rendered (en and fa). No repository URL in any public page's HTML or data (the `/work` grid now receives only the card fields — `toProjectCardData`). No status badge text. No `/insights` link anywhere. `/en/insights`, `/fa/insights` and `/…/insights/concurrent-seat-booking` render the not-found page (`noindex`; HTTP 200 for these routes is the known, pinned behaviour from Phase 21). |
| **26.6** `/work` at 1440 px | two cards of 592 px — two columns |
| **26.8** workflow | YAML parsed, every `run:` block passes `bash -n`; the self-test runs on GitHub on this push (result in the completion report). |
| Visual | `/fa/work/transportation-system` at 375 px: Vazirmatn, no status badge, nothing wider than the screen. |

Not run here (no PostgreSQL on this machine): the integration and end-to-end suites — they run in CI on the push.

## Known issues

- **Architecture and Responsive & RTL sections** still show engineering text on both case studies (decision 3) → Phase 27.2 / 32.
- **`BrowserFrame` shows "artaveo.dev/work/…"** — not the site's address — on cards and case studies → Phase 30 (mock-up frames without address bars, § 6.7).
- **Technology badges and "highlights"** on cards and case studies are still technology-led copy → Phase 30 / 32.
- **The Dari FAQ answer** in the same row still says «CMS» → Phase 32's word-by-word pass.
- **The backup workflow's real mode has not run** — it needs the owner's secrets (O-4). The self-test covers every step except reading the live database and its files.
- **Static pages show the article and the old FAQ until the next deploy.** The push of this phase is that deploy.
- **GitHub shows a second "Vercel – artaveo" status that fails** on every push: a Vercel project outside the `zakir-naseri` account is still connected to the repository. The live site (`artaveo-seven.vercel.app`) is the `zakir-naseri/artaveo` project, whose deployments are green. Disconnect the other one in its Vercel dashboard (or in GitHub → Settings → Integrations) when convenient.
- **Every page sends the whole message dictionary to the browser**, the admin's ~1,000 strings included (`NextIntlClientProvider` in the root layout passes all messages). Nothing secret is in it, but it is weight on every public page → Phase 34 (performance), or Phase 29 when the shell is rebuilt.
- **`package-lock.json`** is not used by Vercel or CI (both install with pnpm from `pnpm-lock.yaml`) and was not regenerated here; it still names Next 16.3.3.

## New debt

None beyond the known issues; each has a phase.

## Rollback

- Code: revert the phase commit. The Next upgrade is in the same commit (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`).
- Data: the `ROLLBACK:` block in `db/migrations/0024_live_site_corrections.sql`.
- Backups: deleting `.github/workflows/backup.yml` stops them; nothing else depends on it.

## Files changed

- New: `.github/workflows/backup.yml`, `db/migrations/0024_live_site_corrections.sql`, `scripts/backup/tables.mjs`, `docs/phases/PHASE-26-README.md`
- Deleted: `public/images/work-analytics.png`, `work-commerce.png`, `work-fintech.png`, `public/placeholder-logo.png`, `placeholder-logo.svg`, `placeholder-user.jpg`, `placeholder.jpg`, `placeholder.svg`
- Font and formatting: `app/[locale]/layout.tsx`, `app/globals.css`, `lib/format.ts`, `lib/pricing.ts`, `components/ui/identity.tsx`, `components/services/service-addons.tsx`, `lib/consultation/time.ts` (comment)
- Public pages: `components/work/case-study.tsx`, `case-study-media.tsx`, `project-card.tsx`, `work-grid.tsx`, `app/[locale]/work/page.tsx`, `components/home/featured-work.tsx`, `app/[locale]/page.tsx`, `components/ui/content.tsx`, `lib/site.ts`, `lib/search/build-index.ts`
- Copy: `lib/about-content.ts`, `lib/services-content.ts`, `messages/en.json`, `messages/fa.json`, `app/[locale]/admin/(protected)/page.tsx`, `app/[locale]/admin/(protected)/content/page.tsx`
- CI: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.security/audit-allowlist.json`, `scripts/audit-gate.mjs`, `app/actions/admin-auth.ts`, `lib/postgrest.ts`, `lib/recommendations.ts`, `components/home/recommendations.tsx`
- Backups: `scripts/backup/collect.mjs`, `docs/runbooks/backup-restore.md`, `docs/security.md`
- Tests: `tests/unit/format.test.mjs`, `pricing.test.mjs`, `i18n.test.mjs`, `observability-static.test.mjs`, `security-static.test.mjs`, `scripts/test-consultations.mjs`
- `ROAD-MAP-ARTAVEO.md` (revision 46)

## Final status

**COMPLETE.** Next phase: **Phase 27 — Products, sale options & flexible content (data model + admin)**.
