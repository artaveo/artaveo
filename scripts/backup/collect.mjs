#!/usr/bin/env node
/**
 * Phase 25 — the two things `pg_dump` cannot give a backup on its own:
 *
 *  1. Storage OBJECTS. `pg_dump -n public` (what `.github/workflows/backup.yml` runs) never
 *     touches `storage.*` — Supabase manages that schema — and even a dump of `storage.objects`
 *     would only be metadata: the file bytes live in Supabase Storage, not in Postgres. This
 *     script downloads every object in both buckets (`media`, `inquiry-files`) with the
 *     service-role key and writes it to disk at `<bucket>/<path>`.
 *
 *  2. A restore MANIFEST. `admin_users` (migration 0008) is deliberately just `(id, role)` —
 *     `id` is a foreign key into `auth.users`, which this backup does NOT dump (Supabase's own
 *     auth schema is platform-managed; restoring it by hand is exactly the kind of thing
 *     https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore warns
 *     needs its own care). Restoring `public` into a brand-new project therefore needs to know
 *     which EMAIL each `admin_users` row belonged to, so the owner can recreate that Supabase
 *     Auth user first and remap the id — see docs/runbooks/backup-restore.md § Restore. This
 *     script resolves each admin's email once, here, while the original project still exists,
 *     and never again (the manifest is encrypted with the rest of the backup, same as everything
 *     else this phase produces — see the workflow for the `age` step).
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server-only; never the anon key — this needs to
 * bypass RLS and call the Auth admin API). Output: OUT_DIR (default ./.backup-work), which the
 * workflow tars alongside the `pg_dump` file before encrypting.
 */
import fs from 'node:fs'
import path from 'node:path'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OUT_DIR = process.env.OUT_DIR ?? path.join(process.cwd(), '.backup-work')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('collect.mjs: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// Every bucket this app creates (0012, 0020) — kept as a literal list, not a `storage.buckets`
// query, so a bucket renamed or removed in a migration is a visible diff here, not a silent gap.
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
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`)
    for (const entry of data ?? []) {
      const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name
      // The Storage API's `list` returns folders as entries with `id: null` and no `metadata`.
      if (entry.id === null) {
        await walk(entryPath)
        continue
      }
      const { data: file, error: downloadError } = await supabase.storage.from(bucket).download(entryPath)
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
  const { data, error } = await supabase.from('admin_users').select('id, role, created_at')
  if (error) throw new Error(`admin_users: ${error.message}`)
  const admins = []
  for (const row of data ?? []) {
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(row.id)
    if (userError) throw new Error(`auth user ${row.id}: ${userError.message}`)
    admins.push({ id: row.id, role: row.role, createdAt: row.created_at, email: user.user?.email ?? null })
  }
  return admins
}

async function rowCounts() {
  const counts = {}
  for (const table of ROW_COUNT_TABLES) {
    const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true })
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
