/**
 * Phase 32.3 — the public-copy rules (roadmap § 16) and the gate that applies
 * them. Each rule is pinned with the sentences that made it necessary (§ 6.7's
 * findings, the owner's examples) and with good sentences it must leave alone.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { findViolations } from '../../scripts/content-rules.mjs'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const ids = (text, lang) => [...new Set(findViolations(text, lang).map((v) => v.id))].sort()

describe('content rules: what they catch (§ 16.1–16.3)', () => {
  const bad = [
    // § 16.1 rule 6 — nothing internal
    ['fa', '(طبق § ۱۷ معیار تکمیل کار)', 'roadmap-section'],
    ['fa', 'این کار در فاز ۹ انجام شد', 'phase-number'],
    ['en', 'Built in Phase 9', 'phase-number'],
    ['en', 'Copy [CLIENT_NAME] here', 'placeholder'],
    // rules 1 and 3 — no technology or backend words (the owner's Pezhohesh example, § 6.7)
    ['fa', 'از طریق یک CMS اختصاصی قابل مدیریت است', 'jargon'],
    ['fa', 'از یک پنل متصل به پایگاه داده', 'jargon'],
    ['fa', 'تأیید نهایی در سمت سرور انجام می‌شود', 'jargon'],
    ['fa', 'پلتفرم فول‌استک', 'jargon'],
    ['fa', 'چیدمان ریسپانسیو واقعی روی موبایل', 'jargon'],
    ['en', 'PostgreSQL row-level security', 'tech-name'],
    ['en', 'An installable PWA with tuned caching', 'jargon'],
    ['en', 'Discovery Sprint', 'jargon'],
    // rule 5 — languages are never the headline (owner, 18 October 2026)
    ['fa', 'پورتالی دوزبانه برای یک جامعه‌ی محصلان', 'two-languages'],
    ['en', 'A bilingual Dari and English portal', 'two-languages'],
    // rule 6 / D-15 — no "one person"
    ['fa', 'این پروژه را یک نفر ساخته است', 'one-person'],
    ['fa', 'توسط کارکنان غیرتوسعه‌دهنده', 'one-person'],
    ['en', 'Artaveo is the work of one independent developer', 'one-person'],
    // § 16.2 — the brand speaks, the customer is «شما»
    ['fa', 'چه چیزی می‌سازم', 'voice-i'],
    ['fa', 'از چه طریقی من را می‌شناسی؟', 'voice-i'],
    ['fa', 'چند خط درباره‌ی تجربه‌ی همکاری بنویس', 'voice-you'],
    ['fa', 'درباره‌ی پروژه‌ات بگو', 'voice-you'],
    ['fa', 'وقت تماسِ تو ثبت شده است', 'voice-you'],
    ['en', "I'll confirm one of the new times", 'voice-i'],
    // rule 7 — no defensive tone
    ['fa', 'نتایج جستجوی زنده، نه یک لیست ثابت', 'defensive'],
    ['en', 'Live search results, not a static list', 'defensive'],
    ['en', 'A short, honest note', 'defensive'],
    // § 16.2 — banned without evidence
    ['en', 'A world-class team of experts', 'unproven-claim'],
    // § 16.3 — Dari, not Iranian Persian
    ['fa', 'بلیت اتوبوس را رزرو کنید', 'iranian-word'],
    ['fa', 'صندلی‌ها', 'iranian-word'],
  ]
  for (const [lang, text, rule] of bad) {
    it(`${rule}: «${text}»`, () => assert.ok(ids(text, lang).includes(rule), `got ${ids(text, lang).join(', ') || 'nothing'}`))
  }
})

describe('content rules: what they leave alone', () => {
  const good = [
    ['fa', 'مسافر تکتش را آنلاین می‌گیرد و چوکی‌اش را خودش انتخاب می‌کند.'],
    ['fa', 'آرتاویو همان روز جواب می‌دهد، معمولاً طی چند ساعت.'],
    ['fa', 'چند وقتی را که برایتان مناسب است پیشنهاد کنید؛ آرتاویو یکی را تأیید می‌کند.'],
    ['fa', 'کارمندان مرکز همه‌چیز را خودشان به‌روز می‌کنند.'],
    ['fa', 'قابلیت‌های تازه'], // «بلیت» inside a longer word
    ['fa', 'سیستم مدیریت کلینیک دندان'], // «من» inside a word
    ['fa', 'تور و سفر'], // «تو» inside a word
    ['fa', 'کار گرفتن از سیستم‌های آماده‌ی آرتاویو'],
    ['fa', 'آیا روی چند کمپیوتر کار می‌کند؟'],
    ['en', 'Artaveo designs and builds websites, management systems, mobile apps and desktop software for businesses.'],
    ['en', 'Passengers find a trip and buy the ticket online.'],
    ['en', 'Works offline and sends everything once the connection is back.'],
    ['en', 'In their own words, about working with Artaveo.'],
  ]
  for (const [lang, text] of good) {
    it(`clean: «${text}»`, () => assert.deepEqual(ids(text, lang), []))
  }
})

describe('the gate (scripts/check-content.mjs)', () => {
  it('passes on the dictionaries, the seeds and the customer e-mails', () => {
    const run = spawnSync(process.execPath, ['--no-warnings', '--import', './scripts/register-ts-resolve.mjs', 'scripts/check-content.mjs'], { cwd: ROOT, encoding: 'utf8' })
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`)
    assert.match(run.stdout, /Content check passed/)
  })
  it('runs in the build and in npm run check:content (with the database)', () => {
    const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts
    assert.match(scripts.build, /^node --import \.\/scripts\/register-ts-resolve\.mjs scripts\/check-content\.mjs && /)
    assert.match(scripts['check:content'], /scripts\/check-content\.mjs --db$/)
  })
  it('skips only the admin namespaces of the dictionaries', () => {
    const source = readFileSync(join(ROOT, 'scripts/check-content.mjs'), 'utf8')
    const list = JSON.parse(source.match(/ADMIN_NAMESPACES = (\[[^\]]*\])/)[1].replaceAll("'", '"'))
    assert.deepEqual([...list].sort(), ['Admin', 'BlockHints', 'DesignSystemPage', 'ServiceType', 'TechCategories'])
  })
})
