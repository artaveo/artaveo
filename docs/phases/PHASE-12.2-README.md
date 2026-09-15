# Phase 12.2 — Data Model & Migrations: import script + selector switch

**Status:** ✅ COMPLETE — this closes Phase 12 in full.
**Date:** 15 September 2026

## Objective

Complete Phase 12's remaining action items (roadmap § 12): the one-way
import script from file-based content into the database, running it so
the schema `12.1` created actually holds the site's real content, **and**
the selector-layer switch — making every page and component that reads
`Project`/`Service`/`ServicePackage`/`ServiceAddon`/`EngagementModel`/
`Technology` content read it from Supabase instead of
`lib/home-content.ts`/`lib/services-content.ts`'s static arrays.

An earlier point in this session split Phase 12 into "12.1" and "12.2" —
a split the roadmap itself doesn't define, introduced because the full
scope didn't fit one sitting. The owner asked that the phase breakdown
not be touched further. This document honours that: 12.2 below covers
**everything** left in Phase 12 — import script, data population, and the
full selector switch — completed in this one session, with no further
sub-numbering.

## Scope

- `scripts/import-content-to-db.ts` — the import script (unchanged from its earlier delivery this session)
- Content imported into the live Supabase project (`ukzovqnpqjcrwofycalc`) — unchanged from its earlier delivery this session
- `lib/supabase/content-queries.ts` (new) — Supabase read layer + row-to-type mappers for Project/Service
- `lib/home-content-projects.ts` (new) — Supabase-backed project selectors
- `lib/home-content.ts`, `lib/services-content.ts` — selectors switched to Supabase-backed (async); raw file-based arrays kept, exposed only for the import script
- `lib/inquiry-summary.ts`, `lib/notifications/templates.ts`, `lib/notifications/outbox.ts` — updated to pass services/engagement models as data instead of importing selectors
- Every page/component that read the switched selectors — updated to `await` them (Server Components) or receive them as a prop (Client Components)
- `tsconfig.json` — `scripts/` excluded from the app's strict type-check (matches the existing convention for the other untyped `.mjs` tooling scripts)

## Part 1 — import script + data population

Unchanged from earlier in this session; see the "Implementation summary"
and "Verification" this document's predecessor draft already covered in
detail: `scripts/import-content-to-db.ts` reads the real content modules
at runtime (Node's native `--experimental-strip-types`, no
hand-transcription), builds one row model with two renderers (`--sql` and
live `@supabase/supabase-js` upserts), and every row count was
cross-checked exactly against the source content after applying it via
`Supabase:execute_sql` (this sandbox has no network route to
`*.supabase.co`, so the SQL renderer's output was applied through the MCP
tool rather than the script's own live-write path — see the script's own
header comment for the same explanation). A real bug (`EngagementModel`'s
field is `name`, not `title`) and a real design flaw (an invented
`exec_sql` RPC that doesn't exist) were caught and fixed before anything
touched the database.

## Part 2 — selector switch

### Why this couldn't be a mechanical rename

Converting `getFeaturedProjects()`/`getAllProjects()`/`getProjectBySlug()`
(`lib/home-content.ts`) and `getAllServices()`/`getServiceBySlug()`/
`getEngagementModels()` (`lib/services-content.ts`) from synchronous,
file-based reads to `async` Supabase queries touches three genuinely
different situations, not one:

1. **Server Components that already `await`** — every page
   (`app/[locale]/work/**`, `app/[locale]/services/**`, `app/sitemap.ts`,
   `app/[locale]/start/page.tsx`) is already an `async` function; these
   just needed `await` added at each call site, including
   `generateStaticParams`, which Next.js supports as `async`.

2. **Server Components that weren't yet `async`** —
   `components/home/featured-work.tsx` and `components/home/services.tsx`
   have no `'use client'` directive (confirmed by checking for the
   directive directly, not assumed from hook usage — `next-intl`'s
   `useTranslations`/`useLocale` work in this app's Server Components
   too). These became `async function` components, which Next.js renders
   like any other Server Component — no prop-threading needed.

3. **Real Client Components that cannot `await` during render** — the
   `/start` multi-step brief form (`components/start/steps.tsx`,
   `brief-builder.tsx`, `review.tsx`, all genuinely `'use client'`) called
   `getAllServices()`/`getEngagementModels()` synchronously mid-render.
   These now receive `services`/`engagementModels` as props, fetched once
   by `app/[locale]/start/page.tsx` (already an async Server Component)
   and threaded down through `StartContent` → `BriefBuilder` →
   `ServiceStep`/`ReviewStep`. `lib/inquiry-summary.ts`'s
   `buildInquirySummaryLines`/`buildInquirySummaryText`/
   `buildInquiryMailtoHref` — called both from `review.tsx` during render
   and from server-side email-template code
   (`lib/notifications/templates.ts`) — changed from importing the
   selectors internally to taking `services`/`engagementModels` as plain
   parameters, so the same functions stay usable from both a synchronous
   Client Component render and already-async server code.
   `lib/notifications/outbox.ts` (already `server-only` and `async`)
   simply fetches `services`/`engagementModels` itself before building the
   two notification emails.

### The `server-only` split that wasn't optional

`lib/supabase/content-queries.ts` imports `server-only` (via
`lib/supabase/server.ts`'s existing pattern). A first attempt added the
new async project selectors directly into `lib/home-content.ts` — which
breaks the build: `components/site/site-shell.tsx` is a genuine Client
Component that still needs that file's synchronous, file-based
`getDeveloperProfile()`, and a `server-only` import anywhere in a file's
module graph poisons that file for every importer, including unrelated
exports. The fix: the three Supabase-backed project selectors moved to a
new file, `lib/home-content-projects.ts`, imported only by Server
Components. `lib/services-content.ts` didn't need the same split — after
the Client Component refactor above, nothing client-side imports it
anymore, so it was safe to leave its `server-only`-importing selectors in
place there.

### The `@/` alias problem for the import script

`scripts/import-content-to-db.ts` loads `lib/home-content.ts` and
`lib/services-content.ts` directly via Node
(`--experimental-strip-types`), which has no knowledge of the `@/` path
alias — only Next's bundler resolves that. A static top-level
`import {...} from '@/lib/supabase/content-queries'` in either file would
break the import script's module resolution the instant it loaded the
file, even though the script never calls the DB-backed selectors (it
calls `getAllProjectsRaw()`/`getAllServicesRaw()`/
`getEngagementModelsRaw()` instead — see below). Fixed by making that one
import dynamic (`await import('@/lib/supabase/content-queries')`) inside
each async selector function: dynamic imports resolve only when actually
awaited, so a code path the import script never reaches never triggers
resolution.

### Raw exports for the import script

`getAllProjectsRaw()` (`lib/home-content.ts`), `getAllServicesRaw()` and
`getEngagementModelsRaw()` (`lib/services-content.ts`) expose the original
file-based arrays, unfiltered — the import script's actual source now
(previously it imported the public selectors, which is what originally
caused the `@/` resolution break once those became async). No application
page or component reads these; only `scripts/import-content-to-db.ts`
does. Because they're unfiltered by `published`, the import script now
writes every project/service regardless of that flag — the database's own
`published` column and its RLS policy (from 12.1) are what actually gate
public visibility, so an editor could stage an unpublished draft in the
database without it ever being served. There are no unpublished items in
the content today either way, so this changes nothing observable yet.

### A real bug caught by `tsc --noEmit`

`lib/supabase/content-queries.ts`'s service-assembly code grouped
`service_process_steps` rows through a small generic `groupBy<T>()`
helper, called as `groupBy(stepRows as any)`. TypeScript inferred `T` as
the helper's bare constraint (`{ service_id: string }`) rather than the
row's real shape, so the grouped map's values type-checked as missing
`title`/`description`/`sort_order` — a real type error, not a false
positive, since without the fix a runtime shape mismatch was only
accidentally avoided by every field being read the same way regardless.
Fixed by giving `groupBy` an explicit type argument for this one call
instead of relying on inference through `any`.

## Verification

- **`tsc --noEmit`: 0 errors**, full project, after installing dependencies fresh (`npm install`, no `node_modules` existed at session start) — this is the first real TypeScript verification of Phase 12's code, not just a syntax check.
- **`next build` (Turbopack): compiled and bundled successfully** — "Compiled successfully in 41s", confirming the whole refactor (new files, dynamic imports, prop-threading, the two Server Components made async) is structurally sound and every import resolves under Next's real bundler.
- **Static generation could not be verified in this sandbox** — `next build`'s page-data-collection step calls `generateStaticParams`/`generateMetadata` for `/work/[slug]` and `/services/[slug]`, which now query Supabase; this sandbox has no network route to `*.supabase.co` (same restriction that blocks the import script's live-write path — see Part 1) and no `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` set. The build failed there with exactly the error `lib/supabase/content-queries.ts#requireClient()` is designed to throw when unconfigured — not a bug, but a real limitation this session couldn't get past. Unlike the Google Fonts network block (which the project's established convention stubs with a same-shaped local object, reverted after), this one can't be stubbed without feeding the build fake data and risking a real page-rendering bug going unnoticed — so it wasn't stubbed. **A real production build, with real `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` and real network access (Vercel, or a local dev machine), is the first full static-generation verification this code will get — treat that as this feature's first real run and watch it closely.**
- **`next/font/google` stub**: applied per the established sandbox pattern, reverted immediately after the build attempt, confirmed byte-identical to the pre-stub file via `diff`.
- **Content placeholder check**: `node scripts/check-content-placeholders.mjs` — passed.
- **Data-layer verification** (row counts, determinism, RLS, advisors): see Part 1 above / this document's earlier draft — unchanged, still holds.
- **No English/Persian, RTL/LTR, or visual verification possible** — no rendered page could be reached in this sandbox (see static-generation limitation above); the JSX itself is unchanged from what already shipped in earlier phases except for the `async`/prop additions, so no new copy or layout was introduced.

## Files changed

- `scripts/import-content-to-db.ts` (from earlier this session; raw-export renames)
- `lib/supabase/content-queries.ts` (new)
- `lib/home-content-projects.ts` (new)
- `lib/home-content.ts`, `lib/services-content.ts`
- `lib/inquiry-summary.ts`, `lib/notifications/templates.ts`, `lib/notifications/outbox.ts`
- `app/[locale]/work/page.tsx`, `app/[locale]/work/[slug]/page.tsx`
- `app/[locale]/services/page.tsx`, `app/[locale]/services/[slug]/page.tsx`
- `app/[locale]/start/page.tsx`
- `app/sitemap.ts`
- `components/home/featured-work.tsx`, `components/home/services.tsx`
- `components/start/start-content.tsx`, `components/start/brief-builder.tsx`, `components/start/steps.tsx`, `components/start/review.tsx`
- `tsconfig.json`
- `docs/phases/PHASE-12.2-README.md` (this file, replacing its earlier draft)
- `ROAD-MAP-ARTAVEO.md` (status updated)

## Database changes / migrations

None in this part — Part 1 (earlier this session) already populated
everything Part 2 now reads.

## Known issues

- **Production build's static generation is unverified from this sandbox** — see Verification above. This is the one real gap in this session's own testing; it should be the first thing checked after this ships (a Vercel preview deploy, or `next build` on a machine with real Supabase network access and credentials).
- The `runAgainstSupabase()` live-write path in the import script remains untested end-to-end from this sandbox for the same network reason (unchanged from Part 1).
- `recommendations` and `articles` remain empty — correct, no real content exists yet.

## New debt

None beyond what Phase 12 itself already tracked. Phase 12 is now fully
complete — no further sub-phase (no "12.3") is needed or planned.

## Rollback

Data rollback: unchanged from Part 1 (re-run the import script, or
`delete from public.projects;` etc. — cascades via FKs).

Code rollback: revert the files listed under "Files changed" above to
restore the file-based selectors. Since the raw exports
(`getAllProjectsRaw()` etc.) already exist as a safety net, a partial
rollback (keep the DB populated, revert only the selector switch) is also
possible without touching the database.

## Final status

**PHASE: 12**
**STATUS: COMPLETE** (12.1 — schema and migrations; 12.2 — import script,
data population, and selector switch — all done)

Next recommended phase: whichever the roadmap's phase index names next
after Phase 12 (new chat; re-clone and re-read the roadmap fresh per the
session workflow before starting, per the project's own convention).
