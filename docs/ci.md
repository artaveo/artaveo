# CI/CD and release gates (Phase 22)

**One rule:** nothing reaches `main` without passing every gate below, and only `main` is deployed to production. The gates run automatically on every pull request and on every push to `main` (`.github/workflows/ci.yml`).

```text
INSTALL → TYPECHECK → LINT → UNIT → INTEGRATION → BUILD → E2E → SECURITY → DEPLOY
└──────── job "verify" ───────┘   │              └── job "e2e" ──┘   │        (Vercel)
                          job "integration"                  job "security"
```

The four jobs run **in parallel**; a fifth, **`CI passed`**, waits for all of them and fails if any did not succeed (skipped and cancelled count as failed). **`CI passed` is the only status check branch protection has to require** — jobs can be renamed or added without touching the protection rule.

| Gate | What it checks | Blocks on | Roughly |
|---|---|---|---|
| Install | `pnpm install --frozen-lockfile` — resolution never happens in CI | a lockfile that does not match `package.json` | 1 min |
| Typecheck | `tsc --noEmit` (whole project, tests included) | any error | 1 min |
| Lint | ESLint with `eslint-config-next` | any **error**; warnings may not **grow** (below) | 1 min |
| Content | no `[PLACEHOLDER]` in published copy (`scripts/check-content-placeholders.mjs`) | any placeholder | seconds |
| Unit | `npm run test:unit` — includes dictionary parity and the audit-policy tests | any failure | 1 min |
| Integration | real PostgreSQL + PostgREST: RLS, constraints, triggers, the real Server Actions | any failure | 3 min |
| Build + E2E | a production build against the test stack, then the browser and accessibility suites (desktop + phone) | any failure, and any browser error raised during any test | 12–15 min |
| Security | dependency advisories (policy below) and a secret scan of the whole git history | a new high/critical advisory; any secret | 2 min |
| Deploy | Vercel's Git integration (below) | — | — |

## One-time settings (they cannot be set from the repository)

### GitHub → Settings → Branches → branch protection rule for `main`

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging → add **`CI passed`** (and ✅ *Require branches to be up to date before merging*)
- ✅ Require conversation resolution before merging
- ✅ Do not allow force pushes; ✅ do not allow deletions
- Optional, and worth deciding: ✅ *Require review from Code Owners* (`.github/CODEOWNERS`). GitHub does not let you approve a pull request **you** opened, so as a solo owner either leave approvals at 0, or have agents (v0, Claude) push under a separate account so their pull requests need your approval — that is what makes "agents work through pull requests" a control and not just a habit.
- Decide whether **administrators are included**. Included = you go through the same gate in an emergency; not included = you can bypass it, and a bypass should be the exception you can explain.

### GitHub → Settings → Actions → General

- Workflow permissions: **Read repository contents** (the workflow asks for nothing more).
- Fork pull-request workflows: **Require approval for all outside collaborators**.
- (Recommended) Settings → Code security: enable **Secret scanning + push protection** and **Dependabot alerts**. The pipeline's own scan is the second line, not the first.

### Vercel

- Git integration on, **Production Branch = `main`**. Vercel then builds every pull request as a **preview** and deploys `main` to production — the DEPLOY stage. Because `main` only receives commits that passed the gates, a failing gate blocks the release.
- Optional: *Deployment Checks* (where your plan has them) can additionally hold a production deployment until the `CI passed` check is green.
- **Check what Preview deployments are pointed at.** If the Preview environment uses the same Supabase project and keys as Production, every preview writes to the real database. Give Preview its own Supabase project (or at least its own keys) before opening the site's forms on previews.

## What the pipeline needs — nothing secret

No secrets are configured for CI. The tests run against a throw-away local database with test-only keys (`docs/testing.md`), never against the real Supabase project. If you ever add a secret to the workflow, the pull-request-from-fork rule above matters.

## Running the same thing locally

```bash
pnpm install --frozen-lockfile
npm run verify              # typecheck + lint + content + unit  (≈ the "verify" job)
npm run check:audit         # dependency policy (≈ half of "security"; needs the network)

npm run test:stack:up       # PostgreSQL + PostgREST + gateway (needs the binaries — docs/testing.md)
npm run test:integration    # ≈ the "integration" job
npm run test:stack:build && npm run test:e2e     # ≈ the "e2e" job
npm run test:stack:down
```

`pnpm exec eslint <file>` lints one file.

## When it fails

- **Open the run → the failed job → the step.** For the browser and integration jobs an artifact is attached on failure: `e2e-report` (HTML report with traces, screenshots, the stack logs) or `integration-stack-logs`. `pnpm exec playwright show-report` opens the report; `pnpm exec playwright show-trace <trace.zip>` opens a trace.
- **Reproduce one spec:** `npx playwright test -c tests/e2e/playwright.config.ts brief-builder.spec.ts --project=desktop`.
- **CI retries a failing browser test once.** A test that passes only on the retry is reported as *flaky* — treat that as a bug in the test or the app and fix it within the week. Do not `.skip` a test without a written reason and an issue.
- **Never "fix" a red gate by loosening it** (raising the lint cap, extending an allowlist expiry, deleting an assertion) without saying why in the pull request.

## The three ratchets

1. **Lint warnings may not grow.** `package.json` → `"lint": "eslint . --max-warnings=N"`. Errors are never allowed. When you fix warnings, lower `N` in the same pull request. The categories and reasons are at the top of `eslint.config.mjs`.
2. **Dependency advisories.** A **high or critical** advisory in the production tree (or a **critical** one in dev tooling) blocks the merge unless `.security/audit-allowlist.json` lists it **with a reason and a review date**. When the date passes, the gate fails again so the judgement is repeated. An entry whose advisory has disappeared is reported as stale — delete it. Rules: `scripts/audit-gate.mjs` (tested in `tests/unit/audit-gate.test.mjs`). The audit needs the npm advisory service; if it cannot be reached the gate **fails** (an unavailable check is not a passed check) — re-run the job.
3. **Everything pinned.** Actions are pinned to a commit SHA (the tag is in the comment); PostgREST and gitleaks are downloaded at a fixed version and verified against a fixed sha256; dependencies come from the lockfile. **Dependabot** (`.github/dependabot.yml`) proposes updates as pull requests that must pass the same gates — minor and patch weekly in one group, every major on its own.

## If the secret scan fires

Assume the secret is compromised. **Rotate it first** (Supabase key, provider key, `CRON_SECRET`…), then remove it from history if you want to — removing it from history does not un-leak it. Only add a path or a rule to `.gitleaks.toml` for a genuine false positive, with a comment saying why.

## Not covered (deliberately)

- **Deploying from the workflow.** Vercel does it; the workflow only decides what may reach `main`.
- **Browser tests against the Vercel preview.** They run against the app built inside the job and a local database. A preview points at a real database; running the suite there would write test data to it. A read-only smoke test of a preview is possible later.
- **Static analysis for security (CodeQL or similar), headers/CSP checks, rate-limit tests** → Phase 23.
- **Log/error alerting when a deployed site breaks** → Phase 24. **Performance budgets** → Phase 25.
- **Visual regression** — the suite does not compare pixels (fonts are stubbed offline).
