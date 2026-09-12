# Phase 9.1 — Start a Project: Brief Builder

**Status:** ✅ complete (scope: the Brief Builder itself — see "What this phase does not do")
**Date:** 13 September 2026

## Objective

Build the Brief Builder (roadmap § 9.1): a multi-step inquiry form at
`/start` — engagement model/service → project type → goal → key features
→ timeline → budget range → links/references → contact details →
preferred language/channel → consent → Brief Summary — with per-step
validation, prefill from `?service=`/`?package=`, and the full merged
form-state model (§ 9.1's own merge note: "the state list is the Brief
Builder's own UI/flow behaviour").

## What this phase does not do

Per the numbering/scope rule ("never implement a later milestone to make
an earlier one look finished") and "implement one phase (or sub-phase)
per session," this phase does **not** add:

- a server route or real persistence (§ 9.2 — "server handling &
  persistence," gated by its own scope and D-10, Supabase plan/region)
- real notifications or an outbox (§ 9.3 — blocked on D-01's domain/DNS)
- server-side rate limiting, a honeypot, or an idempotency key (§ 9.2)

## The honest trade-off (full disclosure, as requested)

§ 9.1's own state list includes `Submitting`, `Persisted-notification-
pending`, `Success`, `Server error` and `Rate limited` — states that, read
literally, describe a working backend. That backend does not exist yet.
Building a throwaway API route to make Submit "work" would either (a)
fake persistence that isn't there (violates § 2 principle 15, "never fake
success — a form shows success only after the record is persisted"), or
(b) implement a piece of § 9.2 early, which the roadmap's own numbering
rule says not to do to make this phase look more finished than it is.

**What this phase actually ships instead**, in `components/start/brief-
builder.tsx`:

- The full draft, step flow, validation and Brief Summary are real and
  complete — nothing here is a mock.
- `BriefBuilderStatus` (`types/inquiry.ts`) defines all nine states from
  the roadmap, including `persisted-notification-pending`, which is
  explicitly commented as **reserved for § 9.2/§ 9.3** — no code path in
  this phase produces it, and none should until a real insert path exists.
- Clicking **Send brief** goes through a real `submitting` transition,
  then — since there is nothing to persist to — always resolves to an
  honest `server-error` screen with copy that says plainly: *"Submissions
  aren't live yet — this ships in Phase 9.2. Send it by email instead."*
  A **"Email this brief"** button opens the visitor's mail client with the
  full brief (built by `lib/inquiry-summary.ts`, the same function the
  Review screen renders from) pre-filled in the body, addressed to the
  same real inbox (`lib/site.ts#siteConfig.email`) already used everywhere
  else on the site. This is real, working utility today, not a stopgap
  that pretends to be more.
- `rate-limited` is a **client-side** 8-second resubmit guard only (fast
  double-click / repeated Enter), explicitly commented as such — it is not
  and does not claim to be § 9.2's server-side per-IP/e-mail limiting.
- `offline` is real: detected via `navigator.onLine` and the
  `online`/`offline` events, and blocks submission before the (still
  nonexistent) network call would even be attempted.
- `success` is defined but genuinely unreachable in this phase — reserved,
  not wired, not faked.

This is the same pattern already used for D-04 (§ 7.2 ships every price as
`'quote'` rather than inventing a figure) and D-13 (§ 8.2 ships the
mechanism, not an invented number): ship the honest, complete thing this
phase actually owns, and say plainly what still depends on a later one.

## Decisions touched

- **D-04** (pricing transparency, still open): the optional budget-range
  step does **not** wait on D-04. `BudgetBandId` (`types/inquiry.ts`) is a
  generic, self-reported bucket the *client* declares about their own
  budget — not a price Artaveo publishes about a service (that remains
  gated by D-04 in `lib/services-content.ts`, unchanged). This is
  disclosed inline in both the type and content files.
- **D-01** (domain/e-mail): unaffected by this phase; the mailto fallback
  reuses the existing interim `siteConfig.email`, same as every other
  direct-contact surface on the site today.

## Implementation summary

### Types (`types/inquiry.ts`, new)

`ProjectTypeId`, `TimelineId`, `BudgetBandId`, `PreferredChannelId`,
`FeatureTagId` — closed vocabularies, no invented values (§ 16.5).
`InquiryDraft` — the client-side draft shape, field-named to match the
minimal `inquiries` slice § 9.2 will persist (principle 9, "typed content
mirrors the future database"): only the destination changes later, not
the shape. `BriefBuilderStatus` — the nine-state machine, documented above.

### Content (`lib/inquiry-content.ts`, new)

Option lists (project types, feature tags, timeline, budget bands,
preferred channels) as bilingual `LocalizedText` pairs, added to
`scripts/check-content-placeholders.mjs`'s `CONTENT_FILES` list alongside
the other published-content files.

### Validation (`lib/inquiry-validation.ts`, new)

Plain per-step validator functions — no new dependency added (schema
libraries like zod would be the only consumer of themselves; § 20, "don't
add dependencies without a reason"). `validateStep(step, draft)` returns
field-keyed error codes; `dataSteps` lists the six data-entry steps in
spec order (`review` needs no validation of its own).

### Summary (`lib/inquiry-summary.ts`, new)

`buildInquirySummaryLines` / `buildInquirySummaryText` /
`buildInquiryMailtoHref` — one function each, shared by the Review screen
and the honest submit-fallback, so the two can never drift apart.

### Components (`components/start/`, new)

- `steps.tsx` — the six data-entry step components (`ServiceStep`,
  `ProjectStep`, `ScopeStep`, `TimelineStep`, `LinksStep`, `ContactStep`),
  built from the existing `Field`/`Radio`/`Checkbox`/`Select`/`Input`/
  `Textarea` primitives (§ 4.3) — no new form primitives needed.
- `review.tsx` — `ReviewStep`, the Brief Summary screen. Uses `dir="auto"`
  rather than `LatinTerm` for user-entered values, since a visitor's own
  free text or name may itself be Persian — `LatinTerm`'s forced `dir=
  "ltr"` is for fixed Latin technical terms in prose, not arbitrary
  user input, and would have been wrong here.
- `brief-builder.tsx` — the orchestrator: draft/step/status state, the
  `Stepper` (§ 4.3, already built for exactly this), keyboard-focus
  handoff to the new step's heading on navigation, and the submit flow
  described above.
- `start-content.tsx` — the page wrapper (`PageHeader` + `BriefBuilder`).

### Route (`app/[locale]/start/page.tsx`, new)

Reads `?service=`/`?package=` server-side; an unrecognised `service` slug
is silently dropped (same "empty means hidden" rule the rest of the site
uses for bad/missing data) rather than shown as a broken selection.

### A real bug caught and fixed during verification

Base UI's `Select.Value` resolves an item's label by looking up the
mounted `Select.Item` list, which isn't registered until the popup itself
has rendered at least once — so a **prefilled** value (`?service=…`)
rendered the raw slug (`business-website`) instead of its title
(`Business Website`) on first paint, both server-rendered and before
hydration. Fixed by using `Select.Value`'s render-prop form
(`children={(value) => …}`) in all three Brief Builder selects (service,
engagement model, budget band), which resolves the label directly from
the value instead of depending on item-list mount order. Verified via a
built-and-served smoke test of `/en/start?service=business-website&
package=standard` and the `fa` equivalent — see Verification.

### CTA rewiring (site-wide)

Every "Start a project" CTA now points to `/start` (with `?service=`/
`?package=` where the source page knows them) instead of `/contact`:
`IdentityCta`'s `hire` variant (its `consultation` variant is unchanged —
still `/contact`, since consultation booking is § 20, unrelated to the
Brief Builder), the header and mobile-nav "Start a project" buttons, the
Home hero and Final CTA, the Process and About pages' closing CTAs, and
`ServiceDetail`/`PackageComparison`'s per-service/per-package start links.
`/contact` remains live as the secondary "email/WhatsApp/hire channels"
path — `SiteShell`'s sticky-mobile-CTA exemption list now covers both
`/contact` and `/start` (each page already *is* the CTA it would
otherwise float). Added a small cross-link from `/contact` to `/start`
(`ContactPage.briefBuilderNote`/`briefBuilderCta`) and a `start` entry in
the command palette (`Nav.start`, `lib/site.ts#commandItems`) — `/start`
itself stays out of the primary header nav, matching the page map's own
"(primary CTA target)" annotation rather than a nav-listed page.

## Files changed

```
types/inquiry.ts                          new
lib/inquiry-content.ts                    new
lib/inquiry-validation.ts                 new
lib/inquiry-summary.ts                    new
components/start/steps.tsx                new
components/start/review.tsx               new
components/start/brief-builder.tsx        new
components/start/start-content.tsx        new
app/[locale]/start/page.tsx               new
scripts/check-content-placeholders.mjs    edited (added lib/inquiry-content.ts)
messages/en.json                          edited (Nav.start, ContactPage.briefBuilder*, StartPage, BriefBuilder)
messages/fa.json                          edited (same keys, translated)
components/ui/identity.tsx                edited (IdentityCta per-variant default href)
components/site/site-header.tsx           edited (start CTA → /start)
components/site/mobile-nav.tsx            edited (start CTA → /start)
components/site/site-shell.tsx            edited (sticky-CTA exemption list)
components/home/hero.tsx                  edited (ctaContact → /start)
components/home/final-cta.tsx             edited (primaryAction → /start)
components/process/process-content.tsx    edited (closing CTA → /start)
components/about/about-content.tsx        edited (closing CTA → /start)
components/services/service-detail.tsx    edited (startHref → /start)
components/services/package-comparison.tsx edited (both start links → /start)
components/contact/contact-content.tsx    edited (stale comment fixed, cross-link to /start added)
lib/site.ts                               edited (NavKey 'start', commandItems entry)
ROAD-MAP-ARTAVEO.md                       edited (this phase marked complete, status line, decision-register notes)
```

## Verification

- `tsc --noEmit`: clean, no errors.
- `next build` (Turbopack): compiles clean; `/[locale]/start` correctly
  renders as dynamic (ƒ) since it reads `searchParams`, every other route
  unaffected. Google Fonts stubbed for the sandbox's lack of network
  access per the established pattern, restored immediately after, `diff`
  confirmed byte-identical to the pre-build file.
- `node scripts/check-content-placeholders.mjs`: passes, now covering
  `lib/inquiry-content.ts` too.
- `en`/`fa` key parity: scripted diff of both message files — no keys
  present in one and missing from the other.
- Built-and-served smoke test (`next start`, `curl`):
  - `/en/start`, `/fa/start`, `/en/contact` all return `200`, render the
    expected copy, no error-boundary or `MISSING_MESSAGE` text.
  - `/en/services/business-website` and its package-comparison table
    render `href="/en/start?service=…"` / `…&package=…` links — the CTA
    rewiring is live, not just in source.
  - `/en/start?service=business-website&package=standard` and the `fa`
    equivalent (`?service=business-website`) correctly show the resolved
    service title (not the slug) and the prefilled package note, in both
    locales, after the `Select.Value` fix above.
- Manual review (not machine-checked this session): keyboard traversal of
  the step flow, RTL layout of the two-column contact step, and
  light/dark contrast were not re-verified visually beyond what the
  rendered HTML/CSS classes above confirm structurally. Flagged as a
  known gap below rather than asserted as done.

## Known issues / new debt

- **Manual visual QA not done this session** (see above) — keyboard-only
  traversal, screen-reader labeling of the stepper's `aria-current`, and
  visual light/dark + LTR/RTL review of the Brief Builder specifically
  should happen before this ships to real visitors, even though the
  build/typecheck/smoke-test layer is clean.
- **`persisted-notification-pending` and `success` are unreachable** by
  design until § 9.2 (and, for the outbox nuance, § 9.3) exist — this is
  the documented trade-off above, not an oversight, but it means this
  phase's "Submit" flow cannot be exit-criteria-verified end-to-end
  ("end-to-end submission verified in both locales" is Phase 9's own exit
  criterion, not 9.1's — 9.2 is required first).
- **Budget-band figures ($1,000 / $5,000 / $15,000 in `lib/inquiry-
  content.ts`) are bucket boundaries for the *client* to self-report
  against, not Artaveo-published prices** — flagged clearly in code
  comments so a future reader doesn't mistake them for a D-04 resolution.
  If the owner would rather avoid dollar figures anywhere pending D-04
  entirely, these bucket labels are the one place in this phase worth a
  second look.
- **No file-attachment support** — by 9.1's own spec ("scope limit: file
  attachments are deferred to Phase 15"); the Links step accepts URLs
  only, as specified.

## Rollback

Every changed/added file is additive or a narrow, single-purpose edit
(mostly one `href` string per CTA site). Reverting is either deleting the
new `types/inquiry.ts`, `lib/inquiry-*.ts`, `components/start/`, and
`app/[locale]/start/`, or restoring the listed `href`s to `/contact` and
removing the `messages/*.json` additions — no migrations, no schema, no
data to roll back.

## Final status

```text
PHASE: 9.1
STATUS: COMPLETE

IMPLEMENTED:
- Brief Builder: 6 data-entry steps + Brief Summary, per-step validation,
  ?service=/?package= prefill, full 9-state form-state model
- Honest submit flow pending § 9.2 (never fakes success; real mailto fallback)
- Site-wide CTA rewiring from /contact to /start

VERIFIED:
- typecheck · build (Turbopack) · content-placeholder guard · en/fa key parity
- built-and-served smoke test of /start, /contact in both locales, with
  and without ?service=/?package= prefill
- NOT done this session: manual keyboard/screen-reader/visual QA (see Known issues)

FILES CHANGED:
- see "Files changed" above

DATABASE / MIGRATIONS:
- none (§ 9.2's scope)

KNOWN ISSUES:
- see "Known issues / new debt" above

NEW DEBT:
- manual visual/a11y QA of the Brief Builder still owed
- persisted-notification-pending / success states unreachable until § 9.2

DECISIONS NEEDED:
- none new; D-04's existing open status is unaffected (budget step doesn't depend on it)

ARTIFACT: artaveo-phase-9-1-complete.zip
ROADMAP UPDATED: YES
NEXT PHASE: 9.2 (server handling & persistence) — new chat recommended (new
file surface: API route/server action, Supabase table, D-10 dependency)
```
