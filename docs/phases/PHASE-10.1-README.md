# Phase 10.1 — Installable PWA: Web App Manifest, Install Experience & Update Handling

**Status:** ✅ COMPLETE
**Date:** 13 September 2026

## Objective

Make Artaveo installable like an app — a correct, complete web app
manifest; a non-nagging, platform-conventional install prompt; and a
visible "update available" prompt when a new deploy publishes while a
visitor already has the site open or installed (roadmap § 10.1).

## Scope

In scope for this sub-phase, per § 10.1's own three bullets:
- `manifest.json` (`app/manifest.ts`) content
- Icons generated from the Phase 4 mark-only, flat/monochrome variant, at
  the manifest's standard PWA sizes
- Install prompt following platform convention (no custom nagging banner)
- Update handling: a visible prompt on a new deploy, not silent staleness

Out of scope (explicitly deferred to their own sub-phases per the
roadmap): the cache-first / stale-while-revalidate **caching strategy**
itself (§ 10.2) and the Brief Builder's **offline submission behaviour**
(§ 10.3). This phase registers a service worker for install/update
*lifecycle* only — it caches nothing and has no `fetch` handler.

## Dependencies

D-01 (production domain) blocks §§ 4.1, 9.3 and 11.4 per the Decision
Register — **not** § 10.1. Confirmed against the table before starting;
no decision was needed or blocked for this sub-phase.

## Debt closed by this phase

Recorded in the roadmap at § 4.1 ("Not yet updated, new debt, out of this
pass's scope... recommended before Phase 10"): `public/icon-192.png`,
`public/icon-512.png` and `public/icon-512-maskable.png` were still built
from the old, defective mark trace (a disconnected lower-right facet),
even though the favicon and Apple touch icon had already been corrected
11 September 2026. All three are now regenerated from
`public/brand/artaveo-mark-mono-white.svg` — the same corrected,
connectivity-verified mark. `public/brand/og-image.png` remains open debt
(unrelated to installability; tracked against Phase 11 SEO work, not
touched here to keep this phase's diff scoped to what § 10.1 actually
asked for).

## Implementation summary

**Icons** — regenerated at build time from the vector mono-white mark
(not rasterized from the old PNGs, to avoid compounding any existing
raster artifacts): mark centered on a full-bleed `#1A1A1A` charcoal
canvas (matching the manifest's `background_color`/`theme_color`), sized
to ~40% of canvas width for the two `purpose: "any"` icons — the same
proportion already used in the correct `apple-icon.png`, for visual
consistency across every icon touchpoint — and ~34% for the maskable
icon, giving it extra clearance inside the safe-zone circle that OS icon
masks crop to.

**`app/manifest.ts`** — added `id: '/'` and `scope: '/'` (the installed
app's identity and boundary are the whole site; there's no installable
sub-section). Updated the file's own doc comment, which previously said
"not a PWA install flow (no offline/service-worker work planned)" — no
longer true as of this phase.

**Service worker** (`public/sw.js`, generated — not committed) —
`scripts/generate-sw.mjs` runs before every build and writes a
lifecycle-only worker stamped with a fresh `BUILD_ID`
(`VERCEL_GIT_COMMIT_SHA`, falling back to a timestamp locally). This
stamping is the mechanism that makes the browser's own update check
(a byte-for-byte comparison of `sw.js` run on every navigation) actually
detect a new deploy — an unchanging hand-written file would never look
different across builds. The worker:
- does **not** call `skipWaiting()` on install — a newly installed worker
  waits rather than silently taking over a page that might have
  in-progress state (the Brief Builder is the obvious future case, even
  though its own offline behaviour is § 10.3's job, not this one's)
- calls `clients.claim()` on activate
- listens for a `{ type: 'SKIP_WAITING' }` message, sent by the client
  once the visitor accepts the reload prompt

`next.config.mjs` adds a `headers()` rule forcing
`Cache-Control: no-cache, no-store, must-revalidate` on `/sw.js` — without
it, Vercel's edge cache sits in front of the browser's own bypass-cache
fetch and could still serve a stale worker to a given edge node for a
while after a redeploy.

**`components/site/pwa-manager.tsx`** (new, mounted in
`app/[locale]/layout.tsx` next to `<ThemeSync>`) — the one component that
does everything client-side:
- registers `/sw.js` (production only — a service worker in `next dev`
  would fight its own hot-reloading over which bundle is current)
- shows a small dismissible **update-available** card with a "Reload"
  action when `updatefound` → `installed` fires *and* the page already
  had a controller (i.e. a real update, not the very first install);
  reloads once via `controllerchange` after posting `SKIP_WAITING`
- captures `beforeinstallprompt` (Chromium/Android only — Firefox and
  iOS Safari never fire it, and iOS's install path is the OS share sheet,
  which this component correctly leaves alone) and shows a small
  **install** card with an "Install" action calling the captured event's
  own `prompt()`
- both cards are dismissible, independent, absent on first load, and
  never re-shown after a dismissal within the same page life — the
  "never a custom nagging banner" rule from § 10.1 is read here as "don't
  add heuristics on top of the browser's own judgment of the moment,"
  not as "hide the affordance entirely"
- if both conditions are ever true simultaneously, the update card takes
  priority (an update everyone should see matters more than an install
  offer)

**i18n** — new `Pwa` namespace in `messages/en.json` / `messages/fa.json`
(7 keys: `updateTitle`, `updateDescription`, `reload`, `installTitle`,
`installDescription`, `install`, `dismiss`). Persian copy keeps "Artaveo"
transliterated as "آرتاویو" (matching every other namespace) and the
same `‌ی`-ezafe orthography used throughout the rest of `fa.json`, per
D-03's neutral-vocabulary rule.

## Decisions

None needed — no Decision Register item touches manifest/install/update
mechanics.

## Changed files

```
app/[locale]/layout.tsx              mount <PwaManager />
app/manifest.ts                      id/scope fields, updated doc comment
components/site/pwa-manager.tsx      new — install + update UI, SW registration
scripts/generate-sw.mjs              new — build-time SW generator (BUILD_ID stamping)
next.config.mjs                      Cache-Control: no-cache header for /sw.js
package.json                         build script now runs generate-sw.mjs
messages/en.json                     + Pwa namespace (7 keys)
messages/fa.json                     + Pwa namespace (7 keys)
public/icon-192.png                  regenerated from corrected mono mark
public/icon-512.png                  regenerated from corrected mono mark
public/icon-512-maskable.png         regenerated from corrected mono mark
.gitignore                           + public/sw.js (generated, never committed)
```

`public/sw.js` itself is generated, not committed — present in the
delivered ZIP as the file that was actually build-verified, but will be
regenerated fresh on every future build/deploy.

## Database / migrations

None.

## Tests

No automated test suite exists yet (Phase 21). Verified manually — see
below.

## Manual verification

- `tsc --noEmit`: clean, no errors.
- `next build` (Turbopack): clean, all 40 static/SSG routes generated,
  `/manifest.webmanifest` and `/apple-icon.png` both present in the route
  list. Confirmed the built manifest body resolves to the expected JSON
  (`id`, `scope`, `start_url: "/"`, `display: "standalone"`, correct
  `background_color`/`theme_color`, all three icon entries with correct
  `purpose`).
  - Per the established sandbox pattern: `next/font/google` imports in
    `app/[locale]/layout.tsx` were stubbed before the build (Google Fonts
    unreachable here) and restored immediately after; `diff` against the
    pre-stub backup confirmed byte-identical restoration.
- Confirmed `scripts/generate-sw.mjs` runs standalone and produces a
  well-formed `sw.js`; confirmed the `Cache-Control` header for `/sw.js`
  appears in the build's `routes-manifest.json`.
- Visual check of all three regenerated icons at native resolution:
  connected mark geometry (no disconnected facet), correct charcoal
  background, consistent proportion with the already-correct
  `apple-icon.png`.
- En/fa: `Pwa` namespace present and parseable in both message files;
  Persian copy reviewed for the transliteration/orthography conventions
  used elsewhere in `fa.json`.
- Light/dark: the install/update card uses the same semantic tokens
  (`bg-popover`, `text-popover-foreground`, `border-border`) as the rest
  of the design system, so it inherits both themes without new CSS.
- RTL: card layout uses `inset-x-4 ... sm:end-4` (logical, not
  `left`/`right`), text alignment is the default block-level (correct in
  both directions), and no `text-left`/`pl-`/`pr-` was introduced.
- **Not verifiable in this sandbox** (no real browser / installable
  context available here): the actual `beforeinstallprompt` firing, a
  real install to a home screen, and a real service-worker
  install → waiting → activate cycle across two live deploys. This is
  standard browser runtime behaviour that a code sandbox cannot exercise;
  it needs verification against the live Vercel deployment after this
  phase is pushed — flagged as the one open verification item below.

## Known issues

- The actual end-to-end install and update-prompt behaviour needs a
  first live check against `https://artaveo-seven.vercel.app` after
  deploy: install on an Android/Chromium device, then push a trivial
  follow-up change and confirm the reload prompt appears on an already-
  open tab. The logic is standard and code-reviewed, but "does the
  browser really show it" is worth eyes-on once, in production.
- No Lighthouse installability run performed in this sandbox (no browser
  available). Recommended as part of § 10.1/§ 10.3's combined exit
  criteria once live.

## New debt

- `public/brand/og-image.png` remains built from the old defective mark
  trace — unchanged by this phase (out of scope; tracked against
  Phase 11 SEO work).

## Rollback

Revert the files listed above. `public/sw.js` is generated, not
committed, so rolling back the code also removes the worker from the
next build — visitors with an already-registered worker would simply
stop receiving updates to it until it naturally expires per the
browser's own service-worker lifecycle (no data loss, no broken state).

## Final status

**COMPLETE.** All three of § 10.1's bullets are implemented and build-
verified. § 10.2 (caching strategy) and § 10.3 (offline Brief Builder
behaviour) are the next recommended work — both build directly on the
`sw.js` generation mechanism and `PwaManager` registration introduced
here.
