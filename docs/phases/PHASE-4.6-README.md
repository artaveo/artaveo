# PHASE 4.6 — Visual pass on Shell & Home

## Status: COMPLETE — see Verification below.

## Objective

Per `ROAD-MAP-ARTAVEO.md` § 4.6: apply the D-12-approved direction and the finished 4.3–4.5 primitives to the shell (header, mobile nav, footer, command palette) and every Home section, redesign "Tech Stack" into the Proof-Linked Expertise Matrix layout, and fix the three known Home bugs. Unblocked by D-12 (owner sign-off, resolved 12 Sep 2026).

## Scope

- Header, mobile navigation, footer, command palette — apply the design system consistently (no more raw markup duplicating a primitive that already exists)
- Home "Tech Stack" → Expertise-matrix layout (data wiring stays Phase 7–8, per roadmap)
- Fix: Hero code-panel line overflow around 1024px, "Why Artaveo" heading line break, portrait-placeholder head shape
- No content changes beyond Phase 3's rules

## Implementation

**Shell — replacing ad hoc markup with existing primitives, not new design:**
- `components/site/site-header.tsx` — raw `<kbd>⌘K</kbd>` replaced with the `Kbd` primitive (`components/ui/actions.tsx`, § 4.3). Active nav link now gets a small brand-coloured underline (`bg-brand`) instead of only a text-colour change, matching the tab-style active indicator later added to mobile nav.
- `components/site/mobile-nav.tsx` — added the same active-route detection the desktop header already had (it had none before); active item gets a muted background plus a `start-0` brand rail (logical property, RTL-safe).
- `components/site/site-footer.tsx` — the hand-rolled social-link list and the email link (each duplicating what `Link`/`ExternalProfileLinks` already do) now call `ExternalProfileLinks` (§ 4.5) and the `Link` primitive (`variant="standalone"`, § 4.3) instead. This is the first real call site outside `/design-system` for the Phase 4.5 identity components.
- `components/site/command-palette.tsx` — raw `<kbd>ESC</kbd>` replaced with `Kbd`.

**Home — Expertise matrix (`components/home/tech-stack.tsx`):**
- Replaced the divided-card grid with a matrix of category rows (icon + label) and skill chips (`Badge variant="outline"`), which reads as a denser, more scannable "matrix of what's used" than the old plain list.
- The evidence-count/proof-linking itself (Contra B-03: "a skill is shown only if linked to ≥ 1 project, service or article") is explicitly **not** built here — that requires the join-table data arriving in Phase 7–8. Doc comment in the file states this so nobody mistakes the chip layout for the finished feature. The section description was reworded to a currently-true statement ("used in the real work further down this page") rather than invent a per-skill count.

**Home bug fixes:**
- **Hero code-panel overflow (~1024px, `components/home/hero.tsx`):** the `lg` breakpoint's font size was still 13px/leading-6 while the visual column is at its narrowest (5/12 of a 12-col grid at exactly 1024px), which the roadmap flagged as overflowing. Dropped to `lg:text-[11px] lg:leading-5` (still stepping back up to `text-sm`/`leading-7` at `xl` once the column has more room), and split the one genuinely long line (`scope: ['architecture', 'interface', …]`) across two shorter lines matching the style already used for the `stack` line just below it, so no single line depends on being exactly at the edge of fitting.
- **"Why Artaveo" heading line break (`components/home/why-artaveo.tsx`):** the title used a manual `<br className="hidden sm:inline" />` combined with the `text-balance` utility on the `h2`. `<br>` forces a break regardless of `display`, so the forced split fought with `text-balance`'s own line-balancing and could produce an extra, unbalanced wrap at some widths. Removed the manual break and kept the same two-clause visual treatment (second clause dimmed) as a single `text-balance`-wrapped string — the same pattern Hero's own `h1` already uses successfully.
- **Portrait-placeholder head shape (`components/home/about-preview.tsx`):** the fallback figure positioned the "head" with `mt-[22%]` and pushed the "shoulders" to the bottom with `mb-auto`, so the gap between the two pieces scaled with the container's aspect ratio and could look disconnected. Changed to a centred `flex-col` group with a small fixed `gap-1.5`, so head and shoulders always read as one figure regardless of viewport. (This fallback no longer renders on the live Home page now that D-02's real portrait exists — `developer.portrait` is set — but it's kept correct since `DeveloperProfile.portrait` is optional and other content could still hit this path.)

## RTL / keyboard / theme review

- New `start-0` (mobile nav rail) and existing `inset-x-3`/`-bottom-[1px]` (header underline, both symmetric, no physical side) — no `left-`/`right-`/`ml-`/`mr-`/`pl-`/`pr-` introduced. The Hero code panel's pre-existing `text-left` is unchanged and intentional (`dir="ltr"`-locked code content, per the file's own comment — code always reads left-to-right even in the `fa` layout).
- `Kbd` swaps keep the exact same visual result as the raw markup they replace, just centralised in one primitive instead of duplicated in two files.
- Every new/changed element uses semantic tokens only (`bg-brand`, `border-border`, `bg-muted`, `text-muted-foreground`) — no raw colours.

## Verification

- `npx tsc --noEmit` — clean.
- `next build` — verified with the same temporary `next/font/google` stub used in §4.1–§4.5 (sandbox can't reach `fonts.googleapis.com`; reverted immediately after, confirmed byte-identical via `diff`). Full production build compiled successfully.
- Not done here: manual screen-reader pass, visual regression screenshots at the exact ~1024px range the Hero fix targets, and real-device RTL check — same standing caveat every §4.1–§4.5 sub-phase carries for this sandbox (no reachable browser). Recommend a manual look at the Hero panel between 1024–1279px specifically, since that fix was reasoned from CSS/typography math, not observed directly.

## Files changed / added

Added: `docs/phases/PHASE-4.6-README.md`.
Changed: `components/site/site-header.tsx`, `components/site/mobile-nav.tsx`, `components/site/site-footer.tsx`, `components/site/command-palette.tsx`, `components/home/tech-stack.tsx`, `components/home/hero.tsx`, `components/home/why-artaveo.tsx`, `components/home/about-preview.tsx`, `ROAD-MAP-ARTAVEO.md` (D-12 marked resolved, § 4.6 marked complete).

## Debt / open items for § 4.7

- The three-file duplication of the raw `<ArtaveoMark /> + "ARTAVEO" wordmark` markup (header, mobile nav, footer) was left as-is — not a listed 4.6 bug, and extracting it into a shared component is a mechanical refactor better done as its own small pass rather than folded into this one.
- Expertise-matrix evidence-linking (skill → project/service/article) is intentionally unbuilt — flagged in `tech-stack.tsx` for Phase 7–8.
- No further owner decision needed for this sub-phase; D-12 was the one it depended on and is now resolved.
