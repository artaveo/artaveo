# Case Study Media — public gallery rendering

**Status:** ✅ COMPLETE
**Date:** 17 September 2026
**Roadmap entry:** § 23.1 "Out-of-sequence work log" — **this is not a
roadmap phase.** Phase 15 was already complete and Phase 16 is next in
the sequence; this work was necessary but unrelated to that ordering,
so it's tracked here rather than as an invented "15.1".

## Objective

Close the one gap Phase 15 itself disclosed: `project_media` was real
and admin-editable, but nothing on the public `/work/[slug]` case-study
template ever rendered it — both real projects still showed either a
single `coverImage` or nothing. This work captures the actual
screenshot set for both real case studies and wires it through to the
public template § 6.1 already designed for it (`BrowserFrame` /
`DeviceFrame`, named in that section's "media v1" note but unused until
now).

## Scope

> 25 real screenshots (14 Transportation System, 11 Pazhuhesh Portal),
> each captured against the actual running source repo and reviewed
> against its code before capture · `project_media.placement` column
> distinguishing hero ("main") shots from supporting ("gallery") shots ·
> `media_assets`/`project_media` rows populated for both projects, real
> metadata, bilingual alt/caption text · `cover_image` backfilled for
> both projects · case-study hero renders every `main` item in its
> actual capture frame · new gallery grid + lightbox for `gallery` items

This is additive throughout — no existing field, column, or component
prop was removed or repurposed. A project with no `media` rows still
renders exactly as it did before this work.

## Dependencies

None blocking. `project_media` and `media_assets` already existed
(migrations `0003`/`0007`, Phase 12.1) — this work only added the one
column (`placement`) they were missing to tell a hero shot from a
gallery shot, and populated real rows. No new package dependency.

## Implementation summary

### Screenshot capture

Before any code changed, this session cloned all three relevant repos
(`artaveo/artaveo`, `artaveo/Transportation-System`,
`artaveo/pezhohesh-portal`) and audited each candidate screen against
the actual running source — routes, components, admin panel tabs — not
against the case-study spec's assumptions alone. Two real deviations
were found and corrected before capture: Transportation System's
"coupons" have no standalone admin screen (they live inside
`loyalty-manager.tsx` alongside loyalty tiers — captured as one combined
shot, not two); Pazhuhesh Portal has no bilingual/English mode at all
(`index.html` is hardcoded `lang="fa" dir="rtl"`, no language switcher
anywhere in the code) — the "theme/bilingual" gallery slot captures dark
mode only, not a fabricated bilingual view.

Zakir captured and placed all 25 files at the exact repo-relative paths
agreed in the screenshot manifest; this session verified the final set
against the manifest (all present, none extra, real file sizes) and
spot-checked several against their expected content directly (seat
map, both admin-role dashboards, the image-slot media manager, dark
mode) before treating any of it as ready to wire in.

### Database (`db/migrations/0013_project_media_placement.sql`)

- `alter table project_media add column placement text not null default
  'gallery' check (placement in ('main', 'gallery'))` — a second closed
  vocabulary, independent of the existing `kind` ('desktop' | 'mobile' |
  'diagram') column; a shot can be any combination of the two axes
- 25 new `media_assets` rows: real `url`, bilingual `alt` (what the
  screenshot visibly shows, verified against the source repo — never a
  generic label), real `width`/`height`/`size_bytes` read directly off
  each PNG file, `type: 'image/png'`
- 25 new `project_media` rows linking each asset to its project, with
  `kind` ('mobile' for the two genuine mobile-viewport captures,
  'desktop' for the rest), `placement`, a bilingual `caption` (a short
  line — what the shot demonstrates, not a restatement of the alt text),
  and `sort_order`
- backfills `projects.cover_image` for both rows, which had been `null`
  since Phase 12.1 — `/work`'s grid and the homepage's Featured Work
  tiles were silently rendering the neutral placeholder for both real
  projects until this migration
- applied live via the Supabase MCP's `apply_migration` (same path
  every phase since 12.2 has used — this sandbox has no network route
  to Supabase); verified by querying the joined result back (all 25
  rows correct) and re-running `get_advisors(type: 'security')` — no
  new findings, the pre-existing 9 `rls_enabled_no_policy` service-role
  tables are unchanged

### Types (`types/content.ts`)

- `ProjectMediaKind = 'desktop' | 'mobile' | 'diagram'`
- `ProjectMediaItem = { src, alt, caption?, kind, placement }`
- `Project.media?: ProjectMediaItem[]` — optional, additive;
  `Project.coverImage` is unchanged and still used by the catalogue
  card / Featured Work tile

### Selector layer (`lib/supabase/content-queries.ts`)

`fetchProjectsByFilter` now runs a third query alongside the existing
`project_sections`/`project_technologies` ones — `project_media` joined
to `media_assets(url, alt)` — and `assembleProject` sorts and maps the
result onto `project.media`, omitting the field entirely when a project
has no rows (same "absent field, not an empty array" convention the
rest of this assembler already follows for `constraints`/`keyDecisions`).

### Public template (`components/work/case-study.tsx`)

The Hero media block now maps every `placement: 'main'` item to its own
frame — `BrowserFrame` for `kind: 'desktop'`, the existing (previously
unused in this template) `DeviceFrame` for `kind: 'mobile'` — in
capture order, first item `priority`-loaded. A project with an empty
`media` array falls back to the exact single-`coverImage` block this
template rendered before this work, so nothing regresses for a
project photographed later than this one.

A new "Gallery" section (hidden entirely when `galleryMedia` is empty)
renders `placement: 'gallery'` items through the new
`components/work/project-gallery.tsx` — a small client component
(needs lightbox open/close state, kept separate so `case-study.tsx`
itself stays a Server Component otherwise): a responsive thumbnail grid
opening the existing `Dialog` primitive with the full image and its
caption.

### i18n

One new key, `CaseStudy.gallery` ("Gallery" / "گالری تصاویر"), both
locales. 687/687 parity (flattened-key diff, both files).

## Decisions

- **`placement` as its own column, not folded into `kind`.** `kind`
  already meant "what device/context was this captured in" (0003); a
  hero-vs-gallery placement is a different, orthogonal question — a
  shot could in principle be a mobile hero shot or a desktop gallery
  shot. One enum trying to carry both would eventually need a
  compound value; two independent closed-vocabulary columns don't.
- **`media_assets`/`project_media`, not a new table.** Both already
  existed in the schema (0003/0007) specifically for this — building a
  parallel table would have duplicated exactly what they're for.
- **Fallback to `coverImage`, not a required migration for every
  project.** Only Transportation System and Pazhuhesh Portal have
  `media` rows today; the template still works, unchanged, for any
  future project that only has a `coverImage` until its own screenshots
  are captured.
- **Gallery as a separate client component, not inlined into
  `case-study.tsx`.** The lightbox needs `useState`; keeping that in
  its own file means the case-study template itself stays a plain
  Server Component for every other section.
- **Logged as § 23 "out-of-sequence work," not a roadmap phase.**
  Zakir's call: Phase 15 is complete, Phase 16 is next — this doesn't
  belong in that sequence even though it's real, verified work.

## Changed files

- `db/migrations/0013_project_media_placement.sql` (new)
- `types/content.ts`
- `lib/supabase/content-queries.ts`
- `components/work/case-study.tsx`
- `components/work/project-gallery.tsx` (new)
- `messages/en.json`, `messages/fa.json`
- `public/images/work/transportation-system/main/{01–06}-*.png` (6)
- `public/images/work/transportation-system/gallery/{07–14}-*.png` (8)
- `public/images/work/pazhuhesh-portal/main/{01–05}-*.png` (5)
- `public/images/work/pazhuhesh-portal/gallery/{06–11}-*.png` (6)
- `ROAD-MAP-ARTAVEO.md` (revision 30, new § 23 / § 23.1)

## Database / migrations

`0013_project_media_placement.sql` — applied live on
`ukzovqnpqjcrwofycalc` via the Supabase MCP. Rollback is documented in
the migration's own header (drop the `placement` column, delete the 25
new `project_media`/`media_assets` rows, null both `cover_image`
columns back out).

## Tests

No automated test suite exists yet for this codebase (Phase 21 is
still ahead) — verification below is manual/structural.

## Manual verification

- `npx tsc --noEmit` — 0 errors
- `npx next build` (Turbopack) — "Compiled successfully"; page-data
  collection then throws the same pre-existing
  `lib/supabase/content-queries.ts#requireClient()` error every phase
  since 12.2 has hit (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` not
  reachable from this sandbox) — this run it surfaced first at
  `/[locale]/services/[slug]`, same root cause, unrelated to this work
- `next/font/google` stub applied to `app/[locale]/layout.tsx` for the
  build attempt only, reverted immediately after, confirmed
  byte-identical via `diff`
- `node scripts/check-content-placeholders.mjs` — passes (this work
  didn't touch any of the files it covers)
- i18n key-parity check (flattened `en.json`/`fa.json` key sets) —
  687/687, no keys only on one side
- grepped both changed components for physical CSS properties
  (`margin-left`, `pl-`, `text-right`, etc.) — none found
- queried the live database directly after the migration: all 25
  `project_media` rows present with correct `project_id`, `kind`,
  `placement`, `sort_order`, and joined `media_assets.url`/dimensions;
  both `projects.cover_image` values confirmed non-null
- `get_advisors(type: 'security')` re-run after the migration — no new
  findings
- spot-checked 7 of the 25 placed screenshots directly against their
  manifest description before wiring anything (seat map, both
  Pazhuhesh admin roles, the image-slot media manager, dark mode,
  loyalty/coupons) — all matched; the loyalty/coupons shot's coupon
  list is empty ("No coupons yet") per Zakir's own call to leave it for
  now

## Known issues

- **Not verifiable from this sandbox:** real static generation of
  `/work/[slug]` against live data (the Supabase-network gap above),
  and the gallery lightbox's actual rendered appearance in a browser —
  both need the next real Vercel deploy or a local dev machine with
  Supabase network access, same standing gap every phase since 12.2.
- The admin panel's editors still have no UI to add/reorder/caption
  `project_media` rows themselves (Phase 15's admin screens don't cover
  the new `placement` column) — today this data can only be changed via
  a migration or direct SQL, same way this work populated it. Worth a
  small follow-up once there's a second or third project's worth of
  screenshots to manage this way. Not scoped into this work.

## Resolved during this work

- `pazhuhesh-portal/gallery/08-achievements.png` shows real named
  students and their specific admission/scholarship outcomes — content
  already public on the Achievements page itself, but reused here in a
  different context (Artaveo's own portfolio). Flagged mid-session
  rather than decided silently; **Zakir confirmed it's fine to keep
  as-is.**

## New debt

- Admin UI for `project_media` (add/reorder/edit caption, set
  `placement`) — tracked above, not scoped into this work.

## Rollback

See the migration file's own header comment for the exact SQL. The
component/type changes are additive and can be reverted independently
of the migration (a project with `media` rows just won't render them
if the components are reverted first) — no ordering dependency either
way.

## Final status

This work is complete and self-contained: real screenshots, reviewed
against their source repos, are live on Supabase and rendered on the
public `/work/[slug]` template for both real case studies, with a
working lightbox gallery for the supporting shots. Nothing about it is
staged across further parts — the one open technical gap (Supabase
network access for static generation) is the same standing,
already-disclosed limitation every phase since 12.2 has carried, not
new debt from this work; the only genuinely new follow-up item is the
optional admin-UI editing capability noted above.
