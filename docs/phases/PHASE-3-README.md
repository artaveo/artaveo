# PHASE 3 — Content Truth Pass & Home Page (Closure — checklist 3.5)

## Status: COMPLETE

## Objective

Close the eight open items of the Phase 3 closure checklist (ROAD-MAP-ARTAVEO.md § 3.5) left after the 10 September push (`4ef6f87`). Scope was deliberately narrow: this session did **not** redo Phase 3.3 (sections already exist and were not redesigned) and did not start Phase 4, 4.5 or 5.

## Scope

In scope (§ 3.5, all eight items):

1. `lib/site.ts` — remove the unverified placeholder e-mail, drop the X/Twitter link, replace root-domain GitHub/LinkedIn links with real profile URLs.
2. Voice pass (§ 16.1) on nav descriptions, `siteConfig.tagline` / `description`, Home metadata, and the Hero "View our work" CTA.
3. Delete unused fictional-project images and unused v0 placeholder assets.
4. `robots: { index: false, follow: false }` on `/design-system`.
5. Hide Insights Preview entirely while no article is published.
6. Build-time guard that fails on an unresolved `[PLACEHOLDER]`-style token in published content.
7. Bilingual content shape (`{ en, fa }`) with selector functions as the only read path into content.
8. This phase document.

Out of scope (explicitly not touched): any visual redesign, including the three known Hero/Why-Artaveo/portrait issues deferred to § 4.6; Availability, Identity Header and Sticky CTA (§ 4.5); `/en` `/fa` locale routing and translation (Phase 5); new dependencies (none were added).

## Dependencies

- D-01 (brand spelling, domain, e-mail) — spelling resolved; domain still open. See "Decisions" below for how the e-mail item was actually resolved this session.
- D-05 (hire channels) — GitHub, LinkedIn, Fiverr and WhatsApp are the confirmed real channels; no other platform profile exists.

## Implementation summary

**Content truth & voice (§ 3.1, § 16.1).** `lib/site.ts` no longer contains the unverified `hello@artaveo.studio` address or an X/Twitter link. `socialLinks` now points at the three real profiles supplied by the owner. Every occurrence of "we / our / studio" in the required locations (nav descriptions, `siteConfig.tagline`/`description`, `app/layout.tsx` default metadata, `app/page.tsx` Home metadata, and the Hero paragraph + CTA) was rewritten to first-person-singular or brand-name phrasing, per the voice rule. `app/layout.tsx` now derives its default title/description from `siteConfig` instead of duplicating the copy, so the two can't drift out of sync again.

**Real contact info (owner-supplied mid-session).** After the first pass removed the e-mail entirely (matching the checklist's literal instruction), the owner supplied a real, currently-active inbox (`artaveo.dev@gmail.com`) and a real phone/WhatsApp number. Since the roadmap's concern was specifically an *unverified* address on an *unregistered* domain — not e-mail contact in general — this is recorded as new information rather than a checklist violation: `siteConfig.email` now holds the real Gmail address (footer and mobile nav mailto links restored with the real value), and `socialLinks` gained a `WhatsApp` entry (`https://wa.me/93790685832`). This is flagged under "Decisions" below because it wasn't in the original eight-item list; D-01's *domain-backed sending address* (for Phase 9.4 automated notifications) remains open.

**Unused assets (§ 6.1).** Deleted `public/images/work-analytics.png`, `work-commerce.png`, `work-fintech.png` (AI-generated screenshots of the removed fictional projects) and the unused v0 template files `placeholder-logo.png`, `placeholder-logo.svg`, `placeholder-user.jpg`, `placeholder.jpg`, `placeholder.svg`. Confirmed unused via a repo-wide grep before deletion.

**`/design-system` robots.** Added `robots: { index: false, follow: false }` to its `metadata` export. Verified in the served HTML (`<meta name="robots" content="noindex, nofollow"/>`).

**Insights Preview empty state (§ 3.5, § 16.5).** `InsightsPreview` now calls `getPublishedInsights()` and returns `null` when it comes back empty. All three articles in `lib/home-content.ts` still have `publishedAt: null` (none are written yet), so the section currently renders nothing on `/` — confirmed by absence of "Notes from real projects" in the served HTML. The "In writing" draft badge was removed from the public component entirely, since a component fed only by published data never has a draft to show; that state is reserved for a future admin/preview view.

**Placeholder build guard (§ 3.1).** Added `scripts/check-content-placeholders.mjs`, wired into `package.json`'s `build` script (`node scripts/check-content-placeholders.mjs && next build`). It scans `lib/home-content.ts` and `lib/site.ts` for bracketed upper-snake-case tokens (`[CLIENT_NAME]`, `[PROJECT_YEAR]`, etc.) and exits non-zero if any are found. Verified both ways: build passes clean, and fails with a clear message when a placeholder is deliberately injected.

**Bilingual content shape & selectors (§ 3.2, § 3.5).** `types/content.ts` gained a `LocalizedText = { en: string; fa: string }` type, a `Locale` type and a `t(field, locale = 'en')` helper. Every prose field on `Project`, `Service`, `Capability`, `Principle`, `TechCategory.title`, `ProcessStep`, `ArticlePreview` and `DeveloperProfile` is now `LocalizedText` (or `LocalizedText[]` for arrays like `highlights`/`deliverables`/`focus`). Proper nouns that aren't translatable (technology names in `Project.technologies` and `TechCategory.items`) were deliberately left as plain `string[]`. `fa` mirrors `en` everywhere for now — Persian copy itself is Phase 5 work.

`lib/home-content.ts` now exports only selector functions (`getCapabilities`, `getFeaturedProjects`, `getServices`, `getWorkflowStages`, `getDifferentiators`, `getTechStack`, `getProcessSteps`, `getDeveloperProfile`, `getPublishedInsights`); the raw data arrays are module-private. All nine Home components were updated to call the selectors and unwrap fields with `t()` instead of importing raw arrays. Static section copy owned by each component (the `eyebrow`/`title`/`description` passed to `SectionHeader`) was deliberately left as plain English strings — that's UI microcopy for Phase 5's dictionaries, not a database-shaped content entity, and translating all of it now would have meant writing an ad hoc i18n system a phase early.

## Decisions

No item in this session was blocked by a missing owner decision. One item is recorded as new information affecting D-01:

- **D-01 (partial).** The owner supplied a real, currently-active e-mail (`artaveo.dev@gmail.com`) and phone/WhatsApp number (+93 790685832) mid-session, after the checklist's literal "remove the e-mail" instruction had already been applied. This is not the same problem the roadmap flagged (an *unverified* address on an *unregistered* domain) — a Gmail inbox doesn't depend on the `artaveo.studio` domain at all — so it was added as the real interim contact channel. **Still open:** a domain-backed sending address with SPF/DKIM/DMARC for Phase 9.4's automated notifications. Record this in `docs/decisions.md` when that file exists (§ 7 notes decisions are logged there; this repo does not yet have that file — see New Debt).

## Changed files

```
app/design-system/page.tsx          robots: noindex/nofollow added
app/layout.tsx                      metadata now derived from siteConfig; "studio" removed
app/page.tsx                        Home metadata description voice fix
components/home/about-preview.tsx   selector + t(); Portrait takes developer as a prop
components/home/capability-strip.tsx   selector + t()
components/home/featured-work.tsx   selector + t()
components/home/hero.tsx            "studio" removed from paragraph; "View my work" CTA
components/home/insights-preview.tsx   selector; returns null when nothing published; draft branch removed
components/home/process.tsx         selector + t()
components/home/services.tsx        selector + t()
components/home/tech-stack.tsx      selector + t() (category titles only; items stay plain strings)
components/home/why-artaveo.tsx     selector + t() for differentiators and workflow stages
components/site/mobile-nav.tsx      real e-mail restored as a mailto link
components/site/site-footer.tsx     real e-mail restored; "Studio" column renamed "Explore"
lib/home-content.ts                 rewritten: LocalizedText fields, private data, selector exports
lib/site.ts                         real contact links, voice fixes, WhatsApp added
package.json                        build script now runs the placeholder guard first
scripts/check-content-placeholders.mjs   new — build-time content guard
types/content.ts                    LocalizedText / Locale / t() added; entities updated

deleted:
public/images/work-analytics.png
public/images/work-commerce.png
public/images/work-fintech.png
public/placeholder-logo.png
public/placeholder-logo.svg
public/placeholder-user.jpg
public/placeholder.jpg
public/placeholder.svg
```

No files were added outside `scripts/` and `docs/phases/`. No new npm dependency was introduced.

## Database changes / migrations

None. No database exists yet (Phase 11).

## Tests

No automated test suite exists yet (Phase 20). Verification for this phase was manual, per the Definition of Done (§ 17):

- `npx tsc --noEmit -p .` — 0 errors.
- `pnpm build` (which now runs the placeholder guard first) — succeeds; guard prints `✓ Content placeholder check passed (lib/home-content.ts, lib/site.ts)`.
- Guard negative test: a `[CLIENT_NAME]`-style token was deliberately injected into `lib/home-content.ts`; `node scripts/check-content-placeholders.mjs` exited `1` with a clear message naming the file and the token; the file was restored and the guard passed again.
- Runtime smoke test against the built, served app (`pnpm start`): confirmed via `curl` that — the home page contains no `hello@artaveo.studio` or `x.com` reference; it contains the real `artaveo.dev@gmail.com`, `github.com/artaveo`, `linkedin.com/in/artaveodevelops`, `fiverr.com/sellers/zakir_naseri` and `wa.me/93790685832`; the Hero CTA reads "View my work"; `/design-system` serves `<meta name="robots" content="noindex, nofollow">`; the home page does **not** contain "Notes from real projects" (Insights Preview correctly hidden).

## Manual verification (screenshots)

Full-page screenshots taken against the production build, `localStorage`-seeded per case, no server restart between cases:

| Case | Viewport | Theme | Direction | Result |
|---|---|---|---|---|
| Desktop / Light / LTR | 1440×900 | Light | LTR (en) | no horizontal overflow, 0 console errors |
| Desktop / Dark / LTR | 1440×900 | Dark | LTR (en) | no horizontal overflow, 0 console errors |
| Desktop / Light / RTL | 1440×900 | Light | RTL (fa) | no horizontal overflow, 0 console errors |
| Tablet / Dark / LTR | 820×900 | Dark | LTR (en) | no horizontal overflow, 0 console errors |
| Mobile / Dark / LTR | 390×900 | Dark | LTR (en) | no horizontal overflow, 0 console errors; mobile nav drawer checked separately, shows real e-mail |
| Mobile / Light / RTL | 390×900 | Light | RTL (fa) | no horizontal overflow, 0 console errors |

(RTL here still shows English copy mirrored — Persian text itself is Phase 5. The check is layout direction and mirroring, not translation.)

## Known issues

- Three pre-existing visual issues are intentionally untouched (deferred to § 4.6): the Hero's illustrative code panel, the "Why Artaveo" heading, and the About portrait placeholder shape. Nothing in this session made them better or worse.
- The mailto links (footer, mobile nav, command palette) point at a personal Gmail inbox, not a domain-backed address. Fine as an interim channel; revisit once D-01's domain is registered.
- `docs/decisions.md` referenced by § 7 of the roadmap does not exist yet in this repo — see New Debt.

## New debt

- `docs/decisions.md` should be created (§ 7 says decisions "are recorded" there) to log the interim e-mail/WhatsApp decision above and any future ones; it doesn't exist yet.
- The command palette's "Email Artaveo" item and the mailto-handling branch in `components/site/command-palette.tsx` were exercised logically but not clicked through in a live keyboard-driven session in this pass.
- No automated regression test protects the placeholder guard or the `t()`/selector layer — acceptable pre-Phase-20, but worth a unit test once the test harness exists.

## Rollback

All changes are additive/content-level except seven asset deletions. To roll back: `git revert` the phase-3-closure commit(s). The deleted assets are recoverable from the commit history (`4ef6f87` and earlier) if ever needed. No migrations to reverse.

## Final status

```text
PHASE: 3.5 (Phase 3 closure checklist)
STATUS: COMPLETE
```
