# Case Study Media & Narrative Refinement

**Status:** ✅ Implemented, ⚠️ browser verification NOT performed (see below)
**Date:** 17 September 2026
**Roadmap entry:** § 23.1 "Out-of-sequence work log" — not a roadmap
phase. Zakir requested this directly, from an owner-supplied brief.
Phase 16 remains the next item in the phase sequence.

## The problem this fixes

`/work/[slug]` rendered every `placement: 'main'` screenshot as a
full-width block, stacked one after another, directly under the
header — six in a row for Transportation System, five for Pazhuhesh
Portal — before any written case-study text appeared. The page read as
"a sequence of screenshots" rather than "a case study with evidence
placed where it helps."

## What changed — media model

`project_media.placement` grows from `'main' | 'gallery'` to
`'hero' | 'story' | 'gallery'` (migration `0014`):

- **`hero`** — exactly one image per project, the lead screenshot.
- **`story`** — screenshots grouped by a new `story_key` column, each
  group anchored to a specific case-study section via a new
  `story_anchor` column (naming the exact `Project` field — e.g.
  `'architecture'`, `'problemAndGoals'` — the group should render
  after).
- **`gallery`** — unchanged from migration `0013`.

This is fully data-driven: `CaseStudy` groups `project.media` by
`storyKey`, buckets each group under its `storyAnchor`, and renders
whatever exists at a given anchor. There is no `if (project.slug ===
...)` branch anywhere — a project with no story group at a given
anchor simply renders nothing extra there, the same "absent means not
yet true" rule the rest of the template already follows.

`media_assets.width`/`height` (already present, just never selected
before) are now read and passed through, so the hero and story images
render at their real aspect ratio instead of a fixed `16/9` crop —
`object-contain` inside a container whose own aspect-ratio matches the
image means nothing is ever cropped or letterboxed. A hero/story
container is capped by width for a landscape shot and by height for a
portrait one (several real Pazhuhesh Portal captures are taller than
wide), so nothing ever becomes an oversized, page-dominating block
regardless of the source screenshot's shape.

## Exact media mapping (matches the brief's § 20 exactly)

**Transportation System** (14 screenshots)
- Hero: `01-home-overview`
- Story `booking-flow` (after **Problem & Goals**): `02-trip-search-results`,
  `03-seat-selection`, `04-booking-confirmation`
- Story `operations` (after **Architecture**): `05-admin-dashboard`
- Story `reports` (after **Key Decisions**): `06-admin-reports`
- Gallery (unchanged): `07`–`14`

**Pazhuhesh Portal** (11 screenshots)
- Hero: `01-home-overview`
- Story `public-experience` (after **Context**): `02-study-lounge`,
  `03-academic-services`
- Story `admin-roles` (after **Data Integrity & Security**):
  `04-super-admin-dashboard`, `05-department-admin`
- Gallery (unchanged): `06`–`11`

The brief's § 10 rhythm diagram names "Operations explanation" and
"Reporting explanation" as separate prose beats; the current
case-study text model has no section literally titled either of those
(the existing sections are Context, Problem & Goals, Constraints,
Architecture, Key Decisions, Engineering Highlight, Data Integrity &
Security, Responsive & RTL, Quality, Current Status & Next, Lessons
Learned — no copy rewrite or new section was added, per the brief's
explicit "no copywriting pass" instruction). `operations` was anchored
to **Architecture** (the section that explains how the system is
built, which the admin dashboard evidences) and `reports` to **Key
Decisions** (the section right before **Engineering Highlight**, which
is itself the project's security/engineering story) — this keeps the
brief's intended order (Architecture → operations evidence → Key
Decisions → reports evidence → Engineering Highlight/security →
Gallery) without inventing new prose sections. Pazhuhesh's
`admin-roles` group was anchored to **Data Integrity & Security**
specifically because that section's own text (rewritten in the earlier
copy pass) already describes the two admin roles and their
database-enforced permissions — the closest real match to "Role-based
Administration" in the brief's § 9 rhythm, better than a generic
Architecture anchor would have been.

## Components

- `components/work/case-study-media.tsx` (new) — `CaseStudyHeroMedia`
  and `CaseStudyEvidenceGroup`. Evidence-group layout: one image alone,
  two images side by side and balanced, three or more give the first
  visual emphasis with the rest in a 2-column supporting grid (matches
  the brief's § 8 booking-flow spec and § 9's "balanced composition"
  for 2-shot groups). Real, already-verified captions (from migration
  `0013`) render under each story image — no new copy was written.
- `components/work/case-study.tsx` — old stacked-media block replaced
  with the single hero render (falling back to `coverImage` for a
  project with no photographed hero yet, same fallback behavior as
  before); `storyGroupsFor(anchor)` inserted after Context, Problem &
  Goals, Architecture, Key Decisions, and Data Integrity & Security.
- `components/work/project-gallery.tsx` — **not changed**. Already
  used `object-cover` only for small thumbnails (an explicitly allowed
  exception, § 13) and `object-contain` in the lightbox — already
  correct.
- Admin (`components/admin/content/project-media-editor.tsx`,
  `app/actions/media.ts`) — **not changed**, per the brief's "do not
  redesign admin." It never set `placement` at all; new rows still
  fall through to the column default, which stays `'gallery'`.

## Performance (§ 18)

Only the hero image is `priority`-loaded. Every story and gallery
image is lazy (no `priority` prop set on any of them).

## Verification actually performed

- `tsc --noEmit`: **0 errors.**
- `node scripts/check-content-placeholders.mjs`: **passes**, unchanged
  from before this work (this pass touched no content-placeholder
  file).
- `next build`: **compiles successfully** (Turbopack). Page-data
  collection fails at the same pre-existing, already-disclosed
  Phase-12 Supabase-network gap this sandbox has shown on every prior
  build (`/[locale]/services/[slug]`, `SUPABASE_URL` /
  `SUPABASE_SERVICE_ROLE_KEY` unset here) — unrelated to this change;
  the compile step itself, which does type-check and bundle
  `case-study.tsx` and `case-study-media.tsx`, succeeded.
- `next/font/google` stub applied and reverted, confirmed
  byte-identical via `diff`; `tsconfig.tsbuildinfo` reverted with
  `git checkout --`.
- Migration `0014` applied directly to the live Supabase project and
  verified by reading all 25 `project_media` rows back: every row has
  the expected `placement`/`story_key`/`story_anchor`, no row was
  lost, no `media_assets` row was touched, added or removed.

## Verification NOT performed — read this before treating this as done

**No real rendered-browser check was performed.** This sandbox has no
network route to Supabase (`supabase.com` is not in the allowed-domains
list), and `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are not set here,
so `next dev`/`next start` cannot actually fetch and render either case
study — the same limitation that blocks the build's page-data
collection step above. That means none of the following, which the
brief's § 27 explicitly requires, has been checked:

- hero scale, whitespace, and visual rhythm at desktop/laptop/mobile
  widths,
- whether the computed `maxWidthPx`/`maxHeightPx` caps in
  `case-study-media.tsx` actually look right against the real
  screenshots (the aspect-ratio arithmetic was checked by hand against
  each image's real `width`/`height`, not against a rendered page),
- RTL alignment and mobile stacking of the evidence groups,
- the Gallery's position relative to the new layout,
- that `next/image`'s `sizes` values are well-tuned.

This is a real, unresolved gap, not a formality — Zakir should run
`next dev` locally (with real Supabase credentials) or check the
deployed preview at `/en/work/transportation-system`,
`/fa/work/transportation-system`, `/en/work/pazhuhesh-portal`, and
`/fa/work/pazhuhesh-portal`, at desktop and mobile widths, before
considering this visually complete. Per the brief's own instruction,
this is stated plainly rather than glossed over.

## Files changed

- `db/migrations/0014_project_media_story_placement.sql` (new) —
  applied live to Supabase
- `types/content.ts` — `ProjectMediaItem`: `placement` widened,
  `storyKey`, `storyAnchor`, `width`, `height` added
- `lib/supabase/content-queries.ts` — selects/maps the new columns
- `components/work/case-study-media.tsx` (new) — `CaseStudyHeroMedia`,
  `CaseStudyEvidenceGroup`
- `components/work/case-study.tsx` — story-first layout
- `ROAD-MAP-ARTAVEO.md` — this revision's entry
- `docs/updates/2026-09-17-case-study-media-narrative.md` — this file
