# Phase 28 — Design System 2.0

**Status:** ✅ complete (18 October 2026)
**Roadmap:** § 11A Phase 28, specification § 14.1, component list § 14.0
**Design reference:** the owner-approved design sample (17 October 2026, private artifact — its three artboards Main, Menu and Product were read for this phase)

## Summary

The approved visual direction (D-17) is now a set of tokens and components, shown on `/design-system` with real data. Nothing on the public pages changes look yet except three things the phase itself asks for: no whole-page fade on navigation, Dari body text at line height 1.85, and the share image with the corrected mark. The pages are rebuilt from these components in Phases 29–33.

| Part | What was built |
|---|---|
| **28.1 Tokens** | `app/globals.css`: ink family (`ink` #0A0C11, `ink-raised` #11141B, `ink-elevated` #16181D, text, muted, subtle, hairlines at 8 % and 14 % white), warm panel (`paper` #F4F2ED, white cards, text, muted, line), brand gold #E2B65C with `gold-foreground` and `gold-deep` (gold as text on the warm panel), one cool accent (blue #4078FF, text #8FB0FF), WhatsApp green. The same in light and dark themes. Radii `pill`, `card` 20, `card-lg` 24, `panel` 32, `panel-lg` 40 px. Shadows `card`, `card-hover`, `float`, `device`, `gold`. Per-project colours: `--color-project*` read custom properties that `projectStyle(projectPalette(brand, accent))` sets from the admin's colours (`lib/design/color.ts`). |
| **28.2 Type** | `text-h1` 32–50, `text-h2` 24–34, `text-h3` 20–25, `text-card-title` 16–18, `text-body` 15–16, `text-small` 12–13 px; weight 800 only for h1/h2. Sizes are in `cqi`, so a component sizes by the width it is given. Dari line heights: body 1.9 (and 1.85 site-wide on `<body>`, was 1.7), headings 1.5–1.6. Vazirmatn for Dari, Geist for English, unchanged. |
| **28.3 Glass** | `glass` (header, chips: ink at 74 %, blur 18 px) and `glass-strong` (menus: 88 %, blur 26 px), white hairline at 12 %. Text on glass uses `glass-foreground` / `glass-muted`. The fill alone keeps that text above 4.5:1 over a white page (7.7:1 and 5.9:1 on `glass`), so contrast never depends on the blur. `prefers-reduced-transparency: reduce` and browsers without `backdrop-filter` get a solid #171A22. The header and one open menu are two layers — under the limit of three. |
| **28.4 Motion** | `components/site/page-transition.tsx` deleted — pages no longer fade in as a whole. New: `hover-lift` (4 px, 250 ms), `media-zoom` (1.03, 700 ms, inside mock-ups), `animate-menu-in` (150 ms), `<Reveal>` (280 ms; only elements that start below the fold, never on load, never without JavaScript). Each exists only under `prefers-reduced-motion: no-preference`. |
| **28.5 Components** | `components/brand/`: `GlassHeader` (Products and Services mega menus, mobile menu, search icon, language link, Start a Project), `ProductBlock` / `ProductBlockList`, `PortfolioRow` / `PortfolioList`, `LaptopMockup`, `PhoneMockup`, `DeviceShowcase`, `FloatingChip`, `ServiceKindCard` / `ServiceKindGrid`, `SaleOptionCard` / `SaleOptionGrid`, `AfterSalesChips`, `FeatureGrid`, `ProcessSteps`, `CtaBand`, `BrandFooter`, `FloatingWhatsAppButton`, `ArticleCover`, plus `PillLink`, `InkBand`, `PaperPanel`, `SectionHeading`, `BrandLockup`, `LocaleLink`, platform and service-kind icons. |
| **28.6 Mark debt** | The last asset still drawn from the old placeholder trace, `public/brand/og-image.png`, is re-rendered from the corrected mark (`scripts/brand/render-og-image.mjs`). The mark's outline now lives once in `lib/brand/mark-path.ts`; the inline mark, the share images and the static image all read it. The per-page share cards (`/api/og`) use the same builder (`lib/brand/og-card.ts`) in ink and gold. (The PWA icons were already rebuilt in Phase 10.1.) |

## How the components follow § 14.0 / § 14.1

- **Data only, hidden when empty.** Every list component returns nothing for an empty list: `ProductBlockList` (no product published → no Products section), `PortfolioList`, `ServiceKindGrid`, `SaleOptionGrid`, `AfterSalesChips`, `FeatureGrid`, `ProcessSteps`, footer columns; `GlassHeader` draws no Products menu while no product is published; `FloatingWhatsAppButton` and the WhatsApp actions need the number from the admin; `ArticleCover` needs a cover; mock-ups need a real screenshot (`pickMockupImages`: a landscape cover or desktop screenshot on the laptop, the first mobile screenshot on the phone — a portrait image is never squeezed into a laptop).
- **Prices.** Only through `formatMoney` (D-21 currencies). An option or service without an amount says «قیمت بعد از یک گفتگوی کوتاه»; a service's "from" price shows only when the owner set one.
- **Each project in its own colour.** `projectPalette()` derives the block's gradient, text, secondary text, accent fill and accent text from the two admin colours and guarantees 4.5:1 for every text pairing on every point of the block — tested on 5,000 random colour pairs (and 50,000 while building it). A mid-tone colour that no text can read on is shaded by the smallest step that fixes it, keeping its hue. The two real projects keep their colours exactly (main text 13.8:1 and 11.0:1).
- **Stands alone.** A product block or a portfolio row is one `article` with its own boundary; lists stack them 32 / 28 px apart with the image side alternating. No product block is ever placed in a grid with other tiles; sale options and after-sales services are product-page components only.
- **No fake chrome.** Laptop and phone frames are a bezel and a base: no address bar, no status bar. The old `BrowserFrame` / `DeviceFrame` stay only for the pages Phase 30 replaces.
- **Both directions.** Logical properties throughout (`start`/`end`, `ms`/`me`), forward arrows mirror on Dari pages, the wordmark is pinned left-to-right.
- **Keyboard.** Menus are disclosure buttons (`aria-expanded`, `aria-controls`); Escape closes and returns focus; clicking outside or changing page closes; touch targets are 44 px; every focusable element has a visible ring.
- **Three sizes.** Components lay out by their container (`@container`), so `/design-system` previews each at 375, 768 and 1240 px with one switch, and the same component works full width on a page.

## `/design-system`

Design System 2.0 comes first: tokens (with measured contrast for each text pairing and each real project's palette), the type scale in Dari and English side by side, glass over a half-white, half-screenshot background (with its measured contrast), motion samples, then every component fed by the live data — published projects, products, services, the WhatsApp number from the admin. While no product is published, the product blocks show the portfolio projects and say so; the sale-option cards use five sample options **with no price set**, so they show exactly what a real option without a price shows. The earlier primitives (still used by the admin) follow. The direction toggle now starts from the page's own direction (it used to assume left-to-right, which mirrored `/fa` the wrong way when it unmounted).

## Verification

- `npm run verify`: typecheck, lint (66 warnings — at the cap, none new), content check, **549 unit tests** (55 new in `tests/unit/design-system.test.mjs`: every token pairing, glass over white and ink and its solid fallback, the blur range, the reduced-transparency and no-backdrop-filter rules, the project palette on the real colours and 5,000 random pairs, invalid colours, the mock-up choice, the type ranges and Dari line heights, the removed page fade and the reduced-motion gates, and class merging that knows the type scale).
- `next build` passes.
- In the browser (dev server, `/fa/design-system`): all components render; no element spills out of any preview at 375, 768 or 1240 px and the page has no horizontal scroll; at phone width the header shows the menu button and folds its links into it; the Services mega menu opens, Escape closes it and focus returns to its button; glass computes to `rgba(10, 12, 17, 0.74)` with an 18 px blur. Both share images were rendered and checked by eye.
- New end-to-end suite `tests/e2e/design-system.spec.ts` (CI): every component in both languages at the three widths with no spill, axe (WCAG 2.2 AA) on the new sections in both languages and both themes, the mega menu by keyboard, the phone-width menu, glass turning solid under emulated `prefers-reduced-transparency`, the hover lift with motion allowed, no movement and no pending reveal under reduced motion, no whole-page fade on Home.

## Found by CI and fixed

- **tailwind-merge did not know the new type scale.** `cn()` took `text-small`, `text-body`… for text colours and dropped the real colour class next to them — axe caught the gold "Start a project" pill with light text on gold. `lib/utils.ts` now registers the six sizes as font sizes (unit-tested).
- **The showcase test expected mock-ups the test data cannot have.** The test stack's seed projects have no screenshots, so the showcase rightly draws no laptop, phone or article card there (nothing is invented). The e2e test now requires the always-present components and checks the data-driven ones for consistency (article card ⇔ a screenshot exists; the WhatsApp button ⇔ the WhatsApp actions).

## Known issues and what is next

- The public pages still use the revision 1–44 components; Phase 29 puts the glass header, footer, WhatsApp button and Home together from these components, and Phases 30–31 the product, work and service pages.
- `--brand` (the older, slightly darker gold #D4A24C-ish token) still drives the existing pages and the admin; the new `gold` replaces it on the public pages as they are rebuilt.
- Sample texts in the showcase (the four process steps, the sample article title) are the design sample's; the real copy is Phase 29's and Phase 32's.
- The search icon in the header previews only says it was pressed; on the site (29.1) it opens the command palette.
- Turbopack's dev server sometimes fails to download Google Fonts on the first try in this environment (a font fetch timeout, cached as a build error); restarting the dev server fixed it. The production build fetches them normally.

## Files

```text
app/globals.css                                   DS 2.0 tokens, type scale, glass, motion utilities; Dari line height 1.85
lib/design/color.ts                               contrast maths, projectPalette(), projectStyle()
lib/design/mockups.ts                             which real screenshots go into the laptop and phone
lib/brand/mark-path.ts                            the mark's outline, one source
lib/brand/og-card.ts                              share card (page card and brand card)
components/brand/*.tsx                            the Design System 2.0 components (19 files)
components/site/artaveo-mark.tsx                  reads the shared outline; one glyph instead of two copies
components/site/site-shell.tsx                    no PageTransition
components/site/page-transition.tsx               deleted
components/showcase/ds2/*.tsx                     /design-system sections and the width switch
components/showcase/showcase-header.tsx           2.0 links; the section menu scrolls inside itself
components/showcase/direction-toggle.tsx          starts from and restores the page's own direction
app/[locale]/design-system/page.tsx               DS 2.0 first, fed by live data
app/api/og/route.tsx                              uses lib/brand/og-card.ts
scripts/brand/render-og-image.mjs                 renders public/brand/og-image.png
public/brand/og-image.png                         re-rendered from the corrected mark
messages/en.json, messages/fa.json                new `Brand` namespace (33 strings)
tests/unit/design-system.test.mjs                 new
tests/e2e/design-system.spec.ts                   new
docs/design/art-direction.md                      Design System 2.0 section; mark debt closed
```
