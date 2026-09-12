# Phase 8.2 — Working Agreement ("How we'll work")

**Status:** ✅ complete
**Date:** 12 September 2026

## The D-13 question, answered up front

Roadmap § 8.2 asks for "milestones, deposits and payment timing" and a
"warranty window for defects" — both of which normally mean a concrete
number (a deposit percentage, a day-count). No such figure has been
approved by the owner anywhere in this codebase or the Decision Register.

Rather than invent one — the exact mistake § 7 forbids ("Agents must not
invent these answers") — this phase adds **D-13** to the Decision
Register and ships the honest mechanism instead of a fabricated figure:
deposit split and warranty length are stated as *"agreed per engagement,
during Define, and written into that project's own agreement,"* not as
one sitewide percentage or day-count. This is the same reasoning
Phase 7.2 already used for D-04 (ship the real, honest signal — there,
`price.type: 'quote'`; here, "decided during Define" — rather than wait on
an unresolved number). Nothing here blocks: § 8.2 ships **complete and
honest**, not **partial**.

Everything else on the page is not a new promise — it's a direct citation
of commitments the roadmap itself already states in § 8.2's own bullet
list (ownership, handover package contents) or an already-resolved
decision (D-08's response commitment).

## Objective

Build the Working Agreement section of `/process` — the page the roadmap's
own page map (§ 15) names as **"Process + engagement models + working
agreement"**: one route, not three. § 8.1 already built Process +
Quality baseline on that route and left a bridging note to `/services`
for engagement models (§ 7.2, already live there). This phase adds the
seventh and final piece: communication, response commitment, payment,
ownership, handover, warranty & change requests, and confidentiality.

## Dependencies

- No Decision Register item blocks this phase directly (§ 8.3 is the one
  gated by D-05, not § 8.2).
- D-08 (response commitment, resolved 11 Sep 2026): reused verbatim.
- § 7.2 `engagementModelsData` (Discovery Sprint · Fixed-scope Project ·
  Productized Service · Care Plan · Long-term Part-time, with their real
  billing models): reused by reference for the payment section's
  per-model breakdown — not re-invented.
- § 8.1's own Process phases (Define, Build): reused by reference for
  "when payment/warranty specifics get agreed" and "how change requests
  get scoped," so the two sub-phases of Phase 8 reinforce each other
  rather than repeating themselves independently.

## Implementation summary

### Types (`types/content.ts`)

Added `WorkingAgreementItem` — `{ id, icon, title, summary, points? }`.
`points` is optional: six of the seven topics need a short bulleted
breakdown, Confidentiality is a single sentence and doesn't.

### Content (`lib/about-content.ts`)

Added `getWorkingAgreementItems()` — seven items, fully written in `en`
and `fa`:

1. **Communication & cadence** — weekly written update, milestone demos,
   no account manager. Matches § 8.1's own Build-phase language exactly
   (already-approved content, not duplicated invention).
2. **Response commitment** — restates D-08's resolved commitment
   verbatim, plus a forward note that it becomes tracked/SLA'd once
   Phase 14's lead pipeline ships (already stated in § 14's component
   inventory entry for "Response Commitment Note").
3. **Payment, milestones & deposits** — breaks payment down per
   engagement model, quoting § 7.2's own `engagementModelsData` billing
   column for each (Discovery Sprint fixed/upfront, Fixed-scope
   milestone-billed, Productized Service package-priced, Care Plan/
   Long-term Part-time monthly) — then states the deposit mechanism per
   D-13 rather than inventing a percentage, and notes no online payment
   gateway exists yet (Phase 9 is still ahead).
4. **Ownership** — code/IP transfer on payment, third-party accounts
   created in the client's name — the exact two commitments § 8.2's own
   roadmap bullet already states, quoted directly.
5. **Handover package** — repository, documentation, environment
   template, runbook, credentials transfer — the exact five items §
   8.2's own roadmap bullet lists, each given one concrete sentence
   instead of staying a bare noun.
6. **Warranty & change requests** — states the warranty-length mechanism
   per D-13 (no invented day-count), defines the defect-vs-change-request
   distinction, and points at Process's own Define/Build phases for how
   changes get scoped and priced.
7. **Confidentiality** — an NDA is available on request before Discover
   begins. A real, low-risk capability any independent developer can
   offer without further infrastructure — not a claim requiring external
   evidence.

### Icons (`components/icon.tsx`)

Added `Clock` (response commitment), `Wallet` (payment), `KeyRound`
(ownership), `Lock` (confidentiality) to the registry. Handover reuses the
existing `FileText`; Warranty reuses the existing `ShieldCheck`;
Communication reuses the existing `MessagesSquare` — no icon added for a
topic that already had a sensible match from § 8.1's set.

### Component (`components/process/process-content.tsx`)

Added a new "Working Agreement" section, `id="working-agreement"` (target
for the new cross-link from Services below), rendered after the Quality
baseline using the same `Accordion` primitive and `defaultValue={[]}`
convention the Process phases and `ServiceDetail`'s FAQ already use — one
consistent expand/collapse pattern across the whole site rather than a
new one invented for this section. Each accordion panel renders the
item's `summary` paragraph plus an optional bulleted `points` list.
Updated the file's top doc-comment to describe the route's now-complete
§ 8.1 + § 8.2 scope.

### Cross-link from Services (`components/services/service-detail.tsx`)

Phase 7.2's README flagged `paymentScheduleNote` as having "no link
target... revisit once Phase 8 ships." Phase 8.1's README revisited it
and correctly deferred again, since payment timing is a Working
Agreement topic, not a Process topic, and § 8.2 hadn't shipped yet. It
has now: added a `StandaloneLink` (aliased import from
`components/ui/actions`, since the file already imports a plain `Link`
from `@/i18n/navigation` for other purposes) immediately under each
service's payment-schedule note, pointing at `/process#working-agreement`.
This closes debt tracked across two prior phase documents.

### Decision Register (`ROAD-MAP-ARTAVEO.md`)

Added **D-13**: "Sitewide deposit percentage / warranty window length for
the Working Agreement." Recommended default (the one this phase ships
with): no single sitewide figure — agreed per engagement during Define.
Blocks: 8.2 (informationally — doesn't block completion, since the
recommended default is itself a complete, honest answer, the same
resolution pattern as D-11 "None unless the owner explicitly wants one").

### i18n (`messages/en.json`, `messages/fa.json`)

Added `agreementTitle` / `agreementDescription` to `ProcessPage` (inserted
after `engagementModelsNote`) and `paymentScheduleLink` to `ServiceDetail`
(inserted after `paymentSchedule`) in both files. Real Persian copy
throughout. Verified full key-parity between `en.json` and `fa.json`
after the edit — zero keys present in one file and missing from the
other, across the entire tree (not just the new namespaces).

One correction made during copywriting, before the build check: the
initial `paymentScheduleLink` draft included a literal arrow glyph (→ /
←) to suggest direction, hardcoded per-locale. Removed before delivery —
a raw Unicode arrow embedded in translated text doesn't flip with
`dir="rtl"` the way the codebase's existing icon-based arrows do
(`rtl:rotate-180` on a Lucide `ArrowRight`), so it would have pointed the
wrong visual direction in Persian. Plain text carries the same meaning
without the RTL risk.

## Verified

- `tsc --noEmit`: 0 errors.
- `next build` (Turbopack, font-stubbed per the established sandbox
  pattern, `app/[locale]/layout.tsx` restored and diffed byte-identical
  against the pre-stub backup immediately after the build): compiled
  successfully, all 35 static routes generated (no new routes — this
  phase extends `/process`, doesn't add one).
- `node scripts/check-content-placeholders.mjs`: passed.
- Static-HTML inspection of the actual build output: confirmed all seven
  Working Agreement topic titles render on both `/en/process` and
  `/fa/process` (English: Communication & cadence, Response commitment,
  Payment/milestones/deposits, Ownership, Handover package, Warranty &
  change requests, Confidentiality; Persian equivalents: ارتباط و ریتم
  گزارش‌دهی, تعهد پاسخ‌گویی, پرداخت، نقاط عطف…, مالکیت, بسته‌ی تحویل,
  ضمانت و درخواست‌های تغییر, محرمانگی) — two English "Title &
  Subtitle" headings initially looked missing from a plain grep because
  Next escapes `&` to `&amp;` in the static HTML; re-checked with the
  escaped form and confirmed present. Also confirmed "D-13" appears on
  both locale pages (inside the Payment and Warranty items' honesty
  notes) and that the new Services→Process cross-link renders with the
  correct locale-prefixed href (`/en/process#working-agreement`,
  confirmed on `/en/services/business-website.html`) and label text.
- i18n key parity: scripted comparison of every flattened key across
  `messages/en.json` and `messages/fa.json` — zero keys present in one
  file and missing from the other, across the whole tree.
- RTL: grepped every changed/added source file
  (`process-content.tsx`, `service-detail.tsx`, `about-content.ts`,
  `icon.tsx`, `types/content.ts`) for
  `text-left`/`text-right`/`pl-`/`pr-`/`ml-`/`mr-` — none found.
- Content truth: every Working Agreement claim traces to either an
  already-resolved decision (D-08), an existing verified data source
  (`getEngagementModels()`'s billing column), a direct quote of § 8.2's
  own roadmap bullet list (ownership, handover), or D-13's honest
  mechanism-not-figure resolution — verified by inspection of
  `lib/about-content.ts`. No deposit percentage, warranty day-count, or
  other invented figure appears anywhere in the new content.
- Not yet done, tracked as debt below rather than silently skipped: a
  real-browser manual accessibility pass on the now-longer `/process`
  page (two independent accordions stacked on one route) and dark-theme /
  narrow-viewport visual verification — only the build's static HTML
  output was inspected in this sandbox, not a rendered browser.

## Files changed

- `types/content.ts` — added `WorkingAgreementItem`.
- `components/icon.tsx` — added `Clock`, `Wallet`, `KeyRound`, `Lock` to
  the registry.
- `lib/about-content.ts` — added `getWorkingAgreementItems()` and its
  seven-item data set.
- `components/process/process-content.tsx` — added the Working Agreement
  accordion section; updated the file's top doc-comment.
- `components/services/service-detail.tsx` — added the
  `paymentScheduleNote` → `/process#working-agreement` cross-link
  (aliased `Link` import to avoid colliding with the file's existing
  `Link` from `@/i18n/navigation`).
- `messages/en.json`, `messages/fa.json` — added `ProcessPage.agreementTitle`
  / `agreementDescription`, `ServiceDetail.paymentScheduleLink`.
- `ROAD-MAP-ARTAVEO.md` — added D-13; marked § 8.2 complete; updated the
  Phase 8 header, the phase index line, and the "next step" pointer at
  the top of the document.
- `docs/content/claims-ledger.md` — new entries for this phase's content.

## Database / migrations

None — file-based content, same as § 8.1. Nothing here changes shape when
`site_settings` / a real terms table exists at Phase 12.

## Known issues / new debt

- **`docs/decisions.md` doesn't exist yet** (noticed while checking where
  D-13 should be recorded once resolved — § 19's documentation
  architecture names this file, but it isn't in the repo). Pre-existing
  gap, not introduced by this phase; D-13 stays recorded in the Decision
  Register table inside `ROAD-MAP-ARTAVEO.md` for now, same as every
  other still-open decision.
- **D-13 remains open** — this phase ships with the honest "decided per
  engagement" mechanism, not a sitewide figure. If the owner later wants
  one universal deposit percentage or warranty length published instead,
  resolving D-13 only requires updating `lib/about-content.ts`'s
  `payment`/`warranty` items — no type, component or route changes.
- **Manual accessibility pass still pending** (same carried-over item
  Phase 7.2 and Phase 8.1 already track): now also covering the second,
  larger accordion on `/process`.
- Confirmed again (not fixed, out of scope): `.gitignore`'s malformed last
  line still means `tsconfig.tsbuildinfo` isn't actually ignored by git.

## Rollback

Revert this delivery's file set. `messages/en.json` and `messages/fa.json`
would need their `ProcessPage.agreementTitle`/`agreementDescription` and
`ServiceDetail.paymentScheduleLink` keys removed to fully roll back.
`components/services/service-detail.tsx`'s cross-link and its
`StandaloneLink` import would need removing to restore the § 7.2-only
state. `/process` itself would keep working exactly as § 8.1 left it — no
existing content or route from before this phase is modified, only
extended.

## Final status

```text
PHASE: 8.2
STATUS: COMPLETE

IMPLEMENTED:
- Working Agreement section on /process (id="working-agreement"):
  communication & cadence, response commitment, payment/milestones/
  deposits, ownership, handover package, warranty & change requests,
  confidentiality — 7 topics as an accordion
- Cross-link from every service's payment-schedule note to the new
  section, closing debt tracked since Phase 7.2

VERIFIED:
- typecheck · content-placeholder guard · build (existing 35 routes,
  no new routes — this phase extends /process) · smoke (static-HTML
  inspection of real rendered output, both locales)
- en/fa · RTL (source-level grep) · content truth check (no invented
  deposit % or warranty day-count anywhere)
- Not yet done: real-browser accessibility/visual pass (tracked as debt)

FILES CHANGED:
- types/content.ts, components/icon.tsx, lib/about-content.ts,
  components/process/process-content.tsx,
  components/services/service-detail.tsx,
  messages/en.json, messages/fa.json

DATABASE / MIGRATIONS:
- None (file-based content, per M1's content-first approach)

KNOWN ISSUES:
- docs/decisions.md doesn't exist yet (pre-existing gap, noted not fixed)
- Manual accessibility pass still pending (carried over)

NEW DEBT:
- D-13 open: owner may want a single sitewide deposit %/warranty length
  instead of the "decided per engagement" mechanism this phase ships

DECISIONS NEEDED:
- D-13 (new, non-blocking) — sitewide vs. per-engagement payment/warranty
  figures
- D-05 continues to block § 8.3 specifically (not § 8.2)

ARTIFACT: artaveo-phase-8-2-complete.zip
ROADMAP UPDATED: YES
NEXT PHASE: 8.3 (Hire channels) — still blocked on D-05; or skip ahead to
Phase 9 (Start a Project / Brief Builder), since Phase 8's remaining
sub-phase doesn't block anything downstream per § 8's dependency chain.
```
