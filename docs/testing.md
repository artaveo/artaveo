# Testing (Phase 21)

Three layers, each answering a different question. Run the cheap ones often and the expensive one before a release.

| Layer | Question it answers | Needs | Command | Time |
|---|---|---|---|---|
| **Unit** | Is this function right? | Node only | `npm run test:unit` | seconds |
| **Integration** | Does the real code do the right thing against a real database — including what the database *refuses*? | the test stack | `npm run test:integration` | ~1 min |
| **End-to-end + accessibility** | Can a visitor / the owner actually do the important things in a browser, and is it usable by everyone? | the test stack + a production build + Chromium | `npm run test:e2e` | ~11 min on one core |

`npm test` runs unit + integration. **In CI** (`.github/workflows/ci.yml`, described in `docs/ci.md`) all of this runs on every pull request; `npm run verify` is the quick local version (typecheck, lint, content check, unit).

## The test stack

Integration and E2E tests run against **real PostgreSQL and real PostgREST**, not mocks, so every constraint, trigger, index and RLS policy the migrations define is genuinely exercised. Around the database sits a small "fake Supabase" (`tests/support/stack/gateway.mjs`) that serves one URL — what the app calls `SUPABASE_URL` — and routes `/rest/v1` to PostgREST, `/auth/v1` to a **stand-in** for the sign-in service, and `/storage/v1` to a **stand-in** for file storage.

```text
npm run test:stack:up       # once per session: cluster → shim → migrations 0001…latest → real content import → test admins + fixtures → PostgREST → gateway
npm run test:stack:build    # once per code change: `next build` against the stack (fonts served offline, see below)
npm run test:e2e
npm run test:stack:down
```

`up` rebuilds the database from scratch every time, so a run never depends on the previous one. `npm run test:stack:reset` empties only the tables the flows write to.

**Needs on the machine:** PostgreSQL 15+ server binaries (`initdb`, `pg_ctl`, `psql`) and a PostgREST binary (`POSTGREST_BIN`, or on `PATH`). Set `PG_BIN` if Postgres is not under `/usr/lib/postgresql`. Playwright's browser: `npx playwright install chromium` (the dev dependency is pinned to an exact version so the browser build matches).
Ubuntu: `sudo apt install postgresql-16`, and the static PostgREST binary from its GitHub releases.

### What is real and what is not

| Real | Stand-in (says nothing about the real service) |
|---|---|
| PostgreSQL, every migration, every constraint, trigger, index | GoTrue: password sign-in, refresh and `getUser` only — **no MFA, password policy, lockout, e-mail flows** |
| PostgREST and the JWT roles `anon` / `authenticated` / `service_role` | Storage: upload, delete, public read in memory — **bucket size/type limits and storage policies are not exercised** |
| Row Level Security, with Supabase's default privileges mirrored (`tests/support/stack/shim.sql`) | E-mail: the `console` provider (nothing is delivered) |
| The app's own code: real Server Actions, selectors, the built Next app | Google Fonts: served from a local stub, so text renders in the fallback font — fine for behaviour and accessibility, **not for judging typography** |

`shim.sql` is the only file that knows about Supabase's internals; nothing in it is application schema.

### Accounts (test values only)

`owner@test.artaveo.dev`, `editor@test.artaveo.dev`, and `stranger@test.artaveo.dev` (a sign-in account with **no** `admin_users` row — it must be refused). Password `Test-Password-123!`. Defined in `tests/support/stack/accounts.mjs`.

## Unit tests (`tests/unit`, plus the four older suites in `scripts/test-*.mjs`)

Plain `node:test`, no services. TypeScript is loaded through `scripts/register-ts-resolve.mjs` (resolves the `@/` alias and stubs `server-only`; it also stubs `next/headers`, `next/cache` and `next/navigation` for the integration suite).

| File | What it pins |
|---|---|
| `inquiry-validation` | the Brief Builder schema, every step and boundary (goal exactly 10 chars, URL schemes, WhatsApp needs a phone…) |
| `format` | dates and digits per locale — **Persian pages use Gregorian dates and Persian digits, never the Solar Hijri year** |
| `pricing` | price display rules, and that JSON-LD never invents an `Offer`; **a policy pin: while D-04 is open every price on the site is a quote** (delete that one test on purpose when D-04 is resolved) |
| `pipeline-graph` | the stage graph's invariants; SLA "same day" judged in the configured time zone |
| `admin-roles` | the role matrix and the MFA routing truth table |
| `media-upload` | upload rules — **compared with the values migration 0012 creates the bucket with**, so code and database cannot drift |
| `offline-queue` | the browser-side outbox against a fake `localStorage`, including storage that throws |
| `i18n` | both dictionaries have the same keys and `{placeholders}`, no empty strings, Persian typography hygiene, and every literal `t('key')` in the code exists |
| `seo`, `request-ip`, `recommendation-privacy` | canonical/alternates, the IP hash, D-14 recipient retention |

## Integration tests (`tests/integration`)

Run **serially** (`--test-concurrency=1`) because they share one database. They call the app's **real** Server Actions under Node, with the Next runtime (`headers`, `cookies`, `revalidatePath`, `redirect`) replaced by `tests/support/stubs/next-runtime.mjs`. A sign-in goes through `adminSignIn`, and the session cookie is stored and read back like a browser would.

| File | What it proves |
|---|---|
| `inquiry` | `submitInquiry`: one row with normalised values, salted IP hash (never the address), the `created` event, exactly two outbox messages, **idempotency (six parallel submits → one row, no duplicate e-mails)**, refusals write nothing, both rate limits |
| `rls` | **every table has RLS on; the set of publicly readable tables is an exact reviewed list; an anonymous visitor cannot read or write any private table; a signed-in admin using the public key is still just a visitor; unpublished content and everything hanging off it disappears; the outbox-claim function is server-only** |
| `admin-authorization` | sign-in outcomes and audit rows; wrong password and unknown e-mail give the *same* answer; a non-admin account is refused; every owner-only action refused for editor, non-admin and anonymous; a removed admin loses access on the next call |
| `pipeline` | **the database trigger and `ALLOWED_STAGE_TRANSITIONS` agree on all 72 possible stage changes**; the real actions leave events and audit rows; CSV escaping |
| `cms` | project and article lifecycles; publish gates (both languages complete, no `[PLACEHOLDER]`, no missing image); routes revalidated in both languages; owner notified; scheduling and the sweep; uploads (safe names, limits, bilingual alt, focal clamp), public attachments (per-address cap, own-file removal, 3-per-inquiry cap) |
| `content-selectors` | what the public site reads from the database equals the typed content it was imported from |

## End-to-end and accessibility tests (`tests/e2e`)

Drive the **built** app (`next start`, port 3100) in Chromium. One worker, in order: flows share a database.

| File | Covers |
|---|---|
| `routes` | every route type in both languages: status, `lang`/`dir`, one `h1`, no leaked template text, no sideways scroll; 404s; sitemap, robots, feeds; cron route fails closed; private pages are `noindex` |
| `flows-public` | Home → Work → Case study; Service → Package → Brief Builder; language switch on **every** route type (and it keeps the query string); theme switch |
| `search` | the command palette (keyboard, mouse, Persian letter folding, no-match, public-only index) |
| `brief-builder` | validation, labels clickable, hidden bot field, "too fast" refusal (also in Persian), happy path with the real database rows, double click, **offline → kept → sent once on reconnect**, Persian end to end |
| `admin` | login (generic errors), editor vs owner, moving a lead through the pipeline, notes, CSV, **publish a project → public in both languages → unpublish** |
| `mobile` | (`--project=mobile`, Pixel 5) every page type in both languages fits the screen width; the menu; the Brief Builder by touch |
| `a11y` | axe-core (WCAG 2.0/2.1/2.2 A + AA) on every page type in both languages, dark theme, every Brief Builder step, the open palette, the mobile menu |

**Every** E2E test also fails if the browser raised an uncaught exception, a Base UI/React error or a hydration error — a page that shows "Something went wrong" cannot pass by accident.

### Accessibility — what this does and does not do

axe finds the mechanical problems (names, roles, contrast, duplicate ids, landmarks, valid ARIA). It is estimated to find about a third of real accessibility problems. **Still manual, before a release:** a keyboard-only pass through the Brief Builder and admin, and one screen-reader pass (NVDA or VoiceOver) in each language. Every violation is fixed or listed in `KNOWN_ISSUES` at the top of `a11y.spec.ts` with a reason; a listed issue that stops occurring should be removed.

### Writing E2E tests here

- Import `test` and `expect` from `./support`, not from `@playwright/test`: `page.goto` there returns only once React has hydrated (a click on a not-yet-hydrated button is silently lost), and the browser-error check is applied.
- Use `clickWhenReady(locator)` for the first click after a navigation that must not be lost.
- Take copy from the real messages with `msg('fa', 'Namespace.key')` rather than hard-coding it.
- Arrange and verify data with `db(...)` (service-role REST), not by driving unrelated UI.
- The Brief Builder refuses a submission less than 3 s after the form appeared; tests that send must wait it out.

## What is deliberately not tested (yet)

- Real sign-in, MFA, password reset, and real Storage limits (stand-ins only — above).
- Real e-mail delivery (D-01); real calendar clients for the `.ics` file.
- Visual appearance / typography (fonts are stubbed) — no visual regression suite.
- Load and performance (Phase 25) and security scanning beyond the dependency audit and secret scan (Phase 23). Running all of this on every push is Phase 22 — see `docs/ci.md`.
- Consultation and recommendation flows have unit and integration coverage of their rules (`scripts/test-consultations.mjs`) but no browser flow.

## Known behaviours the suite pins

- An unknown slug under a dynamic route (`/en/work/nope`) answers **HTTP 200**, not 404, with the not-found page and `noindex` (the page streams before it finds out). Pinned in `routes.spec.ts`; tighten the assertion if it is ever fixed.
- A URL that matches no route (`/fa/no-such-page`) is a real 404 but is drawn by the plain, English-only root not-found page (no header, `<title>` or `<h1>`); pinned in `routes.spec.ts`, allow-listed in `a11y.spec.ts`.
- After Publish/Unpublish, the first visitor to a list page may still see the previous version once (Next serves the old page while it regenerates). `admin.spec.ts` reloads until the change shows.
- `notification_outbox` rows and the audit log are truncated by the suites; never point them at a real database. `stack.mjs` only ever creates its own cluster in a temp directory.

## Security tests (Phase 23)

Run with the rest — `npm run test:unit`, `npm run test:integration`, `npm run test:e2e` — and in CI. What is where (rationale and the full model: `docs/security.md`):

| File | Layer | What it pins |
|---|---|---|
| `tests/unit/security-input.test.mjs` | unit | the search-term escaper (with hostile terms), CSV formula neutralising (phone numbers untouched), upload inspection by bytes (each image type, lying labels, huge canvases, SVG allow/deny lists), display names, client-address choice on and off Vercel, the hash salt, the rate-limit policy's shape, the configuration check (never prints a value), article link filtering |
| `tests/unit/security-csp.test.mjs` | unit | both Content Security Policy variants (no `'unsafe-inline'` in the admin, no nonce/hash beside it in the public one, the theme-script hash equals the script's real hash), the static header set, private-path rules and their order |
| `tests/unit/security-static.test.mjs` | unit (reads the source) | **every Server Action is either gated before it touches data or a reviewed public entry point that calls the rate limiter**; `'use server'` only in `app/actions`; the list of places that can produce HTML; no `.or()`/`.filter()` built from free text; no form that can fall back to GET; migration `0020` ↔ code ↔ test stand-in agree on the upload rules; every environment variable the code reads is in `docs/security.md` |
| `tests/integration/security.integration.test.mjs` | integration (real PostgreSQL) | the limiter function (limit, windows, 40-way race lets exactly 10 through, nonsense arguments, unreachable by browser roles), the limiter inside the real actions, the lead search with **a control that proves the old code was injectable**, the CSV export, RLS and constraints on the new tables |
| `tests/integration/cms.integration.test.mjs` | integration | rewritten attachment tests: private bucket, never in the CMS library, bytes checked, linking rules, the daily sweep |
| `tests/e2e/security.spec.ts` | browser | headers and **no policy violation on every route type in both languages**; the admin walk with its nonce policy and `httpOnly` cookies; an injected script does not run in the admin; the sign-in limit through the UI; **a Server Action call with a foreign `Origin` is refused, and the identical call from our own origin runs (control)**; a hostile lead is shown as text; the private attachment (no public URL, anonymous/editor/malformed all 404, owner gets a 60-second download link) |

Every other browser test now also **fails on any Content Security Policy violation** (see the console filter in `tests/e2e/support.ts`), so the policy is exercised by the whole suite, not only by this file.

**Fixtures.** The many sign-ins and submissions a suite makes would otherwise share one rate-limit bucket: integration suites give every fresh request context its own address (`resetRequest`, `__TEST_AUTO_IP__`) and clear the admin windows; browser tests clear them in `signInAsAdmin`. The rate-limit tests themselves do not — they are the ones that need the windows. The storage stand-in now models private buckets and signed URLs (`tests/support/stack/gateway.mjs`); which buckets are private is checked against the migration by `security-static`.

**Not covered:** real Supabase Storage (bucket limits, real signed-URL behaviour, the `Content-Type`/CSP headers Storage adds), Vercel's platform limits (the 4.5 MB body cap, the firewall), and Supabase Auth's own limits and MFA.
