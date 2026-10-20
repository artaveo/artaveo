# Phase 33 — Articles revamp

**Status:** ✅ complete (21 October 2026) — the infrastructure; there is no article to publish yet (owner action **O-10**: write the first customer articles)
**Roadmap:** § 11A Phase 33, page map § 15, component inventory § 14.0 (Article Card), benchmark B-37, copy § 16
**Migration:** `0032_articles` — applied on Neon (21 October 2026, one transaction over the HTTPS endpoint; the Data API's schema reloaded)

## Summary

Insights became **Articles** («مقاله‌ها») at `/articles`, built for customer reading: each article has a large cover and tags, only articles written for customers can be published, and the link to them grows with them — the footer from the first article, the header from the fourth. Today no article is published (the one in the database is an engineering note and stays a draft), so nothing of this shows on the site yet; it appears by itself the day the owner publishes an article.

| Part | What was built |
|---|---|
| **33.1 Insights → Articles** | Routes moved to `/[locale]/articles`, `/[locale]/articles/[slug]` and `/[locale]/articles/feed.xml` (RSS kept); every old address — `/insights`, `/en/insights/…`, the feed — redirects with 308. The dictionary namespace is `Articles`, the menu item «مقاله‌ها» / "Articles", the copy written for business owners ("what new software changes in your work, what it costs, and what's new in Artaveo's products"). Migration `0032` gives each article a **cover** (`cover_media_id`, from the media library; a cover in use cannot be deleted) and **tags** (`{ en, fa }` list, at most eight, both languages required). The **card** follows B-37: the cover, the topic as its tag, the title (`ArticleCover`); without a cover no card is drawn. `/articles` is rebuilt in Design System 2.0 (ink hero, cards on the warm panel, feed link, CTA band); the article page too (ink hero with topic, title, excerpt and dates; the cover, the body with its contents list, the tags, related work, services and articles on the warm panel). The cover is the article's `image` and the tags its `keywords` in the structured data, the tags are search keywords and feed categories. |
| **33.2 Footer first, then the menu** | `applyArticleRule()` (`lib/shell-settings.ts`), applied in the root layout with the count of readable articles: none → no link anywhere and `/articles` is a 404; 1–3 → the footer and the search only; 4 or more → also the header and the mobile menu. The owner's own placement in Content → Navigation still applies within that, and his switch hides it altogether. The navigation row became `articles` → `/articles` (migration `0032`). |
| **33.3 Engineering stays unpublished** | Each article has an **audience**: *customers* or *engineering*. The database refuses to publish or schedule an engineering article or one without a cover (`articles_publish_rules`) — whatever writes the row (the admin, the daily scheduler, a query); the public read repeats the rule. The existing draft about seat bookings is marked engineering. The admin form says why, in plain words (`missing-cover`, `not-for-customers`). |
| **Admin** | The article form has a **cover picker** (the media library, by project, with upload), the **tags** list and **"Who it is for"**; "Category" is now "Topic (shown on the card)". The preview shows the cover exactly as the public page will. |

## Decisions

- **Topic and tags are separate.** The topic (the old category) is the one tag on the card; tags are the article's keywords under it, in the search and in the feed. An article has at most one topic and up to eight tags.
- **The rule lives in the database.** A cover and a customer audience are not form validation only: the scheduler publishes on its own at night, so the check constraint is what makes 33.3 true.
- **The navigation threshold is code, not a setting** (`ARTICLES_IN_HEADER_FROM = 4`, the roadmap's number). The owner keeps the switch and the placement.
- **The fallback shell never shows the articles link**: it is used only when the database cannot be read, and then no article can be read either.
- **Internal module names stay** (`lib/insights.ts`, `lib/insights-scheduler.ts`, `lib/insights-revalidate.ts`) — nothing public; renaming them would only churn imports.

## Verification

- Typecheck clean; lint 64 warnings (at the cap, none new); **682 unit tests** — new `tests/unit/articles.test.mjs`: the menu rule at 0, 1–3 and 4+ articles, the owner's placement and switch, the header and footer models, the layout applying it; tags; the migration's columns and rules; the public read's filters; the actions' codes; the routes and redirects; «مقاله‌ها»; the card. `shell-home`, `products` and the notification tests follow the new key and paths.
- Integration (CI, test stack): publishing or scheduling without a cover → `missing-cover` (also for a cover id that does not exist); an engineering article → `not-for-customers`; a direct database write is refused (check violation `23514`); a published article cannot lose its cover or become engineering; the cover and tags reach the public read; the count of readable articles. The fixture article now has a cover and tags; the shell row is `articles`.
- End-to-end (CI): the article routes in both languages (renders, one `h1`, no overflow, axe), the 404 for an unknown article, sitemap and both feeds at `/articles`, the 308 redirects of the old addresses, the cover on the article page, and with one article the link in the footer but not in the header.
- On Neon after `0032`: the Data API reads `audience`, `tags` and the `cover` link; the engineering draft is `engineering`; the navigation row is `articles` → `/articles`.
- Dev server against Neon: `/fa` has no articles link (no readable article); `/en/articles` and `/en/articles/concurrent-seat-booking` show the not-found page with `noindex`; the feed is a 404; `/fa/insights`, `/en/insights/feed.xml` and `/insights` redirect (308) to their `/articles` addresses.
- `npm run check:content` passes, including the database.
- `npm run build` passes.

## Known issues and what is next

- **O-10 (owner):** write customer articles in the admin (Content → Articles): pick a cover, a topic, tags, "Who it is for: Customers", then publish. The footer link appears with the first, the header link with the fourth.
- The admin form could not be clicked through here (the admin needs the owner's sign-in); it is covered by typecheck, the integration suite and the preview.
- **Next: Phase 34** — Performance & Accessibility Certification.

## Rollback

- Code: revert the Phase 33 commit.
- Data: the rollback block at the top of `db/migrations/0032_articles.sql`.

## Files

```text
db/migrations/0032_articles.sql                       new (applied on Neon)
app/[locale]/articles/{page.tsx,[slug]/page.tsx,feed.xml/route.ts}   moved from insights/; index rebuilt in DS 2.0
next.config.mjs                                        /insights redirects
components/articles/{article-card,article-view}.tsx    moved from components/insights/; card = cover, topic, title; page in DS 2.0
components/articles/{article-body,article-toc}.tsx     moved
components/admin/content/article-form.tsx              cover picker, tags, audience, new error codes
app/actions/content.ts                                 cover/tags/audience; publish and schedule rules
app/[locale]/admin/(protected)/content/articles/[id]/preview/page.tsx   cover in the preview
app/[locale]/layout.tsx                                count of readable articles → applyArticleRule
lib/insights.ts                                        cover and tags; customer-and-cover filter; countPublishedArticles
lib/articles/tags.ts                                   new
lib/admin/content.ts                                   new columns; media projects for the picker
lib/shell-settings.ts                                  applyArticleRule, ARTICLES_IN_HEADER_FROM; key articles; fallback
lib/site.ts                                            articles item and command follow the content flag
lib/structured-data.ts, lib/search/build-index.ts, lib/insights-revalidate.ts, lib/notifications/events.ts, app/sitemap.ts, scripts/generate-sw.mjs   /articles, cover and tags
components/site/site-flags.tsx, components/showcase/*  the flag and links renamed
types/content.ts, types/cms.ts                         cover, tags, audience
messages/en.json, messages/fa.json                     Articles namespace, Nav.articles, admin labels
tests/unit/articles.test.mjs                           new
tests/unit/{shell-home,products}.test.mjs, scripts/test-notifications.mjs, tests/integration/{cms,products}.integration.test.mjs, tests/e2e/{support,routes,a11y}.ts, tests/support/stack/fixtures.sql   updated
ROAD-MAP-ARTAVEO.md                                    33 done; O-10
```
