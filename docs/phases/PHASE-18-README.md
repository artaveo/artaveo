# Phase 18 — Search & Command Palette

**Status:** ✅ COMPLETE (code) — no migration, no new dependency, nothing to apply before pushing
**Date:** 19 September 2026

## Objective

Make the site searchable from the command palette (⌘K / Ctrl+K, and a search
button on every screen size): one box that finds published pages, projects,
services, articles and technologies in the visitor's own language, alongside
the palette's built-in actions — with recent searches, suggestions,
highlighted matches, keyboard navigation and honest loading / no-result /
error states, behind an interface a server-side provider can replace later.

## Scope

Roadmap Phase 18:

```text
index built from published content per locale (pages, projects, services, articles, technologies)
recent searches, suggestions, keyboard navigation, highlighted matches, loading and no-result states
interface ready for a server-side search provider later
```

## Dependencies

- The published-only selectors that already exist: `getAllProjects()`,
  `getAllServices()` (Phase 12.2) and `getPublishedArticles()` (Phase 17).
- `commandItems` / `mainNav` (`lib/site.ts`) and the `SiteFlagsProvider`
  (Phase 17) for the palette's built-in entries.
- `trackEvent('search_used')` — declared in Phase 11.1, wired here.
- **No new package dependency.** The matcher is a few hundred lines of TypeScript.

## Before you push

Nothing to apply: no migration, no environment variable. Drop the ZIP into the
working copy and push. After the first deploy, open the palette once on the
live site in both languages (see "Manual verification → Not verifiable").

## Implementation summary

### What is searched (`lib/search/build-index.ts`, server-only)

One JSON index per locale, built from **published content only** — every source
is a selector that already filters to published rows, so a draft, an archived
article or an unpublished project cannot reach the index; there is no second
"is it public?" rule to keep in sync.

| Kind | Title | Description | Searchable-only keywords |
|---|---|---|---|
| page | translated nav label | nav description, where the nav has one | the command list's keywords |
| project | title | summary | category, technologies |
| service | title | short description | deliverables |
| article | title | excerpt | category |
| technology | name | "Used in N projects: …" | — |

- **Empty means hidden** (§ 2, principle 3): with no published article there
  are no article documents *and no Insights page document* — the same rule
  that hides its nav link.
- **Technologies are proof-linked** (§ 4.5, B-03): a technology exists in the
  index only if a published project uses it. Case-insensitive de-duplication.
- Pages are the navigate/resources entries of the command list. `/start`,
  `/contact` and the e-mail shortcut are *actions* (client-side commands);
  `/design-system` is an internal `noindex` tool and stays a command only.
- Suggestions are the technologies used by the most projects (max 6) — derived
  from the same documents, so every suggestion returns at least one result.

### Delivery (`app/api/search/index/[locale]/route.ts`)

`GET /api/search/index/en|fa` — dynamic, cached at the CDN
(`s-maxage=900, stale-while-revalidate=3600`), the same approach as the RSS
feed. A failure returns **503 with `Cache-Control: no-store`** so one bad moment
is never pinned at the edge; an unknown locale is 404. The route is outside the
i18n middleware and outside the service worker's content-page allow-list, so
it is always a fresh network request from the browser.

### Matching (`lib/search/normalize.ts`, `scoring.ts`)

- **Folding** — Latin: lower-case, diacritics dropped. Persian/Arabic: `ي ى` →
  `ی`, `ك` → `ک`, `ة` → `ه`, `أ إ آ` → `ا`, vowel marks and tatweel dropped.
  Persian and Arabic-Indic digits → `0–9`. Zero-width and bidi characters
  removed (so `می‌خواهم` = `میخواهم`). Every folded character remembers the span
  of the original character it came from, so highlights are always correct in
  the text the visitor sees.
- **Query semantics** — words are AND-ed (order-free); each word matches a
  document word exactly, as a prefix, or (3+ letters) inside a word. If the
  word-by-word match fails, the whole query is tried with separators removed:
  `nextjs` → `Next.js`, `tailwind css` → `TailwindCSS`.
- **Ranking** — title > keyword > description; bonuses for an exact title
  (including the separator-less form), a title starting with the query, and all
  words landing in the title; small kind bonus (pages first); featured work is
  boosted. Equal scores keep source order.
- Queries are bounded (80 characters, 6 words).

### Provider seam (`lib/search/types.ts`, `local-provider.ts`, `provider.ts`)

The palette talks only to `SearchProvider { prepare, search, debounceMs }`. The
first implementation fetches the index once per language (memory-cached, 30-minute
expiry, 8-second timeout, malformed documents dropped, failures never cached)
and matches in the browser. **To move to the server:** write a provider that
calls `GET /api/search?q=&locale=` returning `SearchResponse`, and change the one
line in `lib/search/provider.ts`. The `useSearch` hook already debounces from
`provider.debounceMs`, aborts stale requests through an `AbortSignal` and only
claims "no results" for a query that actually completed.

### The palette (`components/site/command-palette*.tsx`)

- **One ranked list, two sources.** Site search results and the palette's
  built-in commands are scored by the same scorer and grouped by kind (groups
  ordered by best score). A command is dropped when search already returned the
  same page. Commands run in the client, so **they keep working when site search
  is unavailable**.
- **Empty box:** recent searches (max 5, this browser only), one-tap suggestions,
  then the full command list as before.
- **Recent searches** are saved only when a result is opened from a query, never
  per keystroke; de-duplicated case-insensitively; validated on read; "Clear
  recent searches" in the palette. Nothing is sent anywhere.
- **States:** loading (spinner, previous results stay while typing), no results
  (message + hint + suggestions), error (message, **Retry**, offline-specific
  wording; built-in commands still listed).
- **Keyboard & assistive tech:** ↑/↓ wrap, Enter opens (on a recent search it
  re-runs it), Esc closes, ⌘/Ctrl+K toggles. The input is a `combobox`, the list a
  `listbox` of `option`s in labelled `group`s with `aria-activedescendant`; a
  polite live region announces the result count. Arrow keys only act when the
  input has focus, so Enter on Retry / a suggestion / Clear still does what the
  button says. Selection scrolls into view only after a keyboard move.
- **RTL / bidi:** titles and descriptions sit in `<bdi dir="auto">`, so a Latin
  technology name inside the Persian UI reads correctly without changing the
  row's alignment. Highlight `<mark>`s carry no horizontal padding or weight
  change (that would break Persian letter joining).
- **Header:** a search icon button below `md` (there was no way to open the
  palette on a phone); hovering/focusing the desktop button warms the index.

### Analytics (`lib/analytics.ts`)

`search_used` is now wired, in exactly two situations — a result was opened
(`outcome: 'selected'`, `kind`, `position`, `locale`) or a *working* search ended
on no results (`outcome: 'no-results'`, `locale`, reported once when the palette
closes; not reported while search is down). **The query text is never sent.**

### Privacy (`lib/legal-content.ts`)

The privacy policy already lists what the browser keeps locally; it now also
lists the recent-searches history (both languages). Privacy and Terms now carry
separate "last updated" dates (`2026-09-19` / `2026-09-13`) — before, one shared
constant would have re-dated the Terms for a privacy-only change.

### i18n

19 new keys per language (18 in `CommandPalette`, 1 in a new server-side
`SearchIndex` namespace), 1 reworded (`CommandPalette.searchPlaceholder`).
Parity **842/842**.

## Decisions

1. **In-browser matching over a server search endpoint.** The index is tiny
   (16 documents in the fixture; tens in reality), typing is instant after the
   first load, and there is no per-keystroke server cost or latency. The
   provider interface keeps the door open.
2. **AND semantics, no typo tolerance.** A misspelt word finds nothing rather
   than something plausible but wrong; predictable beats clever for a small,
   curated site.
3. **Commands stay client-side and are merged**, rather than duplicated into the
   index, so search outages don't take navigation away.
4. **Technologies are derived from projects, not read from the `technologies`
   table.** That table has no publish concept (0003); reading it would index
   technologies with no published work behind them, against B-03.
5. **A technology with several projects links to `/work`; with exactly one, to
   that project.** There is no technology filter page to link to (the `/work`
   filters appear only at 6+ projects). When one exists, the `href` set in
   `build-index.ts` is the single line to change.
6. **Keyword-only hits say why** ("Matches: Next.js") instead of showing a
   description with nothing highlighted.
7. **CDN cache of 15 minutes, no invalidation hook** — the same trade-off as the
   RSS feed; a publish reaches search within that window.

## Changed files

New:

```text
app/api/search/index/[locale]/route.ts
lib/search/types.ts              lib/search/normalize.ts      lib/search/scoring.ts
lib/search/local-provider.ts     lib/search/provider.ts       lib/search/use-search.ts
lib/search/recent.ts             lib/search/build-index.ts
components/site/command-palette-parts.tsx   components/site/search-highlight.tsx
scripts/test-search.mjs
docs/phases/PHASE-18-README.md
```

Changed:

```text
components/site/command-palette.tsx   (rewritten)
components/site/site-header.tsx       (mobile search button, index warm-up)
lib/analytics.ts                      (doc comment — search_used is wired)
lib/legal-content.ts                  (search history disclosure, split dates)
messages/en.json   messages/fa.json
scripts/ts-resolve-hook.mjs           (also resolves the `@/` alias for tests)
package.json                          (test:search script)
ROAD-MAP-ARTAVEO.md
```

Nothing to delete.

## Database / migrations

None.

## Tests

`npm run test:search` — 24 unit tests, Node's built-in runner, no dependency:
folding (Persian letter variants, digits, ZWNJ, diacritics, `İ`), the folded→original
range mapping, query parsing and bounds, AND semantics, prefix vs 3-letter substring,
ranking order (exact > prefix > keyword > description, boost, stable ties), the
separator-less fallback and its exact-title bonus, keyword-only hits, no typo
tolerance, limit/total, Persian queries, highlight ranges across removed characters,
range merging, index validation (drops malformed documents, rejects wrong-locale
payloads), and the recent-searches store (order, de-duplication, cap, corrupt and
blocked storage). **24/24 pass.** `npm run test:articles`: 16/16 still pass.
The palette component itself has no automated test — Phase 21's scope.

## Manual verification

Done against a **mock PostgREST server** (this sandbox has no route to Supabase)
with a real `next build` + `next start`, and a **headless Chromium** driving the
built app:

- `tsc --noEmit`: 0 errors. Content-placeholder check: passes. i18n parity 842/842.
- `next build` (with the `next/font/google` stub): exit 0; `/api/search/index/[locale]`
  is a dynamic route.
- Index JSON, en and fa: 16 documents each; localised titles, descriptions and the
  "Used in 2 projects" / Persian equivalent (Persian digits, `و` list); **none of
  the unpublished fixtures** (a draft project, a draft service, a draft article and
  a technology used only by the draft project) appears; `Next.js` / `next.js`
  de-duplicated to one technology; suggestions = the four fixture technologies.
  200 with the 15-minute CDN header; unknown locale → 404; **database down → 503
  with `Cache-Control: no-store`**; zero published articles → no Insights page and
  no article documents.
- Palette in Chromium (desktop 1280 px, and a 390 px touch viewport): opens from
  the header button, ⌘/Ctrl+K and (mobile) the icon button; empty state shows
  suggestions and the command list; `next` → Technologies then Projects with the
  typed part highlighted; `nextjs` finds `Next.js`; `seat` → the article first;
  nonsense → "No results" + suggestions; arrow keys move `aria-activedescendant`;
  Enter navigates to `/en/insights/…` and closes; the query is stored, shown under
  "Recent searches" on reopen, and "Clear recent searches" empties storage; Esc
  closes; a forced 503 shows the error notice with **Retry**, built-in commands
  still match, and Retry recovers.
- Persian (`/fa`, `dir=rtl`): a query typed with the Arabic `ي` (`صندلي`) finds
  Persian text written with `ی`, and the highlight lands on the right letters;
  Latin `next` finds `Next.js` inside the RTL UI. Screenshots reviewed.
- Grepped every new/changed component for physical CSS properties: none.
- `next/font/google` stub applied and reverted (`app/[locale]/layout.tsx`
  byte-identical to `HEAD`); `tsconfig.tsbuildinfo` reverted with `git checkout --`.

**Not verifiable from this sandbox:** the queries against the real Supabase
(mock PostgREST only); dark mode and the reduced-motion spinner; Safari and
Firefox; a screen reader (the combobox/listbox wiring follows the ARIA pattern
but was not heard); real published content (the index was checked against fixture rows, not
the live Transportation System / Pezhohesh Portal data); the CDN cache
behaviour on Vercel; that `search_used` reaches Vercel Analytics (it only runs
in a deployed production build).

## Known issues

- **No typo tolerance.** `bokoing` finds nothing.
- **Article bodies are not searched** — title, excerpt and category only. A
  phrase that appears only in the body of an article will not find it.
- **Service technologies are not indexed** (the type carries none); a technology
  is reachable only through projects.
- **A multi-project technology opens `/work`,** not a filtered list (Decision 5).
- **Page keywords are English-only** (the command list's own aliases): typing
  English `hire` finds Contact on the Persian site, but there are no Persian
  aliases.
- **Up to 15 minutes' delay** between publishing and search seeing it.
- **Offline:** the service worker deliberately does not cache `/api/*`, so with no
  connection site search shows its error state; built-in commands still work.
- No `/search` results page and no `SearchAction` in the site's JSON-LD.
- The palette is not a `Dialog` primitive (still the hand-rolled overlay + focus
  trap from § 11.3); it inherits that limitation, not a new one.
- A keyword hit such as "Terms — Matches: service" can look loose for a short
  query; it is real (the Terms page is "terms of service") but noisy.

## New debt

- Server-side provider (`GET /api/search`) — the seam exists, the endpoint doesn't.
- Full-text search over article bodies once there are enough articles to warrant it.
- A technology page or `/work?tech=` filter, then update the technology `href`s.
- An automated palette/interaction test — Phase 21.

## Decisions needed

None blocking. Optional: whether a search results page (`/search`) and the
`SearchAction` structured data are wanted before Phase 21.

## Rollback

Revert the commit. There is no migration and no dependency to undo. The privacy
text and the `search_used` events revert with it.

## Final status

Phase 18 complete (code). Next in sequence: Phase 19 — Notifications & Outbox.
