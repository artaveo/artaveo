# Phase 15 — CMS & Media

**Status:** ✅ COMPLETE (code)
**Date:** 16 September 2026

## A note on how this phase was delivered

This phase was built across several working sessions and, along the
way, was provisionally split into "15.1" (services cluster), "15.2"
(projects & articles), and an unnamed "15.3" (media/navigation/
settings) purely as an internal sequencing device — the same pattern
§ 4, § 9, § 10, and § 12 used for phases too large for one sitting.
Two separate roadmap revisions were briefly logged for that split.
**Zakir asked for the roadmap to carry exactly one Phase 15 entry, not
a numbered sub-series** — so those two revisions were merged into the
single revision this file documents, and this README replaces the two
`PHASE-15.1-README.md` / `PHASE-15.2-README.md` files that existed
during the split. Nothing about the *scope* changed because of this —
only how it's recorded. Every sub-phase label below is history, kept
only where it helps explain why something was built in a particular
order, never as a claim that the roadmap still tracks it that way.

## Objective

Give editors a real way to change what the site says — services,
projects, articles, media, navigation structure, and site settings —
without a code deploy, and let visitors attach reference files to a
Brief Builder inquiry.

## Scope

> editors: projects + case-study sections, services, packages, add-ons,
> FAQs, engagement models, articles, settings/availability, navigation ·
> draft → preview → publish → unpublish; per-locale completeness
> indicator; publishing a locale requires its required fields · media
> uploads: type/size validation server-side, safe names, storage policy,
> required alt text, focal-point cropping for responsive crops ·
> on-demand revalidation of affected routes after publish · attachments
> for the Brief Builder enabled here, behind the same upload rules

Every bullet above is now real. Per § 13's own role definition
("editor: content only, no leads"), this entire area is
**editor-accessible** — both `owner` and `editor` sessions can use
everything in this phase; editors don't need MFA either (owner's own
choice per revision 27), so `mfaSatisfied` alone gates every page and
action here.

## Dependencies

None blocking for the content-CRUD portion — every table this phase
writes to already existed (Phase 12.1's `0003`–`0007` migrations). The
media pipeline needed one new migration (`0012`) for Supabase Storage
and a Brief Builder attachments table. No new package dependency
anywhere in the phase.

## Implementation summary

### The services cluster: services, packages, add-ons, FAQs, engagement models

`services`, `service_process_steps`, `service_packages`,
`service_addons`, `faqs` (both `service` and `global` scope),
`engagement_models`. A service's nested collections (process steps,
packages, add-ons, FAQs) each get their own small editor with their own
database row ids, since each is genuinely independently added/edited/
removed on its own schedule — unlike a project's case-study sections
(see below). Packages are upserted on the existing
`(service_id, tier)` unique constraint, so one action call handles both
create and edit for a tier; the `custom` tier's price always stays
`'quote'` per the existing convention (scoped after a discovery call,
never a fixed number in advance).

### Projects & articles

`projects` + `project_sections`, and `articles`. Unlike the services
cluster's packages/add-ons/FAQs, `project_sections` gets **no per-row
nested editor** — a case study's eleven possible sections are authored
together, as one write-up of one project, and the public `Project` type
and `CaseStudy` template already treat them as flat optional fields on
one object (§ 6.1's "empty means hidden"). So `updateProjectSections`
replaces the entire section set for a project in one delete-then-insert
pass whenever the sections form is submitted, rather than diffing which
of nine singular sections plus `constraints[]`/`keyDecisions[]`
changed — simpler, and safe: a section the editor clears is genuinely
gone, not left behind as an orphaned row.

A `TechnologyPicker` lets an editor choose a project's stack from the
existing, curated `technologies` table (checkboxes against real,
already-seeded rows — eight of them, verified live before building
this — grouped by category), not a freetext field: `types/content.ts`'s
own doc comment calls these "proper nouns — never translated", and
picking from a fixed list keeps that true and avoids near-duplicate
entries ("Next.js" vs "NextJS"). **Adding a new technology to the list
isn't part of this admin surface** — a stack that genuinely needs one
not yet listed can't be fully represented here yet; worth its own small
screen if that becomes a real blocker, not invented ahead of need.

`articles.status` is the schema's richer `draft | review | scheduled |
published | archived` enum (0005) — richer than every other entity's
plain boolean. The editor exposes the three pre-publish states directly
via a select; a separate `Publish` action (completeness-gated, same
shape as every other publish gate) sets `status = 'published'` and
`published_at` only if not already set (republishing after an
unpublish doesn't overwrite the original "first went live" date);
`Unpublish` reverts to `draft` and deliberately leaves `published_at`
alone — when something first went live is a real historical fact, not
something an unpublish should erase. `reading_time_minutes` is computed
server-side on every save (English body word count ÷ 200, rounded up,
minimum 1) rather than a manually-typed field that would silently go
stale the moment the body is edited again — the admin form has no
`readingTimeMinutes` input at all, by design.

No public page reads `articles` or the `global`-scope FAQs yet (Phase
17 doesn't exist; global FAQs have no public consumer either) — checked
before building either, same schema-ahead-of-use relationship Phase
16's own tables already have with their own not-yet-built phase.

### The media pipeline

`media_assets` (0007) already had every column an uploaded file's row
needs (`url`, `alt`, `width`, `height`, `type`, `size_bytes`,
`focal_x`, `focal_y`) — this phase adds the Storage bucket rows
actually land in (`db/migrations/0012_media_storage_and_inquiry_attachments.sql`):
a `media` bucket, public-read via Supabase's own bucket-level `public`
flag (not an RLS policy — same reasoning `project_media`'s existing RLS
policy already established: gating happens through the referencing
content's own `published` flag, not the asset URL itself, which is
effectively a CDN path once known, identical to how a static `/public`
asset already works today), 5 MB size limit, restricted to five image
MIME types. An explicit public-`SELECT` policy on `storage.objects`
scoped to that bucket was added too, matching this project's style of
explicit policies over relying solely on the bucket's implicit `public`
flag.

`app/actions/media.ts#uploadMedia` is real, working file upload — not
a stub: it validates MIME type and size **server-side** (the real gate;
a client-side check is only a UX nicety), generates a safe storage path
(strips everything but ASCII letters/digits/hyphens from the original
filename — no path separators, no traversal, no unicode tricks —
prefixed with a timestamp + random suffix so two uploads of
"screenshot.png" never collide), uploads to Supabase Storage, and
**requires alt text in both languages** before the row is even
inserted — § 15's "required alt text" enforced at the write boundary,
not left to the nullable column's own leniency. If the row insert fails
after a real upload, the orphaned storage file is cleaned up rather
than left dangling with no admin-visible record.

**Focal-point cropping**, honestly scoped: there is no image-processing
library in this codebase (no `sharp`, nothing that resizes or
re-encodes), and adding one is its own decision, not something to slip
into a CMS phase. What's built instead is real and useful:
`focal_x`/`focal_y` (0–1, image-relative) are set by clicking a preview
image (`FocalPointPicker`), and every place a thumbnail is rendered in
the admin already uses them to drive CSS `object-position` — a genuine
"responsive crop" without literally cropping the file, the same
technique this exact codebase would use publicly once media renders on
a public page. Width/height are left `null` on upload (no library to
read them); never fabricated.

`project_media` (screenshots/diagrams) is edited from the *project's*
own page (`ProjectMediaEditor`) by picking an already-uploaded asset
from the library, not by uploading inline per-attachment — so alt text
and focal point stay defined once, centrally, never duplicated per
project attachment.

### Settings and navigation

`site_settings` (the one singleton row: availability state, next
opening date, response commitment, timezone, working languages,
external profile links) and `navigation_items` (href, which surfaces
show it, sort order, the two content-presence flags) both get real
admin editors, writing real rows on the live, already-seeded tables —
`site_settings.response_commitment`/`timezone` were already
successfully read from Supabase elsewhere in this codebase (Phase 14's
SLA logic), proving the table was live and reachable before this phase
touched it.

`navigation_items.key` — the fixed, closed set the DB `check`
constraint enforces — and a nav item's translated label (still
`Nav.<key>` in `messages/*.json`) are **never** editable here; only the
structural fields are.

### The one deliberate scope line in this whole phase: the public read path isn't switched over

Wiring the *public* site's header, footer, mobile nav, command palette,
and Availability Card to actually read from `navigation_items`/
`site_settings` — instead of the static `lib/site.ts`/
`lib/home-content.ts` values every one of them reads today — was
investigated and **deliberately not done in this pass**. The reason,
in full: `lib/site.ts` alone is imported by 16 files, several with
nothing to do with navigation at all (OG image generation, the web app
manifest, notification templates), and both the header and footer
render inside the root layout on literally every page. This is a much
larger, higher-blast-radius change than anything else in this phase —
closer in size to its own dedicated phase than a line item inside a CMS
phase — and this session had no way to visually verify it against the
live site (no Supabase network route from this sandbox, and no way to
screenshot the real header/footer/command-palette after the change).

So: the CRUD is real, live, and working today — an editor's changes
are genuinely saved to the database. What doesn't happen yet is the
public site noticing. This is disclosed here, in the roadmap, and in
"Known limitations" below — not silently claimed as finished. The
`app/actions/settings.ts` file's own header comment says the same
thing, and deliberately calls **no** `revalidatePath` for exactly this
reason: there is nothing cached to invalidate yet.

### Brief Builder attachments (`/start`)

A public, unauthenticated upload path
(`app/actions/inquiry-attachments.ts#uploadInquiryAttachment`) sharing
the identical type/size/safe-naming rules the admin library uses (both
now pull from `lib/media-upload.ts`, so the two paths can't drift
apart). No alt text is collected here — a Brief Builder reference file
is read once by whoever reviews the inquiry in the admin panel, never
rendered on a public page with an `<img alt>`, so that rule doesn't
apply to this path. Capped at 3 files, enforced both client-side (the
file input disappears past 3) and server-side (`submitInquiry` only
ever links the first 3 ids it receives, never trusting the client
alone). Rate-limited at 15 uploads per IP hash per hour — the same
never-store-the-raw-IP `hashIp` construction `app/actions/inquiries.ts`
already used, extended with a new `media_assets.uploaded_by_ip_hash`
column (nullable, `null` for every admin-library upload, which is
rate-limited by requiring a session instead).

Uploaded files are linked to the inquiry via `inquiry_attachments`
**after** the inquiry itself is successfully inserted — best-effort,
exactly like `inquiry_events`: a failure to link never undoes or masks
the successful inquiry save. A visitor can also remove an attachment
before submitting (`removeInquiryAttachment`) — which only ever deletes
a row the same IP hash uploaded and that isn't already linked to a
submitted inquiry, never a general-purpose public delete endpoint.

**Disclosed, not solved:** a stronger anti-abuse guard than the
per-IP-hash hourly cap — e.g. requiring a short-lived token issued when
the Brief Builder page itself loads, so an upload request can't exist
without the form having been loaded first — is real follow-up work, not
implemented here.

## Decisions

No new Decision Register entries; several small interpretive calls,
recorded here rather than silently decided:

1. **"Per-locale completeness... requires its required fields" reads as
   a completeness *gate* on the one `published` flag that exists, not a
   genuine independent per-locale publish state.** No table in the
   § 12 schema models publishing English independently of Persian —
   `published` is one sitewide boolean per entity, and every public
   selector, the sitemap, and structured data all assume a row is
   visible in both locales or neither. Building real per-locale
   publishing would mean touching RLS and every public query — a
   deliberate, reviewed schema change in its own right. What ships
   instead: completeness is computed and shown per locale everywhere,
   and the one publish action is blocked server-side until *both*
   locales' required fields are filled.
2. **Reading time is computed, not typed** (see Articles above).
   Revisit if the owner wants a different words-per-minute assumption,
   or per-locale reading times (today's single column has no locale
   dimension to compute two numbers into).
3. **The technology picker has no "add new" affordance.** A deliberate
   scope line, not an oversight — see Projects & articles above.
4. **Focal-point cropping means a stored point driving CSS
   `object-position`, not a server-side image-processing pipeline.** No
   such dependency exists in this codebase; adding one is its own
   decision.
5. **The public nav/settings read-path switch is out of scope for this
   phase.** The single largest, most consequential scope line in this
   document — see its own section above.

## Changed files

**New:**
- `db/migrations/0011_content_workflow_touch.sql`
- `db/migrations/0012_media_storage_and_inquiry_attachments.sql`
- `types/cms.ts`
- `lib/admin/content.ts`
- `lib/admin/media.ts`
- `lib/admin/settings.ts`
- `lib/media-upload.ts`
- `app/actions/content.ts`
- `app/actions/media.ts`
- `app/actions/settings.ts`
- `app/actions/inquiry-attachments.ts`
- `app/[locale]/admin/(protected)/content/page.tsx` (hub)
- `app/[locale]/admin/(protected)/content/services/` — `page.tsx`,
  `new/page.tsx`, `[id]/page.tsx`, `[id]/preview/page.tsx`
- `app/[locale]/admin/(protected)/content/engagement-models/` —
  `page.tsx`, `new/page.tsx`, `[id]/page.tsx`
- `app/[locale]/admin/(protected)/content/faqs/page.tsx`
- `app/[locale]/admin/(protected)/content/projects/` — `page.tsx`,
  `new/page.tsx`, `[id]/page.tsx`, `[id]/preview/page.tsx`
- `app/[locale]/admin/(protected)/content/articles/` — `page.tsx`,
  `new/page.tsx`, `[id]/page.tsx`
- `app/[locale]/admin/(protected)/content/media/page.tsx`
- `app/[locale]/admin/(protected)/content/settings/page.tsx`
- `app/[locale]/admin/(protected)/content/navigation/page.tsx`
- `components/admin/content/` — `localized-fields.tsx`,
  `price-type-select.tsx`, `completeness-badge.tsx`,
  `publish-control.tsx`, `service-form.tsx`,
  `process-steps-editor.tsx`, `packages-editor.tsx`,
  `addons-editor.tsx`, `faqs-editor.tsx`, `engagement-model-form.tsx`,
  `technology-picker.tsx`, `project-form.tsx`,
  `project-sections-form.tsx`, `article-form.tsx`,
  `focal-point-picker.tsx`, `media-library.tsx`,
  `project-media-editor.tsx`, `site-settings-form.tsx`,
  `navigation-items-editor.tsx`
- `docs/phases/PHASE-15-README.md` (this file, replacing
  `PHASE-15.1-README.md` and `PHASE-15.2-README.md`)

**Modified:**
- `components/admin/admin-chrome.tsx` — "Content" nav link (both roles)
- `app/[locale]/admin/(protected)/page.tsx` — Content shortcut card
- `types/inquiry.ts` — `attachmentMediaIds` field on `InquiryDraft`
- `components/start/steps.tsx` — attachment upload UI in the Links step
- `app/actions/inquiries.ts` — links uploaded attachments after the
  inquiry insert succeeds
- `messages/en.json`, `messages/fa.json` — 263 new `Admin` keys, 9 new
  `BriefBuilder` keys, `comingSoonNotice` updated
- `ROAD-MAP-ARTAVEO.md` — § 15 marked ✅ COMPLETE, single revision entry

## Database / migrations

Both applied to the live Supabase project (`ukzovqnpqjcrwofycalc`) via
the Supabase MCP this session:

- `0011_content_workflow_touch.sql` — `set_updated_at()` trigger
  function, applied to `services` and `engagement_models`
  (`engagement_models.updated_at` didn't exist before this). Live-
  verified with a transactional before/after update. One follow-up
  statement (`set search_path = public`) was needed live after a
  Supabase advisor flagged it; folded into this file's function
  definition so a fresh apply needs no follow-up.
- `0012_media_storage_and_inquiry_attachments.sql` — the `media`
  Storage bucket, its public-read policy, `inquiry_attachments`, and
  (added as a follow-up statement once the public upload path's rate-
  limiting need became clear) `media_assets.uploaded_by_ip_hash` plus
  its index — both folded into this file so a fresh apply is complete
  in one pass.

`get_advisors` (security) re-run clean after each: the now-nine
`rls_enabled_no_policy` findings are the same already-expected
service-role-only tables recorded since Phase 12.1 (`inquiry_attachments`
joins that set); the pre-existing `function_search_path_mutable` on
`enforce_inquiry_stage_transition` (Phase 14) remains untouched — out
of this phase's scope, not silently fixed as a drive-by.

## Tests

No automated test suite exists yet (Phase 21). Manual/static
verification performed across this phase's sessions:

- `npx tsc --noEmit` — clean, zero errors as of the final round. Real
  issues found and fixed along the way: `types/cms.ts#AdminService`
  assumed the public `Service` type carries a `published` field (it
  doesn't — public queries already filter `published = true`); a bad
  type cast in `projectCompleteness`'s section-field lookup didn't
  account for `Project`'s array-typed fields, narrowed via `unknown`
  rather than loosened to `any`; a `str_replace` edit accidentally
  deleted a function declaration line in
  `app/actions/inquiry-attachments.ts`, caught by re-running `tsc`
  immediately after.
- `node scripts/check-content-placeholders.mjs` — clean throughout, no
  new static content file at any point in this phase.
- i18n key parity: `en.json`/`fa.json` flattened and diffed at every
  stage — final count 686/686, no missing keys either direction; every
  `t('cms…')`/`t('...')` call across every new/changed file
  cross-checked against the message files by grep, not just the parity
  diff.
- `npx next build` — Turbopack compiles every route with zero errors at
  every stage of this phase. Page-data collection fails only at the
  same pre-existing, already-disclosed `/[locale]/services/[slug]`
  Supabase-network gap every phase since 12.2 has recorded. Verified
  more thoroughly than a "compiles successfully" line each time: with
  `/services/[slug]` and `/work/[slug]` temporarily removed, the build
  progressed to "Generating static pages" and produced real output for
  every new admin route in both locales — including statically
  pre-rendered unauthenticated-redirect HTML, confirmed by listing
  `.next/server/app` directly — before both routes were restored
  byte-identical (diffed) and the full-tree build re-confirmed to fail
  at the same original spot with no new error.
- Manual grep for physical CSS properties (`ml-`, `pl-`, `left-`,
  `text-left`, `border-l-`, …) across every new file — none found.
- Sandbox state fully restored after every verification pass:
  `next/font/google` stub in `app/[locale]/layout.tsx` reverted
  (diffed byte-identical against a pre-edit backup each time),
  `tsconfig.tsbuildinfo` reverted via `git checkout --`, `.next` and
  `node_modules` removed.
- **Mid-phase, re-checked `origin/main` before delivering** and found
  it three commits ahead of the state this phase's work started from —
  the owner had independently pushed three real fixes to Phase 13's own
  auth code (a locale-double-prefix 404, an MFA QR-code rendering bug
  bundled with making MFA optional for both roles, and a "skip
  enrollment" affordance), numbered revisions 26–28 himself. Those five
  files were pulled in as-is (untouched by this phase, so a copy, not a
  merge); their i18n key changes were folded into this phase's own
  message-file edits; every `mfaSatisfied`/`mfaDestination` call this
  phase's pages make needed zero changes, since both are called purely
  by name with an unchanged signature. `tsc`/`next build` re-run clean
  after the merge.

## Manual verification

Not runnable in this sandbox — needs the live Supabase project, a
provisioned editor/owner account, and a real browser:

- Creating and publishing a service, a project (with a real case study,
  tech stack, and screenshots), and an article end to end, confirming
  the service and project actually appear on their public pages in both
  locales after `revalidatePath` fires against a real deployment.
- A real file upload through both the admin media library and the
  Brief Builder, confirming the uploaded image is genuinely reachable
  at its public Storage URL and the focal point renders correctly via
  `object-position` wherever it's used.
- Confirming an `editor` (non-owner) session can reach every page in
  this entire phase and genuinely cannot reach `/admin/leads`.
- The reading-time estimate against a real, finished article body.
- Rate-limit behavior on the Brief Builder upload path under repeated
  requests from the same IP.
- Screenshots of both preview routes (service, project) in both
  locales/themes.

Same category of "sandbox can't verify, needs live deployment" gap
every earlier phase doc has disclosed.

## Known limitations

- **The public site does not yet read from `navigation_items` or
  `site_settings`.** The single largest limitation in this phase — see
  its own section above. The CRUD is real; the public switch-over is
  real, scoped, disclosed follow-up work.
- **No genuine independent per-locale publish** for any entity — see
  Decisions.
- **No delete for services, projects, or articles** — only create/
  update/publish/unpublish exist; a mis-created entity is left as an
  unpublished draft rather than removable.
- **No reordering UI** for a service's packages/add-ons/FAQs/process
  steps, or a project's key decisions/constraints — everything renders
  in insertion/`sort_order` order.
- **No "add new technology" affordance** in the tech-stack picker.
- **No `width`/`height` on uploaded media** — no image-processing
  library reads them; never fabricated.
- **No bulk actions** on any list view.
- **The Brief Builder upload path's anti-abuse guard is a per-IP-hash
  hourly cap only** — a stronger guard (e.g. a page-load token) is
  disclosed follow-up work, not implemented.

## New debt

- The public nav/settings/Availability-Card read-path switch — its own
  dedicated pass, given its size and the root-layout blast radius.
- Service/project/article delete or archive flow, if abandoned drafts
  turn out to matter.
- Reordering UI for every nested collection this phase introduced.
- "Add new technology" screen, if the curated list ever blocks a real
  project write-up.
- A stronger Brief Builder upload anti-abuse guard.
- Once the public nav/settings switch-over happens, revisit whether
  `revalidatePath` calls are needed in `app/actions/settings.ts`
  (deliberately absent today, per that file's own header comment).

## Rollback

The two migrations' reverse SQL is documented in each file's own
header comment. Reverting the application code is: delete every file
listed above under "New", restore `components/admin/admin-chrome.tsx`,
`app/[locale]/admin/(protected)/page.tsx`, `types/inquiry.ts`,
`components/start/steps.tsx`, and `app/actions/inquiries.ts` to their
pre-Phase-15 versions, drop the 263 `Admin` and 9 `BriefBuilder` keys
from both message files, and revert `ROAD-MAP-ARTAVEO.md` to revision
28 (the last revision before this phase and before the owner's own
revisions 26–28, which predate it).

## Final status

**COMPLETE** for everything a coding session can implement and verify:
every entity in § 15's own bullet list has real, working, editor-
accessible CRUD, and Brief Builder attachments are live. Two honest,
disclosed gaps remain, both real follow-up work rather than silently
dropped: the public site's navigation/settings/Availability-Card
rendering hasn't been switched over to read from the database yet, and
real end-to-end verification (publishing content and watching it appear
live) needs the owner's provisioned account against the live Supabase
project and a real deployment.

**Next recommended phase:** the public nav/settings read-path switch,
if the owner wants § 15 fully closed end-to-end before moving on; or
Phase 16 — Verified Evidence, if collecting real recommendations
matters more right now than that remaining wiring work.
