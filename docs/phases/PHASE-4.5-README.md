# PHASE 4.5 — Identity components

## Status: COMPLETE — see Verification below.

## Objective

Per `ROAD-MAP-ARTAVEO.md` § 4.5: build the identity/hire building blocks (Identity Header, Availability, external profile links, Hire/Consultation CTA, Sticky Mobile CTA) that turn "an anonymous platform listing" into "a named, reachable, real person" — the core differentiator against Toptal/Contra/Fiverr identified in the benchmark research. Unblocked by D-02 (real name, portrait, timezone) and D-08 (response commitment), both resolved 11 Sep 2026.

## Scope

- **Identity Header** — name, title, portrait slot
- **Availability Chip** (compact) and **Availability Card** (full, with response commitment + last-updated)
- **Response Commitment Note** — standalone as well as embedded in the card
- **External Profile Links** — verified real profiles only (D-05)
- **Hire CTA / Consultation CTA** — two intents, one component
- **Sticky Mobile CTA**

## Data model

Rather than adding a second, parallel place for the owner's name/portrait, this phase extends the `DeveloperProfile` type `types/content.ts` already defined in Phase 3 for exactly this purpose (`components/home/about-preview.tsx` already reads `developer.name`/`developer.portrait` from it — those fields were simply empty pending D-02).

**`types/content.ts`**
- Added `AvailabilityState` (`'available' | 'limited' | 'unavailable'`) and `Availability` (`state`, `updatedAt`, `responseCommitment: LocalizedText`), with a `TODO(Phase 9)` comment noting this shape is designed to map 1:1 onto the future `site_settings` table.
- `DeveloperProfile` gained `timezone?: string` and `availability?: Availability`.

**`lib/home-content.ts`**
- `developerData` now carries the real values: `name: 'Zakir Naseri'`, `portrait: '/Profile-pic.jpg'`, `timezone: 'UTC'`, and `availability: { state: 'available', updatedAt: '2026-09-11', responseCommitment: … }`. All read through the existing `getDeveloperProfile()` selector — no new selector added.

No `lib/site.ts` changes were needed: `socialLinks` (D-05) and `siteConfig.tagline` (used as the Identity Header's title) already existed from Phase 3.

## Implementation

**`components/ui/identity.tsx`** — all six pieces, each optional-data-safe:

- `IdentityHeader` — portrait (falls back to a plain initial when `portrait` is missing — not invented, not a stock photo), name, title, timezone. `size="default" | "compact"` for hero-scale vs. inline (e.g. next to a CTA) placements.
- `AvailabilityChip` — small pill (dot + label), reads `availability.state` only.
- `AvailabilityCard` — full card: state, `ResponseCommitmentNote`, and a formatted "Updated <date>" line (`Intl.DateTimeFormat`, `en`/`fa` locale-aware, real math on `updatedAt` rather than a hardcoded string).
- `ResponseCommitmentNote` — exported standalone so it can sit next to a contact form on its own, not only inside the card.
- `ExternalProfileLinks` — renders `lib/site.ts#socialLinks` through the existing `Link` primitive (`variant="standalone"`, which already adds the external-arrow indicator) — no new brand icons were invented for GitHub/LinkedIn/Fiverr/WhatsApp, since this `lucide-react` version ships no accurate brand marks and a wrong icon is worse than no icon.
- `IdentityCta` — one component, `variant: 'hire' | 'consultation'`, mapped to the existing `Button` (`default` / `outline`). Both currently point at `/contact`; the Discovery Sprint / consultation-booking destination itself is out of scope here (§ 7, § 20).
- `StickyMobileCta` — fixed bottom bar, `md:hidden`, `env(safe-area-inset-bottom)` padding, combines `AvailabilityChip` + `IdentityCta`. Built and demoed but **not wired into the root layout** — § 5.4 (Phase 5) decides which content routes it appears on, consistent with how `EmptyState` was built-but-unwired in § 4.4 pending its first real call site.

**`components/showcase/identity-section.tsx`** + `app/design-system/page.tsx`
- New `16 — Identity` section: Identity Header with/without portrait, all three availability states as both chip and card, the standalone response-commitment note, the real external links, both CTA variants, and the sticky CTA demoed inside a small contained frame (`className="static"` override) so it doesn't cover the rest of the design-system page.

## RTL / keyboard / theme review

- No physical-direction utilities (`text-left/right`, `pl-/pr-/ml-/mr-`, `left-/right-`) in any new file.
- `IdentityCta` and the CTA half of `StickyMobileCta` are real `Button`s with `render={<NextLink … />}`, so native focus/activation and the project's existing focus-ring styling apply unchanged. `ExternalProfileLinks` reuses `Link`, same reasoning.
- Only semantic tokens used: `bg-card`, `border-border`, `text-muted-foreground`, and the `-text` tone pairs `success-text`/`warning-text` for the two active availability states, `text-muted-foreground` (not `destructive-text`) for `unavailable` — "not currently taking work" is a neutral state, not an error, so it deliberately doesn't borrow the red-orange warning hue.

## Verification

- `npx tsc --noEmit` — clean.
- `next build` — verified with the same temporary `next/font/google` stub technique used in §4.1–§4.4 (this sandbox can't reach `fonts.googleapis.com`; stub reverted immediately after, confirmed byte-identical to the pre-session file via `diff`). Full production build compiled successfully, including the new `/design-system` § 16 section.
- Not done here: manual screen-reader pass, visual regression screenshots in both themes/directions, and real-device check of `env(safe-area-inset-bottom)` on the sticky bar — same standing caveat every § 4.1–§ 4.4 sub-phase carries for this sandbox.

## Files changed / added

Added: `components/ui/identity.tsx`, `components/showcase/identity-section.tsx`, `public/Profile-pic.jpg`, `docs/phases/PHASE-4.5-README.md`.
Changed: `types/content.ts` (`Availability`/`AvailabilityState` types, `DeveloperProfile` extended), `lib/home-content.ts` (`developerData` filled in with D-02/D-08 values), `app/design-system/page.tsx` (§ 16 wired in), `ROAD-MAP-ARTAVEO.md` (D-02/D-08 marked resolved, § 4.5 marked complete), `.gitignore` (`tsconfig.tsbuildinfo`).

## Debt / open items for § 4.6+

- `StickyMobileCta` has no dismiss/scroll-aware hide behavior yet — it's a static bar for now; whether it should hide on scroll-down or ever be dismissible is a § 5.4 decision, not a 4.5 one.
- The `availability` object is still hand-edited in `lib/home-content.ts` — the `TODO(Phase 9)` comment on the `Availability` type flags it for the `site_settings` table migration.
- No further owner decision needed for this sub-phase's scope; D-02 and D-08 are the two this phase depended on and both are resolved.
