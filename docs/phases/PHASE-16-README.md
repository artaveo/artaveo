# Phase 16 — Verified Evidence (Recommendations & Testimonials)

**Status:** ✅ COMPLETE (code)
**Date:** 18 September 2026

## Objective

Let the owner collect real recommendations and testimonials from people
he's actually worked with, and publish them only with their explicit
consent — no invented clients, no invented quotes, no ratings.

## Scope

Roadmap § 16:

```text
the owner generates a single-use request link; the recommender submits
statement, role, relationship, optional profile URL and explicit
consent to publish · moderation queue: approve · request change ·
reject; meaning is never edited, typos only with consent · verification
labels shown publicly: Submitted via verified request · Linked to
platform review · Linked public profile · recommendation = about
working with the developer; testimonial = tied to a delivered
project/service · sections stay hidden until at least one item is
published
```

Per § 13's own role definition ("editor: content only, no leads"), this
entire area is `editor`-accessible — the same split every other § 15/16
content area already follows.

## Dependencies

`recommendations` already existed (0005), created empty ahead of this
phase — same "schema exists ahead of the CMS that populates it"
relationship § 12 already established for Phase 15. No new package
dependency.

## Implementation summary

### Database (`db/migrations/0015_recommendation_requests.sql`)

- A new `recommendation_requests` table: `token` (unique, the entire
  access control — an unguessable random value, never gated by RLS),
  an internal-only `note`, `suggested_related_project_id`/
  `suggested_related_service_id` (the owner's own call, never the
  recommender's — see Decisions), `created_by`, `expires_at`,
  `used_at`, `revoked_at`, `recommendation_id` (set once submitted).
- Four new columns on `recommendations`: `consent_to_publish` (not
  null, default `false` — the explicit consent § 16 requires before
  anything is shown), `request_id`, `moderation_note`, and
  `related_service_id` (0005 only had `related_project_id` — § 16's own
  "testimonial = tied to a delivered project/**service**" needed the
  second link).
- `status` grows a fourth value, `'changes-requested'` — the loop that
  closes when the recommender revisits the same link after the owner
  asks for a change.
- `touch_recommendation_requests_updated_at()` sets `search_path = ''`
  from the start, applying 0011b's own lint fix at creation time
  instead of shipping the same advisor finding again.
- No trigger enforces the moderation status graph, unlike the lead
  pipeline's `enforce_inquiry_stage_transition()` (0010) — see
  Decisions.
- Applied and verified live on Supabase (`ukzovqnpqjcrwofycalc`) via
  the Supabase MCP this session; `get_advisors` (security) shows only
  the same pre-existing, already-disclosed findings plus the expected
  `rls_enabled_no_policy` for the new table (inert, same pattern every
  no-public-policy table already has).

### Public: the recommender's side

- `lib/recommendations.ts#resolveRequestToken` — the one place a raw
  token is resolved to a real request row, using the service-role
  client (no public RLS policy exists for `recommendation_requests` at
  all). Returns a closed, exhaustive state: `not-found` / `revoked` /
  `expired` / `closed` (already submitted, not sent back for changes)
  / `open` (accepting a submission — either fresh, or a
  `'changes-requested'` reopening with the recommender's own prior
  answers pre-filled so they aren't asked to retype from scratch).
- `app/actions/recommendations.ts#submitRecommendation` — re-validates
  every field server-side, re-resolves the token itself rather than
  trusting anything the client sent about its state, and reuses the
  Brief Builder's honeypot + minimum-fill-time anti-spam check
  (`app/actions/inquiries.ts`). On a resubmission, merges only the
  visitor's own locale into the existing bilingual `statement` object
  — an admin's already-completed translation of the *other* locale
  survives a "request change" round-trip instead of being overwritten.
- `app/[locale]/recommend/[token]/page.tsx` +
  `components/recommend/recommendation-form.tsx` — the actual form
  (name, role, company, relationship, statement, optional profile URL,
  required consent checkbox), an invalid-link state, an
  already-submitted state, and a post-submit thank-you state. Always
  `noindex` — this is a private utility route reached only via a link
  the owner hands out directly (the same category `/consultation`'s
  future reschedule/cancel links will be, Phase 20), not a § 15 page-map
  entry.

### Public: Home section 10 (§ 3.3)

`components/home/recommendations.tsx` — reads Supabase directly via a
new `queryApprovedRecommendations()` selector
(`lib/supabase/content-queries.ts`), `.eq('status', 'approved')` on top
of the RLS policy that already enforces the same filter (0005). Unlike
`InsightsPreview` (still file-based, Phase 17 not started), this is the
real, live phase these rows belong to. Returns `null` when the list is
empty — same pattern every optional home section already follows.
`kind` (`'recommendation'` vs `'testimonial'`) is derived at read time
from whether `related_project_id`/`related_service_id` is set, never a
stored column (see Decisions). No ratings anywhere, per § 14's own
component inventory ("Recommendation Card … no ratings").

### Admin (`/admin/content/recommendations`)

- `lib/admin/content.ts` — `recommendationCompleteness`,
  `listRecommendationsAdmin`, `getRecommendationAdmin`,
  `listRecommendationRequestsAdmin` (+ `requestLinkStatus`, a derived
  display value computed from `revoked_at`/`recommendation_id`/
  `expires_at`, never stored).
- `app/actions/content.ts` — `createRecommendation` (the manual-entry
  path, `platform-review`/`public-profile` only — `verified-request` is
  refused here, it only ever comes from a real submission),
  `updateRecommendation`, `deleteRecommendation`,
  `moderateRecommendation('approve' | 'reject' | 'request-change', note?)`,
  `createRecommendationRequest`, `revokeRecommendationRequest`. Every
  action independently re-checks the `editor` session and writes an
  `audit_log` row, same pattern every other content action already
  follows.
- `components/admin/content/recommendation-request-panel.tsx` — link
  generator (internal note, optional suggested project/service,
  expiry in days) plus every issued link with copy-to-clipboard and
  revoke.
- `components/admin/content/recommendations-editor.tsx` — the
  moderation queue: every recommendation regardless of status, with
  per-locale completeness badges, inline edit (typo/translation
  fixes), and Approve/Request Change/Reject controls, plus the
  manual-add card at the bottom.
- `approve` checks two independent gates and the error names which one
  failed: per-locale completeness (reusing § 15's own "publishing a
  locale requires its required fields" rule) and the recommender's own
  `consentToPublish` — a row can be bilingually complete and still lack
  real consent, and those are different problems worth different error
  messages.
- Linked from the content hub (`/admin/content`), alongside every other
  § 15/16 entity.

### i18n

95 new keys, both locales: 8 `Recommendations` (the public Home
section), 30 `RecommendPage` (the public submission page), 57 `Admin`
(the moderation queue + request-link panel). Parity re-verified:
782/782.

## Decisions

No new Decision Register entry. Two judgment calls, recorded in the
migration's own header rather than silently made:

1. **No database trigger enforces the moderation transition graph.**
   The lead pipeline's trigger (0010) exists because that graph is a
   one-way sales funnel with real business consequences to a skipped
   stage. Moderation here is a small, fully reversible action set
   (approve / request change / reject, and back to pending on
   resubmission) gated by the same `editor`-role check already
   enforced in `app/actions/content.ts` — a second enforcement layer in
   the database would duplicate that check without guarding against a
   materially different failure mode.
2. **`kind` is never a stored column.** § 16's own definition
   ("recommendation = about working with the developer; testimonial =
   tied to a delivered project/service") is fully determined by
   whether `related_project_id`/`related_service_id` is set, so a
   second column would only be able to drift out of sync with the
   columns that already carry the real signal.

## Changed files

**New:**
- `db/migrations/0015_recommendation_requests.sql`
- `lib/recommendations.ts`
- `app/actions/recommendations.ts`
- `app/[locale]/recommend/[token]/page.tsx`
- `app/[locale]/admin/(protected)/content/recommendations/page.tsx`
- `components/recommend/recommendation-form.tsx`
- `components/home/recommendations.tsx`
- `components/admin/content/recommendation-request-panel.tsx`
- `components/admin/content/recommendations-editor.tsx`
- `components/admin/content/recommendation-status-badge.tsx`
- `docs/phases/PHASE-16-README.md` (this file)

**Modified:**
- `types/content.ts` — `Recommendation`, `RecommendationVerification`,
  `RecommendationKind`
- `types/cms.ts` — `AdminRecommendation`, `AdminRecommendationRequest`,
  `RecommendationInput`, `RecommendationRequestInput`,
  `RecommendationSubmissionInput`, `RecommendationStatus`,
  `RecommendationRequestStatus`
- `lib/supabase/content-queries.ts` — `queryApprovedRecommendations()`
- `lib/admin/content.ts` — recommendation admin read layer
- `app/actions/content.ts` — recommendation admin Server Actions
- `app/[locale]/admin/(protected)/content/page.tsx` — content hub nav
  link
- `app/[locale]/page.tsx` — `<Recommendations />` inserted between
  `AboutPreview` and `InsightsPreview` (§ 3.3's own ordering)
- `messages/en.json`, `messages/fa.json` — 95 new keys each

## Database / migrations

`db/migrations/0015_recommendation_requests.sql` — applied to the live
Supabase project (`ukzovqnpqjcrwofycalc`) via the Supabase MCP this
session. `get_advisors` (security) re-run after: only the same
pre-existing, already-disclosed findings (`enforce_inquiry_stage_transition`'s
mutable search path from 0010, leaked-password-protection) plus the
expected `rls_enabled_no_policy` for `recommendation_requests` — inert,
the same pattern every service-role-only table already carries. Column
list and foreign-key constraint names verified directly against the
live schema (`information_schema.columns`, `pg_constraint`) before
being relied on in `lib/recommendations.ts`'s embedded-select syntax.

## Tests

No automated test suite exists yet (Phase 21). Manual/static
verification performed this session:

- `pnpm install --frozen-lockfile` (dependencies weren't present in
  this sandbox at session start).
- `npx tsc --noEmit` — clean, zero errors (three real issues found and
  fixed along the way: a Supabase embedded-select query typed as
  `GenericStringError` needed an explicit cast, same as every other
  untyped-client query elsewhere in this codebase; a helper's parameter
  type was narrower than the `Record<string, any>` row it was actually
  called with; one type re-exported from the wrong module).
- `node scripts/check-content-placeholders.mjs` — clean, unaffected
  (no new static content file — every row here is Supabase-only).
- `npx next build` — Turbopack compiles successfully; page-data
  collection then fails at the same pre-existing, already-disclosed
  Phase-12 Supabase-network gap every prior phase's build has shown
  (this run at `/[locale]/services/[slug]`) — unrelated to this work.
  `next/font/google` stub applied before the build and reverted after,
  confirmed byte-identical via `diff`; `tsconfig.tsbuildinfo` reverted
  with `git checkout --`.
- i18n key parity: `en.json`/`fa.json` flattened and diffed — 782/782,
  no missing keys either direction.
- Every new/changed file grepped for physical CSS properties (`ml-`,
  `pl-`, `left-`, `text-left`, `border-l-`, …) — none found.
- Every `t('...')` call in every new file cross-checked programmatically
  against its namespace's actual keys in both message files — zero
  missing.

## Manual verification

Not runnable in this sandbox — needs the live Supabase project and a
real browser:

- Generating a real request link, opening it in an incognito window,
  and submitting a recommendation end to end.
- The "request change" round-trip: an admin requesting a change, the
  same link reopening with the prior answers pre-filled, a resubmission
  landing back in the queue as `'pending'`.
- The Home section's actual rendered card layout, in both locales/
  themes, once at least one recommendation is approved.
- The moderation queue's inline edit and Approve/Reject/Request Change
  controls against real data.

Same category of "sandbox can't verify, needs live deployment" gap
every earlier phase doc has disclosed — this sandbox has no network
route to `*.supabase.co`.

## Known issues

- **No automated e-mail when a request link is generated or a change
  is requested.** Phase 19 (Notifications & Outbox) is the provider
  abstraction this would properly send through; building a one-off
  e-mail path here would mean throwing it away once Phase 19 exists.
  The owner copies the link from the admin panel and shares it
  directly today (WhatsApp, e-mail client, wherever).
- **No per-IP rate limit on the public submission action** — a
  deliberate difference from the Brief Builder, not an oversight (see
  `app/actions/recommendations.ts`'s own comment): the route only does
  anything once someone already holds a real, owner-issued, unguessable
  token, so abuse is bounded by how many real links exist rather than
  by how fast one visitor can submit.
- **No reordering UI** for approved recommendations — `sort_order`
  exists on the table (0005) but nothing in the admin editor writes to
  it yet, so the Home section renders in whatever order rows were
  created. Same class of gap Phase 15's own README already recorded for
  its nested collections.

## New debt

- Wire request-link/change-request notifications through Phase 19 once
  it exists.
- A reordering control for `recommendations.sort_order`.
- Consider a stricter public-route rate limit if abuse of issued links
  ever becomes a real problem in practice (not built ahead of a real
  need).

## Rollback

Purely additive — no migration to roll back in place, though
`db/migrations/0015_recommendation_requests.sql`'s own header documents
the reverse SQL (drop the trigger/function and the new table, drop the
four new `recommendations` columns, restore the original three-value
`status` check). Reverting the application code is: delete the files
listed above, remove the `<Recommendations />` line from
`app/[locale]/page.tsx`, remove the recommendations nav link from the
content hub, and drop the 95 new keys from both message files.

## Final status

**COMPLETE** for everything a coding session can implement and verify.
Real end-to-end verification (a real request link, a real submission, a
real moderation pass) needs the owner's provisioned admin account
(`docs/runbooks/admin-onboarding.md`) against the live site.

**Next recommended phase:** 17 — Insights / Engineering Journal.
