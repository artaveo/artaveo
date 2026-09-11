# Phase 5.1 — Locale infrastructure (routing, dictionaries, Persian specifics)

**Status:** ✅ complete
**Date:** 12 September 2026

## What this phase delivered

Real bilingual (`en` / `fa`) routing and translated UI, replacing the
client-only `lang`/`dir` flip that Phase 4 shipped as a placeholder.

### Routing & middleware
- `i18n/routing.ts` — `next-intl` routing config: locales `en`/`fa`,
  default `en`, **`localePrefix: 'always'`** (both locales get a prefix —
  `/en/…` and `/fa/…` — so `app/[locale]/…` maps every route without a
  hidden default-locale exception, and the language switcher always has a
  symmetrical URL in both directions). This wasn't specified in the
  roadmap bullet and is recorded here as the implementation decision.
- `i18n/navigation.ts` — locale-aware `Link`, `useRouter`, `usePathname`,
  `redirect`, `getPathname`, wrapping `next-intl/navigation`.
- `i18n/request.ts` — loads `messages/{locale}.json` per request.
- `proxy.ts` (root) — locale-negotiation middleware. **Named `proxy.ts`,
  not `middleware.ts`**: Next.js 16 renamed the file convention (the old
  name still works but logs a deprecation warning at build time — see
  `npx @next/codemod@canary middleware-to-proxy`). Negotiates on first
  visit via `Accept-Language`, then respects the `artaveo-locale` cookie
  (1-year `maxAge`) on repeat visits, per the roadmap's "respects a stored
  choice" requirement.
- `global.d.ts` — augments `IntlMessages` from `messages/en.json`, so a key
  present in one dictionary but missing from the other fails at
  type-check, not silently at runtime (build still passes today because
  `next.config.mjs` has `typescript.ignoreBuildErrors: true`, pre-existing
  from Phase 1 — the type augmentation is real and will catch drift the
  moment that flag is ever removed).

### Routes moved under `app/[locale]/`
- `app/[locale]/layout.tsx` — new root layout. `<html lang dir>` set
  **server-side** from the URL segment, no client script, no flash.
  `NextIntlClientProvider` wraps `children`. `generateMetadata` now reads
  from `Common.tagline` / `Common.siteDescription` per locale instead of a
  static English string.
- `app/[locale]/page.tsx` — Home, `generateMetadata` translated.
- `app/[locale]/design-system/page.tsx` — moved for routing correctness;
  only its `<title>`/description are translated (see Known debt below).
- **Deleted** (superseded by the above — a zip can't represent deletions,
  see delivery note): `app/layout.tsx`, `app/page.tsx`,
  `app/design-system/page.tsx`.

### Dictionaries
- `messages/en.json` / `messages/fa.json` — every UI chrome string (nav,
  header, footer, mobile nav, command palette) and every Home-page section
  string (Hero, FeaturedWork, Services, WhyArtaveo, TechStack, Process,
  AboutPreview, Insights, FinalCta). Persian copy is genuine translation —
  neutral / Dari-leaning vocabulary per **D-03**, first-person voice
  preserved, not a mirror of English.
- `lib/home-content.ts` — every `LocalizedText` field's `fa` value is now
  real Persian (projects, services, differentiators, tech-stack category
  titles, process steps, developer bio/focus, planned-articles copy).
  `technologies` / tech-stack `items` arrays stay English proper nouns per
  the existing type contract (`types/content.ts` comment) — see Known
  debt.

### Shared link/navigation plumbing
Found and fixed during implementation — these weren't called out in the
roadmap bullet but would have silently broken locale-prefixed navigation:
- `components/ui/actions.tsx` (`Link` primitive used across the whole
  site) and `components/ui/patterns.tsx` (`SectionHeader`/`CTASection`,
  used by every Home section) were both importing `next/link` directly.
  Swapped for the locale-aware `Link` from `i18n/navigation`. Without this,
  every "All work" / "See the full process" / CTA button on the `fa` site
  would have linked to the bare English path.
- `components/ui/identity.tsx` (`IdentityCta`) and
  `components/site/breadcrumb.tsx` — same fix, for consistency, even
  though neither is wired into a live page yet (built ahead of the pages
  that will use them in Phase 6+).
- `components/site/language-switcher.tsx` — fully rewritten. Old version
  just flipped `document.documentElement.lang/dir` and wrote
  `localStorage`. New version uses `next-intl`'s locale-aware router to
  navigate to **the same route** in the other locale (never back to
  Home), and the cookie write is handled by the router itself.
- `components/site/command-palette.tsx` — items and group labels
  translated; navigation goes through the locale-aware router.

### Persian-specific rules
- `components/site/latin-term.tsx` — `<LatinTerm>` wraps a Latin technical
  term in `<bdi dir="ltr">` so it doesn't get reordered inside RTL prose.
  Applied to: project `technologies` badges, tech-stack `items` badges,
  and the developer's name in the About heading (via `t.rich`, since the
  name is interpolated into translated Persian text).
- `lib/format.ts` — `formatDate` / `formatNumber` / `formatCurrency`
  helpers over `Intl`, keyed by locale (`fa` → Gregorian calendar with
  Persian digits, not `fa-IR`'s default Solar Hijri — see file comment).
  Wired into `InsightsPreview`'s publish date, replacing a hardcoded
  `new Intl.DateTimeFormat('en', …)`.
- Tailwind's `rtl:`/`ltr:` variants (already keyed off `[dir]` on `<html>`
  since Phase 4) needed no changes — they now key off the real
  server-rendered `dir`, not a client-set one.

## Verified

Ran a real `next build` (Turbopack) end to end:
- `next/font/google` needs network access this sandbox doesn't have
  (`fonts.googleapis.com` isn't in the allow-list) — used the established
  copy-and-patch approach: backed up the real `app/[locale]/layout.tsx`,
  swapped the three font imports for inert stub objects, built, inspected
  output, then **restored the real file from the backup** (diffed
  identical after restore, confirmed above).
- Both `/en` and `/fa` statically generated for Home and `/design-system`
  (`generateStaticParams` over `routing.locales`).
- Inspected the rendered `/fa` HTML directly:
  `<html lang="fa" dir="rtl">`, every internal link correctly prefixed
  (`/fa/work`, `/fa/services`, `/fa/about`, …), external links
  (GitHub/LinkedIn/Fiverr/WhatsApp/mailto) correctly **not** prefixed,
  `<title>` and OG/Twitter meta tags translated, `<bdi dir="ltr">`
  correctly wrapping tech-stack badges and the developer's name.
- Migrated `middleware.ts` → `proxy.ts` after the first build surfaced
  Next.js 16's deprecation notice; rebuilt clean, warning gone.

## Known debt (tracked, not blocking)

- **`TechCategory.items` / `Project.technologies` stay English-only.**
  Per the existing type contract in `types/content.ts` these are "proper
  nouns", but a few entries (`"Authentication"`, `"Server-side
  validation"`, `"Relational data modeling"`, `"Row-level security"`) are
  descriptive phrases, not proper nouns. Translating them is a content
  *and* data-model decision (would need per-item `LocalizedText`) better
  made deliberately in a later phase than folded silently into 5.1.
- **`app/[locale]/design-system/page.tsx` body content stays English.**
  It's the internal, `noindex` design-system tool (Phase 4.7), not public
  site content — only its `<title>`/description are translated for
  consistency. Translating the full showcase is out of scope for the
  public bilingual site.
- **`app/manifest.ts` stays English** (`siteConfig.tagline`/`description`).
  PWA manifests aren't easily localized per-request in Next.js without a
  dynamic route; revisit alongside Phase 10 (Installable PWA).
- **`components/ui/identity.tsx` (`IdentityCta`) labels stay English**
  ("Start a project" / "Book a consultation"). Not wired into any live
  page yet (Phase 4.5 built it ahead of use) — translating it now would
  mean inventing message keys for pages (`/about`, `/services`) whose
  content structure isn't decided yet. Revisit when Phase 6/8/9 wires it
  into a real page.

## Files changed

**New:** `i18n/routing.ts`, `i18n/navigation.ts`, `i18n/request.ts`,
`proxy.ts`, `global.d.ts`, `messages/en.json`, `messages/fa.json`,
`lib/format.ts`, `components/site/latin-term.tsx`,
`app/[locale]/layout.tsx`, `app/[locale]/page.tsx`,
`app/[locale]/design-system/page.tsx`, `docs/phases/PHASE-5.1-README.md`

**Modified:** `next.config.mjs`, `package.json`, `lib/site.ts`,
`lib/home-content.ts`, `components/site/site-header.tsx`,
`components/site/mobile-nav.tsx`, `components/site/site-footer.tsx`,
`components/site/command-palette.tsx`,
`components/site/language-switcher.tsx`, `components/ui/actions.tsx`,
`components/ui/patterns.tsx`, `components/ui/identity.tsx`,
`components/site/breadcrumb.tsx`, `components/home/hero.tsx`,
`components/home/capability-strip.tsx`, `components/home/featured-work.tsx`,
`components/home/services.tsx`, `components/home/why-artaveo.tsx`,
`components/home/tech-stack.tsx`, `components/home/process.tsx`,
`components/home/about-preview.tsx`, `components/home/insights-preview.tsx`,
`components/home/final-cta.tsx`

**Deleted** (need manual deletion in the working copy — a zip can't
represent this): `app/layout.tsx`, `app/page.tsx`,
`app/design-system/page.tsx`

## Next sub-phase

**5.2 — Shell completion & global boundaries** (Home nav item, right-side
controls incl. Search, mobile nav sheet/overlay decision, sticky header
polish, footer real-links-only pass, command palette content wiring,
per-locale `loading`/`error`/`not-found`). Depends on 5.1 being done
(confirmed above) — recommend a **new chat** for it, since it's a fresh
sub-phase touching a different slice of the shell than the routing/i18n
plumbing this session focused on.
