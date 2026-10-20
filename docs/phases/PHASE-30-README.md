# Phase 30 — Products & Work pages

**Status:** ✅ complete (20 October 2026)
**Roadmap:** § 11A Phase 30, page map § 15, components § 14.0, visual direction § 14.1
**Migration:** `0029_products_navigation` — applied on Neon (20 October 2026)

## Summary

Products now have their own pages, a visitor can ask for a demo or send a purchase request with the way to get it they chose, and the work pages are rebuilt in Design System 2.0. At the owner's request (20 October 2026) the mega menus' glass was fixed and made calmer, and a hovered menu entry stands out more.

| Part | What was built |
|---|---|
| **30.1 `/products`** | Every published product as its own block (§ 2.24), image side alternating, then a CTA band. While no product is published the page does not exist (404) and nothing links to it: the Products menu, its "All products" link, the footer column and the search entry all appear only with the first published product (`lib/shell-menus.ts`; migration `0029` turned the navigation item on, the site hides it itself). |
| **30.1 `/products/[slug]`** | `components/products/product-page.tsx`, in the order a buyer asks: the product in its own colours with its real screens in laptop and phone frames, *Request a demo* and *Ways to get it* (and *See the project* when it is also in the portfolio) → its features → the owner's blocks (features by role, who it is for, the story) and its **screens with one-line captions** → **ways to get it**: exactly the published options as cards, the highlighted one marked, then the after-sales services → questions (FAQ blocks) → the request form → a compact "Any questions?" band with WhatsApp. Every section hides itself when its data is empty. The admin's project preview shows a product as this page. |
| **30.2 `/work`** | One project per row, full width, each in its own colour (Phase 28's `PortfolioList`) with laptop and phone screens, industry and platforms — no technical labels, no address-bar frames. A product's row opens its product page. Platform filters (toggle chips) only from six projects (`lib/work-filters.ts`), never by technology. |
| **30.2 `/work/[slug]`** | Visuals first: the same coloured hero (`components/brand/project-hero.tsx`) with the real screens, *See the product* when it is a product (else *Start a project*), *Visit the site* when there is one; then the content blocks (27.2) and the screens on the warm panel, the next project as its own row, and the CTA band. Gone: technology badges, the "category" label («پلتفرم فول‌استک»), the browser frame with `artaveo.dev/work/…`, the old grid and cards. |
| **30.3 Requests** | `components/products/product-request-form.tsx` → `submitProductRequest` (Phase 27.5): *see a demo first* or *buy it*, the way to get it, after-sales services, name, e-mail, WhatsApp/e-mail reply, phone, message, consent. The server re-validates, checks that the product, option and services exist and are published, stores the request with a snapshot of their titles and prices, and queues the e-mails; the pipeline shows product and option (Phase 27.5). **Success is shown only after the server confirmed the request is stored**; honeypot, minimum fill time, idempotency key and per-visitor limits as in the Brief Builder. Each option card links to the form with that option chosen (`#request-purchase-<id>`, `lib/products/request-hash.ts`) — a fragment, so the page stays static. Analytics: `product_view`, and `product_request` only after the save. |
| **30.4 SEO** | Sitemap: `/products` and every product page while products exist. Metadata and share cards per product (industry as the eyebrow). Structured data: `Product` with an `Offer` per currency **only for options with a real price** (D-04), a `UnitPriceSpecification` for monthly/yearly licences, a "from" price as `minPrice`; the case study's `CreativeWork` no longer lists technologies. **Redirect:** a product that is not in the portfolio is permanently redirected from `/work/<slug>` to `/products/<slug>`. |
| **Mega menu (owner, 20 Oct)** | The text behind an open menu was sharp and readable. Cause: the header carried `backdrop-filter` itself, which makes it a *backdrop root* — anything inside it (the menus) can only blur what is inside the header, so the menus blurred nothing and the page showed through their 88 % fill. The header now draws its glass on a `::before` layer (`glass-under`), so the menus blur the page. Values from the standard rather than a guess: **Microsoft WinUI's dark menu acrylic** (`microsoft-ui-xaml`, `AcrylicBrush_themeresources.xaml`: `AcrylicInAppFillColorDefaultBrush`, luminosity layer **0.96**; `AcrylicBrush.h`: Gaussian blur `sc_blurRadius = 30`) → menus are **30 px blur, 96 % fill**. Only a soft wash of the colours behind remains. Hovered and focused entries: 12 % white instead of 6 %. § 14.1 updated. |

## Decisions

- **D-19 respected:** no repository is linked anywhere (unit-tested on the product page). The `Transportation-System` repository's visibility is still owner action O-7 before that product is sold.
- **D-20 respected:** a product's name is the project title the owner sets in the admin; nothing is renamed in code.
- **A product always has its product page** (`/products/<slug>`), whether or not it is also in the portfolio; its case study stays at `/work/<slug>` when it is, and the two link to each other.
- **The product page shows features in a band of their own and questions after the ways to get it**, whatever their position among the blocks; every other block keeps the owner's order.
- **The request form sits on the ink band in a themed card**, so its fields follow the visitor's light/dark theme like every other form.
- **Screens** are the case-study screenshots then the gallery, never the hero image twice (`lib/products/screens.ts`); each opens larger in a native `<dialog>`.

## Copy

New namespaces `ProductsPage` and `ProductPage`; `Work` and `CaseStudy` rewritten without "I" and without technology («کارهایی که آرتاویو ساخته است», «وب‌سایت‌ها و سیستم‌هایی که آرتاویو برای کسب‌وکارها طراحی کرده و ساخته است»); retired keys removed (category/technology filters, stack, year…). Dari checked against § 16.3 («انترنت», «معلومات», «ضرورت», «کار بگیرید», «دالر»/«افغانی» through `formatMoney`). No new factual claim (the reply "the same day" is D-08's commitment).

## Verification

- `npm run verify`: typecheck, lint (**64** warnings — cap lowered), content check, **584 unit tests** (new `tests/unit/products-pages.test.mjs`: request links, screens, /work filters, Product/Offer structured data incl. no offer without a price and `minPrice` for "from", the removed frames and grid, the redirect, success only after the stored result; `shell-home` and `design-system` tests updated for product links, "All products", the header's glass layer and the 30 px menu blur).
- `next build` passes (against Neon).
- On the production build with the live data, in headless Edge: `/work`, two case studies, an unknown slug and Home — **no horizontal overflow at 375 and 1280 px** in both languages, one `h1`, no browser errors; **axe (WCAG 2.2 AA) clean** on `/work` and a case study in light and dark; the **product page** (shown on `/design-system` with a real project standing in, since no product is published yet) axe-clean in both languages and themes; clicking a "ways to get it" card puts its option into the form; the menu blur computes to `blur(30px) saturate(1.5)` and screenshots at 88/92/96 % confirm the text behind is no longer readable.
- End-to-end (CI): new `tests/e2e/products.spec.ts` on a fixture product in the test stack (`tests/support/stack/fixtures.sql`: a priced yearly licence, a highlighted unpriced custom edition, **an unpublished option that must never appear**, an after-sales service, features by role, audience, a question) — exactly the published options, the highlighted one, prices only where set, `Product`/`Offer`; **a purchase request with the chosen option and service reaches the pipeline** (row checked: kind, option, service, snapshot, stage `new`); a Dari demo request from the hero, refused while incomplete; `/products` and the Products menu; the `/work` → `/products` redirect. The product pages joined every-route suites (status, language switch, phone overflow, axe in both themes) and the sitemap test; `home.spec.ts` now expects the Products section and menu.

## Found by CI and fixed

- **Integration test:** it still pinned the pre-Phase-30 rule "the products item exists but is hidden"; it now checks the item is on (migration 0029) — the site hides it itself while no product is published, which the unit tests cover.
- **The Dari demo-request test** clicked `#product-consent`, which Base UI puts on the hidden native input behind the checkbox; it now clicks the visible checkbox by its label (as the purchase test, which passed, already did).
- `home (en)` in the accessibility suite was flaky once (the page reloaded during the scan on its first visit — the service worker taking control); it passed on retry, as in Phase 29's runs.

## Known issues and what is next

- **No product is published on the live site yet** (owner action O-8): `/products` is a 404 and nothing links to it until the owner switches a project to a product and publishes it (Content → Projects → a project → Product tab). Saving it refreshes the pages.
- The screenshot captions and project summaries in the database still carry old engineering wording ("not a static list", «پورتالی دوزبانه … CMS») — Phase 32.5.
- The admin preview of a product shows the request form; sending it from a draft product is refused by the server (the product is not published), as it should be.
- Services, About, Contact and Start keep their revision 1–44 bodies (and the old sticky mobile bar) until Phase 31.

## Rollback

- Code: revert the Phase 30 commit.
- Data: `update public.navigation_items set has_content = false where key = 'products';` (migration 0029's header).

## Files

```text
app/[locale]/products/page.tsx                    new — /products
app/[locale]/products/[slug]/page.tsx             new — product page, metadata, Product/Breadcrumb JSON-LD
app/[locale]/work/page.tsx                        rows, filters from six, CTA
app/[locale]/work/[slug]/page.tsx                 visuals first; redirect to /products for a product outside the portfolio
app/[locale]/admin/(protected)/content/projects/[id]/preview/page.tsx   a product previews as its product page
app/[locale]/page.tsx                             portfolio rows link products to their product pages
app/sitemap.ts                                    products
app/globals.css                                   glass-under (header glass on a layer); menus 30 px / 96 %
components/products/product-page.tsx              new
components/products/product-request-form.tsx      new
components/brand/project-hero.tsx                 new — coloured hero with path, platforms, actions, mock-ups
components/brand/screen-gallery.tsx               new — screens with captions, native dialog
components/brand/glass-header.tsx                 glass-under; stronger hover
components/brand/pill.tsx                         #anchors stay on the page
components/brand/portfolio-row.tsx, product-block.tsx   heading level option
components/work/case-study.tsx                    rebuilt
components/work/project-blocks.tsx                Design System 2.0 on the warm panel; FAQ as <details>
components/work/portfolio-filter.tsx              new
components/work/{work-grid,project-card,case-study-media,project-gallery}.tsx   deleted
components/site/site-flags.tsx, site-footer.tsx   Products only with a published product; "All products"
components/showcase/ds2/components-section.tsx, foundations.tsx   product page preview; glass values
lib/shell-menus.ts                                productPageHref → /products, projectHref, "All products"
lib/products/request-hash.ts, lib/products/screens.ts, lib/work-filters.ts   new
lib/db/content-queries.ts, lib/home-content-projects.ts   product by slug
lib/structured-data.ts                            Product/Offer; CreativeWork without technologies
lib/site.ts, lib/analytics.ts                     products item; product_view / product_request
db/migrations/0029_products_navigation.sql        new (applied on Neon)
messages/en.json, messages/fa.json                ProductsPage, ProductPage; Work, CaseStudy rewritten; Brand additions
tests/unit/products-pages.test.mjs                new
tests/unit/{shell-home,products,design-system}.test.mjs   updated
tests/e2e/products.spec.ts                        new
tests/e2e/{home,routes,a11y,support}.ts           products in the route list, sitemap, Home
tests/support/stack/fixtures.sql                  fixture product
package.json                                      lint cap 64
```
