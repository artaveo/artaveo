/**
 * Phase 24 — rules about the SOURCE that no runtime test would notice breaking:
 * server code logs only through the logger; every event name is well formed and
 * used consistently; the two open reporting endpoints are limited; `headers()` is not
 * read where it would make the public site dynamic; the migration and the code agree.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import { EVENT_NAME } from '../../lib/observability/redact.ts'
import { RATE_LIMITS } from '../../lib/security/rate-limit-policy.ts'

const ROOT = path.resolve(import.meta.dirname, '../..')
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')

function walk(dir, exts, out = []) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (['node_modules', '.next', '.test-stack', 'test-results', 'playwright-report'].includes(entry.name)) continue
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(rel, exts, out)
    else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(rel)
  }
  return out
}

const serverFiles = [...walk('app', ['.ts', '.tsx']), ...walk('lib', ['.ts']), 'proxy.ts', 'instrumentation.ts'].filter((f) => !/^lib\/observability\/logger\.ts$/.test(f))
const isClient = (source) => /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*['"]use client['"]/.test(source)

describe('logging discipline', () => {
  it('no server code calls console — everything goes through lib/observability/logger.ts', () => {
    const offenders = serverFiles.filter((file) => {
      const source = read(file)
      return !isClient(source) && /\bconsole\.(log|info|warn|error|debug|trace)\b/.test(source)
    })
    assert.deepEqual(offenders, [])
  })

  it('every event name passed to log / track / captureError is well formed', () => {
    const bad = []
    let seen = 0
    for (const file of serverFiles) {
      const source = read(file)
      for (const m of source.matchAll(/\blog\.(?:info|warn|error)\(\s*'([^']+)'|\btrack\(\s*'([^']+)'|\bevent:\s*'([^']+)'/g)) {
        const name = m[1] ?? m[2] ?? m[3]
        seen += 1
        if (!EVENT_NAME.test(name)) bad.push(`${file}: ${name}`)
      }
    }
    assert.ok(seen > 50, `expected many event names, found ${seen}`)
    assert.deepEqual(bad, [])
  })

  it('the three persisted business events the roadmap names are all recorded somewhere', () => {
    const all = serverFiles.map(read).join('\n')
    for (const name of ['inquiry.submitted', 'notification.exhausted', 'content.published', 'consultation.requested', 'evidence.submitted', 'cron.completed', 'monitor.checked', 'audit.write_failed', 'rate_limit.unavailable']) {
      assert.ok(all.includes(`'${name}'`), `${name} is never recorded`)
    }
  })

  it('the funnel, the alert rules and the code agree on event names', () => {
    const facts = read('lib/observability/alerts.ts')
    for (const name of ['rate_limit.unavailable', 'audit.write_failed', 'cron.completed', 'monitor.checked']) assert.ok(facts.includes(`'${name}'`), name)
    assert.ok(read('lib/security/rate-limit.ts').includes("'rate_limit.unavailable'"))
    assert.ok(read('lib/admin/audit.ts').includes("'audit.write_failed'"))
  })
})

describe('where the request id is read', () => {
  it('getRequestId() (which calls headers()) is used only in dynamic entry points', () => {
    const allowed = new Set([
      'lib/observability/context.ts',
      'lib/admin/audit.ts',
      'lib/notifications/events.ts',
      'lib/consultation/service.ts',
      'app/actions/inquiries.ts',
      'app/actions/consultations.ts',
      'app/actions/recommendations.ts',
      'app/actions/inquiry-attachments.ts',
      'app/actions/admin-auth.ts',
    ])
    const users = serverFiles.filter((f) => /\bgetRequestId\(/.test(read(f)))
    assert.deepEqual(users.filter((f) => !allowed.has(f)), [], 'a file that may run while prerendering must not call headers() through getRequestId()')
  })
  it('the logger and the database client never call headers() — they run while prerendering', () => {
    for (const file of ['lib/observability/logger.ts', 'lib/supabase/server.ts', 'lib/observability/store.ts', 'lib/observability/redact.ts']) {
      const code = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      assert.doesNotMatch(code, /\bheaders\(\)/, file)
    }
  })
  it('the proxy makes the id itself and overwrites whatever the caller sent', () => {
    const proxy = read('proxy.ts')
    assert.match(proxy, /newRequestId\(\)/)
    assert.match(proxy, /requestHeaders\.set\(REQUEST_ID_HEADER/)
    assert.match(proxy, /response\.headers\.set\(REQUEST_ID_HEADER/)
  })
  it('API routes make their own id and never read the incoming header', () => {
    for (const file of walk('app/api', ['.ts', '.tsx'])) {
      const source = read(file)
      assert.doesNotMatch(source, /headers\.get\(['"]x-request-id/i, file)
      if (/export (async )?function (GET|POST|HEAD)/.test(source) && /observe|ops|health|cron|calendar|inquiry-files/.test(file)) {
        assert.match(source, /newRequestId\(\)/, `${file} must make its own id`)
      }
    }
  })
})

describe('the open reporting endpoints', () => {
  for (const [file, scope] of [
    ['app/api/observe/csp/route.ts', 'observe.csp'],
    ['app/api/observe/client-error/route.ts', 'observe.client-error'],
  ]) {
    it(`${file} is rate-limited, size-capped, always answers 204 and rejects GET`, () => {
      const source = read(file)
      assert.match(source, new RegExp(`checkRateLimit\\('${scope.replace('.', '\\.')}'`))
      assert.match(source, /readJsonBody\(/)
      assert.match(source, /status: 204/)
      assert.match(source, /status: 405/)
      assert.ok(RATE_LIMITS[scope], `${scope} needs a row in RATE_LIMITS`)
      assert.ok(RATE_LIMITS[scope].global, `${scope} needs an overall ceiling, addresses can be spread`)
    })
  }
  it('the check endpoint is authenticated with the shared cron check and the health endpoints expose no detail', () => {
    assert.match(read('app/api/ops/check/route.ts'), /checkCronAuth\(request\)/)
    const health = read('lib/observability/health.ts')
    assert.doesNotMatch(health, /error\.message|\.message/, 'health output must not carry error text')
  })
  it('the CSP names the endpoint with report-uri only', () => {
    assert.match(read('lib/security/csp.ts'), /\['report-uri', \[CSP_REPORT_PATH\]\]/)
    assert.doesNotMatch(read('lib/security/csp.ts').replace(/\/\/.*$/gm, ''), /report-to/, 'report-uri only: report-to would switch browsers to the batching Reporting API')
  })
  it('client-reported errors and CSP reports never raise alerts (anyone can post them)', () => {
    assert.match(read('lib/observability/alerts.ts'), /not\('source', 'in', '\(client,csp\)'\)/)
  })
})

describe('the migration and the code agree', () => {
  const sql = read('db/migrations/0021_observability.sql')
  it('every new table has RLS on and no policy; every new function is service_role only', () => {
    for (const table of ['ops_events', 'error_groups']) assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`))
    assert.doesNotMatch(sql, /create policy/i)
    for (const fn of ['record_ops_event', 'record_error_event', 'purge_ops_data']) {
      assert.match(sql, new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to service_role`))
      assert.match(sql, new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from anon, authenticated`))
    }
    assert.equal((sql.match(/set search_path = ''/g) ?? []).length, 3)
  })
  it('the sources the code writes are the sources the table allows', () => {
    const allowed = [...sql.match(/source\s+text not null check \(source in \(([^)]*)\)\)/)[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1])
    const typeLine = read('lib/observability/store.ts').match(/export type ErrorSource = ([^\n]+)/)[1]
    const inCode = [...typeLine.matchAll(/'([a-z]+)'/g)].map((m) => m[1])
    assert.deepEqual([...inCode].sort(), [...allowed].sort())
  })
  it('the rollback lines are in the header', () => {
    for (const line of ['drop function if exists public.purge_ops_data', 'drop table if exists public.error_groups', 'drop table if exists public.ops_events', 'drop column if exists request_id']) assert.ok(sql.includes(line), line)
  })
})
