# Copy & Localization Refinement Pass

**Status:** ✅ COMPLETE
**Date:** 17 September 2026
**Roadmap entry:** § 23.1 "Out-of-sequence work log" — **this is not a
roadmap phase.** Zakir explicitly asked that this not be numbered as
Phase 16 and that it be treated as a self-contained, out-of-sequence
pass. Phase 16 remains the next item in the phase sequence.

## Objective

An owner-supplied brief asked for a full-site Persian/English
language-and-localization refinement pass: natural, non-mechanically-
translated Persian; independent heading composition per locale;
shorter, more scannable sentences without losing technical depth; no
visual redesign. Not a request to rewrite everything — only to find
and fix real instances of the brief's named failure modes.

## Scope

> Audited: `messages/en.json`/`fa.json` (687 keys), `lib/home-content.ts`,
> `lib/services-content.ts`, `lib/about-content.ts`, `lib/site.ts`,
> `lib/inquiry-content.ts`, the shared heading components
> (`Hero`, `WhyArtaveo`, `FinalCta`, `PageHeader`/`SectionHeader` in
> `components/ui/patterns.tsx`), and the live case-study/service copy
> in Supabase (`project_sections`, `services`) · three static-content
> fixes, one Persian heading rewrite, two Supabase case-study text
> updates · no schema change, no component change, no new i18n keys

No visual design, layout, color, spacing, or component structure was
touched — this was a wording pass only, as the brief required.

## Audit findings

The brief assumed the Persian copy would show widespread machine-
translation symptoms: wrong comma character, missing spacing around
Latin terms, a specific list of vague abstract phrases, forced
identical line-breaks between locales. Automated scans for every one
of those mechanical patterns across every `fa`-content file came back
clean. This codebase's Persian had already been written carefully in
prior phases (Phase 5.1 and since) — not templated, not machine-
translated.

Three genuine issues were found and fixed:

1. **`WhyArtaveo`'s heading mirrored the English almost word-for-word.**
   English: "One developer. One workflow. The whole product." Persian
   was: "یک توسعه‌دهنده. یک روند کاری. کل محصول." — a direct clause-
   for-clause translation. This is exactly the brief's own worked
   example of what not to do (§15). Rewritten to its own Persian
   composition: "یک نفر همه‌چیز را می‌سازد، از معماری تا محصول
   نهایی." — same meaning, independent rhythm and line split.

2. **A vague abstract phrase, repeated.** "مرزهای شفاف میان..."
   ("clear boundaries between...") appeared twice in
   `lib/home-content.ts` — once as a capability tagline, once as a
   differentiator sentence. The brief names this exact construction
   as an example of unnecessary abstraction (§3). Both rewritten as
   direct, active sentences naming what the boundaries actually keep
   separate.

3. **One run-on, four-idea sentence.** The Pezhohesh Portal case
   study's `dataIntegrityAndSecurity` field (`lib/home-content.ts`)
   packed four separate claims — the check constraint, the fail-closed
   function, RLS policies, and the rate-limited Edge Function — into
   two long sentences joined with "و". Split into four single-idea
   sentences; also dropped a stray "رویکرد" ("approach") abstraction
   along the way.

In the live database (edited directly — this is CMS content, not
schema, so `execute_sql`, not a migration):

- Pazhuhesh Portal case study, `context` and `problem-and-goals`
  sections: split a run-on opening sentence, and fixed one colloquial
  "یه" → the correct written "یک" — a register slip (informal spoken
  Persian) in an otherwise professional-register paragraph.
- Transportation System case study, `engineering-highlight` section:
  its longest compound sentences broken into shorter ones, without
  cutting any of the technical detail (the function-permission gap,
  the audit-trail risk, the cancel/refund bug).

A SQL scan across every `project_sections` and `services` row
confirmed no other instance of the colloquial "یه" or the brief's
abstract-phrase list remained after these fixes.

## Heading composition (brief §2/§5)

The brief's core architectural ask — that each locale be free to
compose its own heading lines rather than being forced into the
English split — was checked against the actual components, not
assumed. `PageHeader` and `SectionHeader` (`components/ui/patterns.tsx`)
already accept `title` as a `React.ReactNode`; every call site already
supplies its own JSX per locale via `next-intl`. `Hero`, `WhyArtaveo`
and `FinalCta` already read independent `titleLine1`/`titleLine2` keys
from `messages/fa.json` and `messages/en.json` — there is no shared
key and no code path that derives the Persian line break from the
English one. The architecture already supports this; only
`WhyArtaveo`'s Persian *content* needed rewriting (finding 1 above),
not the component.

## Why the rest was left unchanged

The brief itself says not to rewrite English or Persian unnecessarily,
and to judge success by whether the copy reads naturally — not by how
much text moved. `lib/about-content.ts`, `lib/services-content.ts`,
the rest of `lib/home-content.ts`, and most of the case-study/service
rows in Supabase were reviewed and use short-to-medium sentences,
active verbs, and dash-led asides for supporting detail rather than
nested relative clauses — the pattern the brief itself recommends.
Rewriting already-natural copy for its own sake would have risked
introducing new problems (register drift, meaning loss) for no
readability gain, so those were left as-is.

## Verification

- `tsc --noEmit`: 0 errors.
- i18n key parity: 687/687 (`en.json`/`fa.json`) — no keys added or
  removed; a wording pass, not a new-feature phase.
- `node scripts/check-content-placeholders.mjs`: passes
  (`home-content.ts`, `site.ts`, `services-content.ts`,
  `about-content.ts`, `contact-content.ts`, `inquiry-content.ts`,
  `legal-content.ts`).
- `next build`: Turbopack compiles successfully; page-data collection
  fails at the same pre-existing, already-disclosed Phase-12
  Supabase-network gap (this run surfaced first at
  `/[locale]/services/[slug]`) — unrelated to this work, same root
  cause as every prior phase. `next/font/google` stub applied and
  reverted per the established sandbox pattern, confirmed
  byte-identical via `diff`; `tsconfig.tsbuildinfo` reverted with
  `git checkout --`.
- No CSS or component structure changed in this pass, so the
  logical-CSS-property grep (§ RTL correctness) did not apply.

## Known limitations

Not verifiable from this sandbox: the actual rendered visual balance
of the rewritten headings and case-study paragraphs in a real browser,
in both `/fa` and `/en`. The brief's own Phase E explicitly calls for
judging line length, heading rhythm, and whitespace in the rendered
page, which this sandbox cannot render. Zakir should look at the
`WhyArtaveo` section and the two edited case studies in a real browser
after this ships, in both locales.

## Addendum — revision 32 (deeper pass)

Zakir reviewed revision 31 and correctly called it too narrow: the
brief's core complaint was that Persian and English were "sort of
using the same format" — sentences mirroring the English clause order
and length rather than being independently composed — and the first
pass only fixed three flagged spots instead of checking the site's
actual prose against that standard. Went back for a real second pass:

- **`messages/fa.json` prose rewritten for independent composition** in
  `Hero`, `FeaturedWork`, `Work`, `CaseStudy.pendingNotice`,
  `Services`, `ServicesIndex`, `TechStack`, `Process`,
  `ProcessPage.agreementDescription`, and `AboutPage.description` —
  each rewritten to its own Persian sentence order/length rather than
  translating the English fragment-for-fragment (dash-list-plus-clause
  patterns split into separate sentences; passive constructions
  converted to active first-person verbs where the English used them).
- **Two register inconsistencies fixed**: `BriefBuilder.offlineQueuedTitle`/
  `offlineQueuedDescription` and `ServiceDetail.requirements` used the
  formal "شما" pronoun and verb forms while every other string in the
  same flows uses the informal "تو" register — a real formatting
  inconsistency, not a style choice.
- **Important correction to revision 31's own work**: `lib/home-content.ts`'s
  `featuredProjectsData` (the case-study prose for both projects) turned
  out to be dead code — per `lib/home-content-projects.ts`'s own
  comment, it is only the historical input to
  `scripts/import-content-to-db.ts` and is never read at request time.
  The actually-rendered case-study text lives in Supabase
  (`project_sections`), which `queryProjectBySlug` reads directly. This
  means revision 31's sentence-split fix inside `featuredProjectsData`
  never had any live effect — it was correct as a fix to the repo's
  seed source, but not the fix the site visibly needed. Went back to
  the live data: found and rewrote `responsive-and-rtl` for both
  projects (both mirrored the English "RTL-first from the ground up —
  using..." fragment structure almost verbatim), and reviewed every
  other `project_sections` row plus the full `services` table content
  directly in Supabase. Those were already independently composed —
  natural Persian rhythm, not translated English — and were left as
  they were, per the brief's own instruction not to rewrite copy that
  already meets the bar.
- `next build`, `tsc --noEmit`, i18n parity (687/687) and the
  content-placeholder script all re-run clean after this pass, same
  procedure as above.

## Addendum — revision 33 (exhaustive line-by-line pass)

Zakir insisted the brief be re-checked line by line, with nothing
skipped, however long it took. This pass read every remaining live
content source in full rather than sampling:

- `lib/about-content.ts` (about-page story, languages, the 8-phase
  process, quality commitments, Working Agreement), `lib/site.ts`
  (structural nav/config, no prose), `lib/inquiry-content.ts` (Brief
  Builder option labels), and the rest of `lib/home-content.ts`
  (process steps, developer bio, unpublished insight drafts) — all
  read start to finish. All already natural, independently composed,
  first-person Persian. Nothing changed here; confirmed rather than
  assumed.
- `messages/fa.json`: `Common.siteDescription` (visible in both SEO
  meta and the footer) rewritten to active voice, matching the Hero
  rewrite. Two strings found in fully colloquial *spoken* Persian —
  `NotFound.description` and `ErrorPage.description` used "نداره",
  "اومد", "می‌تونی" — against the site's established written-informal
  register everywhere else; fixed. `Pwa.installDescription`
  ("دستگاه‌تان" → "دستگاهت"), `BriefBuilder.successQueuedNote`, and
  `Price.quote` had formal verb conjugations in an informal-register
  site; fixed. `ServiceDetail.requirements` dropped a formal "شما".
- English, per brief §6: `Hero.description` was the one string that
  actually packed multiple ideas into one long sentence past what §6
  flags; split into two, second half made active voice. Nothing else
  in `en.json` crossed that bar on a full-file scan.

**Largest finding this pass, live in Supabase:** the entire `faqs`
table — the FAQ section rendered on every `/services/[slug]` page —
was written in the formal "شما" register throughout: "صادقانه به شما
اطلاع می‌دهم", "در اختیارتان بگذارم", "آیا خودتان متن را
می‌نویسید؟", "کار می‌کنید؟". Every other public-facing string on the
site — Hero, Services, WhyArtaveo, ProcessPage, ContactPage, Brief
Builder — uses the informal "تو" register. This was a real,
systemic register mismatch, not a style choice: one whole content
table drifted onto a different register from everything else. All 6
affected FAQ rows were rewritten to match. The same slip turned up in
two service taglines (`admin-dashboards`: "تیم شما" → "تیمت";
`backend-api-database`: "محصول شما" → "محصولت", "فرانت‌اند شما" →
"فرانت‌اندت" in its `included` array) and one `service_addons.description`
("شما متن نهایی را تحویل دهید" → "خودت متن نهایی را تحویل بدهی") —
all fixed.

After the manual fixes, ran a regex sweep for the formal-register
pattern (`شما`, `‑تان`) across every `fa` jsonb column in `services`,
`service_packages`, `service_addons`, `site_settings`,
`engagement_models` and `project_sections` to confirm nothing else
was missed. One flagged hit inside `project_sections`
(`123c5d5e-...`, the Transportation System `quality` section) was
checked by hand and is a false match inside the word "شناخته‌شده"
("known") — not a register issue.

`next build`, `tsc --noEmit`, i18n parity (687/687, unchanged — this
was a wording pass, no keys added or removed) and the
content-placeholder script all re-run clean after this pass.
`next/font/google` stub applied and reverted, confirmed byte-identical
via `diff`; `tsconfig.tsbuildinfo` reverted with `git checkout --`.

## Files changed

- `messages/fa.json` — `WhyArtaveo` heading; independent-composition
  rewrites of `Hero`, `FeaturedWork`, `Work`, `CaseStudy.pendingNotice`,
  `Services`, `ServicesIndex`, `TechStack`, `Process`,
  `ProcessPage.agreementDescription`, `AboutPage.description`,
  `Common.siteDescription`; register fixes in `NotFound`, `ErrorPage`,
  `Pwa.installDescription`, `BriefBuilder` (`offlineQueuedTitle`/
  `offlineQueuedDescription`/`successQueuedNote`), `Price.quote`,
  `ServiceDetail.requirements`
- `messages/en.json` — `Hero.description` tightened per brief §6
- `lib/home-content.ts` — two abstract-phrase rewrites (`capabilitiesData`,
  `differentiatorsData` — both live), one sentence split in
  `featuredProjectsData` (confirmed dead / seed-only, see the
  revision-32 addendum)
- `ROAD-MAP-ARTAVEO.md` — revisions 31–33 (this entry)
- `docs/updates/2026-09-17-copy-localization-refinement.md` — this file

Edited live in Supabase (not tracked in this repo — CMS content):

- `project_sections` — Pazhuhesh Portal `context`, `problem-and-goals`,
  `responsive-and-rtl`; Transportation System `engineering-highlight`,
  `responsive-and-rtl`
- `faqs` — 6 of 9 rows (formal-register fix, see revision-33 addendum)
- `services` — `tagline` (`admin-dashboards`, `backend-api-database`),
  `included` (`admin-dashboards`, `backend-api-database`)
- `service_addons` — `description` (copywriting add-on)

## Reviewed and confirmed already correct (no change made)

- `lib/about-content.ts`, `lib/site.ts`, `lib/inquiry-content.ts` — read
  in full
- `lib/home-content.ts` — `processStepsData`, `developerData`,
  `insightsData`
- Supabase `services` (`description`, `problem`, `for_whom`,
  `not_for_whom`, `included`/`not_included` elsewhere, `deliverables`,
  `requirements`, `what_drives_cost`, `payment_schedule_note`),
  `service_packages` (`summary`, `for_whom`, `included`,
  `not_included`, `deliverables`, `requirements`), `engagement_models`,
  `site_settings.response_commitment`, remaining `project_sections`
  rows not listed above
