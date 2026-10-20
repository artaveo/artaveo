# Phase 29 — Shell & Home rebuild

**Status:** ✅ complete (20 October 2026)
**Roadmap:** § 11A Phase 29, specification § 14.0 / § 14.1, page map § 15
**Built from:** the Design System 2.0 components of Phase 28 (`components/brand/`)
**Migration:** `0028_header_navigation` — applied on Neon (20 October 2026)

## Summary

Every public page now has the new shell — the glass header with mega menus, the ink footer and the floating WhatsApp button — and Home is rebuilt from the Design System 2.0 sections. The other pages keep their revision 1–44 bodies until Phases 30–31; they now sit inside the new shell.

| Part | What was built |
|---|---|
| **29.1 Header** | `components/site/site-header.tsx` is the glass header fed by the owner's data: **Products** (mega menu, only while a published product has a page) · **Services** (mega menu of the published services, with "All services" and the *Start a Project* card) · **Work** · **About** — then a search icon (no "⌘K" text; the shortcut still works), the language link and *Start a Project*. Below tablet width everything folds into the glass mobile menu (the pages, Contact, search, language, *Start a Project*). The current page is marked (`aria-current`). The rules live in `lib/shell-menus.ts` (pure, unit-tested); the products and services come from `getShellMenus()` in the root layout. |
| **29.1 Navigation data** | Migration `0028`: "How it works" (`/process`) leaves the header and mobile menu, stays in the footer and search until Phase 31.2 folds it into Services. The built-in fallback (`FALLBACK_SHELL`) follows. Home is the logo, never a link of its own. |
| **29.1 Language** | `LocaleLink`: one link to the other language, named in it («دری», "English" — shown as "EN"). **Decision:** the query string travels with the switch (a chosen package on `/start` survives it), read from the address bar on click so no page is forced into dynamic rendering. |
| **29.1 WhatsApp** | `components/brand/whatsapp-icon.tsx`: **WhatsApp's own glyph** (the phone in a speech bubble, WhatsApp's published mark, flat, unaltered — white on the green button, WhatsApp green `#25D366` on ink). Every WhatsApp action uses it: the floating button, the CTA band, the mega-menu card and the footer. lucide's `MessageCircle` is gone from every WhatsApp action. The floating button is on every page (number from the admin; none → no button), at the reading-end corner, lifted above the mobile call-to-action bar on phones. |
| **29.1 Footer** | `components/site/site-footer.tsx`: the ink footer with **Products · Services · Artaveo · Contact** (WhatsApp, e-mail, phone, profiles — all from the admin) and the legal row; empty columns are not drawn (no product → no Products column; at most five services, then "All services"). The year follows the page's calendar («۱۴۰۵» / 2026). The light/dark switch moved here, to the end of the legal row (the § 14.0 header has none, and the ink bands do not change with the theme). |
| **29.2 Home** | `app/[locale]/page.tsx`: **hero** (value line, *Start a Project* + *See the products* — or *See our work* while no product is published — and the laptop and phone mock-ups of a real product, else of the first portfolio project with screenshots; two glass chips with that project's industry and one feature) → **platforms strip** (websites, web systems & admin panels, mobile apps, desktop software, offline systems — kinds of software, no technology names) → **products**, one block each (hidden while none is published) → **work**, one row per project → **services** with a "Not sure where to start?" tile → **process in four steps** → recommendations (only when real) → **CTA band** with WhatsApp. Removed: Capability Strip, Tech Stack, the "one developer" section, the About preview, the Insights preview (and the code-snippet hero). |
| **29.3 Themes** | Hero, products, CTA and footer are ink; work, services and process sit on warm panels — identical in the light and the dark theme (measured, and an e2e test). |

## Decisions

- **No product page yet → no dead link.** Until Phase 30 builds `/products/[slug]`, a product opens its project page while it is in the portfolio (`productPageHref`); a product without one appears in its Home block with *Request a demo* only, and not in the menus. *Request a demo* opens the Brief Builder with the product chosen (`/start?product=…`, Phase 27.5).
- **"All products"** appears in the menu once the owner turns the `products` navigation item on (Phase 30).
- **Services as a menu** only when the `services` item is in the header and a service is published; otherwise it is a plain link — never an empty menu.
- **The mobile menu** lists the header's pages plus the footer-only pages a visitor looks for (Contact, How it works), never the legal links or the design system.
- **Catalogue saves refresh the shell.** Saving a service, a project or a product's options now also revalidates the layout (`app/actions/content.ts`, `app/actions/products.ts`), because the header and footer list them on every page.
- **Process steps** are Home's own copy (`Home.step1…4` in the message files), the design sample's four steps.
- **Recommendations** (§ 14.0: kept, hidden until real) moved onto the warm panel; their heading no longer speaks in the first person.

## Copy

New `Home` namespace (and `Brand.footerWhatsapp`, `Brand.footerContact`), written separately in Dari and English under § 16: the brand is the subject, the customer is «شما», no technology names, no defensive tone, Dari vocabulary checked against § 16.3 («پیش می‌برد», «کمپیوتری», «ضرورت», «کار بگیرید», «گرفتن وقت مشوره»). The unit test that blocks the Iranian "avoid" words passes. Message namespaces used only by the removed sections were deleted (`Hero`, `FeaturedWork`, `WhyArtaveo`, `TechStack`, `Process`, `AboutPreview`, `FinalCta`, `Footer`, `ProjectStatus`, `Loading` — 55 strings per language fewer sent to every page). Claims ledger: new Phase 29 section.

## Verification

- `npm run verify`: typecheck, lint (**65** warnings — one fewer; the cap is lowered to 65), content check, **567 unit tests** (18 new in `tests/unit/shell-home.test.mjs`: product links, menu entries, the header for every data case — no product, a product, "All products", no service, the mobile menu, the fallback — the footer columns, the WhatsApp glyph in every WhatsApp action and its colours, Home's section order, the removed sections, no sale options on Home, no "⌘K" or theme switch in the header).
- `next build` passes (against Neon).
- On the production build with the live data, in headless Edge (Playwright):
  - Home has **no horizontal overflow** at 375, 768 and 1280 px in both languages; About, Work, a case study, Services, Start and Contact have none at 375 px either, and no browser errors.
  - **axe (WCAG 2.2 AA): no violation** on Home in English and Dari, light and dark; none with the Services mega menu open; none with the mobile menu open in either language.
  - Hero, CTA and footer are `rgb(10, 12, 17)` and the work and services panels `rgb(244, 242, 237)` in **both** themes.
  - The Services mega menu opens from the keyboard, Escape closes it and focus returns to its button.
  - The language link keeps `?service=business-website&package=standard` from `/en/start` to `/fa/start` and back.
  - The footer's theme switch turns the page dark.
  - On a phone the WhatsApp button ends above the mobile call-to-action bar (804 px vs 843 px).
  - Screenshots checked by eye: Dari Home at 1280 px, the Services mega menu (English), the Dari mobile menu.
- End-to-end suites updated for the new shell (CI): `flows-public` (language link, footer theme switch), `mobile` (the glass menu), `a11y` (mobile menu), `search` (search through the phone menu); new `tests/e2e/home.spec.ts` (Home's sections from data in both languages, grounds in both themes, the header's content and current page, the WhatsApp glyph and number, the footer's columns and Solar Hijri year).

## Known issues and what is next

- **Service and project texts still read like the old site** in places the new Home now shows prominently: service titles and lines from the database mention "CMS", "MVP", "API", "Discovery Sprint", "SEO" (the services and their copy are Phase 31 and 32), and the education project's summary still opens with «پورتالی دوزبانه … CMS» (Phase 32.5). The Home's own copy is clean.
- `Common.tagline` / `Common.siteDescription` still say "independent full-stack developer"; they are the default title and description of pages without their own (Home has its own) → Phase 32.
- The pages behind the shell (Work, Services, About, Contact, Start…) keep their revision 1–44 bodies and the old sticky mobile bar with the availability chip → Phases 30–31.
- No product is published yet (owner action O-8), so the Products menu, the Products section and the "See the products" action are not visible on the live site; they were checked through the unit tests and appear on their own when the owner publishes a product.
- Every page still receives the whole message dictionary (Phase 26's known issue), now 55 retired strings lighter → Phase 34.

## Rollback

- Code: revert the Phase 29 commit.
- Data: `update public.navigation_items set surfaces = '{header,footer,mobile,command-palette}' where key = 'process';` (in the migration's header).

## Files

```text
app/[locale]/page.tsx                         new Home from Design System 2.0 sections
app/[locale]/layout.tsx                       reads the menus (getShellMenus) for the shell
app/actions/content.ts, app/actions/products.ts   catalogue saves revalidate the layout
app/globals.css                               --whatsapp-glyph (#25D366)
components/brand/whatsapp-icon.tsx            new — WhatsApp's own glyph
components/brand/whatsapp-button.tsx          uses the glyph
components/brand/cta-band.tsx                 uses the glyph
components/brand/glass-header.tsx             glyph in the menu card; current page; mobile-only links; search warm-up; scrollable menu
components/brand/brand-footer.tsx             contact links (external, icons, ltr), tools slot, five columns
components/brand/locale-link.tsx              keeps the query string; named in its own language
components/brand/product-block.tsx            a product without a page yet offers the demo request only
components/site/site-header.tsx               the glass header, fed by data; command palette behind the search icon
components/site/site-footer.tsx               the ink footer, fed by data; theme switch
components/site/site-shell.tsx                floating WhatsApp button, clear of the mobile bar
components/site/site-flags.tsx                menus in the context; useHeaderModel / useFooterModel
components/site/mobile-nav.tsx                deleted (the glass header's menu replaces it)
components/site/language-switcher.tsx         deleted (LocaleLink replaces it)
components/theme-toggle.tsx                   ink version for the footer
components/home/home-hero.tsx                 new
components/home/platforms-strip.tsx           new
components/home/recommendations.tsx           on the warm panel; brand voice
components/home/{about-preview,capability-strip,featured-work,final-cta,hero,insights-preview,process,section-header,services,tech-stack,why-artaveo}.tsx   deleted
components/showcase/ds2/*.tsx                 comments only
lib/shell-menus.ts                            new — header, mobile menu and footer rules
lib/shell-settings-server.ts                  getShellMenus()
lib/shell-settings.ts                         fallback: How it works not in the header
db/migrations/0028_header_navigation.sql      new (applied on Neon)
messages/en.json, messages/fa.json            Home namespace; retired namespaces removed; Recommendations voice
docs/content/claims-ledger.md                 Phase 29 section
package.json                                  lint cap 65
tests/unit/shell-home.test.mjs                new
tests/unit/products.test.mjs                  fallback header without How it works
tests/e2e/home.spec.ts                        new
tests/e2e/{flows-public,mobile,a11y,search}.spec.ts   the new shell
```
