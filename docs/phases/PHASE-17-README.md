# Phase 17 — Insights / Engineering Journal

**Status:** ✅ COMPLETE (code) — migrations `0016` and `0016b` **applied and verified live** on Supabase project `ukzovqnpqjcrwofycalc` (18 September 2026)
**Date:** 18 September 2026

## Objective

Give the site a real engineering journal: articles that can be drafted,
reviewed, scheduled, published and archived from the admin, and read on the
public site in English and Persian — with a table of contents, code blocks
that stay left-to-right and can be copied, images with real alt text, links
to related work, RSS per language and a reading time per language.

## Scope

Roadmap Phase 17:

```text
article model with statuses Draft · Review · Scheduled · Published · Archived
table of contents, LTR-locked code blocks with copy button, images,
related projects/services/articles, RSS per locale, reading time per locale
seed topics from real work
```

What already existed and was not rebuilt: the `articles` table with the full
status enum (0005) and the admin CRUD for it (Phase 15). This phase is the
public journal, plus the parts of the model and the admin that Phase 15
could not finish without a public page to test against.

## Dependencies

- `articles` (0005) and the admin article screens (Phase 15).
- `media_assets` + the `media` bucket (0007/0012) for images.
- The once-a-day cron (`vercel.json`, Phase 9.3) for scheduled publishing.
- **No new package dependency.** The article body parser is ~350 lines of
  TypeScript (`lib/articles/markdown.ts`) — see Decision 1.

## Before you push

The migrations are already live (applied 18 September 2026 from the build
session once the SQL tool was approved), so the order is simply: drop the ZIP
into the working copy and push. Verified live afterwards:

- Pre-check: 0 articles, 0 rows that could violate the new constraint, none of
  the three tables existing, `set_updated_at()` present.
- `0016_insights` applied; `0016b_validate_scheduled_constraint` applied
  (validating the constraint was safe: the table is empty).
- The three join tables exist with RLS enabled and **no policy** (by design);
  all four new indexes exist; `articles_scheduled_requires_date` is validated;
  `set_articles_updated_at` exists.
- Rolled-back transaction test: a `scheduled` article with no date is rejected
  (`check_violation`); a self-relation is rejected; deleting an article cascades
  away its relation rows.
- Real (separate-transaction) test: `updated_at` moves on update
  (`18:07:47.468` → `18:07:54.316`); the test row was deleted afterwards. (A
  single-transaction test cannot show this — `now()` is the transaction start.)
- `get_advisors` **security**: the only new findings are three
  `rls_enabled_no_policy` INFO entries for the new tables — the intended
  "server-only" pattern, same as `inquiries`. Pre-existing and unrelated:
  `function_search_path_mutable` on `enforce_inquiry_stage_transition`, and
  Auth leaked-password protection disabled. **Performance:** only
  `unused_index` INFO on the four new indexes (new, empty tables). Pre-existing
  and unrelated: four unindexed foreign keys and one duplicate index on
  `recommendation_requests` / `recommendations` (Phase 16's tables).

## Implementation summary

### Database (`db/migrations/0016_insights.sql`)

- `article_projects`, `article_services`, `article_related` — join tables,
  composite primary key, covering index on the other column, RLS enabled
  with no policy (server-only, like `inquiries`). `article_related` is stored
  in both directions so an article's related set is the same from either side.
- `articles_scheduled_requires_date` — `scheduled ⇒ published_at is not
  null`, added `NOT VALID` so it constrains every new write without failing
  the migration on any unexpected old row (expected: the table is empty).
- `articles_scheduled_due_idx` — partial index for the daily sweep.
- `set_articles_updated_at` — `articles.updated_at` had no touch trigger
  (0011 covered `services`/`engagement_models`), so it never moved after
  insert. It now feeds `dateModified` and the sitemap's `lastModified`.
- `articles.reading_time_minutes` is left in place and no longer read or
  written (Decision 4). Dropping it is a separate, destructive step.

### Article body format (`lib/articles/markdown.ts`)

`articles.body` stays `{ en, fa }` plain text; it now has a small documented
Markdown subset, parsed to an AST and rendered to React elements. There is no
HTML output path anywhere: raw HTML, unknown syntax and unsafe links degrade
to plain text. Supported: `##`/`###` headings, paragraphs, one-level lists,
quotes, callouts (`> [!NOTE|TIP|WARNING|DANGER] Title`), fenced code,
`---`, media-library images (`![caption](media:<uuid>)`), and inline code,
bold, emphasis, links (http(s), mailto, `/site-relative`, `#anchor`).

### Public site

- `/[locale]/insights` — index. Returns 404 while nothing is published
  ("empty means hidden", § 2.3). Advertises the feed via
  `<link rel="alternate" type="application/rss+xml">`.
- `/[locale]/insights/[slug]` — `ArticleView`: breadcrumb, category, dates,
  reading time, ToC, body, related work / services / articles. `BlogPosting`
  + `BreadcrumbList` JSON-LD, `article` Open Graph, `article_view` analytics
  event. Pre-rendered for what is published; `generateStaticParams` degrades
  to on-demand generation if Supabase is unreachable at build time.
- `/[locale]/insights/feed.xml` — RSS 2.0 per language, dynamic, CDN-cached
  15 minutes (`s-maxage=900`).
- Table of contents (`article-toc.tsx`) — shown from 3 headings; sticky beside
  the article from `lg`, a disclosure button below it; active section via
  `IntersectionObserver` (enhancement only — every link is a plain anchor).
- Code blocks — the existing `CodeBlock`, now with a translated accessible
  name, a polite "copied" announcement, a focusable scroll region, and a copy
  button that is always visible on touch screens (it was hover-only).
- Persian text: Latin technical runs are wrapped in `<bdi dir="ltr">`
  automatically (§ 16.2); inline code is always LTR; heading ids keep Persian
  letters.
- Sitemap — the index and every published article, both locales, with
  `alternates.languages`; nothing while empty.
- Home section 11 (`InsightsPreview`) now reads the database (async Server
  Component, like `Recommendations`). The file-based planned-topics list it
  used to read (`insightsData`, `getPublishedInsights`) is removed.
- Nav — the Insights link appears in the header, mobile nav, footer and
  command palette only when at least one article is published. Resolved in the
  root layout (`hasPublishedArticles()`) and handed to the client nav through
  `SiteFlagsProvider`; `lib/site.ts` no longer exports the pre-filtered
  `visibleMainNav` / `visibleCommandItems` (a static filter cannot express
  this).
- Service worker — `scripts/generate-sw.mjs` now ignores paths with a file
  extension, so `feed.xml` is never treated as an offline-browsable page.

### Admin (`/admin/content/articles`)

- Scheduling — a go-live date (UTC, today or later) when the status is
  `Scheduled`; validated server-side. Shown in the list and on the article.
- Preview — `/admin/content/articles/[id]/preview?lang=en|fa`: the same
  `ArticleView` a reader gets, for any status, plus formatting warnings.
- Related projects / services / articles pickers; "Insert image" from the
  media library (appends `![](media:<id>)` to the chosen language's body);
  a formatting reference; live reading time per language.
- Archive action; Publish gates — both languages complete (existing), **no
  unresolved `[PLACEHOLDER]`** (§ 16.3, the build-time check cannot see the
  database), **no embedded image that no longer exists**.
- Saving a **published** article now keeps it published (Decision 6).

### Scheduled publishing (`lib/insights-scheduler.ts`)

One statement — `update articles set status='published' where
status='scheduled' and published_at <= now() returning id, slug` — so the
transition is atomic and idempotent. It runs from the existing daily cron
route (`/api/cron/notifications`, 06:00 UTC) after the notification sweep;
each writes an audit row (`actor: system:cron`) and revalidates the affected
routes.

### Persian dates are Gregorian now (D-03) — a fix, not a feature

Found while checking the journal's publish dates: every Persian date on the
site was rendering in the Solar Hijri calendar ("۱۹ شهریور ۱۴۰۵") although D-03
says Gregorian. Not something Phase 17 added — `lib/format.ts` mapped `fa` to
plain `'fa'` on the belief that only `fa-IR` triggers the Persian calendar, but
`Intl` uses Solar Hijri for *every* `fa` tag. Now `fa-u-ca-gregory`
("۱۰ سپتامبر ۲۰۲۶"). The same fix was applied to the availability chip's
"last updated" date (`components/ui/identity.tsx`, which used `fa-IR`) and the
admin recommendations list (`toLocaleDateString(locale)`). Digits stay Persian.

### i18n

42 new keys (11 `Insights`, 31 `Admin`), 1 removed (`cmsReadingTime`), 2
reworded (`cmsArticlesNote`, `cmsArticlesNavDescription` — both said "not yet
shown on a public page"). Parity: **823/823**.

## Decisions

1. **Own Markdown-subset parser instead of a dependency.** The renderer needs
   the heading list, the media ids and the word count from the *same* parse,
   and the safety property ("no HTML string exists") is the point. Cost: no
   tables, no nested lists (Known issues). Tested: `npm run test:articles`.
2. **Scheduled = a day, not a minute.** Vercel Hobby allows one cron run per
   day, so a scheduled article goes live at the 06:00 UTC run on its date.
   The form says so next to the date field. A stored state change (not a
   read-time date comparison) keeps exactly one definition of "public".
3. **No second cron entry.** The sweep shares the existing route. Hobby's cron
   allowance is small and exceeding it fails the whole deploy; the two sweeps
   are independent. Moving to an external scheduler or Pro removes the daily
   ceiling with no code change.
4. **Reading time is computed per locale at read time**, not stored: it cannot
   go stale, and `en`/`fa` differ. The speeds (`en` 200, `fa` 180 words/minute,
   code at half weight) are **heuristics, not measurements** — one named
   constant each in `lib/articles/reading-time.ts`.
5. **Empty means hidden, at every layer**: index 404, feed 404, no sitemap
   entries, no nav link, no home section.
6. **Saving no longer unpublishes.** Before this phase `updateArticle` wrote
   the form's `status`, which for a published article always arrived as
   `draft`. Nothing public read `articles` yet, so it never showed. Only
   `publishArticle`, `unpublishArticle` and `archiveArticle` cross the public
   line now.
7. **Related items** are only ever linked when published; the admin marks
   unpublished ones so an editor knows why a link is absent.
8. **Failure policy is split.** Page-rendering reads throw (under ISR a failed
   regeneration keeps the last good page); only the layout's nav flag is
   tolerant, so an optional link cannot take down the legal pages or the admin.
9. **Feed carries excerpts, not full text.** Full text would need an
   AST→HTML serializer for one optional benefit; the excerpt-only feed is a
   normal, honest choice and keeps readers on the site.
10. **Uploaded article images use a plain `<img>`** with explicit width/height
    (no layout shift, lazy, async). `next/image` would need `remotePatterns`
    for the Supabase Storage host; not done here.

## Changed files

New: `db/migrations/0016_insights.sql`, `lib/articles/{markdown,reading-time,placeholders,category}.ts`,
`lib/insights.ts`, `lib/insights-revalidate.ts`, `lib/insights-scheduler.ts`,
`components/insights/{article-body,article-card,article-toc,article-view}.tsx`,
`components/site/site-flags.tsx`,
`app/[locale]/insights/page.tsx`, `app/[locale]/insights/[slug]/page.tsx`,
`app/[locale]/insights/feed.xml/route.ts`,
`app/[locale]/admin/(protected)/content/articles/[id]/preview/page.tsx`,
`scripts/{test-articles.mjs,register-ts-resolve.mjs,ts-resolve-hook.mjs}`,
`docs/phases/PHASE-17-README.md`, `docs/content/insights-topics.md`,
`docs/content/articles/concurrent-seat-booking.{en,fa}.md`.

Also new: `db/migrations/0016b_validate_scheduled_constraint.sql`.

Modified: `ROAD-MAP-ARTAVEO.md`, `lib/format.ts`, `components/ui/identity.tsx`, `components/admin/content/recommendations-editor.tsx`, `docs/content/claims-ledger.md`, `package.json`
(`test:articles` script), `types/{content,cms}.ts`, `lib/{site,structured-data,analytics,home-content}.ts`,
`lib/admin/content.ts`, `app/actions/content.ts`, `app/api/cron/notifications/route.ts`,
`app/sitemap.ts`, `app/[locale]/layout.tsx`,
`app/[locale]/admin/(protected)/content/articles/{page.tsx,new/page.tsx,[id]/page.tsx}`,
`components/admin/content/article-form.tsx`, `components/home/insights-preview.tsx`,
`components/site/{site-header,mobile-nav,site-footer,command-palette}.tsx`,
`components/ui/content.tsx`, `messages/{en,fa}.json`, `scripts/generate-sw.mjs`.

Nothing is deleted.

## Database / migrations

`0016_insights.sql` — see above. Rollback is in the migration's header:

```sql
drop trigger if exists set_articles_updated_at on public.articles;
drop index if exists public.articles_scheduled_due_idx;
alter table public.articles drop constraint if exists articles_scheduled_requires_date;
drop table if exists public.article_related;
drop table if exists public.article_services;
drop table if exists public.article_projects;
```

## Tests

`npm run test:articles` — 16 unit tests on the pure helpers (Node's built-in
runner, no dependency): heading levels/ids (incl. Persian), ToC, verbatim code
fences, inline nesting and escapes, `snake_case` staying literal, safe vs
unsafe links, raw HTML staying inert text, media-only images, lists, callouts,
paragraph wrapping, CRLF, per-locale reading time, the placeholder gate.
**16/16 pass.** Actions, queries, the scheduler and the components have no
automated tests — that is Phase 21's scope.

## Manual verification

Done, against a **mock PostgREST server** with fixture articles (this sandbox
has no route to Supabase):

- `tsc --noEmit`: 0 errors. `node scripts/check-content-placeholders.mjs`: passes.
- `next build` with the `next/font/google` stub: compiles and completes
  (exit 0). Routes generated in both locales: `/insights`, and
  `/insights/[slug]` for each published fixture; the draft fixture is absent;
  `/insights/feed.xml` is dynamic.
- Prerendered HTML inspected, en and fa: `lang`/`dir`; heading ids (Persian
  letters kept); ToC present with 4 entries and absent on a short article;
  code block `dir="ltr"` with the translated copy label; `<bdi>` isolation of
  `PostgreSQL` / `Next.js`; image `alt`, `width`, `height`; callout; `/work/demo`
  becoming `/fa/work/demo`; related work, related service and "keep reading"
  sections; `BlogPosting` + `BreadcrumbList` JSON-LD; a blank-string category
  producing no badge; home section and 3 nav links present.
- `next start`: feed = valid RSS 2.0 (200, `application/rss+xml`, 15-minute CDN
  cache); unknown locale = 404; sitemap lists the index and both published
  articles in both locales and not the draft; the index carries the RSS
  autodiscovery link.
- **Empty state** (rebuilt with zero published articles): `/insights` renders
  not-found, feed 404, no sitemap entries, no home section, no nav link.
- The draft article `concurrent-seat-booking`: both bodies parsed with the
  article parser — 6 headings, 3 code blocks, 1 callout, 0 warnings, 0
  unresolved placeholders (so the publish gate will pass), reading time 5 min
  in each language; stored text compared with the source files in the database
  (MD5 and length identical); live database confirms `status = 'draft'`, 2
  relation rows and 0 published articles — nothing on the public site changed.
  The article's **rendering** was not looked at in a browser.
- Generated service worker: extension guard behaves (`/en/insights/feed.xml`
  is not a content page; `/en/insights/x` still is).
- Grepped every new/changed component for physical CSS properties
  (`ml-`, `pr-`, `text-left`, `left:` …): none.
- `next/font/google` stub applied and reverted; `app/[locale]/layout.tsx`
  differs from `HEAD` only by the Phase 17 edits; `tsconfig.tsbuildinfo`
  reverted with `git checkout --`.

**Not verifiable from this sandbox:** anything against the real Supabase
(query shapes — notably the `.or()` delete on `article_related` and the
`head` count — were exercised only against a mock, never real PostgREST);
the admin form, preview and publish/unpublish/archive flows (they need an
authenticated session); a real browser (visual rhythm, light/dark, mobile
overflow, keyboard/focus order, the active-section highlight, the copy
button, RTL typography); the cron sweep on Vercel; the `CRON_SECRET`
environment variable being present.

## Known issues

- **One article exists, as an unpublished draft** —
  `concurrent-seat-booking` (both languages, ~5 min read each), inserted into
  the live database from the build session (audit row `actor:
  system:build-session`), linked to the Transportation System case study and
  the Backend, API & Database service. Its source is in
  `docs/content/articles/`, byte-identical to the stored rows (MD5 and length
  compared). **Its "One statement, all or nothing" section is unverified
  against the live `hold_seats` function** — the function body is not in the
  repository and that database is on a different Supabase account; the query
  to run before publishing is in `docs/content/claims-ledger.md`. The other
  three topics are a backlog with evidence pointers
  (`docs/content/insights-topics.md`). The journal stays invisible on the
  public site until the article is published.
- **Body syntax has no tables and no nested lists** (an indented marker is read
  as another item at the same level). Engineering articles will eventually want
  tables; adding them is a parser + renderer change, tests included.
- **A tolerant nav flag can be cached wrong.** If Supabase is unreachable at
  the instant the layout regenerates, the Insights link is omitted from pages
  regenerated at that moment until the next revalidation. Trade-off chosen
  over letting the legal/admin pages depend on the database (Decision 8).
- **Scheduled publishing runs once a day** and only on a production Vercel
  deployment; a missed run is caught the next day. `CRON_SECRET` must exist (it
  is auto-provisioned by Vercel).
- **A slug change on a published article breaks its old URL** — the `redirects`
  table (§ 12) is not wired to anything yet.
- **Relation writes are not atomic** (delete then insert per table; `supabase-js`
  has no transaction). A failure between the two leaves that list empty until the
  editor saves again; on create the article still exists and the empty lists are
  visible on the edit page.
- **Admin preview in Persian from an English admin UI** shows the article in
  Persian but without Vazirmatn (the font is only loaded for `rtl` routes), and
  the "keep reading" cards use the admin's language. Preview `fa` from the
  `/fa/admin` route for exact typography.
- **Reading-time speeds are heuristics** (Decision 4).
- **Pre-existing, not fixed here:** `minRead` shows Latin digits in Persian.
  Unknown routes return HTTP 200 with a not-found page (the same on `/work/x`
  and `/services/x`). The Persian **calendar** bug was fixed — see below.
- Case-study pages do not yet link back to the articles written about them.

## New debt

- Tables and nested lists in the article body.
- Full-text RSS.
- `next/image` for uploaded article images (`remotePatterns`).
- Article cover / Open Graph image (articles use the generic dynamic OG).
- Redirects on slug change.
- Drop `articles.reading_time_minutes`.
- Case-study → article backlinks.
- Automated tests for the article actions, queries and scheduler (Phase 21).
- Search over articles (Phase 18 — the index it will need is `getPublishedArticles`).

## Decisions needed

None.

## Rollback

Revert the code commit, then run the rollback SQL above. Nothing else needs
undoing: no data is created by this phase, and the Insights nav link, index,
feed and sitemap entries all disappear on their own when the code or the
published articles are gone.

## Final status

```text
PHASE: 17
STATUS: COMPLETE (code) — migrations 0016/0016b applied and verified live; the app's queries not yet exercised against live Supabase, nothing verified in a real browser
ARTIFACT: artaveo-phase-17-complete.zip
ROADMAP UPDATED: YES (revision 36)
NEXT PHASE: 18 — Search & Command Palette
```
