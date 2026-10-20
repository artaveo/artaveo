# Phase 31 — Services, About, Contact & Start

**Status:** ✅ complete (20 October 2026)
**Roadmap:** § 11A Phase 31, page map § 15, components § 14.0, visual direction § 14.1, copy § 16
**Migration:** `0030_services_catalogue` — applied on Neon (20 October 2026, one transaction over the HTTPS endpoint)

## Summary

The last pages of the old freelancer site are rebuilt in Design System 2.0. Services are organised by the kind of software a business needs, the old process page is folded into Services, About introduces the studio and its founder, Contact offers direct channels only, and Start and Consultation have their new design and customer-voice copy. At the owner's request the light/dark switch is back in the header; the owner's notes on project cards and theme colours are recorded for 32.6.

| Part | What was built |
|---|---|
| **31.1 Services by kind of software** | Five services replace the seven of revisions 1–44: **websites · web systems & admin panels · mobile apps · desktop software · support & extension** (seed `lib/services-content.ts`; migration `0030` puts the same rows on Neon — the block is generated from the seed by `scripts/import-content-to-db.ts --sql`). The old seven are **unpublished, not deleted** (old requests keep their reference) and every old address redirects (308) to the service that covers it now. `/services/[slug]` (`components/services/service-page.tsx`): ink hero with the kind of software, the promise, *Start this project* (→ `/start?service=…`) and WhatsApp, and a glass card with the cost — the owner's "from" price when set, otherwise «قیمت بعد از یک گفتگوی کوتاه» (D-04); **what you get** as tiles; **work of this kind** (only published projects the owner linked, as portfolio rows); **four steps** (the service's own, or the general four); packages only when the owner turns them on; questions; other services; the CTA band. `Service` structured data carries an `Offer` with `minPrice` per currency only for an owner-set "from" price. |
| **31.2 `/process` retired** | `/services` now holds the services, the way of working in four steps (`#process`) and **"how working together goes"** (`#working-together`) — payment, ownership, handover, changes along the way, after launch — as the admin's **global FAQs** (Content → Global FAQs; five rows in `0030`, also as `FAQPage` data). The details stay in each project's agreement (§ 16.1 rule 9). `/process` and `/{en,fa}/process` redirect (308) to `/services#process`; the page, its component and `lib/about-content.ts` (8-phase process, quality baseline, working agreement, languages, story) are deleted; the menu item is removed from the database and from the code's fallback, the search and the sitemap. The four steps are one source for Home and Services (`lib/way-of-working.ts`, messages `WayOfWorking`). |
| **31.3 `/about`** | The studio: what Artaveo builds and how (three short paragraphs), what it holds to in every project (four cards), and its founder — name and photo (D-02), «ذاکر ناصری», «بنیان‌گذار آرتاویو» — then the CTA band. Gone: the "independent full-stack developer" framing, the technical focus list, tools and technologies, languages, time zone and the availability card. The sitewide `Person` data now says "Founder of Artaveo"; `siteConfig` no longer describes "one independent developer". |
| **31.4 `/contact`, `/start`, `/consultation`** | **Contact:** WhatsApp, phone and e-mail as large cards on the ink band (each only when set in the admin), the same-day reply line (D-08), then the two ways to start in writing (project form, consultation). The Hire Channel Selector (direct vs Fiverr escrow) and its data are deleted (D-05). **Start:** the Brief Builder on the ink band in a themed panel, with what happens after sending and WhatsApp beside it; every Brief Builder string rewritten in «شما» voice without "Brief Builder", "engagement model" or the "I" voice; feature options in plain words (no "CMS", "RTL", "third-party integrations", "real-time"). **Consultation:** the same layout, title «گرفتن وقت مشوره», every form string in «شما» voice. |
| **Shell** | The old sticky mobile call-to-action bar (with its availability line) is removed — the header's *Start a Project* and the WhatsApp button cover it. **Owner, 20 October:** the light/dark switch was hard to find at the end of the footer (Phase 29.1) — it is back in the glass header at every width (`ThemeToggle tone="glass"`), and not in the footer twice. |
| **Legal pages** | Phase 27's open item: the contact address comes from the admin's settings (`site_settings`), not `lib/site.ts`. The privacy policy no longer calls Artaveo "the work of one independent developer", and the Dari founder's name, misspelt «زکریا نصری», is «ذاکر ناصری» (both documents re-dated 20 October 2026). The rest of their wording is Phase 32's rewrite. |

## Decisions

- **New service rows, old rows kept unpublished.** Renaming the old rows would have carried their engineering packages, add-ons and FAQs along; new rows start clean, and old requests keep resolving their service.
- **Packages stay possible.** None of the five services has packages; when the owner turns "show packages" on in the admin, the service page shows them as simple cards with *Choose this package* (`/start?service=…&package=…`).
- **The cost card is always shown** on a service page: with no price set it says «قیمت بعد از یک گفتگوی کوتاه» and that each project is priced after the first conversation — never an invented figure.
- **Owner notes of 20 October 2026** (project cards compact and coloured over the whole card, colours that follow the theme) are not part of 31's scope: they are recorded as **32.6**, debt § 6.8 and decision **D-22** in the roadmap, to be built in the next phase.

## Copy

New or rewritten namespaces: `ServicesIndex`, `ServiceDetail`, `WayOfWorking` (moved from `Home`), `AboutPage`, `ContactPage`, `StartPage`, `BriefBuilder`, `ConsultationPage`; `ProcessPage`, `Nav.process` and the retired keys removed. Dari in «شما» voice and Afghan vocabulary (§ 16.3: «مشوره», «انترنت», «معلومات», «ضرورت», «کمپیوتر», «گدام», «بلی», «دوامدار», «تکت»); no technology names; no claims beyond D-08 (same-day reply), D-09 (free call up to 30 minutes), the Working Agreement's ownership/handover/changes rules (D-13) and D-02 (claims ledger, Phase 31 section). Project summaries shown under "work of this kind" are database text and still carry old wording («دوزبانه», «CMS») — Phase 32.5.

## Verification

- `npm run verify`: typecheck, lint (64 warnings — at the cap, none new), content check, **601 unit tests** (new `tests/unit/services-about-contact.test.mjs`: the five services and their completeness, copy rules, the seed equals migration 0030, old services unpublished not deleted, every redirect, nothing links to /process, `Offer`/`minPrice` only for a set price, contact channel order, no hire channels or availability widget, About without "one person", «شما» voice and no freelancer-menu language in the rebuilt namespaces, the legal pages' e-mail and founder's name; `shell-home`, `products`, `pricing` and `i18n` updated).
- `next build` passes (against Neon, with the migration applied).
- On the dev server with the live data: every rebuilt page answers 200 in both languages (`/fa/services/web-systems`, `/en/services/desktop-software`, About, Contact, Start, Consultation); `/fa/process` → 308 `/fa/services#process`, `/process` → 308, `/en/services/care-plan` → 308 `/en/services/support`; at 375 px **no horizontal overflow** and exactly one `h1` on `/fa/services`, `/fa/services/web-systems`, `/en/services/websites`, `/fa/about`, `/fa/contact` (three channel cards), `/fa/start`, `/fa/consultation`; the theme switch is in the header. Screenshots and click-through could not run in the hidden browser pane (it did not hydrate there); those are covered by the browser suites in CI.
- Database after `0030`: five published services with 20 steps, seven old ones unpublished at sort 100–106, five global FAQs, navigation without `process`.
- End-to-end (CI): `flows-public.spec.ts` — the five services on /services, the four steps and five questions there, a service carrying itself into the brief, no invented price («قیمت بعد از یک گفتگوی کوتاه»), no freelancer-menu words on Services/About/Contact/Start/Consultation in both languages, the /process and old service redirects; `brief-builder.spec.ts` and `mobile.spec.ts` follow the new copy; the theme tests look in the header; every-route suites use `/services/websites` and no longer list /process. The RLS integration test uses `web-systems` with a fixture package and add-on (`tests/support/stack/fixtures.sql`).

**CI run 39472368613 is green on every gate** (integration, end-to-end and accessibility suites included, after the test fixes below).

## Found by CI and fixed

- **Brief Builder option test:** "Desktop software" is now also a footer link (the service of that name), so clicking the option by its text matched two elements; the test now clicks inside the project form.
- **Search test:** it searched for the retired "Admin Dashboards" service; it now searches "admin panels" (Web systems & admin panels).
- **Offline test:** it pinned the old wording "You're offline"; it now reads the title from the messages.
- `home (en)` in the accessibility suite was flaky once (the page reloaded during the scan on first visit — the service worker taking control), as in Phases 29 and 30; it passed on retry.

## Known issues and what is next

- **Next: Phase 32** — the content rewrite (including 32.5's project texts in the database) and **32.6**, the owner's project-card and theme notes (D-22).
- No service has a "from" price yet (owner action O-8 covers prices; Content → Services → a service).
- The consultation manage page and the calendar invitation still take the e-mail address from `lib/site.ts`; the legal pages' remaining "I"/«تو» wording — Phase 32.
- `/services/desktop-software` links the owner's unpublished dental product; it appears there the day it is published.

## Rollback

- Code: revert the Phase 31 commit.
- Data: the rollback block at the top of `db/migrations/0030_services_catalogue.sql` (delete the five services, republish the seven old ones, delete the five global FAQs, re-insert the `process` navigation item).

## Files

```text
app/[locale]/services/page.tsx                     rebuilt — services, #process, #working-together, CTA
app/[locale]/services/[slug]/page.tsx              rebuilt — ServicePage, other services, structured data
app/[locale]/about/page.tsx, contact/page.tsx, start/page.tsx, consultation/page.tsx   new metadata keys, shell data
app/[locale]/privacy/page.tsx, terms/page.tsx      contact e-mail from the admin
app/[locale]/process/                              deleted (redirect in next.config.mjs)
app/[locale]/page.tsx                              shared four steps and consultation tile
app/[locale]/admin/(protected)/content/services/[id]/preview/page.tsx   previews with ServicePage
app/sitemap.ts                                     no /process
components/brand/page-hero.tsx, faq-list.tsx       new
components/brand/service-card.tsx                  ConsultationTile
components/brand/glass-header.tsx, components/theme-toggle.tsx, components/site/site-header.tsx, site-footer.tsx   theme switch in the header
components/services/service-page.tsx               new
components/services/{service-detail,service-grid,service-card,package-comparison,service-addons,what-drives-cost}.tsx   deleted
components/about/about-content.tsx, components/contact/contact-content.tsx, components/start/start-content.tsx, components/consultation/consultation-content.tsx   rebuilt
components/contact/hire-channel-selector.tsx, components/process/process-content.tsx   deleted
components/site/site-shell.tsx                     sticky mobile bar removed
components/work/project-blocks.tsx                 FAQ through FaqList
components/icon.tsx                                Monitor
lib/services-content.ts                            the five services (seed), getGlobalFaqs
lib/db/content-queries.ts                          queryGlobalFaqs
lib/way-of-working.ts                              new
lib/contact-content.ts                             direct channels only
lib/about-content.ts                               deleted
lib/legal-content.ts                               e-mail from the admin, founder line and name
lib/inquiry-content.ts                             plain-language Brief Builder options
lib/site.ts, lib/shell-settings.ts                 no process item; studio description
lib/home-content.ts, lib/structured-data.ts        founder bio and job title; Service minPrice
types/content.ts, types/cms.ts                     hire-channel and old about/process types removed
next.config.mjs                                    redirects
db/migrations/0030_services_catalogue.sql          new (applied on Neon)
messages/en.json, messages/fa.json                 rewritten namespaces
docs/content/claims-ledger.md                      Phase 31 section
ROAD-MAP-ARTAVEO.md                                31 done; § 6.8, D-22, 32.6
tests/unit/services-about-contact.test.mjs         new
tests/unit/{shell-home,products,pricing,i18n}.test.mjs, tests/e2e/{flows-public,brief-builder,mobile,support}.ts   updated
tests/integration/rls.integration.test.mjs, tests/support/stack/fixtures.sql   web-systems with a fixture package
scripts/check-content-placeholders.mjs             about-content removed from the list
```
