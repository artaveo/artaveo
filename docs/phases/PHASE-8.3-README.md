# Phase 8.3 — Hire Channels (per D-05)

**Status:** ✅ complete
**Date:** 12 September 2026

## The D-05 question, answered up front

Roadmap § 8.3 asks for a **Hire Channel Selector** comparing *Direct* vs
*Via platform*, gated by **D-05** ("Hire channels and which external
profiles are real"). D-05 is not marked "Resolved" with a date in the
Decision Register — unlike D-02, D-08, D-12. Per § 7 and § 20 ("check the
Decision Register; if a needed decision is missing, stop that part and
mark it BLOCKED"), an agent must not invent this answer.

This phase does not invent it. Inspection of the existing codebase shows
D-05's own **recommended default** — *"Direct + one platform profile
(Fiverr) for clients who want buyer protection; list only profiles that
exist"* — is **already the live, shipping configuration**: `lib/site.ts`'s
`socialLinks` has listed exactly GitHub, LinkedIn, Fiverr and WhatsApp
(real profiles only, no invented platforms) since Phase 5.2, and
`ExternalProfileLinks` has rendered that same list on `/about` since
Phase 8.1. Phase 8.3 doesn't pick a new hire-channel strategy — it builds
the comparison the roadmap calls for around the strategy the site has
already been running. Same reasoning Phase 8.2 used for D-13: ship the
honest, already-approved mechanism, and still flag it for the owner to
record formally rather than silently treat it as settled.

**D-05 remains open** in the Decision Register below, now annotated with
"default applied 12 Sep 2026." Recording it as formally "Resolved" is the
owner's call, same as D-13.

## Objective

Build the § 8.3 Hire Channel Selector and, since it didn't exist yet, the
`/contact` route it lives on — the page map's (§ 15) own destination for
"Direct contact + hire channels," and the route every "Start a project"
CTA site-wide (`IdentityCta`, header, sticky mobile CTA, package
comparison tables) already pointed to without it existing.

## Dependencies

- D-05 (not formally resolved — default applied, see above).
- D-08 (response commitment, resolved 11 Sep 2026): reused via the
  existing `AvailabilityCard` component, unchanged.
- `lib/site.ts#siteConfig.email` and `#socialLinks` (D-01 interim e-mail,
  D-05 default): read by reference, not duplicated.
- `getDeveloperProfile()` (`lib/home-content.ts`, § 4.5): reused for the
  sidebar's availability card, same as `/about`.

## Implementation summary

### Types (`types/content.ts`)

Added `HireChannelKind` (`'direct' | 'platform'`) and `HireChannel` —
`{ id, kind, icon, title, summary, points, href, ctaLabel }`. `href` is
documented as required to resolve to a real, verified channel (mailto,
`wa.me`, or an existing `socialLinks` entry) — never invented, mirroring
the honesty rule already on `ExternalProfileLinks`.

### Content (`lib/contact-content.ts`, new file)

Added `getHireChannels()` — two real channels only:

1. **Direct** — email + WhatsApp, no platform fee, governed by the
   Working Agreement (§ 8.2, cross-referenced), no built-in escrow.
2. **Via Fiverr** — escrow/buyer protection, platform-mediated disputes,
   platform fees apply, canonical site stays the source of truth.

No third channel (Contra, Toptal, Upwork) is listed — none exists for
Zakir, and § 16.5 forbids inventing one. The file's top doc-comment
carries the full D-05 disclosure above, so the reasoning travels with the
code, not just this document.

Also added `getDirectContactChannels()` — email and WhatsApp as a small
list for the `/contact` sidebar, deriving both values from
`siteConfig.email` and `socialLinks` rather than hardcoding a second copy
of the same real numbers/addresses.

### Icons (`components/icon.tsx`)

Added `Send` (email) and `Handshake` (Direct channel) to the registry.
`ShieldCheck` (buyer protection) was already registered from § 8.2.

### Components

- `components/contact/hire-channel-selector.tsx` (new) — two-card
  comparison, `sm:grid-cols-2`. Deliberately not the `PackageComparison`
  table pattern (§ 7.2): there's no shared feature matrix to align
  row-by-row, only two different relationships with their own
  trade-offs, so a card-plus-bullets shape (closer to `FeatureList`)
  fits better than forcing a table with two columns.
- `components/contact/contact-content.tsx` (new) — the `/contact` page.
  Layout mirrors `AboutContent`'s 8/4 split: Hire Channel Selector (the
  actual § 8.3 deliverable) in the wide column; a sticky sidebar with
  direct-contact links, the `AvailabilityCard` (D-08), and
  `ExternalProfileLinks` in the narrow column — so whichever channel a
  visitor picks, the fastest concrete action is one click away without
  scrolling past the comparison.

### Route (`app/[locale]/contact/page.tsx`, new)

Same `generateMetadata` / `setRequestLocale` / `SiteShell` pattern as
`/about` and `/process`.

### Sticky Mobile CTA exemption (`components/site/site-shell.tsx`)

Added `/contact` to `STICKY_CTA_EXEMPT_PATHS`, alongside Home and
`/design-system` — same reasoning as Home's exemption: the page itself
*is* the "Start a project" destination every CTA points to, so a floating
duplicate of that action would be redundant rather than helpful.

### i18n (`messages/en.json`, `messages/fa.json`)

Added `ContactPage` namespace: `eyebrow`, `title`, `description`,
`metaTitle`, `hireChannelsTitle`, `hireChannelsDescription`,
`hireChannelsNote`, `directTitle`. Real Persian copy throughout, written
directly (not translated key-by-key from English afterward).

### Build guard (`scripts/check-content-placeholders.mjs`)

Added `lib/contact-content.ts` to `CONTENT_FILES` — the script's own
comment says "Extend as `content/` grows," and a new content file that
isn't registered would let a bracketed placeholder ship silently.

## Verified

- `tsc --noEmit`: 0 errors.
- `next build` (Turbopack, font-stubbed per the established sandbox
  pattern, `app/[locale]/layout.tsx` restored and diffed byte-identical
  against the pre-stub backup immediately after): compiled successfully.
  New routes `/en/contact` and `/fa/contact` both generated (37 total
  static paths, up from 35 in Phase 8.2 — the two new locale routes).
- `node scripts/check-content-placeholders.mjs`: passed, now covering
  `lib/contact-content.ts`.
- RTL: grepped every changed/added source file for
  `text-left`/`text-right`/`pl-`/`pr-`/`ml-`/`mr-` — none found. The
  direct-contact e-mail/WhatsApp values are wrapped in the existing
  `LatinTerm` component so they stay LTR inside `fa` prose without a
  hardcoded `dir` attribute duplicating that component's job.
- i18n key parity: every `ContactPage` key added to `en.json` has a
  matching key in `fa.json` and vice versa; validated both files parse as
  JSON after the edit.
- Content truth: every Hire Channel Selector claim traces to an existing
  verified source (`socialLinks`, `siteConfig.email`, § 8.2's Working
  Agreement content) or a direct quote of § 8.3's own roadmap line — see
  `docs/content/claims-ledger.md`'s new "Hire channels (Phase 8.3)"
  section. No invented platform, fee percentage, or turnaround time
  appears anywhere in the new content.
- Not yet done, tracked as debt below rather than silently skipped: a
  real-browser manual accessibility and dark-theme/narrow-viewport visual
  pass — only the build's static HTML output was inspected in this
  sandbox.

## Files changed

- `types/content.ts` — added `HireChannelKind`, `HireChannel`.
- `components/icon.tsx` — added `Send`, `Handshake` to the registry.
- `lib/contact-content.ts` — new file: `getHireChannels()`,
  `getDirectContactChannels()`, `DirectContactChannel` type.
- `components/contact/hire-channel-selector.tsx` — new component.
- `components/contact/contact-content.tsx` — new component (the
  `/contact` page body).
- `app/[locale]/contact/page.tsx` — new route.
- `components/site/site-shell.tsx` — added `/contact` to
  `STICKY_CTA_EXEMPT_PATHS`.
- `messages/en.json`, `messages/fa.json` — added the `ContactPage`
  namespace.
- `scripts/check-content-placeholders.mjs` — added `lib/contact-content.ts`
  to `CONTENT_FILES`.
- `docs/content/claims-ledger.md` — new "Hire channels (Phase 8.3)"
  section.
- `ROAD-MAP-ARTAVEO.md` — marked § 8.3 and Phase 8 complete; updated D-05's
  Decision Register row; updated the document-status block (revision,
  project status, next step) at the top of the file.

## Database / migrations

None — file-based content, same as § 8.1/8.2. Nothing here changes shape
when `site_settings` exists at Phase 12; `getHireChannels()` and
`getDirectContactChannels()` are pure functions an eventual data-layer
swap can replace without touching the components that call them.

## Known issues / new debt

- **D-05 still open** — this phase applies the recommended default and
  documents that fact everywhere (code comment, roadmap, claims ledger);
  it does not mark the decision formally "Resolved." If the owner wants a
  different hire-channel strategy (e.g. dropping Fiverr, adding another
  platform), only `lib/contact-content.ts` and `lib/site.ts#socialLinks`
  need to change.
- **`docs/decisions.md` still doesn't exist** (pre-existing gap, tracked
  since Phase 3, carried through Phase 4.1/4.7/8.2, not fixed here either
  — consistent with those phases' choice not to introduce it
  speculatively).
- **Manual accessibility pass still pending** (carried over from Phase
  7.2/8.1/8.2): now also covering the new `/contact` route's two-column
  layout and card grid at narrow viewports.
- The Brief Builder (§ 9.1, `/start`) doesn't exist yet — until Phase 9
  ships, `/contact`'s Direct channel is email/WhatsApp only, no in-site
  form. This is expected, not new debt: § 8.3's scope is the Hire Channel
  Selector, not the Brief Builder.

## Rollback

Revert this delivery's file set. `messages/en.json` and `messages/fa.json`
would need their `ContactPage` namespace removed to fully roll back.
`scripts/check-content-placeholders.mjs` would need
`lib/contact-content.ts` removed from `CONTENT_FILES`. Every CTA that
already pointed at `/contact` (header, `IdentityCta`, sticky mobile CTA,
package comparison tables) would go back to 404ing, since no other phase
currently owns that route.

## Final status

```text
PHASE: 8.3
STATUS: COMPLETE

IMPLEMENTED:
- Hire Channel Selector (Direct vs Via Fiverr) applying D-05's
  recommended default — already the live sitewide configuration,
  not a newly invented strategy
- New /contact route ("Direct contact + hire channels" per page map
  § 15): Hire Channel Selector + direct-contact sidebar (email,
  WhatsApp, availability/response commitment, verified profile links)
- Sticky Mobile CTA exemption for /contact (page itself is the CTA
  destination)

VERIFIED:
- typecheck · content-placeholder guard (now covering
  lib/contact-content.ts) · build (37 static routes, 2 new: /en/contact,
  /fa/contact) · smoke (static-HTML inspection of real rendered output,
  both locales)
- en/fa key parity · RTL (source-level grep, LatinTerm used for
  email/WhatsApp values) · content truth check (claims ledger updated,
  no invented platform/fee/turnaround claims)
- Not yet done: real-browser accessibility/visual pass (tracked as debt)

FILES CHANGED:
- types/content.ts, components/icon.tsx, lib/contact-content.ts (new),
  components/contact/hire-channel-selector.tsx (new),
  components/contact/contact-content.tsx (new),
  app/[locale]/contact/page.tsx (new), components/site/site-shell.tsx,
  messages/en.json, messages/fa.json,
  scripts/check-content-placeholders.mjs, docs/content/claims-ledger.md

DATABASE / MIGRATIONS:
- None (file-based content, per M1's content-first approach)

KNOWN ISSUES:
- D-05 default applied, not formally "Resolved" — owner sign-off still
  open
- docs/decisions.md doesn't exist yet (pre-existing gap, noted not fixed)
- Manual accessibility pass still pending (carried over)

NEW DEBT:
- None beyond the above — Phase 8 (8.1 + 8.2 + 8.3) is now fully complete
```
