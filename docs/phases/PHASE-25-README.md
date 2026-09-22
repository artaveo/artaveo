# Phase 25 — Backup & Recovery

**Status:** ✅ COMPLETE (code) — no migration; a real backup + restore test was run against the local stack (see *Manual verification*), not merely typechecked.
**Date:** 22 September 2026.
**Migration:** none.
**How it works, RPO/RTO, restore (same project and a brand-new one), and deployment/migration rollback:** `docs/runbooks/backup-restore.md`.

## Objective

Roadmap § Phase 25:
- decision per D-10 (resolved: free plan, no platform backups); a scheduled external `pg_dump` to separate storage is the minimum
- media metadata and storage objects included; content export
- RPO/RTO written down; a restore test is performed — a backup never restored is not verified
- rollback procedure for deployments and migrations; recovery runbook

## What was built

| Area | What |
|---|---|
| **Daily backup workflow** | `.github/workflows/backup.yml`: `pg_dump --schema=public --no-owner --no-privileges --format=custom` against the Session pooler connection string (the free plan's direct connection is IPv6-only; GitHub's runners are not), once a day. |
| **Storage export** | `scripts/backup/collect.mjs` downloads every object in both buckets (`media`, `inquiry-files`) with the service-role key — `pg_dump` never sees Storage; it only has `storage.objects` metadata, not file bytes. |
| **Restore manifest** | The same script writes `manifest.json`: applied migrations, per-table row counts (for the restore test), and — because `admin_users` (migration `0008`) is deliberately just `(id, role)` with `id` a foreign key into Supabase's own `auth.users`, which this backup does not dump — each admin's **e-mail**, resolved once via the Auth admin API while the project the backup is *of* still exists. Restoring into a brand-new project needs this; there is nowhere else to get it after the fact. |
| **Restore test** | Sundays, and every manual run: the plaintext `pg_dump` output — **before** it is ever encrypted — is restored into a throw-away local PostgreSQL inside the same job and every table's row count is checked against the manifest. This is what "a restore test is performed" means here: real evidence the dump restores cleanly, not merely that a file exists. |
| **Encryption** | `age` (pinned release, checksum-verified), to one or more recipients from the `BACKUP_AGE_PUBLIC_KEY` repository variable. The private key is never in GitHub — generated and kept by the owner (`docs/runbooks/backup-restore.md` § 4). The plaintext dump, exported files and unencrypted archive are deleted (`shred -u`, falling back to `rm`) inside the same step that encrypts, before the job's next step runs. |
| **Delivery** | The encrypted archive is a GitHub Actions artifact (35-day retention) — no new cloud storage dependency, no new credential beyond what backing up already needs. |
| **Reporting in** | `/api/ops/backup-report` (new): `CRON_SECRET`-authenticated, the same pattern `/api/ops/check` already uses. Records `backup.completed` / `backup.failed` / `backup.restore_verified` / `backup.restore_failed` as `ops_events` — no new table; Phase 24's store is exactly the right shape for this. |
| **Alerts** | Four new stateless rules (`lib/observability/alert-rules.ts`): `backup.failing` and `backup.stale` (errors — the last backup failed, or none has completed recently), `backup.restore_failed` (error — a backup exists but did not restore) and `backup.restore_stale` (warning — no verified restore recently). Same "only if it ever ran" convention `cron.stale` already established: a site that has never backed up yet is an onboarding step (§ 4 of the runbook), not a standing alert. |
| **Admin page** | Two new rows on `/admin/observability` → *Health*: *Last backup*, *Last verified restore* — with a hint pointing at the runbook when neither has ever run. Same component (`HealthRow`) the existing cron/monitor rows already use. |
| **Rollback procedure** | Not new code: every migration since `0001` already carries its own `ROLLBACK:` block; `docs/runbooks/backup-restore.md` § 6 is where that convention, plus Vercel Hobby's one-step-back deployment rollback, is written down as a procedure for the first time. |

## Decisions

1. **The restore test runs on the plaintext dump, before encryption — not on the encrypted artifact from a separate job.** The alternative (decrypt the just-uploaded `.age` file in a second job) needs a second `age` identity living in GitHub Actions secrets, which would have to be trusted and kept in sync with the owner's real one forever, to prove something `age` itself is well-tested at doing correctly. Testing the dump directly proves the thing that actually varies release to release — whether *this* schema's data restores cleanly — and is disclosed, not hidden, as the boundary of what the restore test covers (`docs/runbooks/backup-restore.md` § 5, "What the restore test does and does not prove").
2. **`auth.*` is not dumped.** Supabase's own migration docs say auth/storage schema changes need separate handling; this project makes none, and the one place `auth.users` matters (`admin_users.id`) is handled by resolving e-mails into the manifest instead (§ What was built).
3. **Storage restore is manual, not a bulk-write tool.** A "restore every object" feature is real additional surface area for something used only in an actual incident; `docs/runbooks/backup-restore.md` § 5 says the manual steps plainly instead.
4. **One report route, not a direct database write from the workflow.** The workflow already needs the service-role key (for Storage export), but writing `ops_events` straight from a YAML script would mean the shape of that table's row is decided in two places instead of one, and would skip the length caps and event-name validation the route already enforces for every other event source.
5. **Session pooler, not the direct connection**, for `pg_dump` — the free plan's direct connection is IPv6-only (Supabase's own docs) and GitHub-hosted runners are IPv4-only; documented in the runbook's § 4 so a future SUPABASE_DB_URL doesn't get set to the wrong one.

## Database

None. This phase adds no table, column or function — `ops_events` (`0021`) already fits `backup.*` events exactly, and the manifest lives inside the encrypted archive, not the database.

## Tests

- **Unit** (`tests/unit/observability-alerts.test.mjs`): the four new alert rules at their threshold and one step either side — a backup failure fires even on the very first run (unlike staleness, which needs a prior success to compare against), a later success clears an earlier failure, and the same for the restore-test pair. Wording present for both new severities, in both languages (existing "every rule has e-mail text" / "title and action in both languages" tests now cover 15 rules instead of 11 automatically). **447/447** (4 new), full suite.
- **Integration**: unaffected — no schema change, no new Server Action.
- **The gateway stand-in gained two real capabilities**, not stubs, to make `collect.mjs` actually testable rather than only typechecked: `POST /storage/v1/object/list/<bucket>` (recursive listing, folders reported as `id: null` the way real Storage does) and `GET /storage/v1/object/<bucket>/<path>` (authenticated download — carefully excluding the `public` bucket segment so it does not shadow the existing public-read route), plus `GET /auth/v1/admin/users/<id>` against the stack's own test accounts. **226/226** integration tests still pass after the change (nothing regressed the existing storage/auth paths).
- **`scripts/backup/collect.mjs` was run for real** against the local test stack with two seeded Storage objects under a nested prefix (`media/team/2026/photo.jpg`) — see *Manual verification*.
- **End-to-end** (`tests/e2e/observability.spec.ts`, all 32 tests, including axe on the admin page in `en`/`fa` × light/dark): green, unaffected by the two new health rows.
- Full `next build` against the stack: `/api/ops/backup-report` compiles and is listed as a real dynamic route.
- `pnpm run lint`: 0 errors, 82 warnings (unchanged cap — no new warning). `pnpm run typecheck`: 0 errors. `node scripts/check-content-placeholders.mjs`: passes (no content file touched).

## Manual verification

Real, not simulated — this sandbox has no network route to the live Supabase project, so everything below ran against the local test stack (`tests/support/stack`), the same one Phase 21 built:

1. Extended the stack's fake-Supabase gateway (see *Tests*) so it actually implements the three calls `collect.mjs` makes, rather than accepting the script only on trust.
2. Uploaded two real objects into the fake `media` bucket, one nested two levels deep (`team/2026/photo.jpg`), to exercise the recursive-listing path, not just a flat bucket.
3. Ran `scripts/backup/collect.mjs` directly against the running stack. Result: `collected: 2 storage object(s) across 2 bucket(s), 2 admin(s), 21 table row count(s)` — both files downloaded byte-correct to `storage/media/...`, `manifest.json` listed both test accounts' real e-mails (`owner@test.artaveo.dev`, `editor@test.artaveo.dev`) against their roles, and 21 tables' row counts matched the seeded content exactly.
4. The GitHub Actions workflow itself (`.github/workflows/backup.yml`) — the `pg_dump`/`pg_restore`/`age` steps, the PGDG apt repository, the daily and weekly scheduling — is **not** run for real (no GitHub Actions runner in this sandbox): the YAML and every embedded bash block were syntax-checked (`bash -n`), and the logic they encode (phase tracking, the failure-report trap, the restore-test gate) was designed and reviewed but not executed end-to-end. This is the same category of gap Phase 22 disclosed for `ci.yml`'s first real run.

## Known issues

- **The workflow's own execution is unverified** (see *Manual verification*, last point). Watch its first scheduled run (or run it manually via *Actions → Backup → Run workflow*) and read the job log before trusting it unattended.
- **`pg_dump`/`pg_restore` version.** The workflow installs PostgreSQL 17 client and server packages via the PGDG apt repository to match the live project's Postgres 17 — this is the officially documented method (`apt.postgresql.org`, key fetched over HTTPS), not pinned by checksum the way `postgrest`/`gitleaks` are in `ci.yml`, because PGDG's signing key is not a static release asset. If Supabase's Postgres major version ever changes, this needs updating alongside it.
- **No live rehearsal of disaster recovery into a genuinely new Supabase project** (`docs/runbooks/backup-restore.md` § 5b) — written from Supabase's own documented restore mechanics and this project's own migrations, not run against a real second project.

## New debt

- A live run of `.github/workflows/backup.yml` (see *Known issues*) — owner-only, needs the GitHub secrets/variables in `docs/runbooks/backup-restore.md` § 4.
- No independent verification of `age` decryption within CI (a deliberate trade-off, see *Decisions* #1) — the owner should decrypt one real archive by hand at least once to confirm the private key works before it is ever needed in an actual incident.

## Decisions needed

None — D-10 was already resolved (13 September 2026); this phase is that decision's disclosed follow-up, not a new one.

## Rollback

Nothing to roll back in code (no migration, no new runtime dependency added to `package.json`). To remove the workflow itself: delete `.github/workflows/backup.yml`, `app/api/ops/backup-report/`, `scripts/backup/`, and revert the alert-rule / i18n / admin-page additions listed under *Files changed* below.

## Files changed

- `.github/workflows/backup.yml` (new)
- `app/api/ops/backup-report/route.ts` (new)
- `scripts/backup/collect.mjs` (new)
- `docs/runbooks/backup-restore.md` (new)
- `docs/phases/PHASE-25-README.md` (new, this file)
- `docs/security.md` (§ 8, residual risk 7 updated from "are Phase 25" to built + linked)
- `lib/observability/alert-rules.ts`, `lib/observability/alerts.ts` (four new alert rules and facts)
- `app/[locale]/admin/(protected)/observability/page.tsx` (two new health rows)
- `messages/en.json`, `messages/fa.json` (14 new keys each: 4 alerts × 2 + 2 health rows × 2 + 2 hints)
- `tests/unit/observability-alerts.test.mjs` (extended for the four new rules)
- `tests/unit/security-static.test.mjs` (the new route added to the existing `checkCronAuth` check)
- `tests/support/stack/gateway.mjs` (Storage `list`, authenticated download, Auth admin `getUserById` — real capabilities, not stubs, so `collect.mjs` is genuinely testable locally)

## Final status

**COMPLETE (code).** Owner-only setup remains before the workflow does anything live: the GitHub secrets and variable in `docs/runbooks/backup-restore.md` § 4, generating the `age` key pair, and watching the first real run. Next phase in sequence: **Phase 26 — Performance & Accessibility Certification** (M3's last phase).
