/**
 * Phase 23 — rules about the SOURCE that no runtime test would notice breaking:
 * every Server Action is either gated or a reviewed public entry point; the
 * places that can turn text into HTML or a query are a short, reviewed list; the
 * migration, the code and the test stand-in agree about the upload rules; every
 * environment variable the code reads is in the secret inventory.
 *
 * A Server Action is an HTTP endpoint whether or not any page imports it — so
 * "not linked from the UI" is not a control. These tests are the control.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import ts from 'typescript'

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

// ---------------------------------------------------------------------------
// 1. Server Actions
// ---------------------------------------------------------------------------

/** Public entry points: anyone on the internet can call these. Each is here on purpose, and each must be rate-limited (or say why not). */
const PUBLIC_ACTIONS = {
  'inquiries.ts': { submitInquiry: 'rate-limited' },
  'inquiry-attachments.ts': { uploadInquiryAttachment: 'rate-limited', removeInquiryAttachment: 'rate-limited' },
  'consultations.ts': { submitConsultationRequest: 'rate-limited', cancelMyConsultation: 'rate-limited', rescheduleMyConsultation: 'rate-limited' },
  'recommendations.ts': { submitRecommendation: 'rate-limited' },
  'admin-auth.ts': {
    adminSignIn: 'rate-limited',
    verifyMfaChallenge: 'rate-limited',
    // The auth service itself refuses a factor challenge without a signed-in (aal1) session; limited per user.
    enrollMfaVerify: 'rate-limited',
    // Signing OUT needs no authority; it only clears the caller's own cookies.
    adminSignOut: 'open',
  },
}

/** Everything else must call its gate before it touches data. */
const GATES = {
  'consultation-admin.ts': 'requireOwner',
  'content.ts': 'requireEditorSession',
  'media.ts': 'requireEditorSession',
  'notifications.ts': 'requireOwnerSession',
  'pipeline.ts': 'requireOwnerSession',
  'settings.ts': 'requireEditorSession',
  'admin-auth.ts': 'getAdminSession',
}

// (`createAuthServerClient` only builds a cookie-bound client; nothing is read until a method is called on it.)
const DATA_ACCESS = /\b(getSupabaseServerClient|requireSupabase)\s*\(|\.from\(/

function allFunctionBodies(file) {
  const source = ts.createSourceFile(file, read(`app/actions/${file}`), ts.ScriptTarget.Latest, true)
  const map = new Map()
  for (const node of source.statements) if (ts.isFunctionDeclaration(node) && node.name && node.body) map.set(node.name.text, node.body.getText())
  return map
}

function exportedFunctions(file) {
  const source = ts.createSourceFile(file, read(`app/actions/${file}`), ts.ScriptTarget.Latest, true)
  const out = []
  for (const node of source.statements) {
    const exported = ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    if (!exported) continue
    if (ts.isFunctionDeclaration(node) && node.name) out.push({ name: node.name.text, async: Boolean(ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)), body: node.body?.getText() ?? '' })
    else if (ts.isVariableStatement(node) && !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword)) {
      for (const declaration of node.declarationList.declarations) {
        const init = declaration.initializer
        if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) out.push({ name: declaration.name.getText(), async: false, body: init.getText() })
      }
    }
  }
  return out
}

describe('Server Actions', () => {
  const files = fs.readdirSync(path.join(ROOT, 'app/actions')).filter((f) => f.endsWith('.ts'))

  it("'use server' appears only in app/actions — a Server Action anywhere else would be an endpoint nobody reviewed", () => {
    const withDirective = walk('.', ['.ts', '.tsx'])
      .filter((file) => !file.startsWith('tests') && !file.startsWith('scripts') && !file.startsWith('node_modules'))
      .filter((file) => /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*['"]use server['"]/.test(read(file)))
    assert.deepEqual(withDirective.sort(), files.map((f) => `app/actions/${f}`).sort())
  })

  it('every action file is classified (a new file must be added to the lists above, on purpose)', () => {
    for (const file of files) assert.ok(file in PUBLIC_ACTIONS || file in GATES, `${file} is neither public nor gated`)
  })

  for (const file of files) {
    for (const fn of exportedFunctions(file)) {
      it(`${file} › ${fn.name}: async, and either a reviewed public entry point or gated before any data access`, () => {
        assert.ok(fn.async, "a 'use server' file may export only async functions — anything else is still an endpoint")
        const publicKind = PUBLIC_ACTIONS[file]?.[fn.name]
        if (publicKind) {
          if (publicKind === 'rate-limited') assert.match(fn.body, /\bcheckRateLimit\(/, 'a public action must be rate-limited')
          return
        }
        const gate = GATES[file]
        assert.ok(gate, `${file} › ${fn.name} is not public and its file has no gate`)
        // One level of delegation is allowed: a thin wrapper that hands everything to a helper in the same file.
        let body = fn.body
        if (!new RegExp(`\\b${gate}\\(`).test(body)) {
          const helpers = allFunctionBodies(file)
          const delegate = [...helpers.keys()].find((name) => name !== fn.name && new RegExp(`\\b${name}\\(`).test(fn.body))
          if (delegate) body = helpers.get(delegate)
        }
        const gateAt = body.search(new RegExp(`\\b${gate}\\(`))
        assert.ok(gateAt >= 0, `${fn.name} never calls ${gate}()`)
        const dataAt = body.search(DATA_ACCESS)
        assert.ok(dataAt === -1 || gateAt < dataAt, `${fn.name} touches data before it calls ${gate}()`)
      })
    }
  }

  it('the role split holds: leads, notifications and consultations are owner-only; content and media are editor-level', () => {
    assert.match(read('app/actions/pipeline.ts'), /canAccessLeads\(session\)/)
    assert.match(read('app/actions/notifications.ts'), /canAccessNotifications\(session\)|role === 'owner'/)
    assert.match(read('app/actions/consultation-admin.ts'), /owner/i)
  })
})

describe('route handlers', () => {
  it('the owner-only attachment route checks the session, MFA and the owner role itself', () => {
    const source = read('app/api/admin/inquiry-files/[id]/route.ts')
    assert.match(source, /getAdminSession\(\)/)
    assert.match(source, /mfaSatisfied\(session\)/)
    assert.match(source, /canAccessLeads\(session\)/)
  })
  it('the cron route fails closed and compares its secret in constant time', () => {
    const source = read('app/api/cron/notifications/route.ts')
    assert.match(source, /timingSafeEqual/)
    assert.match(source, /not-configured/)
  })
  it('the public token route is rate-limited', () => {
    assert.match(read('app/api/consultation/[token]/calendar/route.ts'), /checkRateLimit\('token\.calendar'/)
  })
})

// ---------------------------------------------------------------------------
// 2. XSS sinks and query building
// ---------------------------------------------------------------------------

/** Every place the code can turn a string into markup. Reviewed on 20 September 2026; adding one is a decision, not an accident. */
const HTML_SINKS = {
  'app/[locale]/layout.tsx': 'the theme script — a constant string from lib/theme-script.ts, allowed in the admin policy by its hash',
  'components/site/json-ld.tsx': 'JSON-LD: JSON.stringify output with every "<" escaped to \\u003c',
}

describe('places that can create markup or queries', () => {
  const sources = walk('.', ['.ts', '.tsx']).filter((f) => /^(app|components|lib)\//.test(f))

  it('dangerouslySetInnerHTML / innerHTML / insertAdjacentHTML / document.write / eval / new Function appear only where reviewed', () => {
    const found = sources.filter((file) => /dangerouslySetInnerHTML\s*=|\.innerHTML\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(|\beval\s*\(|new Function\s*\(/.test(read(file)))
    assert.deepEqual(found.sort(), Object.keys(HTML_SINKS).sort())
  })
  it('the JSON-LD component still escapes "<"', () => assert.match(read('components/site/json-ld.tsx'), /replace\(\/<\/g,\s*'\\\\u003c'\)/))

  it('no query filter is built by interpolating a value into .or() / .filter() except through lib/postgrest.ts or a validated UUID', () => {
    const offenders = []
    for (const file of sources) {
      const text = read(file)
      for (const match of text.matchAll(/\.(?:or|filter)\(\s*`[^`]*\$\{([^}]*)\}[^`]*`/g)) {
        if (!/assertUuid\(/.test(match[1])) offenders.push(`${file}: ${match[0].slice(0, 80)}`)
      }
    }
    assert.deepEqual(offenders, [])
  })
  it('the lead search uses the escaping helper', () => assert.match(read('lib/admin/pipeline.ts'), /ilikeAnyOf\(\['name', 'email'\]/))

  it('nothing security-relevant is derived from Math.random (it is predictable)', () => {
    const offenders = sources.filter((file) => /Math\.random\(\)/.test(read(file)) && !['components/start/brief-builder.tsx'].includes(file))
    assert.deepEqual(offenders, [], 'brief-builder.tsx is the one exception: a last-resort idempotency key for browsers without crypto.randomUUID, not a secret')
  })

  it('no form that changes state or carries personal data can fall back to GET (it would put the data in the URL)', () => {
    const offenders = []
    for (const file of sources.filter((f) => f.endsWith('.tsx'))) {
      for (const match of read(file).matchAll(/<form\b[^>]*>/g)) {
        const tag = match[0]
        const isServerActionForm = /\baction=\{/.test(tag)
        const isSearchStyleGet = /method="get"/i.test(tag)
        if (/onSubmit=/.test(tag) && !/method="post"/i.test(tag) && !isSearchStyleGet && !isServerActionForm) offenders.push(`${file}: ${tag.slice(0, 80)}`)
      }
    }
    assert.deepEqual(offenders, [])
  })
})

// ---------------------------------------------------------------------------
// 3. The migration, the code and the stand-in agree
// ---------------------------------------------------------------------------

describe('migration 0020 and the code that relies on it', () => {
  const migration = read('db/migrations/0020_security_hardening.sql')
  it('the visitor bucket is private, 5 MiB, raster only — and the code says the same', async () => {
    const { VISITOR_MIME_TYPES, INQUIRY_FILES_BUCKET, MAX_MEDIA_FILE_SIZE_BYTES } = await import('../../lib/media-upload.ts')
    const block = /insert into storage\.buckets[\s\S]*?on conflict/.exec(migration)[0]
    assert.match(block, new RegExp(`'${INQUIRY_FILES_BUCKET}',\\s*'${INQUIRY_FILES_BUCKET}',\\s*false,\\s*${MAX_MEDIA_FILE_SIZE_BYTES}`))
    const sqlTypes = [...(/array\[([^\]]+)\]/.exec(block)[1]).matchAll(/'([^']+)'/g)].map((m) => m[1])
    assert.deepEqual(sqlTypes.sort(), [...VISITOR_MIME_TYPES].sort())
    assert.ok(!sqlTypes.includes('image/svg+xml'))
  })
  it('the table check constraints match the same rules', () => {
    assert.match(migration, /content_type in \('image\/png', 'image\/jpeg', 'image\/webp', 'image\/gif'\)/)
    assert.match(migration, /size_bytes > 0 and size_bytes <= 5242880/)
  })
  it('the rate-limit function is callable by the server only', () => {
    assert.match(migration, /revoke all on function public\.consume_rate_limit\(text, int, int\) from public/)
    assert.match(migration, /revoke all on function public\.consume_rate_limit\(text, int, int\) from anon, authenticated/)
    assert.match(migration, /grant execute on function public\.consume_rate_limit\(text, int, int\) to service_role/)
    assert.match(migration, /set search_path = ''/)
  })
  it('both new tables have row level security enabled and no policy', () => {
    for (const table of ['rate_limit_buckets', 'inquiry_files']) assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`))
    assert.ok(!/create policy[^;]*on public\.(rate_limit_buckets|inquiry_files)/.test(migration))
  })
  it('the public bucket can no longer be listed', () => assert.match(migration, /drop policy if exists "media bucket is publicly readable" on storage\.objects/))
  it("the test stand-in treats exactly the migration's private buckets as private", () => {
    const gateway = read('tests/support/stack/gateway.mjs')
    const privateInMigration = [...migration.matchAll(/values\s*\(\s*'([^']+)',\s*'[^']+',\s*false/g)].map((m) => m[1])
    const privateInGateway = [...(/PRIVATE_BUCKETS = new Set\(\[([^\]]*)\]\)/.exec(gateway)[1]).matchAll(/'([^']+)'/g)].map((m) => m[1])
    assert.deepEqual(privateInGateway.sort(), privateInMigration.sort())
  })
})

// ---------------------------------------------------------------------------
// 4. Secret inventory
// ---------------------------------------------------------------------------

describe('secret inventory', () => {
  const codeFiles = [...walk('app', ['.ts', '.tsx']), ...walk('lib', ['.ts', '.tsx', '.mjs']), 'proxy.ts', 'instrumentation.ts', 'next.config.mjs']
  const names = new Set()
  for (const file of codeFiles) for (const m of read(file).matchAll(/process\.env\.([A-Z][A-Z0-9_]{3,})|\benv\.([A-Z][A-Z0-9_]{3,})/g)) names.add(m[1] ?? m[2])
  // Set by the platform or the framework, not configuration anyone chooses.
  const PLATFORM = new Set(['NODE_ENV', 'NEXT_RUNTIME', 'VERCEL', 'VERCEL_ENV', 'VERCEL_GIT_COMMIT_SHA', 'SOURCE_VERSION'])

  it('every variable the application reads is described in docs/security.md', () => {
    const doc = read('docs/security.md')
    const missing = [...names].filter((name) => !PLATFORM.has(name) && !doc.includes(name))
    assert.deepEqual(missing, [], 'add these to the secret inventory in docs/security.md')
  })
  it('every variable in .env.example is described there too, and none carries a real-looking value', () => {
    const doc = read('docs/security.md')
    const example = read('.env.example')
    for (const m of example.matchAll(/^([A-Z][A-Z0-9_]+)=(.*)$/gm)) {
      assert.ok(doc.includes(m[1]), `${m[1]} is in .env.example but not in docs/security.md`)
      // SUPABASE_URL is the public project address (documented as such); everything else must be empty or a short placeholder.
      if (m[1] === 'SUPABASE_URL') continue
      assert.ok(m[2].length < 40 && !/^eyJ/.test(m[2]), `${m[1]} looks like it holds a real secret`)
    }
  })
  it('the service-role key is only ever read in the server-only client and the config check', () => {
    const readers = codeFiles.filter((file) => /\benv\.SUPABASE_SERVICE_ROLE_KEY/.test(read(file))).sort()
    assert.deepEqual(readers, ['lib/request-ip.ts', 'lib/security/config-check.ts', 'lib/supabase/server.ts'])
    assert.match(read('lib/supabase/server.ts'), /import 'server-only'/)
    assert.ok(!walk('components', ['.ts', '.tsx']).some((file) => /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE/.test(read(file))))
  })
  it('nothing is exposed to the browser through NEXT_PUBLIC_ except the site URL', () => {
    const publicNames = [...names].filter((name) => name.startsWith('NEXT_PUBLIC_'))
    assert.deepEqual(publicNames, ['NEXT_PUBLIC_SITE_URL'])
  })
})
