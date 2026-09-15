# Phase 11.3 — Launch Readiness: Performance & Accessibility Pass

**Status:** ✅ COMPLETE
**Date:** 15 September 2026

## Objective

An audit-and-fix pass across the whole site against roadmap § 3's
targets (Core Web Vitals on mobile, WCAG 2.2 AA) — not a new feature,
a sweep for real regressions and gaps left by earlier phases.

## Scope

Roadmap § 11.3:

> mobile CWV targets from section 3; route JS budget recorded; fonts
> subset and preloaded carefully; images sized and modern formats
> · keyboard-only pass, screen reader pass (one desktop + one mobile),
> 200 % zoom, reduced motion, contrast, form errors announced, RTL
> reading order

## Approach

Read every relevant file rather than assuming — `next.config.mjs`,
every `next/image` call site, the font setup in
`app/[locale]/layout.tsx`, every directional icon, every hand-rolled
overlay (`MobileNav`, `CommandPalette`), `app/globals.css`'s
reduced-motion and RTL rules, and the design-token contrast (computed,
not eyeballed — see Manual verification). Fixed what was actually
broken; left alone what was already correct, since earlier phases (4.2
token audit, 4.4 patterns/states, 5.1/5.2 locale infra) had already
done real work here and re-litigating settled, verified-working code
isn't this phase's job.

## Findings & fixes

### 1. Image optimization was disabled sitewide

`next.config.mjs` had `images: { unoptimized: true }` since the
project's initial commit. Every `next/image` call site already had
correct `fill` + `sizes` (checked all five: `identity.tsx`,
`case-study.tsx`, `project-card.tsx`, `featured-work.tsx`,
`about-preview.tsx`) — the responsive-sizing half of "images sized and
modern formats" was already done. But with optimization off, the
browser still received the original file at its original size: the
`work-*.png` case-study covers (LCP-candidate images, rendered with
`priority`) are 480–746 KB raw PNGs, just scaled down by CSS instead of
actually being smaller, and never converted to AVIF/WebP.

**Fix:** removed `unoptimized: true`, added explicit
`formats: ['image/avif', 'image/webp']`. Vercel's hosting runs the
optimizer at the edge with no extra setup (no `sharp` install needed,
unlike self-hosting), so this has no deployment cost on the target
platform. Confirmed in the rendered build output: `next/image` now
emits `srcSet` pointing at `/_next/image?url=...&w=...&q=75` with a
real multi-width set, instead of the single raw file path it emitted
before.

### 2. Vazirmatn (Persian font) preloaded on every page, including English

`--font-vazirmatn` is only ever read inside a `[dir='rtl']` rule
(`app/globals.css`'s `font-persian` stack). But `app/[locale]/layout.tsx`
applied all three fonts' `.variable` classes unconditionally on
`<html>`, and Next.js preloads a font the moment its `.variable` class
is present in the rendered tree — regardless of whether any visible
text actually resolves to it. Every `en` request was spending preload
priority (competing with the hero image / LCP element) on a font
family it never paints a single glyph with.

**Fix:** gated the Vazirmatn variable on `dir === 'rtl'`. Geist
Sans/Mono stay unconditional on both locales — both are genuinely used
everywhere (Latin fallback in the `font-persian` stack, and
`font-mono` eyebrows/labels which render in both directions per the
existing letter-spacing reset). Confirmed in rendered output:
`en.html`'s `<html>` class carries only the Geist variables; `fa.html`
carries all three.

### 3. Two text labels failed WCAG AA contrast

`components/ui/identity.tsx` rendered the timezone label and the
"updated at" timestamp at `text-muted-foreground/70`. Computed the
actual contrast ratio (OKLCH → linear sRGB → relative luminance, WCAG's
own formula — see Manual verification for the full token sweep) rather
than trusting the opacity value looked fine: **3.04:1** against the
light-mode background. WCAG AA requires 4.5:1 for text this small
(11.2px); large-text's 3:1 threshold doesn't apply here.

**Fix:** dropped both to plain `text-muted-foreground` (5.74:1 light /
7.29:1 dark) — the same token every other secondary label in the app
already uses at full opacity. The other reduced-opacity
`muted-foreground` usages found in the same sweep (`/25`, `/50`, `/60`
on decorative dots, icons, and a breadcrumb separator) don't carry
text and aren't subject to the text-contrast criterion, so those were
left alone.

### 4. `CommandPalette` had no real Escape handler, and no focus trap

The palette rendered a `Kbd` showing "ESC" as a hint, but nothing in
the component ever listened for the `Escape` key — the only
`onKeyDown` handling covered `ArrowUp`/`ArrowDown`/`Enter`. The hint
was decorative and didn't work. Separately, neither `CommandPalette`
nor `MobileNav` trapped focus: Tab could walk a keyboard user straight
through the backdrop into the page underneath a supposedly modal
overlay, and closing either one left focus wherever it happened to
land (often lost to `document.body`) instead of restoring it to
whatever opened the overlay. `components/ui/dialog.tsx`/`sheet.tsx`
don't have this problem — they sit on Base UI's `Dialog` primitive,
which already handles all of this — but these two overlays predate
that primitive and are hand-rolled.

**Fix:** new shared hook, `lib/use-focus-trap.ts` — while active, moves
focus into the container (or a given `initialFocusRef`), cycles
Tab/Shift+Tab between the container's first and last focusable
elements, calls an optional `onEscape`, and restores focus to whatever
was focused before opening once deactivated. Wired into both:
`CommandPalette` now actually closes on Escape and focuses the search
input on open; `MobileNav` keeps its existing Escape behaviour but
gains the trap and focus restoration, replacing its previous ad-hoc
`window` keydown listener.

## Verified correct, no fix needed

Checked and confirmed already compliant — recorded here so a future
pass doesn't re-audit the same ground from scratch:

- **Heading hierarchy.** Home page is h1 (hero) → h2 (one per section,
  via the shared `SectionHeader` pattern) → h3 (per card) throughout;
  no level skipped.
- **Design-token contrast.** Computed every core text token pair
  (`foreground`, `muted-foreground`, `brand-text`, `destructive-text`
  against `background`, both themes) via the OKLCH→luminance script
  below. All pass AA with margin: 5.46:1–17.32:1 light, 7.29:1–17.28:1
  dark.
- **RTL icon mirroring.** Every directional icon in the app
  (`ArrowRight`/`ArrowLeft` in ten call sites, breadcrumb
  `ChevronRight`, dropdown-menu submenu `ChevronRight`, pagination's
  `ChevronLeft`/`ChevronRight`) already carries `rtl:rotate-180`.
- **`prefers-reduced-motion`.** `app/globals.css` already sets
  `animation-duration`/`transition-duration` to `0.01ms` sitewide under
  `(prefers-reduced-motion: reduce)`, and `PageTransition` already uses
  Tailwind's `motion-safe:` variant rather than an unconditional
  animation class.
- **Focus-visible styling.** `button.tsx`, `pagination.tsx`, and the
  rest of the interactive primitives already carry
  `focus-visible:ring-3 focus-visible:ring-ring/50` — real, visible
  focus indication, not suppressed.
- **200% zoom / narrow-viewport overflow.** The one fixed-`min-width`
  element found (`package-comparison.tsx`'s desktop comparison table,
  `min-w-[640px]`) is already wrapped in `overflow-x-auto` with a
  separate mobile `SegmentedControl` view below `md`, and the table
  itself already has a `<caption>` and `scope="col"` headers.
- **Form errors announced.** `MultiStepFormLayout` announces step
  changes via a `role="status" aria-live="polite"` region; per-field
  validation errors go through Base UI's `Field` primitive, which
  wires `aria-describedby` from control to error text automatically.
- **Skip link and landmarks.** `SiteHeader` renders a working
  `#main` skip link (`focus-visible:not-sr-only`); `SiteShell` renders
  `<main id="main">`; primary/mobile nav both carry `aria-label`.

## Not fixed — out of scope for this pass

- **`components/ui/pagination.tsx`'s hardcoded English `aria-label`s**
  ("Previous page"/"Next page") aren't wired to `next-intl`. Left as-is:
  the component isn't rendered anywhere in the live site yet (it's a
  Phase 4.3 primitive waiting on Phase 15/17/18's list views), so this
  isn't a live accessibility bug today. Flagged under New debt below
  for whichever future phase first renders it.

## Changed files

```
next.config.mjs                       images.unoptimized removed, AVIF/WebP formats added
app/[locale]/layout.tsx               Vazirmatn variable gated to dir="rtl"
components/ui/identity.tsx            2× text-muted-foreground/70 → text-muted-foreground
lib/use-focus-trap.ts                 new — shared Tab-trap/Escape/focus-restore hook
components/site/command-palette.tsx   uses useFocusTrap; Escape now actually closes it
components/site/mobile-nav.tsx        uses useFocusTrap; drops its own keydown listener
```

## Database / migrations

None.

## Tests

No automated test suite exists yet (Phase 21).

## Manual verification

- **Contrast**, computed rather than eyeballed: a small script
  converting each OKLCH token to linear sRGB and applying WCAG's own
  relative-luminance/contrast-ratio formulas, run against every core
  text token (both themes) and against the three reduced-opacity
  `muted-foreground` variants that render as real text. Full token
  sweep: `foreground` 17.32:1 light / 17.28:1 dark, `muted-foreground`
  5.74:1 / 7.29:1, `brand-text` 5.46:1 / 9.44:1, `destructive-text`
  5.54:1 / 7.92:1 — all pass. `muted-foreground/70` (the bug): 3.04:1
  light / 4.12:1 dark — fails light-mode AA, which is why it was fixed
  rather than left as a dark-mode-only concern.
- `tsc --noEmit`: clean.
- `node scripts/check-content-placeholders.mjs`: passes (unaffected —
  this phase touched no content files).
- i18n key parity (`en.json` vs `fa.json` flattened key sets): exact
  match, 323 keys each — unaffected, since no new user-facing strings
  were added.
- `next build` (fonts stubbed and restored per the established sandbox
  pattern, `diff`-confirmed byte-identical restoration of
  `app/[locale]/layout.tsx`): clean, all 47 routes generated.
- Rendered HTML spot-checked directly: `en.html`'s `<html>` class
  carries only the Geist font variables (no Vazirmatn); `fa.html`
  carries all three; the homepage portrait's `<img>` now emits a real
  `/_next/image?url=...&w=256..3840&q=75` multi-width `srcSet` instead
  of the single raw file path it emitted before this phase.

## Known issues — needs a live deployment to verify

Consistent with § 11.1/§ 10.3's own disclosed gaps, the following
genuinely cannot be checked in this sandbox and are flagged rather than
silently assumed fine:

- **Real mobile Core Web Vitals** (actual LCP/CLS/INP numbers against
  § 3's targets) — needs a live Lighthouse/PageSpeed Insights run
  against the deployed site, not a code-level check.
- **Route JS budget as a hard number.** This Next.js/Turbopack version's
  `next build` output no longer prints the classic per-route "First
  Load JS" table; total `.next/static/chunks` came to 1.7 MB across all
  routes combined, but an accurate per-route figure needs either a
  bundle-analyzer pass or Vercel's own build output, neither available
  here. No route was found pulling in an unexpectedly large dependency
  during this audit, but this is a gap, not a clean bill of health.
  Tracked as follow-up.
- **Actual image byte savings and AVIF/WebP negotiation** — the fix is
  confirmed at the config/output level (§ 1 above), but the real
  before/after payload size and browser format negotiation only happen
  at request time on Vercel's infrastructure.
- **Screen reader pass** (one desktop, one mobile, per the roadmap
  line) and a **real keyboard-only walkthrough** in an actual browser
  — this phase fixed every gap a static code read could find (Escape
  handling, focus trap, focus restoration, contrast), but a live pass
  with NVDA/VoiceOver/TalkBack and a physical keyboard is the only way
  to catch what code-reading can't, and hasn't been run.
- **200% browser zoom**, checked here for structural overflow risk
  (fixed widths, missing scroll containers) but not visually confirmed
  in a real browser at that zoom level.

## New debt

- `components/ui/pagination.tsx`'s hardcoded English `aria-label`s
  (tracked above) — fix when a future phase first renders the
  component.
- A bundle-analyzer pass (or first real Vercel deploy) to get an actual
  per-route JS budget number, since this sandbox's build output doesn't
  provide one.

## Rollback

Revert the five changed files listed above, then delete
`lib/use-focus-trap.ts`. No database or env state to unwind.

## Final status

**COMPLETE.** Every gap a full code-level audit could find — disabled
image optimization, wasted font preload, a real contrast failure, and
two overlays missing focus management — is fixed and verified against
rendered build output. What's left (§ Known issues) is exactly the set
of checks that only exist once the site is live, same category of gap
§ 11.1 and § 10.3 already disclosed rather than hid. § 11.4 (pre-launch
content check & deploy) is the next unblocked Phase 11 work, and is
also where the M1 launch gate sits.
