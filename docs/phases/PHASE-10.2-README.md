# Phase 10.2 — Installable PWA: Service Worker & Caching Strategy

**Status:** ✅ COMPLETE
**Date:** 13 September 2026

## Objective

Give the marketing site (Home, Work, Services, About, Process, Insights)
a real offline/repeat-visit caching strategy — cache-first for static
assets, stale-while-revalidate for content pages — versioned to the
deploy, while keeping every server mutation and any future admin/CMS/
client-portal route completely outside the service worker's caching
behaviour (roadmap § 10.2).

## Scope

In scope, per § 10.2's own bullets:
- cache-first for static assets: fonts, logo files, icons, CSS/JS bundles
- stale-while-revalidate for the six named content-page types
- cache versioned to the deploy; a new publish invalidates the old cache
- never cached, network-only: the Brief Builder's submit request and
  every other server mutation; every current and future admin/CMS/
  client-portal route

Out of scope (§ 10.3, next): the Brief Builder's own offline behaviour
(blocking or queueing a submission while offline, and the "never fake
success" guarantee on the client side). This phase does not touch
`/start` at all — it's simply never matched by the content-page list
below, so it was already, correctly, untouched by § 10.1's worker too.

## Dependencies

No Decision Register item applies. Builds directly on § 10.1's
`scripts/generate-sw.mjs` (`BUILD_ID` stamping) and
`components/site/pwa-manager.tsx` (registration) — no new registration
code needed; the existing registration already picks up whatever the
generator produces.

## Implementation summary

All of § 10.2 lives inside the single generated `public/sw.js`
(`scripts/generate-sw.mjs`), extending rather than replacing § 10.1's
lifecycle handlers, exactly as planned when § 10.1 was written.

**Cache versioning.** Two caches, both suffixed with the same `BUILD_ID`
§ 10.1 already stamps for update detection: `artaveo-static-<BUILD_ID>`
and `artaveo-content-<BUILD_ID>`. On `activate`, every `artaveo-*` cache
key that isn't one of the two current ones is deleted — so the moment a
visitor accepts the § 10.1 "update available" reload, the old deploy's
caches are gone, never silently served again.

**Cache-first (`STATIC_CACHE`)** — matched by `isStaticAssetPath()`:
`/_next/static/*` (this already covers every hashed CSS/JS bundle *and*
every self-hosted `next/font` file — Geist, Geist Mono, Vazirmatn all
land under `/_next/static/media/`, so no separate font rule was needed),
`/brand/*` (every logo/mark variant), `/images/*` (the Work case-study
screenshots — without these, a "cached" case study would render with
broken images offline, which isn't meaningfully browsable, even though
the roadmap bullet's own examples are fonts/logo/icons/bundles rather
than content photography), the icon family (`/icon-*`, `/apple-icon.png`,
`/icon.svg`, `/artaveo-icon.svg`, `/favicon.ico`), `/manifest.webmanifest`
and `/Profile-pic.jpg`. Serves from cache immediately if present;
otherwise fetches, caches on success, and returns the response.

**Stale-while-revalidate (`CONTENT_CACHE`)** — matched by
`isContentPagePath()` against § 10.2's own list verbatim: Home (`/en` or
`/fa` with nothing after), Work (index + `/work/[slug]`), Services
(index + `/services/[slug]`), About, Process, and Insights (no route
exists yet — Phase 17 — but the matcher already covers it, so it needs no
service-worker change the day it ships). Only intercepted when
`request.mode === 'navigate'` — a real top-level navigation, not one of
Next's own RSC/client-router fetches, which carry a different `mode` and
are deliberately left alone so this worker can never interfere with App
Router's own prefetch/streaming behaviour. Returns the cached response
instantly when one exists (refreshing the cache in the background), or
waits on the network when there isn't one yet.

**Network-only, by construction, not by a path list.** The one-line
`if (request.method !== 'GET') return;` at the top of the fetch handler
is what actually guarantees the Brief Builder's submission (and any
future admin write) is never cached — every mutation in this app is a
non-GET request, so this is a hard guarantee, not a maintained denylist
that could drift out of date. Separately, `/start`, `/contact`,
`/design-system`, `/api/*`, and any future `/admin` or client-portal
route simply never match `isContentPagePath()` or `isStaticAssetPath()`,
so the fetch handler's third branch (no `respondWith` call at all) lets
the browser handle them exactly as if this worker didn't exist. That's
the concrete mechanism behind "excluded from the service worker's scope
entirely" for this phase — see Known Issues for the one nuance on what
"scope" means here versus the SW spec's own registration-scope concept.

## Decisions

None needed.

## Changed files

```
scripts/generate-sw.mjs   extended with cache-first / SWR strategy, cache
                          versioning and cleanup, and the fetch handler
public/sw.js              regenerated (generated, not committed)
```

No other file changed — § 10.1's registration code in
`components/site/pwa-manager.tsx` needed no changes; it already just
registers whatever `/sw.js` contains.

## Database / migrations

None.

## Tests

No automated test suite exists yet (Phase 21). The two path-matching
predicates (`isContentPagePath`, `isStaticAssetPath`) — the actual
decision logic behind every caching/exclusion guarantee in this phase —
were extracted verbatim and run against 17 + 14 hand-written cases in
Node (both the six real content-page shapes and the excluded paths:
`/start`, `/contact`, `/design-system`, `/admin`, `/admin/leads`, the
bare `/`, and an unsupported locale). All 31 cases passed. This is not a
committed test file (no test runner exists in the repo yet — Phase 21);
it was a verification step for this session, reproducible from the
matcher source in `public/sw.js` itself.

## Manual verification

- `node --check public/sw.js`: valid syntax.
- Matcher unit tests (above): 31/31 pass.
- `tsc --noEmit`: clean (no TypeScript changed in this sub-phase, but run
  again for safety).
- `next build` (Turbopack, fonts stubbed per the established sandbox
  pattern and restored immediately after — `diff` confirmed byte-identical
  restoration): clean, all 40 routes generated, no new warnings.
- Re-read the generated `sw.js` end to end for the three structural
  guarantees § 10.2 asks for: (1) non-GET requests return before any
  caching logic runs; (2) the content-page matcher's segment allow-list
  cannot match `/start`, `/contact`, `/design-system`, or any path whose
  second segment isn't in the six-item list; (3) `activate` deletes every
  non-current `artaveo-*` cache key.
- **Not verifiable in this sandbox** (no real browser / Cache Storage API
  / Service Worker execution context available here): an actual offline
  reload of a previously-visited content page, Lighthouse's PWA/
  installability checks, and confirming a real second deploy's `activate`
  actually evicts the first deploy's caches in a live browser. These need
  one live check against the Vercel deployment, same as § 10.1's open
  item — recommended to do both in the same pass.

## Known issues

- **"Excluded from scope" is enforced at the fetch-handler level, not via
  a narrower service-worker registration scope.** The SW spec's own
  `scope` concept (e.g. registering a worker at `/app/` so it can never
  see requests outside `/app/`) isn't used here — the worker is still
  registered at `/` (matching the § 10.1 manifest's `scope: '/'`) and
  simply chooses, per request, whether to intercept. For every current
  route this is behaviourally identical to true scope exclusion (the
  request is never touched), and it's the only option available anyway
  since admin/CMS/client-portal routes (Phase 13+) don't exist yet to
  register a real sub-scope around. Worth re-examining once those routes
  exist and their real path structure is known — noted here so it isn't
  silently forgotten.
- Fully-offline **client-side** (SPA) navigation between two content
  pages is not guaranteed — only a full load or reload of a given content
  URL is. Next's client router fetches an RSC payload for in-app link
  clicks, which this worker deliberately does not intercept (see
  implementation summary). If offline testing is done by clicking links
  within the app rather than reloading, some navigations may fail even
  though the target page would load fine directly. This is a scope
  decision made to avoid the real risk of a custom cache interfering with
  App Router's own RSC streaming/prefetch semantics, not an oversight.
- No cache-size accounting or eviction beyond the per-deploy version
  cutover — reasonable at this site's current scale (a handful of
  content pages and a few dozen static assets); worth revisiting if the
  asset footprint grows substantially.

## New debt

None new. `public/brand/og-image.png` (Phase 11 debt, noted in
§ 10.1's phase doc) remains untouched and out of scope here.

## Rollback

Revert `scripts/generate-sw.mjs` to its § 10.1 version. The next build's
freshly generated `sw.js` will contain only the lifecycle handlers again
(no caching); any visitor's previously-cached `artaveo-static-*` /
`artaveo-content-*` entries are simply orphaned and will be cleaned up
the next time a worker with the old, non-caching `activate` handler runs
(it doesn't delete unknown caches, so — note for a real rollback — those
specific orphaned caches would persist until the browser's own storage
eviction; not a correctness problem, just a minor storage footprint to
be aware of if this rollback path is ever actually used).

## Final status

**COMPLETE.** Both of § 10.2's caching rules are implemented, its
versioning/invalidation requirement is implemented, and its network-only
guarantee for mutations and future admin routes is implemented and is
structurally hard to violate by accident (method check, not a
maintained list). § 10.3 (offline Brief Builder behaviour) is the next
recommended work, and is the last piece needed to close Phase 10's own
exit criteria in full.
