# Phase 11.2 — Launch Readiness: Legal & Privacy

**Status:** ✅ COMPLETE
**Date:** 13 September 2026

## Objective

Ship a real privacy policy and terms of service, gated by D-07
(jurisdiction of operation) — resolved this session when the owner
confirmed Artaveo is operated from Afghanistan.

## Scope

Roadmap § 11.2:

> Privacy policy (what the inquiry collects, why, retention, rights,
> processors) · terms · imprint if required · prefer cookie-less
> analytics; if any non-essential cookie is used, a consent banner with
> a real reject option.

## Dependencies

**D-07, resolved 13 September 2026.** The owner confirmed Afghanistan.
Before writing a word of content, this was researched rather than
assumed: multiple legal trackers (IAPP's own jurisdiction notes, a
dedicated Afghanistan privacy-law summary, the Council of Europe's
Octopus cybercrime project page) agree Afghanistan has no
comprehensive, standalone data-protection statute — only narrow
sectoral clauses in telecom and banking law, and no dedicated
data-protection authority. That changes what § 11.2's own instruction
("if EU-based, GDPR-grade privacy policy…") means here: it doesn't
apply, since Artaveo isn't EU-based. The honest alternative — document
the real jurisdiction, and offer GDPR-style rights *voluntarily* as
good practice rather than claim compliance with a law that doesn't
apply — is what's shipped.

This also settles two things the roadmap left implicit:

- **Imprint.** "If required" turned out to mean *not* required — the
  EU/German "Impressum" statute (TMG §5) has no Afghan equivalent. No
  imprint page was built; real identity/contact info already lives on
  `/about` (D-02: real name, portrait) and the footer.
- **Cookie consent banner.** Only needed "if any non-essential cookie is
  used." Verified via research that `@vercel/analytics` is cookieless by
  design (identifies visitors by a short-lived hash of the request, not
  a stored ID) — matching what § 11.1 already implemented. The only
  cookie this site sets is `artaveo-locale` (§ 5.1's locale-preference
  cookie), which is strictly functional. No non-essential cookie exists,
  so no banner was built.

## Implementation summary

### Content (`lib/legal-content.ts`)

Follows the same pattern as `lib/about-content.ts`/`lib/contact-content.ts`
— a `tx(en, fa)` helper building `LocalizedText` pairs, read through two
selectors, `getPrivacyPolicy()` and `getTermsOfService()`, each
returning a `LegalDocument` (new type in `types/content.ts`: a
`lastUpdated` date plus an array of `LegalSection`s, each an id, a
title, paragraphs, and an optional bullet list — same "optional field,
render only what's present" shape the rest of the content layer uses).

**Privacy Policy sections:** who this covers (including the "no
comprehensive Afghan law" disclosure above), what's collected (Brief
Builder fields, the salted IP hash used only for spam prevention,
Vercel Analytics' anonymized aggregate data, the `artaveo-locale`
cookie, and browser-local theme/offline-queue storage), why, where it's
stored (Supabase RLS + Vercel, with an honest note that no inquiry data
currently reaches any third-party e-mail service since § 9.3's real
sending is still inactive), **retention** (disclosed as a real gap — no
automated deletion schedule exists yet, not glossed over or invented),
your choices (e-mail-based access/correction/deletion, offered
voluntarily), children, and changes to the policy.

**Terms of Service sections:** scope (website use only — a specific
project's terms are the written scope/estimate + the Working Agreement
principles already on `/process`, not duplicated here), governing law
(Afghanistan, per D-07, without excluding a client's own mandatory
consumer-protection rights), intellectual property (site content +
both real case studies belong to Zakir Naseri, per D-06), acceptable
use, no warranty on the website itself, liability, changes, contact.

### Rendering (`components/legal/legal-content.tsx`)

One shared `<LegalContent>` component renders both documents through
`<Prose>` (the same article-typography component `CaseStudy` and
`ServiceDetail` already use) — eyebrow/title/description header, a
"last updated" date via the existing `formatDate()` helper, then each
section's heading/paragraphs/list. Avoids duplicating the same shape
twice across `/privacy` and `/terms`.

### Routes

`app/[locale]/privacy/page.tsx` and `app/[locale]/terms/page.tsx`,
following § 11.1's exact pattern: `buildAlternates()` +
`buildPageOpenGraph()` in `generateMetadata`, a `BreadcrumbList` via
`<JsonLd>`. Both added to `app/sitemap.ts` (low priority, `yearly`
change frequency — legal pages don't change often).

### Navigation

`lib/site.ts` gained `legalNav` (`privacy`/`terms` `NavItem`s, added to
the `NavKey` union) and two `commandItems` entries for the command
palette. `components/site/site-footer.tsx`'s bottom bar now renders
`legalNav` via the same locale-aware `Link` every other footer link
uses — closing the exact gap that file's own doc comment had flagged
since § 5.2 ("no privacy/terms page to link to yet… add them to a
`legalNav` list… once § 11.2 ships real legal pages").

### Translations

`messages/en.json` / `messages/fa.json` gained `Nav.privacy`,
`Nav.terms`, `Footer.legal` (the footer nav's `aria-label`), and full
`PrivacyPage`/`TermsPage` namespaces (`eyebrow`, `title`, `metaTitle`,
`description`, `lastUpdatedLabel`). Key parity between the two files
re-verified after the edit (still an exact match).

## Decisions

**D-07 resolved** (see the Decision Register): Artaveo operates from
Afghanistan.

## Changed files

```
lib/legal-content.ts                    new — Privacy Policy & Terms content (bilingual)
components/legal/legal-content.tsx      new — shared <LegalContent> renderer
app/[locale]/privacy/page.tsx           new
app/[locale]/terms/page.tsx             new
types/content.ts                        + LegalSection, LegalDocument types
lib/site.ts                             + legalNav, privacy/terms NavKey + commandItems entries
components/site/site-footer.tsx         bottom bar now renders legalNav
app/sitemap.ts                          + /privacy, /terms routes
scripts/check-content-placeholders.mjs  + lib/legal-content.ts registered
messages/en.json                        + Nav.privacy/terms, Footer.legal, PrivacyPage, TermsPage
messages/fa.json                        + same keys, Persian
```

## Database / migrations

None.

## Tests

No automated test suite exists yet (Phase 21).

## Manual verification

- Researched Afghanistan's data-protection landscape via web search
  **before** writing any content, not after — see Dependencies above
  for sources.
- Verified `@vercel/analytics`'s cookieless design via its own
  documentation before deciding no consent banner was needed, rather
  than assuming.
- `tsc --noEmit`: clean.
- `node scripts/check-content-placeholders.mjs`: passes, now covering
  `lib/legal-content.ts`.
- i18n key parity (`en.json` vs `fa.json` flattened key sets): exact
  match, re-verified after adding the new keys.
- `next build` (fonts stubbed and restored per the established sandbox
  pattern, `diff`-confirmed byte-identical restoration): clean, 47
  routes generated including `/en/privacy`, `/fa/privacy`, `/en/terms`,
  `/fa/terms`.
- Rendered HTML spot-checked directly: canonical tag on `/en/privacy`,
  correct Persian `<title>` on `/fa/privacy`, both `/en/privacy` and
  `/en/terms` footer links present on an unrelated page (`/en/about`,
  confirming the footer renders sitewide), and the retention
  disclosure's exact English wording and its Persian equivalent both
  present in their respective rendered pages.

## Known issues

- **No automated data-retention/deletion schedule exists** — disclosed
  honestly in the Privacy Policy's own "How long it's kept" section
  rather than hidden. Tracked as real follow-up work (a scheduled
  cleanup job once real lead volume justifies one), not fixed in this
  phase.
- **Not legal advice.** Flagged in `lib/legal-content.ts`'s own doc
  comment: Claude is not a lawyer, and this content — particularly the
  Terms' liability section — should be reviewed by one before being
  relied on as an enforceable contract for real client engagements.

## New debt

- A real data-retention/deletion policy and schedule (tracked above).

## Rollback

Revert every file listed under Changed Files, then delete the four new
files (`lib/legal-content.ts`, `components/legal/legal-content.tsx`,
`app/[locale]/privacy/`, `app/[locale]/terms/`). No database or env
state to unwind.

## Final status

**COMPLETE.** D-07 is resolved and recorded in the Decision Register;
`/privacy` and `/terms` are live in both locales with honest,
non-fabricated content reflecting Artaveo's real jurisdiction and its
current (not aspirational) data-handling practices. § 11.3 (performance
& accessibility pass) is the next unblocked Phase 11 work.
