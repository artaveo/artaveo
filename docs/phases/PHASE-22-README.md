# Phase 22 — CI/CD & Release Gates

**Status:** ✅ COMPLETE (code) — the pipeline is written and was dry-run as a normal user on a clean copy; **it has not yet run on GitHub** (see *Manual verification*, and the settings only you can make).
**Date:** 20 September 2026
**Migration:** none.

## Objective

Roadmap § Phase 22:

```text
INSTALL → TYPECHECK → LINT → UNIT → INTEGRATION → BUILD → E2E (preview) → SECURITY (deps audit, secret scan) → DEPLOY
```
- branch protection on `main`; agents (v0 included) work through pull requests
- preview deployment per pull request; a failing gate blocks the release

The full description of the pipeline, the one-time settings and how to work with it is in **`docs/ci.md`**.

## Before you push

1. **Push the Phase 21 files first, or together with this ZIP** — this phase runs the Phase 21 suites and adds to some of the same files (`package.json`, `pnpm-lock.yaml`, `.gitignore`, `tests/support/stack/stack.mjs`, `tests/unit/pipeline-graph.test.mjs`, …). The ZIP lists every file changed **since the Phase 21 ZIP**; where a file is in both, this one is the newer.
2. **Two new dev dependencies** (nothing ships to visitors): `eslint` (`^9.39`) and `eslint-config-next` (`16.3.3`, matching Next). **One dependency moved:** `shadcn` from `dependencies` to `devDependencies` — it is a code-generation CLI, and its tree carried 13 of the 17 high advisories in the *production* audit. Its `@import 'shadcn/tailwind.css'` is a build-time CSS import and devDependencies are installed for the build (the other build tools — `tailwindcss`, `typescript` — are already dev dependencies). `pnpm-lock.yaml` is updated; use `pnpm install --frozen-lockfile`.
3. **The first push will trigger the workflow.** Expect it to take about 15 minutes. If something fails in the first run that did not fail in the dry-run below, it will be a GitHub-runner difference — see *Known issues*.
4. **Make the settings in `docs/ci.md` → "One-time settings"** — none of them can be done from code, and without the branch-protection rule the pipeline reports but blocks nothing:
   - branch protection on `main`: require a pull request and the status check **`CI passed`** (the one required check);
   - Actions: read-only workflow permissions, approval for outside collaborators;
   - Vercel: Production Branch `main` (the deploy stage);
   - **check what Vercel Preview deployments point at** — if it is the same Supabase project as production, previews write to the real database.
5. Nothing needs a secret. Do **not** add any to the workflow.

## Implementation summary

- **`.github/workflows/ci.yml`** — four parallel jobs and one aggregate: `verify` (install, typecheck, lint, content placeholders, unit), `integration` (real PostgreSQL + PostgREST), `e2e` (production build against the stack, then the browser + accessibility suites), `security` (dependency policy, secret scan of the full history), and **`CI passed`**, the single required check. Least privilege (`contents: read`), cancel superseded pull-request runs, every action pinned to a commit SHA, PostgREST and gitleaks downloaded at a fixed version and sha256-verified, reports/traces/stack logs uploaded as artifacts on failure.
- **Lint** — `eslint.config.mjs` + `npm run lint`. Started at 93 errors / 15 warnings against the Next.js config; ended at **0 errors, 82 warnings**, with the policy written at the top of the config: real defects are errors; `no-explicit-any` (Supabase row mappers), the React-Compiler-era hook rules and unused variables are warnings that **may not grow** (`--max-warnings=82`). Trivial findings were fixed (unused imports and variables, three stale `eslint-disable` comments). Three deliberate exceptions with reasons: the root not-found page's plain `<a>`, next-intl's empty-interface typing idiom, and the Playwright fixture named `use`.
- **Dependency policy** — `scripts/audit-gate.mjs` (+ `.security/audit-allowlist.json`, + 9 unit tests): a high/critical advisory in the production tree, or a critical one in dev tooling, blocks unless allow-listed **with a reason and a review date**; expired entries block again; stale entries are reported; an unreachable audit service **fails** the gate. Today: 0 blocking, 4 allowed (all four reach the site only through Next.js's build tooling or `sharp`'s HEIF decoding, which the upload rules exclude), all due for review on 2026-12-19.
- **Secret scan** — gitleaks over the full history with `.gitleaks.toml`. History is clean today.
- **Dependabot** — weekly, minor+patch grouped, every major separate; actions too. **PR template** and **CODEOWNERS** (agents' pull requests reach `main` only after the owner has looked, if "Require review from Code Owners" is on).
- **`stack.mjs` hardening found by the dry-run:** the test stack failed for any user other than the one that first created its temp directory (`EPERM … chmod`). It now uses one directory per user and only `chmod`s when running as root.
- **Scripts:** `typecheck`, `lint`, `check:content`, `check:audit`, `verify` (= typecheck + lint + content + unit). `.nvmrc` = 22.

## Decisions

1. **One required check, `CI passed`,** aggregating the jobs — so job names can change without editing branch protection, and a skipped or cancelled job counts as failure (a common hole where "skipped" reads as green).
2. **"E2E (preview)" is done against the app built inside the job, not against the Vercel preview URL.** A preview talks to a real database; the suite writes test data and truncates tables. Documented in `docs/ci.md` as deliberately not covered; a read-only preview smoke test is possible later.
3. **DEPLOY stays Vercel's Git integration.** The workflow decides what may reach `main`; branch protection makes the gate binding. A deploy step in the workflow would need production secrets in GitHub for no gain.
4. **Audit policy is "block new highs, allow reviewed ones with an expiry"** rather than "must be clean" (impossible while a transitive advisory has no release in the Next.js line you are on) or "report only" (a gate that never blocks is a log).
5. **Lint: ratchet, not amnesty.** Warnings are allowed, capped at today's count, with a reason per category; errors are never allowed.
6. **Actions pinned to SHAs** at the newest tags the remote reports (`checkout` v7.0.1, `setup-node` v7.0.0, `pnpm/action-setup` v6.1.0, `upload-artifact` v7.0.1, `cache` v6.1.0). I used only their long-stable inputs. Dependabot keeps them current.
7. **`packageManager` is not added to `package.json`** — it would change which pnpm Vercel uses. CI passes `version: 10` to `pnpm/action-setup` instead. (Consider adding it deliberately.)

## Changed files

**New:** `.github/workflows/ci.yml`, `.github/dependabot.yml`, `.github/pull_request_template.md`, `.github/CODEOWNERS`, `.gitleaks.toml`, `.security/audit-allowlist.json`, `.nvmrc`, `eslint.config.mjs`, `scripts/audit-gate.mjs`, `tests/unit/audit-gate.test.mjs`, `docs/ci.md`, this file.

**Modified:** `package.json` (scripts, 2 dev dependencies, `shadcn` moved), `pnpm-lock.yaml`, `tests/support/stack/stack.mjs`, `docs/testing.md`, `ROAD-MAP-ARTAVEO.md`; and, for lint only, small edits in `components/site/json-ld.tsx`, `components/start/brief-builder.tsx`, `components/ui/patterns.tsx`, `components/admin/mfa-enrollment-panel.tsx`, `components/start/steps.tsx`, `app/[locale]/admin/(protected)/leads/[id]/page.tsx`, `types/cms.ts` (removed unused imports and stale disable comments; one added disable with its reason) and three test files.

## Tests

A dry-run of the whole pipeline was done as a **normal (non-root) user on a clean copy of the repository** (files as they would be checked out; dependencies from the lockfile), following the workflow's own commands:

| Gate | Result |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ (10 s) |
| Typecheck (`tsc --noEmit`) | ✅ clean |
| Lint | ✅ 0 errors, 82 warnings (the cap) |
| Content placeholders | ✅ |
| Unit (`npm run test:unit`) | ✅ **233 / 233** (224 + 9 new for the audit policy) |
| Integration (real PostgreSQL + PostgREST, started by `test:stack:up`) | ✅ **134 / 134** |
| Build + E2E via `pnpm run test:e2e` in CI mode (`CI=true`: one retry, HTML report) | ✅ **164 / 164** in 8.6 min, nothing flaky |
| Dependency gate | ✅ exit 0 (0 blocking, 4 allowed); ✅ exit 1 when one allowlist entry is removed |
| Secret scan | ✅ full history: no leaks |
| `actionlint` on the workflow | ✅ clean |

Running as a normal user found one real defect (the stack's temp directory was shared between users; fixed and re-run). **Not verified:** a run on GitHub's own runners (see *Known issues*), and the branch-protection and Vercel settings (they are outside the repository).

## Manual verification

1. **Push and watch the first run** (Actions tab). All four jobs should be green and `CI passed` last.
2. **Prove the gate blocks:** on a branch, break a test on purpose, open a pull request, and confirm `CI passed` is red and the merge button is disabled. Then fix it. (Without step 4 of *Before you push*, the button will still be enabled.)
3. Open a pull request from Dependabot when it arrives and check the same gates run on it.

## Known issues

1. **The workflow has not run on a GitHub-hosted runner.** It passes `actionlint`, and every command in it was run in this phase as a normal (non-root) user on a clean copy of the repository — but not on GitHub's image. The most likely first-run differences: PostgreSQL location (the workflow installs it if `/usr/lib/postgresql/*/bin/initdb` is absent), Playwright system libraries (`playwright install --with-deps`), and the pinned actions (their tags were read from the remote, their inputs were not test-run).
2. **The dependency audit needs the npm advisory service.** If it is down the job fails; re-run it.
3. **`--max-warnings=82` is a number to lower, not a target.** 66 of the 82 are `any` in two Supabase mapper files; generated database types would remove most of them.
4. **Four high advisories are allowed until 2026-12-19** (reasons in `.security/audit-allowlist.json`); the real fix is a Next.js update, which Dependabot will propose.
5. **The browser job is the longest (about 12–15 minutes)** because the suite shares one database and runs in one worker. Splitting it needs a database per worker.
6. Not in the pipeline: SAST/CodeQL, headers/CSP checks (Phase 23), alerting (Phase 24), performance budgets (Phase 25), visual regression.

## New debt

- A read-only smoke test of the Vercel preview.
- A database per Playwright worker, to shorten the browser job.
- Generated Supabase types (removes most lint warnings).
- Consider `packageManager` in `package.json` and a pinned `@base-ui/react`.

## Decisions needed

- **Do administrators go through the gate too** (branch protection "include administrators")?
- **Do agents push under a separate account** so their pull requests can require your approval?
- **Should Preview deployments have their own Supabase project?** (Strongly recommended.)

## Rollback

Delete `.github/`; nothing else depends on it. The lint and audit scripts are independent of the workflow and can stay. Reverting `package.json` restores `shadcn` under `dependencies` (and 13 high advisories in the production audit).

## Final status

**COMPLETE (code).** Pipeline written, `actionlint`-clean, and every step run as a normal user on a clean copy (233 unit, 134 integration and 164 browser tests, lint at 0 errors, dependency gate and secret scan passing). **Not verified:** the first run on GitHub, and the settings that make it binding (branch protection, Actions permissions, Vercel) — a pipeline without branch protection reports but blocks nothing.
Next in sequence: Phase 23 — Security Hardening (M3).
