/**
 * Dictionary integrity (messages/en.json, messages/fa.json). Parity was
 * previously checked by hand each phase with a throw-away script; this makes
 * it a permanent gate.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const ROOT = new URL('../../', import.meta.url).pathname
const load = (locale) => JSON.parse(readFileSync(join(ROOT, `messages/${locale}.json`), 'utf8'))
const en = load('en')
const fa = load('fa')

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, out)
    else out[path] = child
  }
  return out
}
const flatEn = flatten(en)
const flatFa = flatten(fa)

/** ICU argument names used in a message: {name}, {count, plural, …} → name/count. */
const argsOf = (text) =>
  [...String(text).matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*[,}]/g)].map((m) => m[1]).sort()

describe('parity', () => {
  it('both dictionaries are non-trivial', () => assert.ok(Object.keys(flatEn).length > 500))
  it('identical key sets', () => {
    const onlyEn = Object.keys(flatEn).filter((k) => !(k in flatFa))
    const onlyFa = Object.keys(flatFa).filter((k) => !(k in flatEn))
    assert.deepEqual({ onlyEn: onlyEn.slice(0, 20), onlyFa: onlyFa.slice(0, 20) }, { onlyEn: [], onlyFa: [] })
  })
  it('no empty or whitespace-only string in either language', () => {
    const empty = (flat) => Object.entries(flat).filter(([, v]) => typeof v === 'string' && v.trim() === '').map(([k]) => k)
    assert.deepEqual({ en: empty(flatEn), fa: empty(flatFa) }, { en: [], fa: [] })
  })
  it('the same {placeholders} in both languages — a missing one prints a raw brace or drops data', () => {
    const drift = Object.keys(flatEn)
      .filter((k) => k in flatFa)
      .filter((k) => JSON.stringify(argsOf(flatEn[k])) !== JSON.stringify(argsOf(flatFa[k])))
    assert.deepEqual(drift, [])
  })
  it('the same value types (a string never becomes an array in the other language)', () => {
    const drift = Object.keys(flatEn).filter((k) => k in flatFa && typeof flatEn[k] !== typeof flatFa[k])
    assert.deepEqual(drift, [])
  })
})

describe('Persian text hygiene', () => {
  const persian = Object.entries(flatFa).filter(([, v]) => typeof v === 'string')
  it('uses the Persian comma "،", never a Latin comma between Persian words', () => {
    const bad = persian.filter(([, v]) => /[\u0600-\u06FF],\s*[\u0600-\u06FF]/.test(v)).map(([k]) => k)
    assert.deepEqual(bad, [])
  })
  it('no Arabic-Indic yeh/kaf variants (ي ك) where Persian ی ک belong', () => {
    const bad = persian.filter(([, v]) => /[يك]/.test(v)).map(([k]) => k)
    assert.deepEqual(bad, [])
  })
  it('no English sentence left untranslated (identical text of three or more Latin words)', () => {
    const untranslated = persian
      .filter(([k, v]) => !/[\u0600-\u06FF]/.test(v) && v === flatEn[k])
      .filter(([, v]) => !/^https?:\/\//.test(v) && v.trim().split(/\s+/).filter((w) => /^[A-Za-z]{2,}$/.test(w)).length >= 3)
      .map(([k]) => k)
    assert.deepEqual(untranslated, [])
  })
})

describe('the code only asks for keys that exist', () => {
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (['node_modules', '.next', '.git', 'tests', 'scripts', 'docs', '.test-stack'].includes(name)) continue
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(tsx?|mjs)$/.test(name)) files.push(full)
    }
  }
  walk(ROOT)

  it('every literal useTranslations/getTranslations namespace + t("key") call resolves', () => {
    const missing = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      // const t = useTranslations('Ns')  /  await getTranslations('Ns')  /  getTranslations({ locale, namespace: 'Ns' })
      const bindings = [...source.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:'([\w.]+)'|\{[^)]*?namespace:\s*'([\w.]+)'[^)]*?\})\s*\)/g)]
      for (const [, name, ns1, ns2] of bindings) {
        const namespace = ns1 ?? ns2
        const calls = source.matchAll(new RegExp(`\\b${name}(?:\\.rich|\\.raw|\\.markup)?\\(\\s*'([\\w.]+)'`, 'g'))
        for (const [, key] of calls) {
          if (!(`${namespace}.${key}` in flatEn) && !Object.keys(flatEn).some((k) => k.startsWith(`${namespace}.${key}.`))) {
            missing.push(`${file.replace(ROOT, '')}: ${namespace}.${key}`)
          }
        }
      }
    }
    assert.deepEqual(missing, [])
  })
})
