# Phase 14 — Lead Pipeline

**Status:** ✅ COMPLETE (code)
**Date:** 16 September 2026

## Objective

Give the owner a way to actually work the inquiries the Brief Builder has
been collecting since Phase 9.2: move each one through a real pipeline,
attach notes/tags/priority/follow-up, see whether it's being responded to
inside the published commitment, and export the list.

## Scope

Roadmap § 14:

```text
NEW → REVIEWED → QUALIFIED → CONTACTED → DISCOVERY → PROPOSAL → WON | LOST → ARCHIVED
```
> transitions enforced in the database; every transition written to
> `inquiry_events` · notes, tags, priority, follow-up date, source
> attribution, link to service/package · SLA indicator comparing
> time-to-first-reply with the published response commitment · CSV
> export; no fake dashboards or invented business metrics

Per § 13's own role definition ("roles: `owner`, `editor` (content only,
no leads)"), this entire area is **owner-only** — editors get every other
admin area Phase 15 onward adds, never `/admin/leads`.

## Dependencies

None blocking. `priority` and `follow_up_at` already existed on
`inquiries` (0006); `stage` and `inquiry_events` already existed (0001).
No new package dependency.

## Implementation summary

### Database (`db/migrations/0010_lead_pipeline.sql`)

- A `check` constraint closes `inquiries.stage` to the nine values the
  diagram names.
- A new `tags text[]` column (default `{}`) with a GIN index — the one
  field § 14 names that didn't already exist. "Notes" are not a new
  column: they're `inquiry_events.note`, the same append-only trail
  § 9.2 already established for `type = 'created'`.
- A `check` constraint closes `inquiry_events.type` to `created`,
  `stage-changed`, `note-added`, `priority-changed`, `follow-up-set`,
  `tags-changed` — 0001's own comment said Phase 14 would do this.
- `enforce_inquiry_stage_transition()`, a `BEFORE UPDATE OF stage`
  trigger, is the real "transitions enforced in the database" — it
  rejects any update that isn't one of: the diagram's own forward edges;
  any pre-`proposal` stage moving directly to `lost` (a lead can go cold
  at any point, not only after a proposal — the diagram's `lost` branch
  off `proposal` doesn't rule this out, and no real pipeline forces every
  dead lead through every intermediate stage first); or `won`/`lost` →
  `archived`. No backward transitions exist in this graph — see Known
  issues.
- Verified live on the Supabase project: a valid `new → reviewed` update
  succeeded, an invalid `reviewed → won` update was rejected by the
  trigger with a real Postgres exception, inside one transaction that
  was then rolled back (no test data left behind).

`types/pipeline.ts#ALLOWED_STAGE_TRANSITIONS` is the client-side mirror
of the exact same graph, kept in one place with a comment pointing at the
migration — used only to decide which stages the UI *offers* next; the
trigger is what actually enforces it, including against a direct
Supabase-dashboard edit or a future caller that never goes through
`app/actions/pipeline.ts`.

### SLA indicator — what it honestly measures

`site_settings.response_commitment` (D-08) is prose — "Replies within a
few hours, same day" — not a stored number of hours. Inventing a numeric
SLA threshold the owner never actually set would be exactly the kind of
invented metric § 14 itself warns against ("no fake dashboards or
invented business metrics"). `lib/admin/pipeline.ts#computeSla` instead
operationalizes only the one concrete, computable clause the text
actually makes: same calendar day, in the site's configured timezone
(`site_settings.timezone`). It does not evaluate "a few hours" — there is
no stored field that expresses that as a number to check against. This
is disclosed in the type's own doc comment (`types/pipeline.ts#SlaStatus`)
and here, not silently narrowed.

There is also no real outbound-reply log yet (Phase 19/20's scope), so
"time to first reply" is approximated as time to the first
`inquiry_events` row after `created` — the first time an admin actually
did anything with the lead (changed its stage, added a note, changed its
tags or priority). The closest honest proxy available today, not a
claim that a message was actually sent.

### Server Actions (`app/actions/pipeline.ts`)

`transitionInquiryStage`, `updateInquiryPriority`, `updateInquiryFollowUp`,
`updateInquiryTags`, `addInquiryNote`, `exportInquiriesCsv`. Every one
independently re-checks session + MFA + `owner` role (`lib/admin/auth.ts#canAccessLeads`,
new) — the same "never trust a single gate" rule `app/actions/admin-auth.ts`
already established — and writes an `audit_log` row. `transitionInquiryStage`
checks the transition against `ALLOWED_STAGE_TRANSITIONS` itself before
hitting the database, so a rejected move comes back as an honest
`invalid-transition` code rather than a raw Postgres error string; a
`23514` from the trigger (e.g. a race with another admin session) maps to
the same code. CSV export (`exportInquiriesCsv`) writes only real
`inquiries` columns — no computed aggregate, no invented metric — and
respects whatever filters the admin currently has applied, not just the
current page.

### Queries (`lib/admin/pipeline.ts`)

`listInquiries` / `listInquiriesForExport` (filtered, the latter
ignoring pagination), `getInquiry`, `getInquiryEvents`,
`getResponseCommitment`, `getFirstResponseTimes` (batched — one query
for a whole page of rows' SLA badges instead of N+1), `computeSla` /
`computeSlaFromFirstResponse`.

### Pages (`app/[locale]/admin/(protected)/leads/`)

- `page.tsx` — filterable, paginated table (stage, priority, tag, name/
  email search via `PipelineFiltersBar`, a client component driving the
  URL's query string so filters are shareable/bookmarkable), inline
  stage-transition control per row, per-row SLA badge, CSV export button.
- `[id]/page.tsx` — full brief (contact, goal, features, timeline,
  budget, links, source attribution), pipeline controls (stage, priority,
  follow-up date, tags), the fuller SLA indicator (with the published
  commitment text alongside it), and a notes/activity timeline
  (`EventsTimeline`) with an add-note form.

Both independently redirect a non-owner (or a signed-out visitor, or an
owner who hasn't cleared MFA) away — same pattern the Phase-13 dashboard
already follows, not a new one.

### Nav

`components/admin/admin-chrome.tsx` shows a "Leads" link only when
`canAccessLeads(session)` — editors never see it. The dashboard
(`app/[locale]/admin/(protected)/page.tsx`) gets the same conditional
shortcut card; `comingSoonNotice`'s copy no longer promises lead pipeline
"in a later phase" since this is that phase.

### i18n

88 new `Admin` namespace keys in both `messages/en.json` and
`messages/fa.json` — stage/priority labels, filters, table columns, the
detail page's field labels, SLA and event-timeline copy. Parity
re-verified: 461/461 keys match exactly in both directions.

## Decisions

No new Decision Register entry. The one real judgment call — allowing
`lost` from any pre-`proposal` stage rather than only after `proposal`,
and choosing not to allow backward transitions — is recorded in the
migration's own comment and in Known issues below, not silently decided.

## Changed files

**New:**
- `db/migrations/0010_lead_pipeline.sql`
- `types/pipeline.ts`
- `lib/admin/pipeline.ts`
- `app/actions/pipeline.ts`
- `app/[locale]/admin/(protected)/leads/page.tsx`
- `app/[locale]/admin/(protected)/leads/[id]/page.tsx`
- `components/admin/pipeline/stage-badge.tsx`
- `components/admin/pipeline/sla-badge.tsx`
- `components/admin/pipeline/sla-indicator.tsx`
- `components/admin/pipeline/stage-transition-control.tsx`
- `components/admin/pipeline/priority-select.tsx`
- `components/admin/pipeline/follow-up-field.tsx`
- `components/admin/pipeline/tags-editor.tsx`
- `components/admin/pipeline/note-form.tsx`
- `components/admin/pipeline/events-timeline.tsx`
- `components/admin/pipeline/pipeline-filters.tsx`
- `components/admin/pipeline/csv-export-button.tsx`
- `docs/phases/PHASE-14-README.md` (this file)

**Modified:**
- `lib/admin/auth.ts` — added `canAccessLeads()`
- `components/admin/admin-chrome.tsx` — owner-only "Leads" nav link
- `app/[locale]/admin/(protected)/page.tsx` — owner-only leads shortcut
  card; `comingSoonNotice` copy updated
- `messages/en.json`, `messages/fa.json` — 88 new `Admin` keys each,
  `comingSoonNotice` updated

## Database / migrations

`db/migrations/0010_lead_pipeline.sql` — applied to the live Supabase
project (`ukzovqnpqjcrwofycalc`) via the Supabase MCP this session.
`get_advisors` was not re-run (not available as a tool this session);
nothing in this migration adds a table or a public-facing policy, so no
new RLS finding is expected — worth a manual advisor check on the next
session that has the tool.

## Tests

No automated test suite exists yet (Phase 21). Manual/static
verification performed this session, against the *current* `main`
(fast-forward-merged mid-session — see below):

- `npx tsc --noEmit` — clean, zero errors (four real errors found and
  fixed along the way: `Select`'s `onValueChange` passes `string | null`,
  not `string`).
- `node scripts/check-content-placeholders.mjs` — clean, unaffected by
  this phase's files.
- `npx next build` — Turbopack compiles the entire app, including every
  new `/admin/leads` route, with zero compile errors. Page-data
  collection then fails at the pre-existing `/[locale]/services/[slug]`
  — the same disclosed sandbox limitation Phase 12.2/13 already
  recorded (no network route to `*.supabase.co` here); nothing in
  `/admin/leads` touches that code path, and both leads pages are fully
  dynamic (session-gated), not statically generated.
- i18n key parity: `en.json`/`fa.json` flattened and diffed — 461/461,
  no missing keys either direction.
- Manual grep of every new/changed file for physical CSS properties
  (`ml-`, `pl-`, `left-`, `text-left`, `border-l-`, …) — none found.
- Manually verified the live-database trigger directly (see above):
  correct on both the accept and reject side.

### Mid-session sync with `origin/main`

Partway through this session, the owner pushed a fix for a real
production-build failure discovered on Phase 13's first real Vercel
deploy (`components/home/featured-work.tsx` / `components/home/services.tsx`
calling the client-only `useLocale`/`useTranslations` from an async
Server Component — see that commit's own message and the roadmap's
revision 24 entry). `git fetch` + `git merge --ff-only origin/main` pulled
it in cleanly (it touches no file this phase touches); `tsc --noEmit` and
`next build` were both re-run afterward against the merged tree and are
what's reported above. Checked this phase's own new files for the same
async-component-calling-a-client-hook mistake: none — every async
component here (`SlaBadge`, `SlaIndicator`, `EventsTimeline`, both pages)
already used `getTranslations`/`getLocale` from `next-intl/server`; the
one synchronous component that uses the plain `useTranslations`
(`StageBadge`) is not async, which is the actually-safe case the bug
report describes.

## Manual verification

Not runnable in this sandbox — needs the live Supabase project, a
provisioned owner account, and a real browser:

- Working through a real inquiry end to end (stage transitions, notes,
  tags, follow-up date) against real data.
- Confirming the SLA badge's "same day" computation against the site's
  actual configured timezone with a real inquiry + a real first action.
- CSV export opening correctly in a spreadsheet app with real rows.
- Screenshots for both locales/themes.

Same category of "sandbox can't verify, needs live deployment" gap
earlier phase docs already disclosed.

## Known issues

- **No backward stage transitions.** The graph only allows the diagram's
  forward edges, `lost` from any pre-`proposal` stage, and `won`/`lost` →
  `archived`. There is currently no way to undo a mis-click (move a lead
  back a stage) short of a direct database edit. Not in § 14's own
  diagram or wording — deliberately not invented here rather than
  guessed at; worth a real decision (and its own small migration) if it
  turns out to matter in practice.
- **List-page SLA badge and detail-page SLA indicator use the same
  first-admin-action proxy**, not a real "message sent" event — see
  Implementation summary. Once Phase 19/20 ship real outbound
  notifications/replies tied to an inquiry, this should switch to the
  real first-reply timestamp instead.
- **CSV export runs entirely client-side** (a `Blob` built from the
  Server Action's returned string) — fine at today's lead volume; if
  exports grow large enough to matter, a streamed server route would be
  the next step, not a rewrite.
- **No bulk actions** (e.g. move several leads to the same stage at
  once, or tag several at once). § 14 doesn't ask for this; not built
  ahead of a real need.

## New debt

- Backward stage transitions / correction flow (see above).
- Bulk pipeline actions, if lead volume ever makes row-by-row editing
  slow.
- Once Phase 19/20 land, swap the SLA proxy for a real first-reply
  timestamp.

## Rollback

Purely additive — no migration to roll back in place, though
`db/migrations/0010_lead_pipeline.sql`'s own header documents the
reverse SQL (drop the trigger/function, the two new `check` constraints,
the `tags` column and its index). Reverting the application code is:
delete the files listed above, restore `lib/admin/auth.ts`,
`components/admin/admin-chrome.tsx` and
`app/[locale]/admin/(protected)/page.tsx` to their pre-Phase-14
versions, drop the 88 new `Admin` keys from both message files.

## Final status

**COMPLETE** for everything a coding session can implement and verify.
Real end-to-end verification (working an actual lead through the
pipeline) needs the owner's provisioned account
(`docs/runbooks/admin-onboarding.md`) against the live site.

**Next recommended phase:** 15 — CMS & Media.
