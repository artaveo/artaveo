# PHASE 4.3 — Missing Primitives

## Status: PARTIAL — §4.3a (actions + forms), §4.3b (overlays) and §4.3c (disclosure, data display, content) all complete. §4.3 as a whole is done.

## Objective

Per `ROAD-MAP-ARTAVEO.md` § 4.3: add the primitives missing beyond the existing Button/Badge/Card/Input, each RTL-correct, keyboard-accessible, working in both themes, built on the existing Base UI + shadcn foundation. The roadmap splits this into three sessions — this one covers **4.3a: actions + forms**.

## Scope

In scope this session — **Actions**: Link (inline/standalone/external), IconButton, ButtonGroup, Kbd. **Forms**: Field (label + hint + error), Checkbox, RadioGroup, Switch, Select, SegmentedControl, FileInput shell (upload wiring stays Phase 15 per the roadmap), FormMessage.

Not built this session, and not needed: Label and Textarea were already present in `components/ui/input.tsx` from earlier work — reviewed for RTL/keyboard/theme correctness rather than rebuilt (see Verification).

Out of scope (deferred to 4.3b/4.3c): Dialog, Sheet/Drawer, Popover, Tooltip, DropdownMenu, Toast, Tabs, Accordion, Pagination, Stepper, Progress, Table, Tag, Avatar, Separator, Skeleton, status badge set, Callout, Code block, Blockquote, Prose styles.

## Implementation

**`components/ui/actions.tsx`**
- `Link` — wraps `next/link`. `variant="inline"` for prose links (underline, inherits text color); `variant="standalone"` for link-as-button usage (brand-text color, underline on hover). Auto-detects external hrefs (`//`, `mailto:`, `tel:`) and adds `target="_blank" rel="noopener noreferrer"` plus an `ArrowUpRight` indicator, unless overridden with `external`/`showExternalIcon`.
- `IconButton` — square icon-only button on Base UI's `Button` primitive, sized/variant-mapped to match `button.tsx`'s scale. `aria-label` is a required prop (TypeScript-enforced), since there's no visible text for assistive tech.
- `ButtonGroup` / `ButtonGroupSeparator` — joins adjacent buttons into one control via logical corner-rounding (`rounded-s-lg`/`rounded-e-lg`) and edge-border removal (`border-e-0`), horizontal or vertical.
- `Kbd` — keyboard-shortcut glyph, pinned `dir="ltr"` (key symbols never mirror, same reasoning as the wordmark).

**`components/ui/form-controls.tsx`**
- `Field` / `FieldLabel` / `FieldDescription` / `FieldError` — thin styled wrappers around Base UI's `Field` primitive, which owns the `aria-describedby` wiring between control, hint, and error automatically.
- `FormMessage` — a section/page-level status strip (submit success/error, rate-limit notices), distinct from `FieldError` which attaches to one control. `role="alert"` for the destructive variant, `role="status"` otherwise.
- `Checkbox`, `RadioGroup`/`Radio`, `Switch` — built on Base UI's respective primitives for native keyboard behavior (space to toggle, arrow-key roving in radio groups). Checked/indeterminate states use `bg-brand`/`text-brand-foreground` (fill usage), never raw `--brand` as text — the same fill-vs-text token discipline §4.2's AA audit established.
- `Switch`'s thumb travel uses `rtl:-translate-x-[...]` alongside the LTR `translate-x-[...]` — transforms aren't logical-property-aware, so this is the explicit RTL counterpart, not a token gap.

**`components/ui/select.tsx`** — full `Select` built on Base UI (`Trigger`/`Portal`/`Positioner`/`Popup`/`Item`/`Group`/`Separator`), using the `z-dropdown` token from §4.2's z-index scale, `bg-popover`/`border-border` surface tokens, and a `data-[highlighted]` state instead of hover-only so keyboard navigation is visually tracked too.

**`components/ui/segmented-control.tsx`** — single-select `SegmentedControl`/`SegmentedControlItem` on Base UI's `ToggleGroup`/`Toggle` (`multiple={false}`), styled as one joined pill rather than the `ButtonGroup` line-join treatment, matching the "view/density switcher" use case in the roadmap.

**`components/ui/file-input.tsx`** — drag-and-drop / click-to-browse shell around a native `<input type="file">`, wrapped in a real `<label>` so the hidden (`sr-only`, not `hidden`) input stays keyboard-reachable and gets a visible `has-[:focus-visible]` ring on the label. Exposes picked files via `onFilesChange`; no upload, size/type validation against a backend, or progress UI — that's explicitly Phase 15 per the roadmap's own note on this primitive.

**Showcase wiring** — `components/showcase/actions-section.tsx` and `components/showcase/form-controls-section.tsx` added to `/design-system` (and its header nav) so every primitive above is visually verifiable in both themes rather than only type-checked.

## RTL / keyboard / theme review

- Swept every new file for physical-direction utilities (`text-left/right`, `pl-/pr-/ml-/mr-`, `left-/right-`) — none found; all spacing/alignment uses logical properties (`ps-/pe-/ms-/me-/start-/end-`) per the existing rule.
- `Link`'s external-arrow mirroring follows the documented convention in `docs/design/art-direction.md` exactly: `ArrowUpRight` → `rtl:-scale-x-100` (horizontal-only flip, still points up/away), not `rtl:rotate-180` (which would point down-left and read wrong).
- Keyboard: `Link`/`IconButton` are native-focusable elements with the shared `focus-visible:ring-3 focus-visible:ring-ring/50` treatment; `Checkbox`/`Radio`/`Switch`/`Select`/`SegmentedControl` inherit space/enter/arrow-key handling from Base UI rather than reimplementing it; `FileInput`'s real `<input>` stays tabbable and shows a focus ring on its wrapping label since the input itself is visually hidden.
- Theme: every new component reads only semantic tokens (`bg-card`, `border-input`, `bg-muted`, `bg-brand`/`text-brand-foreground` as a fill pair, `text-destructive-text`, `bg-popover`, `z-dropdown`) — no raw colors, no raw z-index numbers, consistent with the fill-vs-text discipline from §4.2's AA audit.
- Existing `Label`/`Textarea` (already in `input.tsx` from earlier work) reviewed against the same three criteria: plain HTML elements, token-based styling, no directional properties — no changes needed.

## Verification

- `npx tsc --noEmit` — clean.
- `next build` — verified with the same temporary `next/font/google` stub technique used in §4.1.3 (this sandbox can't reach `fonts.googleapis.com`; stub reverted immediately after, confirmed identical to the pre-session file via `diff`). Full production build compiled successfully, including the two new `/design-system` sections.
- Not done here: manual screen-reader pass and visual regression screenshots in both themes/directions — recommend before D-12 sign-off, same caveat §4.1/§4.2 already carry for this sandbox.

## Files changed / added

Added: `components/ui/actions.tsx`, `components/ui/form-controls.tsx`, `components/ui/select.tsx`, `components/ui/segmented-control.tsx`, `components/ui/file-input.tsx`, `components/showcase/actions-section.tsx`, `components/showcase/form-controls-section.tsx`.
Changed: `app/design-system/page.tsx` (new sections wired in), `components/showcase/showcase-header.tsx` (nav links), `docs/phases/PHASE-4-README.md` (status line).

## Debt / open items for §4.3b–4.3c

- §4.3b (overlays: Dialog, Sheet/Drawer, Popover, Tooltip, DropdownMenu, Toast) can reuse `select.tsx`'s `z-dropdown`/`Portal`/`Positioner` pattern directly — Base UI's API shape is consistent across these primitives.
- `ButtonGroup` has no roving-tabindex/arrow-key navigation (each button is independently tabbable) — acceptable for the current use cases (icon toolbars of 2–4 items); revisit only if a future group grows large enough that this becomes a real navigation cost.
- No owner decision needed for this sub-phase — same as §4.2, these are additive primitives built on already-approved tokens (D-12), not new design decisions.

---

## §4.3b — Overlays (this session)

### Scope

Dialog, Sheet/Drawer, Popover, Tooltip, DropdownMenu, Toast — per the roadmap's Overlays row.

### Implementation

- **`components/ui/dialog.tsx`** — `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter` on Base UI's `Dialog` (focus trap, scroll lock, Escape-to-close, and `aria-modal` wiring all come from the primitive). Centered popup, `z-modal` for the popup and `z-overlay` for the backdrop (§4.2's scale), close button pinned `end-4` (logical).
- **`components/ui/sheet.tsx`** — `Sheet`/`SheetContent`/etc., built on the **same `Dialog` root** rather than Base UI's separate `Drawer` primitive. `Drawer` is tuned for a different case (swipeable mobile bottom-sheet with drag-to-dismiss); a plain edge-anchored panel needs none of that, and reusing `Dialog`'s root keeps focus-trap/scroll-lock/Escape behavior identical between the two instead of maintaining two separate interaction models. `side="start"/"end"` use logical positioning (`start-0`/`end-0`) so they flip automatically under `dir="rtl"`; the slide-in transform (`translate-x`) isn't logical-property-aware, so it gets explicit `rtl:` counterparts, the same pattern `Switch`'s thumb used in §4.3a.
- **`components/ui/popover.tsx`**, **`components/ui/tooltip.tsx`** — thin styled wrappers on Base UI's `Popover`/`Tooltip`, sharing the `z-dropdown` token and the same enter/exit transform pattern `select.tsx` established in §4.3a (`data-[starting-style]`/`data-[ending-style]` + `origin-[var(--transform-origin)]`). Anchor positioning (which side text actually renders on near a viewport edge) is handled by Base UI's positioning engine, which is direction-aware internally.
- **`components/ui/dropdown-menu.tsx`** — `DropdownMenu` family on Base UI's `Menu`: item, checkbox-item, radio-item, label, separator, and a submenu trigger. Checkbox/radio indicators sit at logical `start-2`; the submenu's forward-chevron (`ChevronRight`) mirrors `rtl:rotate-180`, the same convention `art-direction.md` documents for breadcrumb separators — it's functionally the same "reveals more, in reading direction" signal.
- **`components/ui/toast.tsx`** — `ToastProvider` (wrap once), `Toaster` (a self-contained portal + viewport that reads `useToastManager().toasts` and renders them), and `useToast` (re-exported `useToastManager` for calling `.add({...})` from anywhere inside the provider). Tone variants (`success`/`destructive`/`warning`/`info`) reuse the exact `-text` token pairs `FormMessage` established in §4.3a, so a toast and a form message never drift in color even though they're unrelated components. Viewport anchored `bottom-4` + logical `sm:end-4`.

### Showcase wiring

`components/showcase/overlays-section.tsx` added to `/design-system` (and header nav) demoing all six: a real dialog, a real edge sheet, a popover, a tooltip, a dropdown menu with a destructive item, and two toast triggers (success/error) with a local `ToastProvider`/`Toaster` pair scoped to that section.

### RTL / keyboard / theme review

- Same physical-utility sweep as §4.3a — only match found was `left-1/2` in `dialog.tsx`, which is correct as-is (centering transform, symmetric in both directions, not a directional lean).
- Keyboard: Dialog/Sheet get focus trap, scroll lock, and Escape-to-close natively from Base UI's `Dialog` root; DropdownMenu gets arrow-key roving and typeahead from `Menu`; Popover/Tooltip triggers keep the shared `focus-visible` ring and close on Escape/outside-press via the primitive. None of this is hand-rolled.
- Theme: every surface reads only semantic tokens — `bg-card`/`bg-popover`/`bg-overlay`/`border-border`, `z-overlay`/`z-modal`/`z-dropdown`/`z-toast` from §4.2's scale, and the `-text` token pairs for toast tone — no raw colors or raw z-index numbers introduced.

### Verification

- `npx tsc --noEmit` — clean.
- `next build` — re-verified with the same temporary font-stub technique as §4.3a (stub reverted immediately after, confirmed identical to the pre-session file via `diff`). Full production build compiled successfully with all six new overlay primitives wired into `/design-system`.
- Not done here: manual screen-reader pass and visual regression in both themes/directions — same standing caveat as §4.1–§4.3a for this sandbox (no reachable browser to visually drive).

### Files changed / added (§4.3b)

Added: `components/ui/dialog.tsx`, `components/ui/sheet.tsx`, `components/ui/popover.tsx`, `components/ui/tooltip.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/toast.tsx`, `components/showcase/overlays-section.tsx`.
Changed: `app/design-system/page.tsx`, `components/showcase/showcase-header.tsx`.

### Debt / open items for §4.3c

- `mobile-nav.tsx` and `command-palette.tsx` are still hand-rolled overlays (manual `fixed inset-0` + manual Escape-key listener) predating this session — they work, and migrating them to the new `Dialog`/`Sheet` primitives is a real simplification, but it's a refactor of existing, shipped UI, not a new primitive, so it's left as a flagged opportunity rather than done inside a "missing primitives" sub-phase.
- `DropdownMenuContent` is reused as-is for submenu popups (no separate `DropdownMenuSubContent`) — Base UI's `SubmenuRoot`/`SubmenuTrigger` provide the nesting context, so the same positioner/popup styling applies without a dedicated component; add one only if a submenu ever needs different sizing/placement defaults than a top-level menu.
- No owner decision needed — additive primitives on already-approved tokens, same as §4.2/§4.3a.

---

## §4.3c — Disclosure, data display, content (this session)

### Scope

Per the roadmap's remaining two rows: **Disclosure & navigation** — Tabs, Accordion, Pagination, Stepper (Brief Builder), Progress. **Data display** — Table (stacked mobile mode), Tag, Avatar, Separator, Skeleton, status badge set (*Live · In development · Private · Archived · Concept*). **Content** — Callout, Code block (LTR-locked, copy button), Blockquote, Prose styles for `en`/`fa` articles.

### Implementation

- **`components/ui/tabs.tsx`** — `Tabs` family on Base UI's `Tabs`. The sliding `TabsIndicator` reads Base UI's own `--active-tab-left`/`--active-tab-width` CSS vars (verified against the compiled source, not guessed) — these are real measured pixel offsets from the DOM, so the indicator tracks correctly under `dir="rtl"` with **no** `rtl:` override needed, unlike `Switch`'s thumb or `Sheet`'s slide-in.
- **`components/ui/accordion.tsx`** — `Accordion` family on Base UI's `Accordion`. Expand/collapse height-animates via the primitive's `--accordion-panel-height` var rather than a guessed animation utility. Chevron rotates on the verified `data-panel-open` attribute.
- **`components/ui/data-display.tsx`** — `Progress` (determinate + `value={null}` indeterminate), `Avatar`/`AvatarImage`/`AvatarFallback`, `Separator` (horizontal/vertical), `Skeleton` (`aria-hidden`, since a loading placeholder has no content to announce).
- **`components/ui/tag.tsx`** — `Tag`, an interactive chip distinct from the existing static `Badge` (real `<button>` remove control with a composed `aria-label` when `onRemove` is given). `StatusBadge` centralizes the roadmap's exact five-state project vocabulary (*Live/In development/Internal-private/Archived/Concept*) → `Badge` variant mapping in one place, so a status color can't drift between call sites.
- **`components/ui/table.tsx`** — real `<table>` at `md:` and above; below that, `<thead>` hides and each `<tr>` restacks into a labelled card via `TableCell`'s `label` prop (`data-label`-style pattern, done with a hidden inline label span instead of a CSS `content: attr()` pseudo-element, since the latter isn't readable by all screen readers).
- **`components/ui/pagination.tsx`**, **`components/ui/stepper.tsx`** — no Base UI equivalent exists for either, so both are plain composed components. `Pagination`'s prev/next chevrons follow the documented `rtl:rotate-180` convention (forward-action arrows). `Stepper` covers the roadmap's named Brief Builder use case: complete/current/upcoming states, connector lines that fill in as steps complete.
- **`components/ui/content.tsx`** — `Callout` (in-content aside; distinct from `FormMessage`, which is form/section-level), `CodeBlock` (pinned `dir="ltr"` — code, paths, URLs never mirror, same rule the wordmark and `Kbd` follow — with a copy-to-clipboard button that fails silently on clipboard-permission denial rather than showing a destructive error for a non-critical action), `Blockquote`.
- **`components/ui/prose.tsx`** — `Prose`, an article-body typography wrapper capped at the `--width-prose` token from §4.2. Built with logical properties throughout (`ps-5` for list indentation, `border-s-2` for the blockquote rule) specifically so it needs **no** separate RTL stylesheet — only `dir="rtl"` on an ancestor, once Phase 5 adds real Persian copy. The D-03 numeral/Latin-run-wrapping rules stay marked pending in `art-direction.md`, same as every prior phase — no Persian content exists yet to apply them to.

### Showcase wiring

Two sections added to `/design-system` (and header nav): `disclosure-section.tsx` (Tabs, Accordion, Pagination, Stepper, Progress) and `data-content-section.tsx` (Table with the two real Artaveo projects, status badges, tags, Avatar, Separator, Skeleton, Callout, CodeBlock, Prose+Blockquote).

### RTL / keyboard / theme review

- Same physical-utility sweep as §4.3a/§4.3b — the only match across every §4.3c file was `TabsIndicator`'s `left-(--active-tab-left)`, which is correct as-is per the CSS-var reasoning above, not a leak.
- Keyboard: Tabs/Accordion get arrow-key and Enter/Space handling natively from Base UI; `Pagination`/`Stepper`/`Table` are plain composed elements (real `<button>`s, a real `<table>`) with no custom keyboard behavior to get wrong; `CodeBlock`'s copy button is a real `IconButton` with `aria-label`, visible on focus (`focus-visible:opacity-100`) not just hover, so it's reachable without a pointer.
- Theme: every new file reads only semantic tokens — no raw colors introduced. `Callout`, `Tag`'s remove-hover, and `Stepper`'s connector fill all reuse tokens already audited in §4.2/§4.3a rather than inventing new color usage.
- One real bug caught during the production-build verification, not just review: `Tag`'s `onRemove` renders a real `<button onClick>`, which cannot exist inside a Server Component's output at all (not just a serialization issue) — `data-content-section.tsx` needed `'use client'`. `next build` caught this immediately (`Event handlers cannot be passed to Client Component props`); fixed before verification passed.

### Verification

- `npx tsc --noEmit` — clean.
- `next build` — first attempt failed on the real Server/Client boundary bug above; fixed, then re-verified with the same temporary font-stub technique as §4.3a/§4.3b (stub reverted immediately after, confirmed identical to the pre-session file via `diff`). Full production build compiled successfully with all fourteen new §4.3c primitives wired into `/design-system`.
- Not done here: manual screen-reader pass and visual regression in both themes/directions — same standing caveat as every §4.1–§4.3 sub-phase in this sandbox.

### Files changed / added (§4.3c)

Added: `components/ui/tabs.tsx`, `components/ui/accordion.tsx`, `components/ui/data-display.tsx`, `components/ui/tag.tsx`, `components/ui/table.tsx`, `components/ui/pagination.tsx`, `components/ui/stepper.tsx`, `components/ui/content.tsx`, `components/ui/prose.tsx`, `components/showcase/disclosure-section.tsx`, `components/showcase/data-content-section.tsx`.
Changed: `app/design-system/page.tsx`, `components/showcase/showcase-header.tsx`.

### Debt / open items for §4.4+

- §4.3's own exit criteria (per the roadmap: "every primitive verified for keyboard, screen reader, RTL and both themes") is met for keyboard/RTL/theme by the reviews across §4.3a–c; the screen-reader half is still a real manual pass with actual assistive tech, which this sandbox can't run — flag before D-12 sign-off, same caveat carried since §4.1.
- `CodeBlock` has no syntax highlighting — the roadmap doesn't ask for it here, and adding a highlighter is a real dependency decision (bundle size, theme integration) better made when a real article/case-study actually needs highlighted code, in Phase 6.
- `Table`'s stacked-mobile mode was built and reviewed but only visually spot-checked via the build's static output, not resized in an actual browser in this sandbox — worth a manual pass at the real 320–639px band before it's relied on for the Phase 6.3 operations-admin tables.
- No owner decision needed — §4.3 in full is additive primitives on already-approved tokens (D-12), same reasoning as every sub-phase above.
