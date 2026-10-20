# Phase 32 — Content rewrite — Dari & English (+ 32.6 project cards)

**Status:** ✅ code complete (21 October 2026) — the owner's read-through of `/fa` (32.4) and his approval of the new project cards (32.6) are owner action **O-9**
**Roadmap:** § 11A Phase 32, copy rules § 16, visual direction § 14.1, owner notes § 6.8, decisions D-15, D-18, D-20, D-22
**Migration:** `0031_project_texts` — applied on Neon (21 October 2026, one transaction over the HTTPS endpoint)

## Summary

Every public word was checked against § 16 by a new content gate and rewritten where it broke a rule; the project texts in the database were rewritten in the customer's words; and the project cards became the compact, coloured, theme-aware cards the owner asked for on 20 October.

| Part | What was done |
|---|---|
| **32.1 Inventory** | The new gate (32.3) was the inventory: on its first run it listed **156** violations — 23 in `messages/fa.json`, 15 in `messages/en.json`, 30 in the legal pages, 31 in the project seed, 17 in the customer e-mails and 40 in the published database content (project texts, screenshot captions, image descriptions). The rest of the public dictionaries (Home, Products, Services, About, Contact, Start, Brief Builder — rewritten in Phases 29–31) was read line by line as well. |
| **32.2 Rewrite** | **Dictionaries:** the site description and tagline ("one independent full-stack developer" → what Artaveo designs and builds), search (no "command palette", «شما» imperatives), the recommendation page and the consultation-call page (both fully «شما» and the brand's voice, no «من» / «تو» / «…‌ات»), the error, 404 and install texts, the Insights texts; the unused `Services`, `SearchIndex`, `Common.location` and `Common.capabilities` keys removed. **Legal pages:** both rewritten for the reader — the brand speaks, the reader is «شما», no technical terms; same facts; the demo and purchase form (Phase 30), missing until now, is described; "a known gap" and the retired Process page are gone. **Customer e-mails:** brand voice and «شما»; "intro call" is now the site's own "consultation call" / «تماس مشوره»; D-08's wording is the site's ("the same day, usually within a few hours"); the recommendation link's expiry is shown in the reader's calendar (Solar Hijri with Afghan month names in Dari); the request is signed «ذاکر ناصری — آرتاویو». **Search:** technology names are no longer searchable and no longer suggested (§ 16.1 rule 3) — the suggestions are the services. English written separately for its reader throughout. |
| **32.3 Content gate** | `scripts/check-content.mjs` (replaces Phase 3's placeholder check; part of `build` and CI) with the rules in `scripts/content-rules.mjs`: placeholders, "§" and phase numbers, technology names and backend words (both languages, and English terms inside Dari), «دوزبانه» / "bilingual", "one person" / developer framing, «من» and «تو» forms (pronouns, verbs, imperatives, «…‌ات»), defensive «…، نه …» and "not a static…", unproven claims, and the § 16.3 "avoid" list. It reads the public dictionary namespaces (not the admin's), the published seeds, the customer e-mails and — with `--db` (`npm run check:content`, and in the integration job against the test stack) — the published database content. Consent checkboxes («موافقم…», "I agree…") are the customer's own voice and allowed. The i18n test uses the same Dari list. |
| **32.5 Project texts** | Migration `0031`: titles «سیستم فروش تکت و مدیریت ترانسپورت» / "Ticket Sales & Transport Management" and «وب‌سایت مجتمع پژوهش» / "Pezhohesh Complex Website" (D-20's descriptive names), kind, summary, industry and features of both projects in the customer's words (the education summary is the design sample's line); the engineering highlights emptied; all 25 screenshot captions and image descriptions rewritten (no «ریسپانسیو», «رندر», "CMS", "UI", "Shabraw", nothing defensive); Artaveo Dental's own text corrected without changing its meaning. The old texts are in `audit_log` (actor `migration:0031`) and the rollback block restores them. The seed `lib/home-content.ts` carries the same texts and no longer the archived engineering write-ups; the import script leaves the archived `project_sections` rows and the "role" line alone. |
| **32.6 Project cards** | `PortfolioRow` (Home, /work, a service's related work, a case study's next project) is a contained card, **≈ 1100 px at most and centred**, screenshot panel **45 %**, less padding, 28 px between cards. The project's hue covers the whole card in tonal steps: a soft tone behind the screenshots, a very light tint (light theme) or a deep tone (dark theme) on the text side with a hairline in the same hue, the **title, the link and the platform icons in the project colour**, chips outlined in a project tone. `projectCardTones()` (`lib/design/color.ts`) derives both themes from the admin colour by luminance targets that keep hue and saturation (HSL lightness), and pushes every text pairing to ≥ 4.5:1; `[data-project-tones]` in `app/globals.css` picks the theme's values. **Theme-aware panels (D-22):** the warm panels, their cards, lines, muted text, gold text and card shadows have dark values; a new `paper-ink` token keeps the dark icon tiles, the founder block and the highlighted sale option dark in both themes; ink bands stay ink. The product block keeps its colours (it sits on an ink band) and takes the same width limit. `/design-system` shows the cards in the light and the dark theme in either direction (`/fa`, `/en`), and the card tones with their measured contrast. |

## Decisions

- **Titles follow D-20's default names** until the owner names the products; the owner can change them in the admin (Content → Projects).
- **Highlights emptied, not rewritten.** They were engineering bullets; the features already say what users can do, and the card falls back to highlights only when a project has no features.
- **Tones by luminance target, in HSL.** Mixing with white or black washed the navy title out to grey in the dark theme; moving only the lightness keeps the identity hue in both themes, as D-22 asks.
- **The legal pages may name their processors** (Neon, Vercel): a privacy policy discloses who keeps the data. The gate allows technology names there and nowhere else.
- **Owner-only alert lines** in the e-mail templates are marked `// owner-facing` and skipped by the gate.

## Verification

- `npm run verify` parts: typecheck clean; lint 64 warnings (at the cap, none new); **664 unit tests** (new `tests/unit/content-rules.test.mjs` — each rule against the sentences that made it necessary and against good Dari and English it must leave alone, the gate passes on the files and is wired into `build` and `check:content`; `design-system.test.mjs` — the dark warm-panel pairings, `paper-ink` in both themes, the light preview equals the light tokens, and `projectCardTones()` at ≥ 4.5:1 in both themes for the real colours and 5,000 seeded random colours, identity hue kept, `tone()` accuracy, invalid colours never reach a style, the card's compact layout; notification, consultation and search tests follow the new wording).
- `npm run check:content` against Neon after `0031`: passes — dictionaries, seeds, e-mails and the database (2 published projects, 5 services).
- New integration test `content-check.integration.test.mjs` runs the gate with `--db` against the test stack (CI).
- `npm run build` passes (with the gate in front of it).
- Dev server, real data: `/fa/work` at 1440 px — cards 1100 px wide, screenshot panel 494 px (45 %), 471 and 407 px tall, checked in the light theme (pale blue card, navy title, soft blue panel) and the dark theme (deep navy / deep green, light blue / mint titles); `/fa/services` and `/fa/about` readable in the dark theme with the panel edge visible; at 375 px no horizontal overflow on `/fa`, `/en/work`, `/fa/work`, `/fa/work/transportation-system`, `/fa/privacy`, `/fa/design-system`; the case study shows the new captions; `/fa/design-system` shows the light card (`#eaeff8`) and the dark card (`#14253e`) side by side whatever the page theme.
- End-to-end (CI): the search tests follow the new titles and add "technology names are not searchable and not suggested"; the case-study flow looks for the new title; the fixture product's text passes the gate.

## Found by CI and fixed

- **RLS integration test:** it needs an archived engineering section to prove such rows are never public; the seed no longer carries them, so the test stack gets one fixture row (`tests/support/stack/fixtures.sql`).
- **Home theme test:** it pinned 29.3's "content panels stay warm in the dark theme", which D-22 replaced; it now checks that the ink bands stay ink, the panels take each theme's value, and the project card is a light tint in the light theme and a deep tone in the dark one.
- **/design-system axe (light page):** the heading of the dark-theme preview sat inside the `.dark` wrapper on the light page; the heading now sits outside the themed wrapper.
- **Search arrow-key test** (flaky once): it waits for a second result before pressing ↓.

## Known issues and what is next

- **O-9 (owner):** read `/fa` end to end as a native reader and send corrections (32.4); look at the new cards on Home and /work in both themes and approve them or say what to change (32.6). Both are exit criteria of the phase.
- The archived engineering sections and the "role" line stay in the database as history (never read by the site). The draft article `concurrent-seat-booking` is still engineering content — Phase 33.
- The Admin dictionary is not part of the public gate (it is the owner's own tool); its Dari was checked only against the § 16.3 word list.
- **Next: Phase 33** — Articles.

## Rollback

- Code: revert the Phase 32 commit.
- Data: the rollback block at the top of `db/migrations/0031_project_texts.sql` (restores every changed project, caption and image description from `audit_log`).

## Files

```text
scripts/check-content.mjs, scripts/content-rules.mjs          new — the public-copy gate (32.3)
scripts/check-content-placeholders.mjs                         deleted (replaced)
package.json                                                    build and check:content run the new gate
messages/en.json, messages/fa.json                              rewritten namespaces; unused keys removed
lib/legal-content.ts                                            both documents rewritten
lib/notifications/templates.ts, consultation-templates.ts       customer e-mails in the brand's voice
lib/inquiry-summary.ts, app/global-error.tsx                    labels and error text
lib/search/{build-index,types,scoring,local-provider}.ts        no technology results or suggestions
components/site/command-palette.tsx, command-palette-parts.tsx  the same
lib/home-content.ts                                             project seed in the customer's words; archived write-ups removed
scripts/import-content-to-db.ts                                 leaves archived sections and role alone
types/content.ts, lib/site.ts                                   dead types and the "Remote · Worldwide" line removed
db/migrations/0031_project_texts.sql                            new (applied on Neon)
lib/design/color.ts                                             tone(), projectCardTones(), cardTonesStyle()
app/globals.css                                                 dark warm panels, paper-ink, card tones, theme-light preview
components/brand/portfolio-row.tsx                              the compact coloured card
components/brand/{pill,product-block,bands,process-steps,sale-option-card,service-card}.tsx   card pill, width, paper-ink, dark hairline
components/about/about-content.tsx, components/contact/contact-content.tsx                    paper-ink tiles
components/showcase/ds2/{components-section,foundations}.tsx    cards and tones in both themes
docs/content/claims-ledger.md, docs/ci.md, lib/articles/placeholders.ts                        updated
ROAD-MAP-ARTAVEO.md                                             32 done (code); O-9; § 16.3 additions
tests/unit/content-rules.test.mjs, tests/integration/content-check.integration.test.mjs        new
tests/unit/{design-system,i18n}.test.mjs, scripts/test-{notifications,consultations,search}.mjs, tests/e2e/{search,flows-public}.spec.ts, tests/support/stack/fixtures.sql   updated
```
