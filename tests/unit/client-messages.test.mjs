/**
 * Phase 34 — the browser gets only the messages its Client Components read
 * (lib/i18n/client-messages.ts). The import graph is walked from every public
 * page, layout and boundary under app/[locale]: a file with 'use client', and
 * everything it imports, runs in the browser; every `useTranslations('X')` in
 * such a file must be in the shell's list or in a `<ClientMessages scope>` the
 * page renders. A missing namespace would show raw keys («BriefBuilder.title»)
 * instead of text, so this fails before that can ship.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { CLIENT_MESSAGE_SCOPES, pickMessages, scopeNamespaces, SHELL_CLIENT_NAMESPACES } from '../../lib/i18n/client-messages.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/')

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(tsx?|mjs)$/.test(entry)) out.push(full)
  }
  return out
}
const SOURCES = new Map(['app', 'components', 'lib', 'i18n'].flatMap((dir) => walk(path.join(ROOT, dir))).map((file) => [file, readFileSync(file, 'utf8')]))

function resolveImport(from, spec) {
  let base
  if (spec.startsWith('@/')) base = path.join(ROOT, spec.slice(2))
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec)
  else return null
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (SOURCES.has(candidate)) return candidate
  }
  return null
}
const importsOf = (file) =>
  [...SOURCES.get(file).matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)]
    .map((match) => resolveImport(file, match[1] ?? match[2]))
    .filter(Boolean)
const isClientFile = (file) => /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*['"]use client['"]/.test(SOURCES.get(file))
const namespacesIn = (file) => [...SOURCES.get(file).matchAll(/useTranslations\(\s*['"]([A-Za-z]+)['"]/g)].map((match) => match[1])
const scopesIn = (file) => [...SOURCES.get(file).matchAll(/<ClientMessages\s+scope="([A-Za-z]+)"/g)].map((match) => match[1])

/** What an entry file needs in the browser, and which scopes it adds. */
function analyse(entry) {
  const seen = new Map() // file → reached in the browser?
  const queue = [[entry, isClientFile(entry)]]
  const needs = new Map() // namespace → client files reading it
  const scopes = new Set()
  while (queue.length) {
    const [file, inBrowser] = queue.pop()
    const client = inBrowser || isClientFile(file)
    if (seen.has(file) && (seen.get(file) || !client)) continue
    seen.set(file, client)
    if (client) for (const ns of namespacesIn(file)) needs.set(ns, [...(needs.get(ns) ?? []), rel(file)])
    else for (const scope of scopesIn(file)) scopes.add(scope)
    for (const next of importsOf(file)) queue.push([next, client])
  }
  return { needs, scopes }
}

const LOCALE_DIR = path.join(ROOT, 'app', '[locale]')
const ENTRIES = walk(LOCALE_DIR).filter(
  (file) => /(?:^|[\\/])(page|layout|template|error|not-found|loading)\.tsx$/.test(file) && !rel(file).startsWith('app/[locale]/admin/'),
)

describe('Phase 34: only the messages a page reads in the browser are sent', () => {
  it('finds the public pages and the root layout', () => {
    assert.ok(ENTRIES.some((file) => rel(file) === 'app/[locale]/layout.tsx'))
    assert.ok(ENTRIES.filter((file) => file.endsWith('page.tsx')).length >= 15, 'too few pages found — the walk is broken')
  })

  for (const entry of ENTRIES) {
    it(`${rel(entry)} sends every namespace its Client Components read`, () => {
      const { needs, scopes } = analyse(entry)
      for (const scope of scopes) assert.ok(scope in CLIENT_MESSAGE_SCOPES, `unknown <ClientMessages scope="${scope}">`)
      const sent = new Set([...SHELL_CLIENT_NAMESPACES, ...[...scopes].flatMap((scope) => CLIENT_MESSAGE_SCOPES[scope])])
      const missing = [...needs].filter(([ns]) => !sent.has(ns)).map(([ns, files]) => `${ns} (read in ${[...new Set(files)].join(', ')})`)
      assert.deepEqual(missing, [], 'add the namespace to the shell list, or wrap the component in <ClientMessages scope>')
    })
  }

  it("the shell's list holds nothing no public Client Component reads", () => {
    const read = new Set(ENTRIES.flatMap((entry) => [...analyse(entry).needs.keys()]))
    assert.deepEqual(SHELL_CLIENT_NAMESPACES.filter((ns) => !read.has(ns)), [])
  })

  it('the admin namespace never reaches a public page', () => {
    assert.ok(!SHELL_CLIENT_NAMESPACES.includes('Admin'))
    for (const namespaces of Object.values(CLIENT_MESSAGE_SCOPES)) assert.ok(!namespaces.includes('Admin'))
  })

  it("the shell's dictionary stays small (budget: 16 KB of Dari, was ~113 KB for the whole dictionary)", () => {
    const fa = JSON.parse(readFileSync(path.join(ROOT, 'messages/fa.json'), 'utf8'))
    const bytes = Buffer.byteLength(JSON.stringify(pickMessages(fa, SHELL_CLIENT_NAMESPACES)))
    assert.ok(bytes < 16_000, `shell messages are ${bytes} bytes`)
    for (const scope of Object.keys(CLIENT_MESSAGE_SCOPES)) {
      const scoped = Buffer.byteLength(JSON.stringify(pickMessages(fa, scopeNamespaces(scope))))
      assert.ok(scoped < 32_000, `${scope}: ${scoped} bytes`)
    }
  })

  it('the layouts wire it: the root sends the shell, the admin sends everything', () => {
    const root = SOURCES.get(path.join(LOCALE_DIR, 'layout.tsx'))
    assert.match(root, /<NextIntlClientProvider messages=\{pickMessages\(messages, SHELL_CLIENT_NAMESPACES\)\}>/)
    const admin = SOURCES.get(path.join(LOCALE_DIR, 'admin', 'layout.tsx'))
    assert.match(admin, /<NextIntlClientProvider>\{children\}<\/NextIntlClientProvider>/)
  })

  it('pickMessages copies only the named, existing namespaces', () => {
    const all = { Nav: { a: '1' }, Admin: { b: '2' }, Brand: { c: '3' } }
    assert.deepEqual(pickMessages(all, ['Nav', 'Brand', 'Nope']), { Nav: { a: '1' }, Brand: { c: '3' } })
    assert.deepEqual(scopeNamespaces('briefBuilder'), [...SHELL_CLIENT_NAMESPACES, 'BriefBuilder'])
  })
})
