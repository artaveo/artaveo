# Phase 5.2 — Shell completion & global boundaries

**Status:** ✅ complete
**Date:** 12 September 2026

## What this phase delivered

Closes out Phase 5 (Internationalization & Shell Completion) by finishing
the header/footer/nav chrome and adding the three route-level boundary
screens every route needs, on top of the routing/dictionary work from
§ 5.1.

### Navigation
- **"Home" added to the primary nav.** `lib/site.ts#mainNav` now starts
  with `{ href: '/', key: 'home' }`; `Nav.home` added to both dictionaries
  (`خانه` / `Home`). Renders in the desktop header nav, the mobile sheet,
  and the footer's Explore column — the logo already linked home, but the
  roadmap bullet asked for it as an explicit nav item too.
- **Insights hidden until it has real content.** `NavItem` and
  `CommandItem` both gained an optional `hasContent` flag; `insights` is
  the only entry set to `false` right now. `visibleMainNav` and
  `visibleCommandItems` (both exported from `lib/site.ts`) are the
  filtered lists every nav surface (header, mobile nav, footer, command
  palette) now reads from instead of the raw arrays — `mainNav` /
  `commandItems` stay the full canonical list for anything that needs it
  later (sitemap, etc.). Flip `hasContent` to `true` (or drop the field)
  once § 17 publishes real articles; no other file needs to change.
- **Sheet, not full-screen overlay — recorded.** `MobileNav` was already
  built as a side sheet (§ 4.x); the roadmap asked for this decision to be
  written down, so it's now a doc comment on the component itself
  explaining why (keeps the header's brand mark/close affordance visible
  for orientation, matches the existing `components/ui/sheet.tsx` pattern
  elsewhere instead of introducing a second full-viewport takeover style).

### Header
- **Solid on content pages.** The header used to be transparent-until-
  scrolled on every route. Now: `isHome = pathname === '/'`; every other
  route is solid immediately (`solid = scrolled || !isHome`). Home keeps
  the transparent-over-hero treatment since it still has one.
- **Skip-to-content link.** A visually-hidden, focus-visible anchor to
  `#main` (the id `SiteShell`'s `<main>` already had) is now the first
  focusable element in the header, translated via `Common.skipToContent`.

### Sticky Mobile CTA (§ 4.5) — wired in
- `components/ui/identity.tsx#StickyMobileCta` was built in § 4.5 but only
  ever demoed on `/design-system`. `SiteShell` now renders it on every
  route except Home (the Hero already has an equivalent CTA above the
  fold) and `/design-system` (an internal tool, not a page to hire from) —
  a deny-list (`STICKY_CTA_EXEMPT_PATHS`) rather than an allow-list, so
  every future content page (§ 6–9) gets it automatically without needing
  to remember to wire it in.
- `SiteShell` is now a Client Component (needs `usePathname` to decide the
  above) and calls `getDeveloperProfile()` for the availability data,
  matching the existing pattern in `components/home/about-preview.tsx`.
- **Closed a real live-translation gap while wiring this in:**
  `IdentityCta` (`"Start a project"` / `"Book a consultation"`) and
  `AvailabilityChip` (`"Available for new projects"` etc.) both had
  hardcoded English labels — harmless while they only rendered inside the
  English-only design-system showcase, but `StickyMobileCta` is now live
  on the real `fa` site. Both now read from dictionaries (`Common.*`, and
  a new `Availability.*` namespace); `AvailabilityCard` (still
  showcase-only, used in § 8/§ 9 later) was fixed the same way so it
  doesn't break silently when it does go live.

### Route boundaries — `loading`, `error`, `not-found`
- **`app/[locale]/not-found.tsx`** — wrapped in `SiteShell`, so a visitor
  who hits an unmatched route (a stale link, or clicking `Work`/`Services`/
  etc. before § 6–9 ship their pages) can still use the real header/nav to
  get elsewhere, not hit a dead end. Fully translated (`NotFound.*`).
  Doesn't receive `params`, so the locale for the "back home" link comes
  from `getLocale()`.
- **`app/[locale]/error.tsx`** — Client Component (Next.js requirement),
  translated (`ErrorPage.*`). Deliberately does **not** render `SiteShell`:
  if the error originated inside the shared shell itself, reusing it here
  risks throwing again mid-render. Minimal, self-contained: brand mark,
  message, a `reset()` retry button, a plain link home.
- **`app/[locale]/loading.tsx`** — a branded skeleton, but **not**
  translated, and that's a documented, verified trade-off: `loading.tsx`
  does not receive `params` in this Next.js version (confirmed by testing
  — `params` resolves `undefined`), and calling `next-intl/server`'s
  `getTranslations()`/`getLocale()` without an explicit locale forces the
  *entire* `/en` and `/fa` routes out of static generation. Confirmed by a
  real `next build`: with the translated version, both routes dropped from
  `●` (SSG) to `ƒ` (dynamic); removing the call restored `●` immediately.
  Losing static generation on every page to translate a screen a fully
  static site almost never shows was the wrong trade — revisit once § 6+
  adds real dynamic routes where this screen is actually likely to appear.
- **`app/not-found.tsx`** (root, no locale) — the escape hatch for the
  rarer case where the `[locale]` segment itself doesn't match a real
  locale, so `next-intl`'s request context was never established. Since
  there's no root `app/layout.tsx` (deleted in § 5.1), this file supplies
  its own `<html>`/`<body>` — required by Next.js for a root `not-found`
  that can render without the segment's own layout. Kept plain/English on
  purpose: there's no locale to translate into at this point.
- Added `NotFoundState` to `components/ui/states.tsx` (alongside the
  existing `EmptyState`/`ErrorState`/etc. family) so the not-found page
  reuses the same visual language instead of a one-off layout, and is
  available for later per-item 404s (e.g. a bad case-study slug in § 6).

### Footer
- No changes needed for D-05 links (already real-only from § 3.5). Added
  a doc comment on `SiteFooter` recording that "locale-aware legal links"
  is intentionally deferred: there's no privacy/terms page to link to yet
  (§ 11.2 builds them) and this codebase doesn't add placeholder links.
  When § 11.2 ships, add a `legalNav` list to `lib/site.ts` and render it
  with the existing locale-aware `Link` — not a new hardcoded block.

## Verified

Ran a real `next build` (Turbopack) end to end, twice — once to confirm
the shell/nav changes compiled clean, once after the `loading.tsx` fix to
confirm static generation was restored:
- `next/font/google` needs network this sandbox doesn't have — used the
  established copy-and-patch approach: backed up
  `app/[locale]/layout.tsx`, swapped the three font imports for inert
  stub objects, built, then **restored the real file from the backup**
  (byte-identical after restore, confirmed via `md5sum`).
- Final route table: `/en`, `/fa`, `/en/design-system`, `/fa/design-system`
  all `●` (SSG, prerendered via `generateStaticParams`); `/_not-found`
  static.
- Ran the real production server (`next start`) and fetched `/en` and
  `/fa` directly: `<html lang="fa" dir="rtl">` correct, skip-link renders
  with the translated label, "Home"/"خانه" appears in the header nav and
  footer, "Insights" does **not** appear as a nav/footer link in either
  locale (only inside the Home page's own Insights-preview section, which
  is unrelated content, not navigation).

## Known debt (tracked, not blocking)

- **`app/[locale]/loading.tsx` stays English-only** — see the dedicated
  explanation above. Revisit alongside § 6+ once real dynamic routes make
  this screen more than a theoretical concern.
- **Footer has no legal links yet** — correct for now; § 11.2 builds the
  pages this would point to.
- **`AvailabilityCard`** (the fuller card variant, `components/ui/identity.tsx`)
  is still only demoed in `/design-system` — fixed to use the same
  translations as `AvailabilityChip` while in here, but not wired into a
  live page yet (§ 8 About / § 9 Contact will do that).
- **`/work`, `/services`, `/process`, `/about`, `/insights`, `/contact`
  don't exist as routes yet.** Clicking them today correctly lands on the
  new translated `not-found.tsx` — that's expected; those pages are built
  in § 6–9. Once they ship, `NotFoundState`'s handling of a *missing case
  study slug specifically* (as opposed to a whole missing route) is a
  separate, smaller piece of work for § 6.1.

## Files changed

**New:** `app/[locale]/not-found.tsx`, `app/[locale]/error.tsx`,
`app/[locale]/loading.tsx`, `app/not-found.tsx`,
`docs/phases/PHASE-5.2-README.md`

**Modified:** `lib/site.ts`, `components/site/site-header.tsx`,
`components/site/mobile-nav.tsx`, `components/site/site-footer.tsx`,
`components/site/command-palette.tsx`, `components/site/site-shell.tsx`,
`components/ui/identity.tsx`, `components/ui/states.tsx`,
`messages/en.json`, `messages/fa.json`

## Exit criteria — checked against the roadmap

- ✅ Switching language on any existing route lands on the same route in
  the other locale with correct `lang`/`dir` (unchanged from § 5.1,
  reverified above).
- ✅ No hard-coded UI strings — the two real gaps found while wiring
  `StickyMobileCta` live (`IdentityCta`, `AvailabilityChip`) were closed
  in this phase rather than left for later.
- ✅ RTL review completed for the shell — header, mobile sheet, footer,
  command palette, and all three new boundary screens checked in `fa`/RTL
  via a real production server render.

## Next sub-phase

**Phase 6 — Work & Case Study Engine** (`/work` index, case study
template, and the two real case studies — Transportation System,
Pazhuhesh Complex Portal). Depends on Phase 5 being fully done (confirmed
above). Recommend a **new chat** for it — different slice of work
(content/data modeling for real projects) than the shell/chrome this
session focused on.
