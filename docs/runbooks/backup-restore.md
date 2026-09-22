# Backup & Recovery (Phase 25)

What gets backed up, how often, how to restore it — into the same project and into a brand-new one — and how to roll back a bad deploy or a bad migration. Where this file and `.github/workflows/backup.yml` disagree, the workflow has the actual behaviour; this file explains it.

## 1. Why an external dump at all

D-10's decision, recorded when the Supabase project was created: the **free plan has no platform backups** — no point-in-time recovery, nothing in *Database → Backups*. Revision 21 flagged this as follow-up ("the free plan has no platform backups — Phase 25's external dump (or a plan upgrade) is needed before real leads accumulate"). This phase is that dump. It does not replace upgrading the Supabase plan if that ever makes sense; it is what exists instead of that, today.

## 2. What is backed up, and what is not

| Backed up | How |
|---|---|
| Every table in the `public` schema | `pg_dump --schema=public --no-owner --no-privileges --format=custom` |
| Every object in Storage (`media`, `inquiry-files`) | downloaded with the service-role key, `scripts/backup/collect.mjs` |
| Which migrations the dump was taken against, table row counts, and each `admin_users` row's e-mail (see § 5 for why) | `scripts/backup/collect.mjs` → `manifest.json`, inside the same archive |

**Deliberately not backed up:**
- **`auth.*`** (Supabase's own schema). It is platform-managed; Supabase's own docs (`supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore`) say auth/storage schema changes need separate care, and this project makes none — `admin_users.id` is the only place `auth.users` is referenced (migration `0008`). Restoring `public` into the *same* project never touches auth, so this only matters for a new-project disaster recovery (§ 5).
- **Secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, …). Rotation, not backup — `docs/runbooks/secrets-rotation.md`.
- **Vercel's own deployment artifacts.** Covered by § 6, not this backup.

## 3. RPO / RTO

- **RPO (Recovery Point Objective): 24 hours.** The workflow runs once a day (`03:17 UTC`). Anything written after the last successful run and lost before the next one is the real, disclosed exposure — there is no continuous replication on the free plan.
- **RTO (Recovery Time Objective): under an hour for restoring into the *same* project** (§ 4) by someone with the decrypted archive and `psql`/`pg_restore` on their machine. **Several hours for disaster recovery into a *new* project** (§ 5) — most of that is Supabase provisioning a new project and the owner recreating Auth users by hand, not the restore itself.

These are engineering estimates, not measured incident times — the same category as Phase 24's alert thresholds (`docs/observability.md`).

## 4. Setup (owner, once)

**Generate a key pair** (needs [`age`](https://github.com/FiloSottile/age) — `brew install age` / `apt install age`, or download a release):
```
age-keygen -o artaveo-backup-key.txt
```
This prints a line starting `Public key: age1…`. **Keep `artaveo-backup-key.txt` somewhere durable and offline** — a password manager, an encrypted USB drive, printed and locked in a drawer. Without it, every backup this workflow ever produces is unreadable, by design. GitHub never sees it.

**In the repository** (Settings → Secrets and variables → Actions):

| Kind | Name | Value |
|---|---|---|
| Secret | `SUPABASE_DB_URL` | The **Session pooler** connection string (Supabase dashboard → Connect → *Session pooler*), with the database password filled in. Not the direct connection: the free plan's direct connection is IPv6-only and GitHub's runners are IPv4-only. |
| Secret | `SUPABASE_SERVICE_ROLE_KEY` | Same key already in Vercel (`docs/security.md` § 6). Used here read-only: listing/downloading Storage objects and reading `admin_users` + Auth e-mails. |
| Secret | `CRON_SECRET` | The same value already in Vercel and in this repository's Actions secrets for `uptime.yml` — reused so the workflow can report in to `/api/ops/backup-report` (no new server secret). |
| Variable | `BACKUP_AGE_PUBLIC_KEY` | The `age1…` public key from above. Multiple recipients: one per line (e.g. add a second person's key later without re-keying anything already backed up). |
| Variable | `SITE_URL` | Only if not already set for `uptime.yml`. |

Nothing above lets GitHub Actions — or anyone reading its logs — decrypt a backup, run a mutating statement against the real database, or see a Storage file's *contents* in a log. `SUPABASE_DB_URL` and `SUPABASE_SERVICE_ROLE_KEY` are read access only; the workflow never runs an `insert`/`update`/`delete` against the real project.

## 5. Restore

**First, always:** `age -d -i artaveo-backup-key.txt -o artaveo-backup.tar.gz artaveo-backup-<stamp>.tar.gz.age`, then `tar xzf artaveo-backup.tar.gz` — you get `public.dump`, `manifest.json`, `storage/`.

### 5a. Into the *same*, still-existing project (the ordinary case: undo a bad migration or bad data, not a lost project)
1. `pg_restore --no-owner --no-privileges --clean --if-exists -d "$SUPABASE_DB_URL" public.dump` — `--clean --if-exists` drops and recreates each object, so this **overwrites** current data with the backup's. Confirm you mean that first (a narrower restore — one table — is the same command with `--table=<name>`).
2. Storage: for anything under `storage/<bucket>/<path>` you need back, re-upload it — through `/admin/content/media` (the `media` bucket) or the owner-only download/replace flow for `inquiry-files`, not by writing into Supabase Storage directly. There is no bulk-restore tool for Storage; this is a manual, per-file step, disclosed rather than automated away.
3. Check `manifest.json`'s `migrations` list against `db/migrations/` on the branch you are restoring onto. If the backup is older than a migration that has since run, apply that migration to the restored data (or restore onto a `main` checked out at the matching commit) before deploying.

### 5b. Disaster recovery into a *brand-new* Supabase project (the old one is gone or unusable)
This is the several-hours path, and the one step pg_dump genuinely cannot do for you:
1. Create the new project; note its URL and get its service-role key.
2. Apply every file in `db/migrations/` in order (same as `tests/support/stack/stack.mjs up` does against the test stack, or by hand with `psql`) — this recreates the schema, RLS, triggers and functions, empty.
3. `pg_restore --no-owner --no-privileges --data-only -d "<new SUPABASE_DB_URL>" public.dump` (`--data-only`: the schema already exists from step 2 with `db/migrations/`'s own, current constraints — restoring the dump's *schema* too would fight them).
4. **Auth, by hand, from `manifest.json`'s `admins` list.** For each `{id, role, email}`: in the new project's dashboard, invite/create an Auth user with that exact `email`. Supabase assigns it a **new** id — it will not match the old `id` in the restored `admin_users` row. Run, per admin:
   ```sql
   update public.admin_users set id = '<new-auth-user-id>' where id = '<old-id>';
   ```
   (The foreign key means this must happen before anything else references the row, and after step 3's data is in, not before.) This is why the manifest carries e-mails at all — `admin_users` itself (migration `0008`) deliberately stores only `(id, role)`.
5. Re-upload Storage objects from `storage/` (same manual step as § 5a.2).
6. Point Vercel's `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` at the new project (`docs/runbooks/secrets-rotation.md` has the "copy into Vercel, redeploy" mechanics). Redeploy.
7. Sign in at `/admin/login` with the recreated owner account; MFA (optional, `/admin/security`) needs re-enrolling — a new Auth user has no factor.

### What the restore test does and does not prove
Every Sunday, and on every manual run of the workflow, `.github/workflows/backup.yml` restores that run's own `public.dump` into a throw-away local PostgreSQL (inside the GitHub-hosted runner, gone when the job ends) and checks every table's row count against the manifest — **before** the dump is ever encrypted, so the test proves exactly what gets encrypted. This is real evidence the dump is restorable and complete, not merely present. What it does **not** exercise: decrypting an actual `.age` archive (the test runs on the plaintext dump, deliberately — see the workflow's own header comment for why), Storage re-upload (§ 5a.2 is manual by design), or the § 5b auth-remap procedure, which only a real second project can really test.

## 6. Rollback (deployments and migrations)

**A bad deployment (Vercel):** the project is on Vercel's **Hobby** plan, which allows rolling back only to the *immediately previous* production deployment (`vercel rollback`, or the dashboard's Instant Rollback) — not to an arbitrary earlier one. If the previous deployment is already the broken one (two bad deploys in a row), the only path is pushing a fixed commit, not a further rollback. Vercel does not restore old environment variables on rollback if they were since changed, and cron jobs revert to the rolled-back deployment's own `vercel.json`.

**A bad migration:** every file under `db/migrations/` carries its own `ROLLBACK:` block in its header comment (a convention every migration since `0001` follows) — the exact statements to undo it, in order, written when the migration was written, not reconstructed after the fact. Run them by hand with `psql "$SUPABASE_DB_URL"` (or the Supabase SQL editor), most-recent migration first if more than one needs undoing. A migration's rollback assumes nothing later depends on what it removes — check the migrations after it before rolling one back out of order.

## 7. What this phase does not build, disclosed rather than silently skipped
- **Point-in-time recovery.** This is daily snapshots, not continuous replication — the RPO in § 3 is the real gap, not a rounding error.
- **Automated Storage restore.** § 5a.2 / § 5b.5 are manual on purpose: a bulk-write tool for Storage is real, additional surface area for a feature used only in an actual incident.
- **A second, independent decryption key for routine testing.** The restore test (§ 5, "What the restore test does and does not prove") deliberately runs before encryption rather than adding a second `age` identity that would have to be trusted and kept in sync with the owner's real one.
- **A live rehearsal of § 5b** (disaster recovery into a genuinely new project). Not verifiable without actually standing one up; the procedure is written from Supabase's own documented restore mechanics (§ 5b) and the schema this project's own migrations define, not run end-to-end.
