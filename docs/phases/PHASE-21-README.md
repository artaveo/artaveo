# Phase 21 — Testing

**Status:** ✅ COMPLETE (code) — automated tests for the critical flows, the database's own rules and accessibility. Nothing to apply to the database.
**Date:** 20 September 2026
**Migration:** none.

## Objective

Roadmap § Phase 21:

- **Unit:** schemas, formatters (dates/digits per locale), selectors, state transitions, pricing display rules
- **Integration:** inquiry persistence + outbox, RLS policies, admin authorization, CMS mutations, uploads
- **E2E:** Home → Work → Case Study · Home → Service → Package → Brief Builder → Submit · language switch on every route type · theme switch · search · admin login · publish project · move inquiry through pipeline
- automated axe checks on key templates in both directions

The full account of how to run and extend the suite is in **`docs/testing.md`**.

## Before you push

1. **Read the five product fixes below** — this phase found real bugs and fixed them. **Two matter most:** the Brief Builder crashing at step 5, and the shared `FieldError` change (it affects every form). Please look at them in the diff.
2. Push. **New dev dependencies** (no runtime dependency, nothing ships to visitors): `@playwright/test` (exact `1.56.0`) and `@axe-core/playwright`, with `pnpm-lock.yaml` updated. Reason: the browser test runner and the accessibility engine.
3. `package-lock.json` is **untouched and stale** (it lacks `@supabase/ssr` since Phase 13). The project is evidently installed with **pnpm**; consider deleting the npm lockfile. Running plain `npm install` also resolves `^` ranges to newer packages than `pnpm-lock.yaml` pins (this phase's first sandbox got `@base-ui/react` 1.8.0 instead of the locked 1.5.0), so use `pnpm install --frozen-lockfile`.
4. Try it once: `pnpm install --frozen-lockfile`, install PostgreSQL 15+ and a PostgREST binary, `npx playwright install chromium`, then `npm run test:unit`, `npm run test:stack:up`, `npm run test:integration`, `npm run test:stack:build`, `npm run test:e2e` (see `docs/testing.md`).
5. **Phase 22** should run these in CI. The GitHub Actions job needs the same PostgreSQL + PostgREST; a `docker compose` file is *not* included — it could not be verified here.

## Implementation summary

- **Test stack** (`tests/support/stack/`): a throw-away PostgreSQL cluster with **all migrations applied unchanged**, the real content imported with the real import script, real PostgREST, and one "fake Supabase" URL in front (stand-ins for sign-in and storage only). One command brings it up (`stack.mjs up`). It replaces the hand-built setup Phase 20 described as debt.
- **Unit tests** (`tests/unit`): schemas, formatting per locale, pricing display rules, the stage graph, roles, upload rules (compared against migration 0012), the offline outbox, the dictionaries, SEO, IP hashing, recommender retention.
- **Integration tests** (`tests/integration`): the **real Server Actions** run under Node against the real database, with the Next runtime replaced by a small stand-in (`tests/support/stubs/next-runtime.mjs`, wired by `scripts/ts-resolve-hook.mjs`).
- **E2E + accessibility** (`tests/e2e`): Playwright on the built app; axe on every page type, both languages, both themes, every Brief Builder step.
- **One refactor:** the price-formatting functions moved from two client components into `lib/pricing.ts` so they can be tested. Behaviour unchanged.

## Product bugs this phase found and fixed

Each was found by a test, reproduced, fixed, and is now guarded by that test.

1. **The Brief Builder crashed at step 5** ("Links & attachments") with "Something went wrong" — `FieldLabel`, `FieldDescription` and `FieldError` were used outside a `<Field>` (since Phase 15), which Base UI rejects (error #28). Reproduced on the locked `@base-ui/react` 1.5.0 **in this phase's build**. The attachments block is now a `<Field>` and the file input has an accessible name. *If the live site's builder works for you today, tell me — the difference between that and this build is not something I could find.*
2. **Radio options had no accessible name and their labels did nothing when clicked** (project type, timeline, preferred channel): all five options were announced as "Project type". Fixed with Base UI's `Field.Item` (new `FieldItem` in `components/ui/form-controls.tsx`).
3. **Per-field error messages never showed** — only the generic form-level "This field is required", even for an invalid e-mail or a too-short goal. `FieldError` now passes `match`. **This is in the shared form component, so it changes every form that renders a `FieldError`** — review it.
4. **Persian pages scrolled sideways by 9,999 px** on the Brief Builder, consultation and recommendation forms: the hidden bot field used `left: -9999px`, which in a right-to-left page extends the scrollable area. Now `inset-inline-start`.
5. **Smaller:** the theme toggle's label was hard-coded English on the Persian site; the Brief Builder's "you're going a bit fast" message was English on the Persian site (new `rateLimited*` messages); the review step's definition list was invalid HTML (axe `definition-list`, `dlitem`); the home page's decorative line numbers failed contrast in both themes; the language switch dropped the query string (a chosen package was lost); the designed not-found page (used for unknown slugs) had no `<h1>`; the language group's label was English; on a 393 px phone the Brief Builder's seven-step progress bar scrolled the page sideways by 16 px (off small screens only the current step now shows its label; all labels stay in the accessibility tree) and the About page by 5 px (grid children lacked `min-w-0`).

## Decisions

1. **Real database, stand-in only for auth and storage.** The risk in this system is in the database (RLS, constraints, triggers), so that is real; a fake there would test the fake. What the stand-ins cannot show is listed in `docs/testing.md`.
2. **Run the real Server Actions under Node** rather than mocking the data layer, by replacing only `next/headers`, `next/cache` and `next/navigation`.
3. **Known bugs are pinned, not hidden.** Two behaviours are asserted as they are, with the reason in the test (unknown slug → 200 + noindex; an unmatched URL → the plain root 404); one accessibility rule for the command palette is allow-listed with its explanation. Each would be deleted, not "fixed", when the underlying issue is.
4. **Policy pin on pricing:** while D-04 is open, a test fails if any price on the site is not "Ask for a quote".
5. **Wrong-version risk is now visible:** the suite ran against the locked versions from `pnpm-lock.yaml`; that is how bug 1 surfaced. Consider pinning `@base-ui/react` exactly.

## Changed files

**Product code:** `components/start/steps.tsx`, `components/start/review.tsx`, `components/start/brief-builder.tsx`, `components/ui/form-controls.tsx`, `components/ui/states.tsx`, `components/ui/stepper.tsx`, `components/about/about-content.tsx`, `components/site/language-switcher.tsx`, `components/theme-toggle.tsx`, `components/home/hero.tsx`, `components/consultation/consultation-form.tsx`, `components/recommend/recommendation-form.tsx`, `components/services/package-comparison.tsx`, `components/services/service-addons.tsx`, `lib/pricing.ts` (new), `messages/en.json`, `messages/fa.json` (4 new keys each).

**Test code and tooling:** `tests/` (new: `unit/`, `integration/`, `e2e/`, `support/`), `scripts/ts-resolve-hook.mjs` (Next runtime stand-ins), `package.json` (scripts, 2 dev dependencies), `pnpm-lock.yaml`, `.gitignore`.

**Docs:** `docs/testing.md` (new), this file, `ROAD-MAP-ARTAVEO.md`.

## Tests

Run in this order on the **final build**, against the locked dependency versions (`pnpm install --frozen-lockfile`), `tsc --noEmit` clean:

| Layer | Result |
|---|---|
| Unit (`npm run test:unit`, incl. the four older suites) | **224 / 224** |
| Integration (`npm run test:integration`, real PostgreSQL + PostgREST) | **134 / 134** |
| E2E desktop — routes, public flows, search | **64 / 64** (63 now: the one `@mobile`-tagged search test moved to the mobile project) |
| E2E desktop — Brief Builder, admin | **22 / 22** |
| E2E desktop — accessibility (axe) | **47 / 47** (2 rules allow-listed with reasons) |
| E2E mobile (Pixel 5) | **32 / 32** |

**Do the tests catch anything?** Three deliberate breakages, each caught, then reverted: changing the Persian date calendar (2 unit failures); allowing `new → won` in `types/pipeline.ts` (the 72-pair integration parity test fails — the unit graph test does *not*, by design: that is what the integration test is for); adding a select policy for `anon` on `inquiries` (4 RLS failures).

Counts are for the whole run; the E2E ran in groups because a single run on one core takes ~11 minutes. Unit and integration were re-run after the last code change; the E2E groups were run on the final build.

**Not run by the suite:** the manual items below, real sign-in/MFA/Storage, real fonts (a stub is used offline; set `ARTAVEO_TEST_REAL_FONTS=1` when building to use Google Fonts), and CI (Phase 22).

## Manual verification

Not done by the suite, and worth ten minutes before relying on it:

1. Keyboard-only pass through `/start` and `/admin` in both languages; one screen-reader pass (NVDA or VoiceOver).
2. Run `npm run test:e2e` once on your own machine (real fonts: set `ARTAVEO_TEST_REAL_FONTS=1` when building) and open the HTML report.
3. Confirm bug 1 on the live site: open `/en/start`, fill the first four steps, press Next.

## Known issues

1. **Unknown slugs under dynamic routes return HTTP 200** (not 404), with the not-found page and `noindex`. The page streams before it knows the record is missing. `dynamicParams = false` would fix the status but would break publishing new slugs without a redeploy. Same limitation as Phase 20's invalid-token page.
2. **A URL that matches no route (`/fa/no-such-page`) gets the correct 404 status but is rendered by the root `app/not-found.tsx`**: plain, **English-only even under `/fa`**, no site header, no `<title>` (WCAG 2.4.2) and no `<h1>` — Next uses the designed `app/[locale]/not-found.tsx` only when a route matched and then called `notFound()`. A `[...rest]` catch-all would give the designed page but turn the 404 status into 200 (the locale segment streams), so it was not done; Next's experimental global-not-found file is the clean fix (a decision for Phase 23/24).
3. **Two `meta name="robots"` tags** are emitted on not-found responses (harmless, untidy).
4. **After Publish/Unpublish the first visitor to a list page can still see the old version once** (stale-while-revalidate).
5. **The command palette's scrollable list** is flagged by axe's `scrollable-region-focusable`; it follows the ARIA combobox pattern and is allow-listed with the reason.
6. **`aria-pressed` and a changing label on the theme toggle** describe the same state twice; screen readers say "Switch to light mode, pressed". Left as is.
7. Suite limits: no visual regression, no real sign-in/MFA/Storage, no consultation or recommendation browser flow, and it does not run automatically (Phase 22).

## New debt

- CI (Phase 22): PostgreSQL + PostgREST in the job, Playwright browser cache, and the report as an artifact.
- Consultation and recommendation E2E flows.
- A Storage/GoTrue contract test against a real Supabase project (a scheduled job, not a per-push one).
- `inquiry-attachments.ts` still holds its own copy of `hashIp`/`getClientIp` (identical today; the suite pins that they agree) — move it to `lib/request-ip.ts`.
- The `enforce_inquiry_stage_transition` `search_path` advisory (Phase 14) — still open.

## Decisions needed

- **Pin `@base-ui/react` exactly** (and consider Renovate/pnpm `--frozen-lockfile` in CI)? A `^` range let a newer version break the builder in one environment.
- **Delete `package-lock.json`?**

## Rollback

Code only: revert the commit. The product fixes are independent files; reverting `components/ui/form-controls.tsx` alone undoes fixes 2 and 3 (the Brief Builder then shows the generic error again). No database change.

## Final status

**COMPLETE (code).** 224 unit, 134 integration and 164 browser tests (132 desktop + 32 mobile) pass on the final build; `tsc` is clean; three deliberate breakages were caught. Not verified: a keyboard-only and a screen-reader pass, real Google Fonts rendering, real sign-in/MFA and Storage limits (stand-ins), and behaviour on a real Vercel deployment. The five product fixes change live behaviour (see *Before you push*).
Next in sequence: Phase 22 — CI/CD & Release Gates (M3).
