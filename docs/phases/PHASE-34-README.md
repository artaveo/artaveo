# Phase 34 — Performance & Accessibility Certification

**Status:** ✅ code complete (21 October 2026) — two owner actions remain: **O-11** turn on Speed Insights in Vercel (real-visitor speed data), **O-12** one screen-reader pass per language
**Roadmap:** § 11B Phase 34 (was Phase 26 before revision 45), § 3 targets (LCP < 2.5 s, CLS < 0.1, INP < 200 ms), § 14.1 glass and motion rules, Phase 10's exit criteria
**Migration:** none

## Summary

The redesigned site was measured first, on the live deployment, and the measurements decided the work. Accessibility, best practices and SEO were already 100 on every route; **speed was not**: mobile performance 57–82, main-thread blocking up to 1.2 s. The main cause was that every public page sent the browser the whole message dictionary — ~113 KB of Dari, 71 KB of it the admin's — inline in the HTML and again in every link prefetch, plus four preloaded font files on every page. Both are fixed, the first page of `/work` loads its screen early, and the search window loads only when it is wanted. Speed and accessibility are now guarded in CI: Lighthouse budgets per route, and a glass, motion and keyboard suite on the real pages.

## Before and after (Lighthouse 12, mobile, simulated slow 4G)

Before: the live site (commit `277660f`). After: the Phase 34 build, `next start` against the same Neon data.

| Route | Performance before → after | Blocking time (ms) | Page weight (KB) |
|---|---|---|---|
| `/fa` | 75 → 84 | 406 → 83 | 577 → 511 |
| `/en` | 68 → 84 | 774 → 128 | 565 → 474 |
| `/fa/work` | 64 → 84 | 1024 → 46 | 565 → 494 |
| `/fa/services` | 68 → 85 | 727 → 89 | 565 → 461 |
| `/fa/start` | 57 → 82 | 1200 → 3 | 618 → 546 |
| `/fa/about` | 82 → 85 | 355 → 0 | 530 → 461 |
| `/fa/work/transportation-system` | 81 → 83 | 217 → 11 | 642 → 588 |
| `/fa/services/websites` | 79 → 84 | 305 → 98 | 549 → 483 |

Accessibility stays 100 on every route; layout shift stays 0. The `/fa` HTML went from 262 KB to 149 KB (54.5 → 27 KB compressed).

**Simulated LCP is still ≈ 4.1–4.8 s.** Lighthouse's model counts every script requested before the largest paint, and the page needs ≈ 250 KB of compressed script (React and Next.js alone are ≈ 110 KB); in an unthrottled trace the largest paint lands within 20 ms of the first one. The honest answer to "is LCP under 2.5 s for visitors" is field data — which needs O-11. The 2.5 s target is a CI warning; a hard ceiling (6 s, 6.5 s on `/start`) catches a real regression.

## What changed

| Part | What was done |
|---|---|
| **Message dictionary (the biggest win)** | `lib/i18n/client-messages.ts`: the root layout sends only the namespaces the shell's Client Components read (header, menus, search, footer, switches, offline notice, error page, portfolio rows) — ≈ 7 KB of Dari instead of ≈ 113 KB. A page with a form wraps it in `<ClientMessages scope="…">` (`components/site/client-messages.tsx`): the Brief Builder, the consultation request and its management link, the product request and the recommendation form. The admin layout sends everything. `tests/unit/client-messages.test.mjs` walks the import graph from every public page, layout and boundary and fails when a Client Component reads a namespace its page does not send (it was checked by removing a wrap: the test fails), when the shell list carries an unused namespace, when the admin namespace could reach a public page, or when the shell dictionary grows past 16 KB. |
| **Fonts** | Measured: next/font preloaded four files (~132 KB) on every page in both languages — Geist, Geist Mono, and Vazirmatn's Latin and Arabic files; Phase 11.3's class gating never stopped the preload. Now two: Geist Mono is not preloaded (eyebrows and labels; it swaps in from a metric-matched fallback) and Vazirmatn preloads only its Arabic-script file. Vazirmatn's Arabic file is still preloaded on English pages: both languages share the root layout, and a preload cannot follow the locale. |
| **Images** | The first card on `/work` is the page's largest paint and was lazy-loaded at low priority: it now loads early with high priority (`PortfolioList priorityFirst`). The screen lightbox loaded the original PNG (up to 1.5 MB) — it now goes through the image optimizer at the dialog's width. Every other image already went through `next/image` with correct `sizes`; project screenshots arrive as 12–16 KB AVIF/WebP. |
| **Search window** | ~40 KB of script that every page loaded and ran is now loaded when the pointer or focus reaches the search icon, and mounted on click or Ctrl/⌘ K. |
| **Field data** | `@vercel/speed-insights` 2.0.0 in the root layout, next to Analytics: each visit's LCP, INP, CLS by route on the project's Speed Insights page. Google has no field data for the site (CrUX needs more traffic), and Vercel's own analytics were not reachable from here. Collection starts when the owner turns Speed Insights on (**O-11**). |
| **Lighthouse budgets in CI** | `tests/performance/lighthouserc.json` + `scripts/lighthouse-budgets.mjs` (`npm run test:lighthouse`), a step in the end-to-end job after the browser tests, reports kept 14 days as the `lighthouse-reports` artifact. Ten routes in both languages. **Errors:** script ≤ 280 KB (≤ 340 KB on `/start`), fonts ≤ 130 KB, document ≤ 70 KB, styles ≤ 30 KB, whole page ≤ 800 KB, layout shift ≤ 0.1, accessibility ≥ 95, LCP ≤ 6 s (6.5 s on `/start`) and blocking ≤ 600 ms as regression ceilings. **Warnings:** the targets — performance 90, LCP 2.5 s, blocking 200 ms, best practices and SEO 90. Run locally against this build: no errors. |
| **Glass contrast audit** | `tests/e2e/glass-audit.ts` reads the rendered page: every element or `::before` with a `backdrop-filter` is a glass layer; for every visible text on glass, the layers between the text and the page are composited over pure white and pure black — anything the page can show behind the glass lands between those two, so the worst contrast is at one of them (or 1:1 if the text's own luminance is between them). **Found two failures:** the price card on every service page, and (caught by the suite's first CI run) the WhatsApp/phone/e-mail cards on the contact page, used the ink band's muted grey on glass — 3.91:1 over a white background; both now use `glass-muted`. The same run counted four glass layers on `/contact` (the header and the three cards) against § 14.1's three: the cards sit on plain ink, where the glass fill is the ink colour itself and the blur has nothing to blur, so they are now plain cards with the same border — identical to the eye, one blur layer on the page. Everything else passes, including both mega menus and the mobile menu. At most three glass layers are ever in the viewport. |
| **Reduced transparency and motion** | With `prefers-reduced-transparency` set, no layer on the page blurs (header, menus, chips, the service price card). With `prefers-reduced-motion`, every transition and animation is cut to 0.01 ms, also on hover and after scrolling, and nothing waits to be revealed. |
| **Keyboard and assistive technology** | Keyboard pass on Home in both languages at desktop and phone widths: skip link first, a visible focus ring on every stop, the order follows the reading direction, Ctrl+K opens search with focus in the box, Escape closes it and returns focus. **Found:** the mega-menu panels are drawn after the header bar, so Tab from an open menu's button skipped past search, language, theme and *Start a project* before reaching the menu. Fixed in `GlassHeader`: Tab goes into the open panel, Shift+Tab back to its button, Tab from the last entry on to the next header item. Accessibility tree on eight page types × two languages: one `h1` each, `lang`/`dir` right, every landmark named, no unnamed button, link, image or field. |
| **Phase 10 on production** | `scripts/check-live-pwa.mjs` against `artaveo-seven.vercel.app`: manifest complete (192/512 icons, standalone), **Chrome finds the site installable** (DevTools `Page.getInstallabilityErrors` is empty), `/sw.js` never cached, nine pages in both languages **open offline** after one visit, `/fa/start` does not pretend to work offline. **Update:** the script keeps a browser profile; the run after the Phase 34 deploy checks that the previous worker's page offers «نسخه‌ی جدید آماده است» and runs the new one after Reload (result in "Verification"). The service worker now also keeps product pages and no longer lists `/process`, which redirects since Phase 31. |

## Owner request during the phase (21 October 2026)

The coloured top of a page ended in a hard line where the page below began. Now nothing ends in a line: the gold and blue glow of every ink hero (Home, Products, Work, and every page with a page hero — Services, a service, About, Contact, Start, Consultation) sits in a layer that fades to nothing over the band's lower half (`BandGlow`, a vertical mask from 40 % to 96 %), and the project-coloured hero of a product or project page runs into the ink below over its last 96 px (128 px on wide screens), behind the content. Recorded in § 14.1 "Glows".

## Decisions

- **Hard budgets are bytes; timings are warnings.** Byte counts do not change with the CI machine; lab timings on a shared runner do. The timing errors are ceilings only a real regression crosses.
- **Field data from Speed Insights, not a home-made collector.** It is the platform the site runs on, it is free at this traffic, and it needs no table or retention policy of ours.
- **The screen-reader pass is the owner's (O-12).** No screen reader is installed on this machine, and the pass is meant to be a human listening in each language. What a screen reader reads — the accessibility tree — was checked here.
- **The duplicated shell chunk is left (known issue).** Turbopack ships the header and footer code twice (≈ 16 KB compressed), once for the page and once for the not-found boundary every page carries. Removing it means mounting the shell in the layout instead of in each page — a structural change that does not belong in a certification phase.

## Verification

- Typecheck clean; lint 64 warnings (at the cap, none new); **710 unit tests** (28 new in `client-messages.test.mjs`).
- `npm run build` passes; every public page is still prerendered (●) except `/start` (reads the query string) and the private links, as before.
- On the local production build: glass audit with no failures on 16 routes × 2 themes × 2 widths, menus open; no raw message key on any page; the Brief Builder advances with its Dari text; the search window loads on first use; Tab enters the open menu; no console errors.
- `npm run test:lighthouse` (local, Chrome): all budgets met, warnings only.
- New end-to-end suite `tests/e2e/certification.spec.ts` (glass on every page type in both languages, dark theme on four, menus and mobile menu; reduced transparency; reduced motion; keyboard into the menu) — runs in CI.
- `scripts/check-live-pwa.mjs` against production: all install and offline checks pass.

**CI run 39575713560 is green on every gate** (unit, integration, build, end-to-end and accessibility suites with the new certification spec, the Lighthouse budgets on ten routes, audit). The two runs before it were red on the new glass suite, which found the contact page's cards (contrast, then four glass layers in view) — both fixed, see the glass row above. The live update check (`check-live-pwa.mjs` with the primed profile) could not finish here: this machine's connection had dropped to 10–20 KB/s; it is to be run again.

## Owner actions

- **O-11 Turn on Speed Insights** — Vercel → the `artaveo` project → Speed Insights → Enable. Data appears after visits; review LCP, INP and CLS (p75, mobile) per route after a few weeks of traffic against LCP < 2.5 s, INP < 200 ms, CLS < 0.1.
- **O-12 One screen-reader pass per language** — NVDA (Windows) or TalkBack (Android) on `/fa`, VoiceOver or NVDA on `/en`: Home → a project → Services → *Start a project* through the Brief Builder to the review step. Report anything read in the wrong language, unnamed, or out of order.

## Known issues

- Simulated LCP stays above 2.5 s (see above); field data decides.
- Header and footer code is shipped twice (≈ 16 KB), see Decisions.
- Locally (not on Vercel) Lighthouse's best practices and SEO read 92–96: the Analytics/Speed Insights script does not exist outside Vercel (a 404 in the console) and the canonical address is the live domain. Both are 100 on the live site.

## Rollback

Revert the Phase 34 commit. Nothing in the database changed.

## Files

```text
lib/i18n/client-messages.ts                              new — shell namespaces, scopes, pickMessages
components/site/client-messages.tsx                      new — <ClientMessages scope>
app/[locale]/layout.tsx                                  shell messages only; fonts; Speed Insights
app/[locale]/admin/layout.tsx                            every namespace for the admin
components/start/start-content.tsx, components/consultation/consultation-content.tsx,
app/[locale]/consultation/[token]/page.tsx, app/[locale]/recommend/[token]/page.tsx,
components/products/product-page.tsx                     forms wrapped in <ClientMessages>
components/site/site-header.tsx                          search window loaded on demand
components/brand/glass-header.tsx                        Tab into an open menu and out again
components/brand/portfolio-row.tsx, components/work/portfolio-filter.tsx, app/[locale]/work/page.tsx   first card loads early
components/brand/screen-gallery.tsx                      lightbox through the image optimizer
components/services/service-page.tsx                     glass-muted on the price card
components/contact/contact-content.tsx                   glass-muted on the channel cards
components/brand/bands.tsx, components/brand/project-hero.tsx   hero colour fades out instead of ending in a line
scripts/generate-sw.mjs                                  products kept offline; /process dropped
scripts/lighthouse-budgets.mjs, tests/performance/lighthouserc.json   new — budgets per route
scripts/check-live-pwa.mjs                               new — Phase 10's live check
tests/unit/client-messages.test.mjs                      new
tests/e2e/glass-audit.ts, tests/e2e/certification.spec.ts             new
.github/workflows/ci.yml                                 Lighthouse step and reports
package.json, pnpm-lock.yaml                             @vercel/speed-insights 2.0.0; test:lighthouse
docs/testing.md, docs/observability.md, ROAD-MAP-ARTAVEO.md, .gitignore
```
