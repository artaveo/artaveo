# Backup & Recovery (Phase 25; Neon since October 2026)

What protects the data, how to get it back — into the same project and into a brand-new one — and how to roll back a bad deploy or a bad migration.

## 1. What exists today

Since the move from Supabase (October 2026) the database, the files and admin sign-in all live in one Neon project, **`Artaveo`** (`calm-breeze-36870180`, `aws-ap-southeast-1`), branch **`main`**.

| Layer | What it is | Covers |
|---|---|---|
| **Instant restore** (Neon, built in) | Any branch can be restored to any moment inside the project's **history window** — 6 hours on the current plan (`history_retention_seconds = 21600`). | Database and Object Storage of the branch, Neon Auth's tables (they live in the same database). |
| **Snapshots** (Neon, built in) | A named, kept copy of a branch at one moment; restorable later, independent of the history window. Take one before every risky change (Console → Branches → `main` → Snapshots, or a schedule). | Same as above. |
| **External export** (Phase 25 code) | `pg_dump` of `public` + `scripts/backup/collect.mjs` (every stored file + a `manifest.json`: migrations, row counts, each admin's e-mail). | A copy outside Neon. |

**Honest gap:** Phase 25 described a daily GitHub workflow (`.github/workflows/backup.yml`) that runs the external export, encrypts it with `age` and tests a restore. **That workflow was never committed to this repository** — only `scripts/backup/collect.mjs` and `/api/ops/backup-report` were. Until it exists, the external export is something you run by hand (§ 4), and the `backup.*` alerts on `/admin/observability` stay silent because nothing reports in.

## 2. What is not backed up

- **Secrets** (`NEON_SERVICE_JWT_PRIVATE_KEY`, the storage credential, `CRON_SECRET`, …). Rotation, not backup — `docs/runbooks/secrets-rotation.md`.
- **Admin passwords.** Neon Auth's tables are in the database (instant restore and snapshots include them); the external export dumps `public` only, so a restore into a *new* project recreates the admin accounts by hand (§ 5b).
- **Vercel's own deployment artifacts.** Covered by § 6.

## 3. RPO / RTO

- **Inside the history window (6 hours):** RPO is effectively zero — restore to the second before the mistake. RTO: minutes (a branch restore).
- **Older than that:** as fresh as the latest snapshot or external export. Take snapshots on a schedule if real leads accumulate.
- **Disaster recovery into a new project** (§ 5b): several hours, most of it recreating admin accounts and secrets, not the restore itself.

Engineering estimates, not measured incident times.

## 4. Running the external export by hand

Needs `pg_dump` (PostgreSQL 17 client), Node 22+, the repo, and the production variables in `.env.local` (`DATABASE_URL`, `NEON_DATA_API_URL`, `NEON_SERVICE_JWT_*`, `NEON_STORAGE_*`). Use the **direct** connection string (without `-pooler`) for `pg_dump`.

```bash
pg_dump --schema=public --no-owner --no-privileges --format=custom -d "$DATABASE_URL" -f .backup-work/public.dump
node --env-file=.env.local --import ./scripts/register-ts-resolve.mjs scripts/backup/collect.mjs
```

You get `.backup-work/public.dump`, `.backup-work/storage/<bucket>/…` and `.backup-work/manifest.json`. Encrypt before it leaves your machine (e.g. `age`, see Phase 25's README), and keep it out of the repository (`.backup-work` is git-ignored).

## 5. Restore

### 5a. Into the *same* project (undo a bad migration or bad data)
1. **Inside the history window:** Neon Console → Branches → `main` → **Restore** → pick the moment just before the mistake. Neon keeps the pre-restore state as a backup branch, so the restore itself can be undone.
2. **From a snapshot:** Console → Branches → `main` → Snapshots → restore.
3. **From an external export:** `pg_restore --no-owner --no-privileges --clean --if-exists -d "$DATABASE_URL" public.dump` — this **overwrites** current data with the backup's (one table: add `--table=<name>`). Files under `storage/<bucket>/<path>` go back through `/admin/content/media` (the `media` bucket) or `neon buckets`; there is no bulk-restore tool, on purpose.
4. Check `manifest.json`'s `migrations` list against `db/migrations/` before deploying onto restored data.

### 5b. Disaster recovery into a *brand-new* Neon project
1. Create the project; on its `main` branch enable the **Data API** with an external JWKS provider (the `service-jwks` bucket's `jwks.json`, no default grants) and **Managed Better Auth**; create the buckets `media` (public_read), `inquiry-files` (private) and `service-jwks` (public_read), and a storage credential with `storage:read` + `storage:write`.
2. Apply `db/neon/prelude.sql`, then every file in `db/migrations/` in order — this recreates the schema, RLS, triggers and functions, empty.
3. `pg_restore --no-owner --no-privileges --data-only -d "<new DATABASE_URL>" public.dump`.
4. **Admin accounts, from `manifest.json`'s `admins` list:** for each `{id, role, email}` create a Neon Auth user with that e-mail (Console → Auth → Users), then re-point the row: `update public.admin_users set id = '<new user id>' where id = '<old id>';`. Two-factor needs re-enrolling (`/admin/security`).
5. Re-upload stored files from `storage/` (as in § 5a.3).
6. Set every `NEON_*` variable in Vercel to the new project's values (`docs/security.md` § 6) and redeploy.

## 6. Rollback (deployments and migrations)

**A bad deployment (Vercel):** the project is on Vercel's **Hobby** plan, which allows rolling back only to the *immediately previous* production deployment (`vercel rollback`, or the dashboard's Instant Rollback). Two bad deploys in a row → push a fix. Vercel does not restore old environment variables on rollback if they were since changed, and cron jobs revert to the rolled-back deployment's own `vercel.json`.

**A bad migration:** every file under `db/migrations/` carries its own `ROLLBACK:` block in its header comment — the exact statements to undo it. Run them in the Neon SQL Editor (or `psql "$DATABASE_URL"`), most recent first. Simpler, if it is still inside the history window: restore the branch to just before the migration (§ 5a.1). Best of all: **apply a risky migration to a Neon branch first** (`neon branches create`, test against it, then apply to `main`).

## 7. History

Until October 2026 the site ran on a Supabase free-plan project, which had no platform backups at all — the reason Phase 25 designed an external dump. The data was copied to Neon on 16 October 2026 and verified table by table (identical row hashes on both sides); `docs/updates/2026-10-16-neon-migration.md` records the move.
