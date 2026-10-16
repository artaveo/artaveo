#!/usr/bin/env node
/**
 * Phase 25 — the two things `pg_dump` cannot give a backup on its own (Neon since October 2026):
 *
 *  1. Storage OBJECTS. A dump of the database never contains the files: they live in Neon
 *     Object Storage buckets, not in Postgres. This script downloads every object in both
 *     buckets (`media`, `inquiry-files`) with the app's storage credential and writes it to
 *     disk at `<bucket>/<path>`.
 *
 *  2. A restore MANIFEST. `admin_users` is deliberately just `(id, role, …)`, and `id` is the
 *     admin's Neon Auth account, which lives in Neon's own `neon_auth` schema. Restoring
 *     `public` into a brand-new project therefore needs to know which EMAIL each `admin_users`
 *     row belonged to, so the owner can recreate that account first and remap the id — see
 *     docs/runbooks/backup-restore.md § Restore. This script resolves each admin's email
 *     once, here, while the original project still exists (the manifest is encrypted with the
 *     rest of the backup).
 *
 * Run with the app's own database client, so it needs the server env (NEON_DATA_API_URL,
 * NEON_SERVICE_JWT_PRIVATE_KEY / _KID, NEON_STORAGE_*) and the module hook:
 *
 *   node --import ./scripts/register-ts-resolve.mjs scripts/backup/collect.mjs
 *
 * Output: OUT_DIR (default ./.backup-work), which is tarred alongside the `pg_dump` file
 * before encrypting.
 */
import fs from 'node:fs'
import path from 'node:path'

const OUT_DIR = process.env.OUT_DIR ?? path.join(process.cwd(), '.backup-work')

const { getDbClient } = await import('../../lib/db/server.ts')
const db = getDbClient()
if (!db) {
  console.error('collect.mjs: NEON_DATA_API_URL, NEON_SERVICE_JWT_PRIVATE_KEY and NEON_SERVICE_JWT_KID are required')
  process.exit(1)
}

// Every bucket this app writes to (configured on the Neon branch) — kept as a literal list, so a
// bucket added or renamed is a visible diff here, not a silent gap.
const BUCKETS = ['media', 'inquiry-files']

// The tables a restore is worth checking against (every table with real content or leads —
// admin/audit tables are counted via the manifest's own admin list instead). Kept as a literal
// list, same reasoning as BUCKETS: a new table needs a deliberate line here, not silent coverage.
const ROW_COUNT_TABLES = [
  'inquiries', 'inquiry_events', 'consultations', 'recommendations', 'recommendation_requests',
  'articles', 'projects', 'project_sections', 'project_media', 'services', 'service_packages',
  'service_addons', 'engagement_models', 'faqs', 'technologies', 'media_assets', 'navigation_items',
  'site_settings', 'notification_outbox', 'audit_log', 'admin_users',
]

async function downloadBucket(bucket) {
  const destRoot = path.join(OUT_DIR, 'storage', bucket)
  let count = 0
  let bytes = 0

  async function walk(prefix) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000 })
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`)
    for (const entry of data ?? []) {
      const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name
      // `list` returns folders as entries with `id: null` and no `metadata` (lib/db/storage.ts).
      if (entry.id === null) {
        await walk(entryPath)
        continue
      }
      const { data: file, error: downloadError } = await db.storage.from(bucket).download(entryPath)
      if (downloadError) throw new Error(`download ${bucket}/${entryPath}: ${downloadError.message}`)
      const dest = path.join(destRoot, entryPath)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      const buffer = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(dest, buffer)
      count += 1
      bytes += buffer.length
    }
  }

  await walk('')
  return { bucket, count, bytes }
}

async function adminManifest() {
  // Neon Auth keeps the accounts in its own schema; 0023's service-only function returns
  // the e-mail of each ADMIN, nothing else.
  const { data, error } = await db.from('admin_users').select('id, role, created_at')
  if (error) throw new Error(`admin_users: ${error.message}`)
  const { data: emails, error: emailError } = await db.rpc('admin_user_emails')
  if (emailError) throw new Error(`admin_user_emails: ${emailError.message}`)
  const emailById = new Map((emails ?? []).map((row) => [row.id, row.email]))
  return (data ?? []).map((row) => ({ id: row.id, role: row.role, createdAt: row.created_at, email: emailById.get(row.id) ?? null }))
}

async function rowCounts() {
  const counts = {}
  for (const table of ROW_COUNT_TABLES) {
    const { count, error } = await db.from(table).select('id', { count: 'exact', head: true })
    if (error) throw new Error(`row count ${table}: ${error.message}`)
    counts[table] = count ?? 0
  }
  return counts
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const storage = []
  for (const bucket of BUCKETS) storage.push(await downloadBucket(bucket))

  const [admins, tableRowCounts] = await Promise.all([adminManifest(), rowCounts()])

  const manifest = {
    generatedAt: new Date().toISOString(),
    // Which migration files the backup's `pg_dump` was taken against — cross-check this list
    // against `db/migrations/` before restoring an old backup into a project on a newer schema.
    migrations: fs.readdirSync(path.join(process.cwd(), 'db/migrations')).filter((f) => f.endsWith('.sql')).sort(),
    gitSha: process.env.GITHUB_SHA ?? null,
    admins,
    tableRowCounts,
    storage: Object.fromEntries(storage.map(({ bucket, count, bytes }) => [bucket, { objects: count, bytes }])),
  }
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

  const totalObjects = storage.reduce((sum, s) => sum + s.count, 0)
  console.log(`collected: ${totalObjects} storage object(s) across ${BUCKETS.length} bucket(s), ${admins.length} admin(s), ${Object.keys(tableRowCounts).length} table row count(s)`)
}

main().catch((err) => {
  console.error('collect.mjs failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
