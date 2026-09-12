# Phase 8.1 — About, Process & Quality baseline

**Status:** ✅ complete
**Date:** 12 September 2026

## Objective

Roadmap § 8.1: build the `/about` and `/process` pages — the two pages that
answer the questions a client is afraid to ask before the first call. Both
routes already existed in navigation (`lib/site.ts` → `mainNav`, wired since
earlier phases) and were already linked to from Home (`AboutPreview`'s
"More about Artaveo", `Process`'s "See the full process") — both links were
live 404s until this phase.

Scope, per the roadmap's own merge note for § 8.1: About (story, the person
per D-02, technical focus, how I work, values, languages, timezone, tools,
external profiles, CTA) + Process (the canonical 01–08 phase model, each
with purpose/activities/output/client involvement/decisions & risks) +
Quality baseline (a short, honest list of kept commitments). Working
Agreement (§ 8.2) and Hire channels (§ 8.3) are explicitly **not** in
scope — they stay their own sub-phases per the roadmap, gated on their own
review/decision timelines (D-05 for 8.3).

## Dependencies

- D-02 (public identity — name, portrait, timezone): already resolved
  (11 Sep 2026). Read directly from the existing `DeveloperProfile`
  (`lib/home-content.ts#getDeveloperProfile`) — no new personal facts
  invented for this phase.
- § 4.5 identity components (`IdentityHeader`, `AvailabilityCard`,
  `ExternalProfileLinks`, `IdentityCta`): reused as-is, unmodified.
- § 7.2 engagement models / package pricing: reused by reference only (a
  short note on `/process` points to `/services`, where they already live)
  — not duplicated.

## Implementation summary

### Types (`types/content.ts`)

Added three types, none of which touch existing shapes:

- `WorkingLanguage` — `{ name, note }`. Deliberately **not** a self-rated
  fluency scale (that would be an invented, unverifiable metric per § 16.5)
  — `note` states a checkable fact instead (which of the site's own two
  content languages this is).
- `ProcessPhase` — the eight-dimension shape the roadmap's canonical
  process needs (`purpose`, `activities[]`, `output`, `clientInvolvement`,
  `decisionsAndRisks`), distinct from the existing, shorter `ProcessStep`
  (Home's preview strip) and `ServiceProcessStep` (one service's own
  process). All three types now coexist with clear doc-comments explaining
  which page each belongs to, so a future reader doesn't conflate them.
- `QualityCommitment` — `{ icon, title, description }` for the Quality
  baseline grid.

### Content (`lib/about-content.ts`, new file)

- `getAboutStory()` — three story paragraphs ("not a CV" per § 8.1). Every
  sentence is either a description of method (verifiable against `/work`)
  or an already-resolved decision (D-02) — no years-of-experience count,
  no client list, no invented outcome, per § 16.5.
- `getWorkingLanguages()` — Dari/Persian and English, each with a `note`
  citing the concrete evidence (this site's own bilingual content, written
  directly per § 16.2, not machine-translated) rather than a self-rated
  level.
- `getProcessPhases()` — all eight phases (**Discover · Define · Design ·
  Architect · Build · Test · Launch · Support**) fully written in `en` and
  `fa`, each with all five roadmap-required dimensions. Every phase's
  `decisionsAndRisks` field states a real trade-off or an honest
  limitation (e.g. Test: "there is no dedicated automated test suite on
  every project today"; Support: the exact warranty window is deferred to
  § 8.2's Working Agreement rather than promised here) — no phase reads as
  marketing copy with no downside.
- `getQualityCommitments()` — six commitments, each traceable to a
  standard already written into this roadmap (§ 2 principles, § 3 target
  standards, § 17 Definition of Done) or to practice already demonstrated
  in a shipped case study, never a new promise invented for this page.

`scripts/check-content-placeholders.mjs`'s `CONTENT_FILES` list was
extended to include this new file, so the same build guard that protects
`lib/home-content.ts` / `lib/services-content.ts` now covers it too.

### Icons (`components/icon.tsx`)

Added `Eye`, `FileText`, `FlaskConical`, `Languages` to the registry —
needed for the Quality baseline grid and the Process phase icons (Test →
`FlaskConical`, Support already covered by the existing `Wrench`, etc.).
No existing icon mapping changed.

### Components

- **`components/about/about-content.tsx`** — the `/about` page body.
  Layout mirrors `ServiceDetail` (an 8/4 split: long-form content on the
  start side, a sticky identity/contact card on the end side) so the
  site's two most detailed content pages share one reading pattern. Every
  section reads from data already established elsewhere (`focus` and
  `differentiators` from `lib/home-content.ts`, `techStack` from the same
  file) plus this phase's own `story`/`languages` — nothing here is new
  data invented specifically for this page. The sidebar reuses
  `IdentityHeader`, `AvailabilityCard`, `ExternalProfileLinks` and
  `IdentityCta` from § 4.5 unmodified. Closes with a `CTASection` pointing
  at `/contact` and `/work` — **not** `/start`, since Phase 9's Brief
  Builder doesn't exist yet and a link to it would 404.
- **`components/process/process-content.tsx`** — the `/process` page
  body. The eight phases render as an `Accordion` (same primitive and
  `defaultValue={[]}` convention `ServiceDetail`'s FAQ already uses), each
  panel laying out all five dimensions in a small grid. Below it, the
  Quality baseline renders as a `FeatureList` grid (the same shared
  pattern Home's "Services" tiles use). A short note bridges to
  `/services` for engagement models and pricing rather than duplicating
  them. Closes with its own `CTASection` pointing at `/contact` and
  `/services`.

Both components use the shared `PageHeader`, `CTASection` and
`FeatureList` patterns from `components/ui/patterns.tsx` — no new
page-level layout primitives were invented.

### Pages (`app/[locale]/about/page.tsx`, `app/[locale]/process/page.tsx`)

Both follow the exact `generateMetadata` + `setRequestLocale` + `SiteShell`
shape already used by `app/[locale]/work/page.tsx` and
`app/[locale]/services/page.tsx`. Because `SiteShell`'s sticky-CTA rule is
a deny-list (`STICKY_CTA_EXEMPT_PATHS = ['/', '/design-system']`, § 5.2),
both new routes get the mobile Sticky CTA automatically — no wiring
needed.

### i18n (`messages/en.json`, `messages/fa.json`)

Added two new namespaces, `AboutPage` (17 keys) and `ProcessPage` (16
keys), in both files, inserted next to their related existing namespaces
(`AboutPreview`, `Process`) for readability. Real Persian copy throughout
— not machine-translated, matching § 16.2 (facts stay the same, wording is
written for a Persian reader). Verified full key-parity between `en.json`
and `fa.json` after the edit (no key present in one file and missing in
the other, anywhere in either file).

One bug caught during the build check and fixed before delivery: the
`titleWithName` rich-text message initially used a `<n>` tag, which
doesn't match `AboutPreview`'s existing convention of naming the rich-text
tag after the interpolated variable (`<name>{name}</name>`) — `next-intl`
requires the tag key and the interpolated variable to be handled
consistently. Fixed to `<name>{name}</name>`, matching the pattern already
established in `components/home/about-preview.tsx`.

## Known content decision: Home's process preview vs. the full 8-phase process

Home's existing `Process` section (`components/home/process.tsx`, built in
Phase 3) shows a shorter, 7-stage preview (Discover · Plan · Design ·
Build · Test · Launch · Support) reusing `getProcessSteps()``. The
canonical process this phase builds for `/process` has **8** stages with
different names in two places (**Define** and **Architect** are new;
**Plan** doesn't appear in the full version). This is a deliberate,
disclosed trade-off, not an oversight:

- Reconciling the two would mean either compressing the full page's
  Architect/Define distinction away (losing real detail the roadmap
  explicitly asks for), or changing Home's already-shipped, already-
  verified preview strip outside this phase's approved scope.
- The two lists serve different jobs — a scannable homepage preview versus
  the full page a client reads before starting — so a preview
  intentionally showing fewer, coarser stages than the full breakdown is a
  defensible content pattern, not a truth violation (nothing on either
  page is false; they're just different levels of granularity).

Recorded here as new, non-blocking debt for the owner's attention: either
approve the two lists staying independently named, or approve a follow-up
pass that realigns Home's preview to the same 8 stage names once this
page's naming is confirmed as final.

## Verified

- `tsc --noEmit`: 0 errors.
- `next build` (Turbopack, font-stubbed per the established sandbox
  pattern, `app/[locale]/layout.tsx` restored and diffed byte-identical
  against the pre-stub backup immediately after the build): compiled
  successfully. All 35 static routes generated, including the four new
  ones — `/en/about`, `/fa/about`, `/en/process`, `/fa/process`.
- One real bug was caught by this build (the `<n>` vs `<name>` rich-text
  tag mismatch above) and fixed before delivery — not shipped and
  discovered later.
- `node scripts/check-content-placeholders.mjs`: passed, now covering
  `lib/about-content.ts`.
- Static-HTML inspection of the actual build output (not just "it
  compiled"): confirmed on `/en/about` — the real name, portrait alt text,
  "How I work" differentiator grid, both languages, all four tech-stack
  categories, all four external profile links (GitHub, LinkedIn, Fiverr,
  WhatsApp), and the closing CTA all render. Confirmed on `/fa/about` —
  the Persian equivalents of the same sections render (چطور کار می‌کنم,
  زبان‌ها, دری / فارسی, پروژه‌ای در ذهن…). Confirmed on `/en/process` and
  `/fa/process` — all eight phase titles (Discover…Support /
  شناخت…پشتیبانی), the Purpose/Activities headings, "Quality baseline" /
  خط پایه‌ی کیفیت, and the closing CTA all render in both locales.
- i18n key parity: scripted comparison of every flattened key across
  `messages/en.json` and `messages/fa.json` — zero keys present in one
  file and missing from the other.
- RTL: grepped the four new source files (`about-content.tsx`,
  `process-content.tsx`, `about-content.tsx`'s data file) for
  `text-left`/`text-right`/`pl-`/`pr-`/`ml-`/`mr-` — none found; every
  spacing/alignment utility used is a Tailwind logical property or an
  existing logical-property component (`Prose`, `PageHeader`,
  `FeatureList`, `Accordion`).
- Content truth: every About/Process claim traces to either D-02/D-08
  (already-resolved decisions), an existing verified data source
  (`getDeveloperProfile`, `getDifferentiators`, `getTechStack`), a roadmap
  standard (§ 2/§ 3/§ 17), or a stated methodology (not a factual claim
  requiring third-party evidence) — verified by inspection of
  `lib/about-content.ts`. No years-of-experience count, client list,
  rating, or invented outcome appears anywhere in the new content.
- Not yet done, tracked as debt below rather than silently skipped: a
  real-browser manual accessibility pass (keyboard/screen-reader) on the
  new `Accordion`-based Process page and the sticky `/about` sidebar at
  `lg:top-24`, and dark-theme / narrow-viewport visual verification (only
  the build's static HTML output was inspected in this sandbox, not a
  rendered browser).

## Files changed

- `types/content.ts` — added `WorkingLanguage`, `ProcessPhase`,
  `QualityCommitment`.
- `components/icon.tsx` — added `Eye`, `FileText`, `FlaskConical`,
  `Languages` to the registry.
- `lib/about-content.ts` — **new file**: story, languages, process
  phases, quality commitments.
- `components/about/about-content.tsx` — **new file**: `/about` page
  body.
- `components/process/process-content.tsx` — **new file**: `/process`
  page body.
- `app/[locale]/about/page.tsx` — **new file**: route + metadata.
- `app/[locale]/process/page.tsx` — **new file**: route + metadata.
- `messages/en.json`, `messages/fa.json` — added `AboutPage`,
  `ProcessPage` namespaces.
- `scripts/check-content-placeholders.mjs` — added `lib/about-content.ts`
  to the guarded file list.
- `ROAD-MAP-ARTAVEO.md` — this phase marked complete.
- `docs/content/claims-ledger.md` — new entries for this phase's content.

## Database / migrations

None — this phase is file-based content only, per § 8's M1 content-first
approach (§ 8.1 of the milestone dependency section). Nothing here changes
shape when it moves onto `site_settings` at Phase 12: `DeveloperProfile`
is untouched, and the three new types are additive.

## Known issues / new debt

- **Home process preview vs. full 8-phase process naming mismatch** — see
  the dedicated section above. Non-blocking; needs an owner decision on
  whether to reconcile.
- **Manual accessibility pass still pending** (same carried-over item
  Phase 7.2 already tracks, now also covering the new Process accordion
  and About sidebar): needs a real-browser keyboard/screen-reader walk
  before public launch.
- **`ServiceDetail`'s `paymentScheduleNote` still has no link target** —
  Phase 7.2's README flagged revisiting this once Phase 8 ships. `/process`
  now exists, but payment timing is more precisely a Working Agreement
  (§ 8.2) topic than a Process (§ 8.1) one — left unlinked again, to avoid
  pointing a payment-timing note at a page that doesn't actually cover
  payment timing. Revisit once § 8.2 publishes.
- **Support phase's warranty/response-commitment specifics are
  intentionally deferred**: `getProcessPhases()`'s `support` entry states
  plainly that the exact warranty window and change-request pricing will
  be published on the Working Agreement page once § 8.2 ships — nothing
  invented to fill the gap in the meantime.
- Confirmed again (not fixed, out of scope): `.gitignore`'s malformed last
  line (carried over from Phase 7.2's README) still means
  `tsconfig.tsbuildinfo` isn't actually ignored by git.

## Rollback

Revert this delivery's file set. `messages/en.json` and `messages/fa.json`
would need their `AboutPage`/`ProcessPage` blocks removed to fully roll
back; `scripts/check-content-placeholders.mjs`'s `CONTENT_FILES` entry for
`lib/about-content.ts` should also be removed if the file itself is
deleted. Nothing else in the existing codebase was modified — `/about` and
`/process` links already existed in navigation and Home before this phase
and would simply return to 404ing, exactly as they did beforehand.

## Final status

```text
PHASE: 8.1
STATUS: COMPLETE

IMPLEMENTED:
- /about page: story, technical focus, how I work, languages, tools,
  external profiles, identity/availability card, CTA
- /process page: canonical 8-phase process (Discover through Support)
  as an accordion with all 5 required dimensions per phase, plus a
  Quality baseline section

VERIFIED:
- typecheck · content-placeholder guard · build (all 4 new routes,
  both locales) · smoke (static-HTML inspection of real rendered output)
- en/fa · LTR/RTL (source-level grep) · content truth check
- Not yet done: real-browser accessibility/visual pass (tracked as debt)

FILES CHANGED:
- types/content.ts, components/icon.tsx, lib/about-content.ts (new),
  components/about/about-content.tsx (new),
  components/process/process-content.tsx (new),
  app/[locale]/about/page.tsx (new), app/[locale]/process/page.tsx (new),
  messages/en.json, messages/fa.json,
  scripts/check-content-placeholders.mjs

DATABASE / MIGRATIONS:
- None (file-based content, per M1's content-first approach)

KNOWN ISSUES:
- Home's 7-stage process preview doesn't name-match the canonical 8-stage
  process built here (disclosed trade-off, not a defect)
- Manual accessibility pass still pending (carried over from Phase 7.2)
- ServiceDetail's paymentScheduleNote still unlinked (revisit at § 8.2)

NEW DEBT:
- Owner decision needed: reconcile Home preview's stage names with the
  canonical process, or keep them independently scoped

DECISIONS NEEDED:
- None new. D-05 remains open and continues to block § 8.3 specifically
  (not § 8.1).

ARTIFACT: artaveo-phase-8-1-complete.zip
ROADMAP UPDATED: YES
NEXT PHASE: 8.2 (Working Agreement) or 8.3 (Hire channels, still blocked
on D-05) — either can proceed independently per the roadmap's own
sub-phase notes.
```
