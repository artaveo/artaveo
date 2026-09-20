#!/usr/bin/env node
/**
 * The local test stack (Phase 21).
 *
 *   node tests/support/stack/stack.mjs up      start everything, write .test-stack/env.json
 *   node tests/support/stack/stack.mjs down     stop everything
 *   node tests/support/stack/stack.mjs status   is it up?
 *   node tests/support/stack/stack.mjs build    `next build` against the stack (offline-safe fonts)
 *   node tests/support/stack/stack.mjs reset    empty the tables the suites write to
 *
 * `up` starts, in order: a throw-away PostgreSQL cluster → applies shim.sql and
 * db/migrations/*.sql (unchanged) → imports the real site content with
 * scripts/import-content-to-db.ts → adds the test admins and fixtures → PostgREST
 * → the gateway (gateway.mjs), which is the one URL the app and the tests use as
 * SUPABASE_URL. It replaces the hand-built setup Phase 20 described.
 *
 * Needs on the machine: PostgreSQL 15+ server binaries (initdb, pg_ctl, psql) and
 * a PostgREST binary. Override discovery with PG_BIN / POSTGREST_BIN. Everything
 * else is Node. Ports: PG 54329, PostgREST 3111, gateway 54321
 * (ARTAVEO_TEST_PG_PORT / _PGRST_PORT / _GATEWAY_PORT).
 */
import { spawn, spawnSync, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { accounts } from './accounts.mjs'
import { createGateway } from './gateway.mjs'
import { roleKey } from './jwt.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../..')
const STATE_DIR = path.join(ROOT, '.test-stack')
const ENV_FILE = path.join(STATE_DIR, 'env.json')
// One directory per user: a run by another account (or by root, in a container) never collides with this one.
const WORK_DIR = path.join(os.tmpdir(), `artaveo-test-stack-${typeof process.getuid === 'function' ? process.getuid() : 'x'}`)
const PGDATA = path.join(WORK_DIR, 'pgdata')

const PG_PORT = Number(process.env.ARTAVEO_TEST_PG_PORT ?? 54329)
const PGRST_PORT = Number(process.env.ARTAVEO_TEST_PGRST_PORT ?? 3111)
const GATEWAY_PORT = Number(process.env.ARTAVEO_TEST_GATEWAY_PORT ?? 54321)
const DB_NAME = 'artaveo_test'
const JWT_SECRET = 'artaveo-test-only-jwt-secret-not-for-real-use-0123456789'

const isRoot = typeof process.getuid === 'function' && process.getuid() === 0

// ---------------------------------------------------------------------------
// helpers

function findPgBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN
  const base = '/usr/lib/postgresql'
  if (fs.existsSync(base)) {
    const versions = fs.readdirSync(base).filter((v) => /^\d+$/.test(v)).sort((a, b) => Number(b) - Number(a))
    for (const version of versions) {
      const candidate = path.join(base, version, 'bin')
      if (fs.existsSync(path.join(candidate, 'initdb'))) return candidate
    }
  }
  const which = spawnSync('which', ['initdb'], { encoding: 'utf8' })
  if (which.status === 0) return path.dirname(which.stdout.trim())
  throw new Error('PostgreSQL server binaries not found. Install postgresql (15+) or set PG_BIN.')
}

function findPostgrest() {
  if (process.env.POSTGREST_BIN) return process.env.POSTGREST_BIN
  const which = spawnSync('which', ['postgrest'], { encoding: 'utf8' })
  if (which.status === 0) return which.stdout.trim()
  throw new Error('PostgREST binary not found. Download one from github.com/PostgREST/postgrest/releases or set POSTGREST_BIN.')
}

const PG_BIN = () => findPgBin()

/** PostgreSQL refuses to run as root; when the suite is (a container), drop to the `postgres` user. */
function asPostgres(command, args, options = {}) {
  if (isRoot) return spawnSync('runuser', ['-u', 'postgres', '--', command, ...args], { encoding: 'utf8', ...options })
  return spawnSync(command, args, { encoding: 'utf8', ...options })
}

function must(result, what) {
  if (result.status !== 0) throw new Error(`${what} failed:\n${result.stdout ?? ''}\n${result.stderr ?? ''}`)
  return result
}

function psql(database, args, input) {
  const result = spawnSync(
    path.join(PG_BIN(), 'psql'),
    ['-X', '-q', '-h', '127.0.0.1', '-p', String(PG_PORT), '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1', ...args],
    { encoding: 'utf8', input, maxBuffer: 64 * 1024 * 1024 },
  )
  return must(result, `psql ${args.join(' ')}`)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(check, what, timeoutMs = 30000) {
  const start = Date.now()
  for (;;) {
    try {
      if (await check()) return
    } catch {
      // keep waiting
    }
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${what}`)
    await sleep(200)
  }
}

function pidFile(name) {
  return path.join(STATE_DIR, `${name}.pid`)
}

function killFromPidFile(name) {
  try {
    const pid = Number(fs.readFileSync(pidFile(name), 'utf8'))
    if (pid) process.kill(pid, 'SIGTERM')
  } catch {
    // not running
  }
  fs.rmSync(pidFile(name), { force: true })
}

function spawnDetached(name, command, args, env) {
  fs.mkdirSync(STATE_DIR, { recursive: true })
  const log = fs.openSync(path.join(STATE_DIR, `${name}.log`), 'a')
  const child = spawn(command, args, { detached: true, stdio: ['ignore', log, log], env: { ...process.env, ...env } })
  child.unref()
  fs.writeFileSync(pidFile(name), String(child.pid))
  return child.pid
}

export function stackEnv() {
  const anon = roleKey('anon', JWT_SECRET)
  const service = roleKey('service_role', JWT_SECRET)
  return {
    SUPABASE_URL: `http://127.0.0.1:${GATEWAY_PORT}`,
    SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: service,
    INQUIRY_IP_HASH_SECRET: 'test-only-ip-hash-secret',
    EMAIL_PROVIDER: 'console',
    CRON_SECRET: 'test-only-cron-secret-0123456789',
    NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3100',
    // Postgres access for the few checks that need raw SQL (triggers, rollbacks).
    ARTAVEO_TEST_DATABASE: DB_NAME,
    ARTAVEO_TEST_PG_PORT: String(PG_PORT),
    ARTAVEO_TEST_PG_BIN: PG_BIN(),
    ARTAVEO_TEST_PGRST_URL: `http://127.0.0.1:${PGRST_PORT}`,
    ARTAVEO_TEST_GATEWAY_URL: `http://127.0.0.1:${GATEWAY_PORT}`,
  }
}

// ---------------------------------------------------------------------------
// commands

async function up() {
  fs.mkdirSync(STATE_DIR, { recursive: true })
  const bin = PG_BIN()
  const postgrest = findPostgrest()

  // 1. cluster
  if (!fs.existsSync(path.join(PGDATA, 'PG_VERSION'))) {
    fs.mkdirSync(WORK_DIR, { recursive: true })
    if (isRoot) execFileSync('chown', ['-R', 'postgres', WORK_DIR])
    if (isRoot) fs.chmodSync(WORK_DIR, 0o755)
    must(
      asPostgres(path.join(bin, 'initdb'), ['-D', PGDATA, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C.UTF-8']),
      'initdb',
    )
  }
  const running = asPostgres(path.join(bin, 'pg_ctl'), ['-D', PGDATA, 'status']).status === 0
  if (!running) {
    must(
      asPostgres(path.join(bin, 'pg_ctl'), [
        '-D', PGDATA, '-w', '-l', path.join(WORK_DIR, 'postgres.log'),
        '-o', `-p ${PG_PORT} -k ${WORK_DIR} -c listen_addresses=127.0.0.1 -c fsync=off -c synchronous_commit=off -c full_page_writes=off`,
        'start',
      ]),
      'pg_ctl start',
    )
  }

  // 2. database: always rebuilt from scratch so a run never depends on the last one
  psql('postgres', ['-c', `drop database if exists ${DB_NAME} with (force)`])
  psql('postgres', ['-c', `create database ${DB_NAME}`])
  psql(DB_NAME, ['-f', path.join(HERE, 'shim.sql')])

  const migrations = fs
    .readdirSync(path.join(ROOT, 'db/migrations'))
    .filter((file) => file.endsWith('.sql'))
    .sort()
  for (const file of migrations) {
    psql(DB_NAME, ['-1', '-f', path.join(ROOT, 'db/migrations', file)])
  }
  console.log(`applied ${migrations.length} migrations (${migrations[0]} … ${migrations.at(-1)})`)

  // 3. the real site content, exactly as the production import produces it
  const importSql = must(
    spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'scripts/import-content-to-db.ts', '--sql'], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }),
    'content import (--sql)',
  ).stdout
  psql(DB_NAME, [], importSql)

  // 4. test admins and fixtures
  const authRows = accounts.map((a) => `('${a.id}', '${a.email}')`).join(', ')
  const adminRows = accounts.filter((a) => a.role).map((a) => `('${a.id}', '${a.role}')`).join(', ')
  psql(DB_NAME, [], `insert into auth.users (id, email) values ${authRows}; insert into public.admin_users (id, role) values ${adminRows};`)
  psql(DB_NAME, ['-f', path.join(HERE, 'fixtures.sql')])

  // 5. PostgREST (schema cache is built at start, so after the migrations)
  killFromPidFile('postgrest')
  spawnDetached('postgrest', postgrest, [], {
    PGRST_DB_URI: `postgres://authenticator:authenticator-test-only@127.0.0.1:${PG_PORT}/${DB_NAME}`,
    PGRST_DB_SCHEMAS: 'public',
    PGRST_DB_ANON_ROLE: 'anon',
    PGRST_JWT_SECRET: JWT_SECRET,
    PGRST_SERVER_HOST: '127.0.0.1',
    PGRST_SERVER_PORT: String(PGRST_PORT),
    PGRST_DB_MAX_ROWS: '1000',
    PGRST_LOG_LEVEL: 'warn',
  })
  await waitFor(async () => (await fetch(`http://127.0.0.1:${PGRST_PORT}/`, { headers: { apikey: roleKey('anon', JWT_SECRET) } })).status < 500, 'PostgREST')

  // 6. the gateway, as its own detached process
  killFromPidFile('gateway')
  spawnDetached('gateway', process.execPath, [fileURLToPath(import.meta.url), 'gateway'], {})
  await waitFor(async () => (await fetch(`http://127.0.0.1:${GATEWAY_PORT}/_test/health`)).ok, 'the gateway')

  fs.writeFileSync(ENV_FILE, JSON.stringify(stackEnv(), null, 2))
  console.log(`test stack is up — SUPABASE_URL=http://127.0.0.1:${GATEWAY_PORT} (env in ${path.relative(ROOT, ENV_FILE)})`)
}

async function down() {
  killFromPidFile('gateway')
  killFromPidFile('postgrest')
  try {
    const bin = PG_BIN()
    if (fs.existsSync(path.join(PGDATA, 'PG_VERSION'))) asPostgres(path.join(bin, 'pg_ctl'), ['-D', PGDATA, '-m', 'fast', 'stop'])
  } catch {
    // nothing to stop
  }
  fs.rmSync(ENV_FILE, { force: true })
  console.log('test stack is down')
}

async function status() {
  const checks = {
    postgres: async () => asPostgres(path.join(PG_BIN(), 'pg_ctl'), ['-D', PGDATA, 'status']).status === 0,
    postgrest: async () => (await fetch(`http://127.0.0.1:${PGRST_PORT}/`, { headers: { apikey: roleKey('anon', JWT_SECRET) } })).status < 500,
    gateway: async () => (await fetch(`http://127.0.0.1:${GATEWAY_PORT}/_test/health`)).ok,
  }
  let all = true
  for (const [name, check] of Object.entries(checks)) {
    let ok = false
    try {
      ok = await check()
    } catch {
      ok = false
    }
    all &&= ok
    console.log(`${ok ? 'up  ' : 'DOWN'} ${name}`)
  }
  process.exitCode = all ? 0 : 1
}

/** Tables the suites write to. Content, migrations' seeds and the admins are left alone. */
const MUTABLE_TABLES = [
  'inquiry_attachments', 'inquiry_files', 'rate_limit_buckets', 'inquiry_events', 'consultations', 'notification_attempts', 'notification_outbox',
  'inquiries', 'recommendation_requests', 'audit_log',
]

async function reset() {
  psql(DB_NAME, ['-c', `truncate ${MUTABLE_TABLES.map((t) => `public.${t}`).join(', ')} restart identity cascade`])
  console.log('mutable tables emptied')
}

async function build() {
  const env = { ...process.env, ...stackEnv() }
  if (process.env.ARTAVEO_TEST_REAL_FONTS !== '1') {
    // Google Fonts is not reachable from every machine (this suite's own sandbox,
    // an offline CI runner). Next has a first-party switch for that: a module
    // that answers the font-CSS requests. The page then uses fallback fonts —
    // fine for behaviour and accessibility, wrong for visual checks.
    env.NEXT_FONT_GOOGLE_MOCKED_RESPONSES = path.join(HERE, 'font-mock.cjs')
  }
  // Turbopack mocks the font CSS but still downloads the font files; answer those
  // locally. (Async spawn: a blocking one would freeze this server.)
  const fontServer = http.createServer((_req, res) => res.writeHead(200, { 'content-type': 'font/woff2' }).end(Buffer.alloc(32)))
  await new Promise((resolve) => fontServer.listen(54399, '127.0.0.1', resolve))
  const code = await new Promise((resolve) => spawn('npm', ['run', 'build'], { cwd: ROOT, env, stdio: 'inherit' }).on('exit', resolve))
  fontServer.close()
  process.exitCode = code ?? 1
}

async function gateway() {
  const gw = createGateway({ port: GATEWAY_PORT, postgrestUrl: `http://127.0.0.1:${PGRST_PORT}`, jwtSecret: JWT_SECRET, accounts })
  await gw.listen()
}

const command = process.argv[2]
const commands = { up, down, status, reset, build, gateway }
if (import.meta.url === `file://${process.argv[1]}` && command) {
  if (!commands[command]) {
    console.error(`unknown command "${command}" — use: ${Object.keys(commands).filter((c) => c !== 'gateway').join(' | ')}`)
    process.exit(2)
  }
  await commands[command]()
}
