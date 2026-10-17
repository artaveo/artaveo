# Phase 27 — Products, sale options & flexible content (data model + admin)

**Status:** ✅ COMPLETE — 18 October 2026 (roadmap § 11A, revision 47).
**Migration:** `0026_products_and_blocks.sql` — **applied on Neon** (`calm-breeze-36870180`, branch `main`) in one transaction on 18 October 2026, checked afterwards; the Data API's schema cache refreshed (see *Database*).
**Goal (roadmap):** everything the new site shows is data the owner manages without code (D-16, § 2.22).

## What was done

| Item | What changed |
|---|---|
| **27.1 Projects** | New columns: `show_in_portfolio` and `is_product` (independent switches), `brand_color` / `accent_color` (`#RRGGBB`), `cover_media_id` (the cover from the media library; the old `cover_image` path stays the fallback), `industry`, `platforms` (web · Android · iOS · Windows · Mac · offline), `outcome_line` and a customer-facing `features` list — all bilingual where they are text, all checked by the database. `status` and `role` left the public `Project` type and the admin form (a project is draft or published); the columns stay as history. `projects` got its `updated_at` trigger. The admin project form has the switches, two colour pickers, a cover picker from the media library, industry, platforms, outcome line and features. `/work` and Home show only `show_in_portfolio` projects. |
| **27.2 Content blocks** | New table `project_blocks`: nine types — intro, challenge, features (shows the project's features list), gallery (library images with one-line captions), features by role, who it's for, result, FAQ, video (YouTube / Vimeo by id only) — bilingual, ordered, each shown or hidden on its own; shown only when complete in both languages. **`project_sections` is archived:** its rows are kept, nothing reads them, and its public read policy is gone. The case-study page (`/work/[slug]`) is now built from the blocks — the last engineering text (Architecture, Responsive & RTL) is off the site. The admin's project editor has a **Page** tab: add a block of any type, edit it, move it up/down, show/hide, delete; plus the existing screenshot editor. Both projects got one shown "What it does" block. |
| **27.3 Products** | New tables `product_sale_options` (kind: monthly / yearly / lifetime licence, source code, custom edition, other; title, short description, price in Afghani and/or dollars or none = «قیمت بعد از یک گفتگوی کوتاه», "from" flag, payment period, maintenance included / optional with its own price and period / not offered, included items, one highlighted option per product, button: purchase request / demo request / contact, shown flag, order) and `product_services` (after-sales: title, description, price, period). Public only when shown and the project is a published product. The admin's **Product** tab: one switch makes the project a product (and back — options are kept), then add / edit / reorder / show / hide / delete sale options and after-sales services. Price changes are kept in the audit log (before/after). |
| **27.4 Services** | `services.kind` (website · web system & admin panel · mobile app · desktop software · offline system · support · other), optional "from" price (Afghani / dollars), `show_packages` (packages optional per service; on for the five services that have packages, so their pages did not change). The one-line promise is `tagline` (now labelled so in the admin); related projects are `related_project_slugs`. **Engagement models and the Discovery Sprint left the public model:** the table on `/services` and the Brief Builder's "how would you like to work together?" step are gone; the table and its admin stay. |
| **27.5 Inquiries** | `inquiries.inquiry_kind` (project brief · product purchase request · demo request) with the product, the chosen option, the after-sales services and a **snapshot** of their titles and prices at the moment of the request (`product_snapshot`) — a later price change never rewrites what the client asked for. Brief Builder project types are now by kind of software: website · web system / admin panel · mobile app · desktop software · offline system · support of existing software · buy one of our products · something else (the "buy" choice appears only while a product is published and then asks which product and, optionally, which way to get it; `?product=` prefills it). New server action `submitProductRequest` for Phase 30's product pages — same guards as a brief (validation, honeypot, fill time, rate limits, idempotent replay), and it accepts only a published product, its own shown option and its own shown services. The lead pipeline shows the kind and the product, the lead page a Product card with the option and its price, the CSV export three new columns; the owner alert and the client confirmation (Phase 19 outbox) cover both new kinds, in the client's language with the price in Afghani on the Dari side. Old leads keep their old project-type labels. |
| **27.6 Shell settings** | The header, mobile menu, footer, command palette and contact page now read navigation from `navigation_items` and the e-mail, WhatsApp number, phone and external profiles from `site_settings` (new columns `contact_email`, `whatsapp_number`, `phone_number`, seeded with today's values). Saving either in the admin revalidates the whole layout. Links are checked (navigation: same-site paths only; profiles: https only; numbers: international form) in the action and in the database. New navigation keys `products` (hidden until Phase 30 builds `/products`) and `consultation` (command palette, as before). If the database cannot be read the shell falls back to the values it shipped with and records the failure. |

## Decisions

1. **A new table for blocks, the old one archived.** Reusing `project_sections` with new types would have mixed the engineering rows with the new content; a separate `project_blocks` table makes "archived" literal (no policy, no reader) and lets the test stack's content import keep writing the history without it ever showing.
2. **The features block shows the project's `features`**, not a list of its own: one list per project, used by the page now and by the product block / portfolio row of Phases 29–30.
3. **Prices as two amounts, not amount + currency** (D-21): the Dari site shows Afghani, the English site dollars, each falling back to the other; both empty = no figure. One rule (`lib/products/money.ts`) for pages, e-mails and the pipeline.
4. **Videos by id.** A video block stores provider + id, never an address; the page embeds only `youtube-nocookie.com` and `player.vimeo.com`, the only two frame origins the public Content Security Policy now allows (the admin still frames nothing).
5. **Hidden by default, shown only when complete** — for blocks, sale options and services alike; editing a shown item so that a language goes missing hides it again instead of publishing half a translation.
6. **A product request is resolved on the server** against the shown rows of a published product, and snapshotted. The ids are kept too (with `on delete set null`), so the pipeline can link back while the row exists.
7. **Admin tabs are links (`?tab=`)**, not client state: each tab survives a reload and needs no JavaScript to switch.
8. **Two new public RLS policies were named under 63 characters** after Postgres silently cut the first versions; the live policies were renamed to match the migration.

## Database

`db/migrations/0026_products_and_blocks.sql` — 46 statements, applied on Neon in one transaction (role `artaveo_owner`, so the default privileges give `service_role` the new tables). Checked afterwards: both projects have their cover from the library, colour, six features and one shown block; navigation `home, products(hidden), work, services, process, about, insights(hidden), designSystem, contact, start, consultation, privacy, terms`; the contact columns hold today's values; every service has a kind, the five with packages show them; RLS on the three new tables with exactly one SELECT policy each; `project_sections` has no policy; the 2 existing inquiries are `project`.

**After a migration on Neon, the Data API needs its schema reloaded:** `notify pgrst` does not reach it; re-saving its settings with the same values did (the build failed with `PGRST205 … not in the schema cache` until then). Written into `docs/security.md` § 9.

Rollback statements are in the file's header.

## Tests

- **Unit** (`npm run test:unit`): **491 / 491** (452 at the end of Phase 26). New `tests/unit/products.test.mjs` — the price rule in both languages (fallback, "from", periods, «۱۵٬۰۰۰ افغانی در ماه», no invented zero), amount cleaning, video addresses (accepted forms, refused look-alikes, embed origins = CSP origins), block bodies and completeness, the public block (gallery images without alt text skipped, unknown/engineering types never rendered), the shell rules (internal links, https profiles, phone numbers, rows → shell, the fallback), the new project types and the product-request validator. `security-static.test.mjs` classifies `products.ts` (editor gate) and `submitProductRequest` (public, rate-limited); a public action may delegate its rate limit to a helper in the same file, as gated actions already could. CSP test: public `frame-src` = the two players, admin `'none'`.
- **Integration** (CI's PostgreSQL + PostgREST): new `tests/integration/products.integration.test.mjs` — blocks (hidden by default, completeness gate, hide-on-incomplete edit, reorder only of this project's blocks, refused shapes, video stored by id), products (the one switch, prices in both currencies and rounding, refused amounts, maintenance rules, one highlighted option, options/services gates, anonymous caller changes nothing), product requests (snapshot survives a price change, demo ignores the option, only shown rows of a published product accepted, honeypot / fill time / replay, Brief Builder "buy" path with the Dari confirmation showing «۱۵٬۰۰۰ افغانی در سال», old project-type ids refused), shell settings (seeded values, admin edit → shell + layout revalidation, unsafe links refused, visitor read-only). `rls.integration.test.mjs`: the reviewed public list now has the three new tables and no `project_sections`; new checks that a block, a sale option and an after-sales service are public only when shown and their project is a published (product) project, and that the database itself refuses a negative price, a stray maintenance price, a second highlighted option and a product request without its snapshot. `cms.integration.test.mjs`: the new project fields round-trip, bad colour / platform / cover id refused (replaces the removed sections test). CSV header and four suites' project-type ids updated.
- **End-to-end:** the Brief Builder labels follow the new project types.
- Integration and end-to-end suites need PostgreSQL/PostgREST, which this Windows machine does not have — **CI is where they run** (see *Verification*).

## Verification

18 October 2026, this Windows machine, production build (`next build` + `next start`) against the live Neon data:

| Check | Result |
|---|---|
| Typecheck | 0 errors |
| Lint | 0 errors, **66 warnings** — below the old cap of 82; the cap is lowered to 66 so it cannot creep back |
| Unit tests | 491 / 491 |
| Content placeholder check | passes |
| `next build` | passes |
| `/fa/work/transportation-system`, `/en/work/pazhuhesh-portal` | built from blocks: "What it does" with the six features, industry and platform badges; no Architecture / Responsive & RTL text; no horizontal overflow at 360 px |
| `/fa/contact` | e-mail, WhatsApp **and phone** from `site_settings` |
| `/en/services` | no engagement-model table, no overflow |
| `/en/start` | service step without the engagement-model question; project step offers the seven kinds (no "buy" choice — no product is published) |
| Header / footer | the same items as before, now from `navigation_items`; Products and Insights hidden |
| Console / server log | no errors except Vercel Analytics' script, which exists only on Vercel |
| Admin screens | not clicked through here: the owner's admin account is still owner action O-2, and signing in with real credentials is not something an agent does. The admin actions behind every button are covered by the integration suite. |

**CI on GitHub, run 39077140486 (commit `14807a9`): all gates green** — typecheck, lint and unit tests; integration tests on real PostgreSQL + PostgREST (the new products suite and the extended RLS suite included); build with the end-to-end and accessibility suites; dependency audit and secret scan. The first run (commit `01e8614`) found two things the local checks could not: the CMS suite emptied `media_assets` with `TRUNCATE … CASCADE`, which since 0026 also emptied `projects` (`cover_media_id`) for every later suite — it now deletes only uploaded media — and two end-to-end tests still expected the old case-study sections and project-type label.

## Known issues

- **Copy is still Phase 32's:** project summaries, highlights, story-screenshot captions and the technology badges on the case study are still the old, technology-led text; service descriptions still mention the Discovery Sprint; the about page still mentions engagement models. Phase 27 moved the content into the owner's hands; Phase 32 rewrites it.
- **`BrowserFrame` still shows "artaveo.dev/work/…"** on case studies → Phase 30 (mock-up frames without address bars).
- **No product is published yet** and no price is set (owner action **O-8**): nothing public changes until the owner turns a project into a product in the admin — and even then the product page itself is Phase 30.
- **The availability card and the legal pages** still read their contact line from `lib/site.ts`, not from `site_settings` (outside 27.6's shell list) → Phase 31.
- **The owner alert's recipient** is still `siteConfig.email` (an operational setting, not a public channel) → with real sending, O-6.
- **The message dictionary** still carries the engagement-model and some admin strings for retired features (every page sends the whole dictionary — Phase 26's known issue) → Phase 29/34.

## New debt

None beyond the known issues; each has a phase.

## Rollback

- Code: revert the phase commit.
- Data: the `ROLLBACK:` block in `db/migrations/0026_products_and_blocks.sql` (drop the three tables and the new columns, restore the `project_sections` policy and the navigation check); or restore the branch to 18 October 2026 before the migration from Neon's history (`docs/runbooks/backup-restore.md` § 5a). Re-save the Data API settings afterwards.

## Files changed

- New: `db/migrations/0026_products_and_blocks.sql`, `app/actions/products.ts`, `lib/products/money.ts`, `lib/products/blocks.ts`, `lib/products/resolve.ts`, `lib/shell-settings.ts`, `lib/shell-settings-server.ts`, `components/admin/content/project-blocks-editor.tsx`, `product-editor.tsx`, `project-editor-tabs.tsx`, `media-picker.tsx`, `child-row-controls.tsx`, `components/admin/pipeline/product-request-card.tsx`, `components/work/project-blocks.tsx`, `tests/unit/products.test.mjs`, `tests/integration/products.integration.test.mjs`, `docs/phases/PHASE-27-README.md`
- Deleted: `components/admin/content/project-sections-form.tsx`, `components/services/engagement-models-table.tsx`
- Types: `types/content.ts`, `types/cms.ts`, `types/inquiry.ts`, `types/pipeline.ts`
- Data layer: `lib/db/content-queries.ts`, `lib/home-content-projects.ts`, `lib/admin/content.ts`, `lib/admin/settings.ts`, `lib/admin/pipeline.ts`
- Actions: `app/actions/content.ts`, `app/actions/settings.ts`, `app/actions/inquiries.ts`, `app/actions/pipeline.ts`
- Admin: `app/[locale]/admin/(protected)/content/projects/[id]/page.tsx`, `…/[id]/preview/page.tsx`, `…/projects/new/page.tsx`, `…/leads/page.tsx`, `…/leads/[id]/page.tsx`, `components/admin/content/project-form.tsx`, `service-form.tsx`, `site-settings-form.tsx`
- Public: `app/[locale]/layout.tsx`, `app/[locale]/contact/page.tsx`, `app/[locale]/services/page.tsx`, `app/[locale]/start/page.tsx`, `components/work/case-study.tsx`, `components/site/site-flags.tsx`, `site-footer.tsx`, `mobile-nav.tsx`, `components/contact/contact-content.tsx`, `components/start/brief-builder.tsx`, `steps.tsx`, `review.tsx`, `start-content.tsx`, `components/icon.tsx`
- Content & copy: `lib/site.ts`, `lib/contact-content.ts`, `lib/inquiry-content.ts`, `lib/inquiry-summary.ts`, `lib/inquiry-validation.ts`, `lib/home-content.ts`, `lib/services-content.ts`, `lib/notifications/templates.ts`, `lib/notifications/events.ts`, `messages/en.json`, `messages/fa.json`
- Security & ops: `lib/security/csp.ts`, `scripts/backup/tables.mjs`, `scripts/import-content-to-db.ts`, `package.json` (lint cap 66)
- Tests: `tests/unit/security-static.test.mjs`, `security-csp.test.mjs`, `inquiry-validation.test.mjs`, `scripts/test-notifications.mjs`, `tests/integration/rls.integration.test.mjs`, `cms.integration.test.mjs`, `inquiry.integration.test.mjs`, `observability.integration.test.mjs`, `pipeline.integration.test.mjs`, `security.integration.test.mjs`, `tests/e2e/brief-builder.spec.ts`
- Docs: `docs/security.md`, `docs/content/claims-ledger.md`, `ROAD-MAP-ARTAVEO.md` (revision 47)

## Final status

**COMPLETE.** Next phase: **Phase 28 — Design System 2.0**.
