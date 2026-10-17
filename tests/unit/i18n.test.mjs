/**
 * Dictionary integrity (messages/en.json, messages/fa.json). Parity was
 * previously checked by hand each phase with a throw-away script; this makes
 * it a permanent gate.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
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

/**
 * Dari, not Iranian Persian (roadmap § 16.3, owner's rule). The "avoid" column of the glossary,
 * as whole words — a Persian letter may not come right before the match, so «قابلیت» is not
 * «بلیت». Checked in the dictionary and in every file that holds public Dari copy.
 */
const IRANIAN = ['اتوبوس', 'صندلی', 'بلیت', 'دلار', 'مشاوره', 'کامپیوتر', 'اینترنت', 'اطلاعات', 'دانشجو', 'دانشگاه', 'سامانه', 'آمریکا', 'رزرو', 'ناوگان', 'ایده(?!‌آل)', 'جلو می‌', 'سادگی', 'وابستگی', 'رسیدگی']
const IRANIAN_RE = new RegExp(`(?<![\\u0600-\\u06FF])(?:${IRANIAN.join('|')})`)
const DARI_COPY_FILES = ['lib/about-content.ts', 'lib/contact-content.ts', 'lib/home-content.ts', 'lib/inquiry-content.ts', 'lib/legal-content.ts', 'lib/services-content.ts', 'lib/notifications/templates.ts', 'lib/notifications/consultation-templates.ts']

describe('Dari vocabulary (§ 16.3)', () => {
  it('no Iranian Persian word in the Dari dictionary', () => {
    const bad = Object.entries(flatFa).filter(([, v]) => typeof v === 'string' && IRANIAN_RE.test(v)).map(([k, v]) => `${k}: ${v.match(IRANIAN_RE)[0]}`)
    assert.deepEqual(bad, [])
  })
  it('no Iranian Persian word in the files that hold Dari copy', () => {
    const bad = DARI_COPY_FILES.flatMap((file) =>
      readFileSync(join(ROOT, file), 'utf8')
        .split('\n')
        .map((line, i) => [i + 1, line.match(IRANIAN_RE)])
        .filter(([, m]) => m)
        .map(([n, m]) => `${file}:${n}: ${m[0]}`),
    )
    assert.deepEqual(bad, [])
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
