/**
 * Phase 33 — Articles: the menu rule (33.2), tags, the publish rules the
 * database enforces (0032), the move from /insights and the card (B-37).
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { MAX_TAGS, normalizeTags } from '../../lib/articles/tags.ts'
import { buildFooterModel, buildHeaderModel, EMPTY_MENUS } from '../../lib/shell-menus.ts'
import { applyArticleRule, ARTICLES_IN_HEADER_FROM, buildShellData, navFor } from '../../lib/shell-settings.ts'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
const ALL = ['header', 'footer', 'mobile', 'command-palette']
const row = (key, href, surfaces, sort, has_content = true) => ({ key, href, surfaces, has_description: false, has_content, sort_order: sort })
const shellWith = (surfaces, hasContent = true) =>
  buildShellData([row('work', '/work', ALL, 1), row('articles', '/articles', surfaces, 6, hasContent), row('contact', '/contact', ['footer'], 8)], null)
const where = (shell) => Object.fromEntries(ALL.map((surface) => [surface, navFor(shell, surface).some((item) => item.key === 'articles')]))

describe('the articles link (33.2): the footer first, the header from the fourth article', () => {
  it('no readable article — no link anywhere', () => {
    assert.deepEqual(where(applyArticleRule(shellWith(ALL), 0)), { header: false, footer: false, mobile: false, 'command-palette': false })
  })
  for (const count of [1, 2, 3]) {
    it(`${count} article(s) — the footer and the search only`, () => {
      assert.deepEqual(where(applyArticleRule(shellWith(ALL), count)), { header: false, footer: true, mobile: false, 'command-palette': true })
    })
  }
  it(`${ARTICLES_IN_HEADER_FROM} articles or more — every place the owner put it`, () => {
    assert.equal(ARTICLES_IN_HEADER_FROM, 4)
    for (const count of [4, 12]) assert.deepEqual(where(applyArticleRule(shellWith(ALL), count)), { header: true, footer: true, mobile: true, 'command-palette': true })
  })
  it("the owner's placement still applies, and his switch hides it altogether", () => {
    assert.deepEqual(where(applyArticleRule(shellWith(['header', 'mobile']), 2)), { header: false, footer: false, mobile: false, 'command-palette': false })
    assert.deepEqual(where(applyArticleRule(shellWith(['footer']), 9)), { header: false, footer: true, mobile: false, 'command-palette': false })
    assert.deepEqual(where(applyArticleRule(shellWith(ALL, false), 9)), { header: false, footer: false, mobile: false, 'command-palette': false })
  })
  it('the header and the footer models follow it', () => {
    assert.ok(!buildHeaderModel(applyArticleRule(shellWith(ALL), 3), EMPTY_MENUS).links.some((link) => link.key === 'articles'))
    assert.ok(buildHeaderModel(applyArticleRule(shellWith(ALL), 4), EMPTY_MENUS).links.some((link) => link.key === 'articles'))
    const footer = JSON.stringify(buildFooterModel(applyArticleRule(shellWith(ALL), 1), EMPTY_MENUS))
    assert.match(footer, /\/articles/)
  })
  it('the other items are untouched', () => {
    const shell = applyArticleRule(shellWith(ALL), 0)
    assert.deepEqual(shell.nav.map((item) => item.key), ['work', 'contact'])
  })
  it('the layout applies it with the count of readable articles', () => {
    const layout = read('app/[locale]/layout.tsx')
    assert.match(layout, /countPublishedArticles\(\)/)
    assert.match(layout, /applyArticleRule\(shellSettings, articleCount\)/)
  })
})

describe('tags (33.1)', () => {
  it('keeps only tags in both languages, trimmed, without duplicates, at most eight', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ en: `Tag ${i}`, fa: `برچسب ${i}` }))
    assert.equal(normalizeTags(many).length, MAX_TAGS)
    assert.deepEqual(normalizeTags([{ en: ' Tickets ', fa: ' تکت ' }, { en: 'tickets', fa: 'تکت' }, { en: 'Only English', fa: '' }, null, 'x']), [{ en: 'Tickets', fa: 'تکت' }])
    assert.deepEqual(normalizeTags('not a list'), [])
  })
})

describe('the database rules (migration 0032)', () => {
  const sql = read('db/migrations/0032_articles.sql')
  it('a cover, tags and an audience; only a customer article with a cover is published or scheduled', () => {
    assert.match(sql, /cover_media_id uuid references public\.media_assets \(id\) on delete restrict/)
    assert.match(sql, /tags jsonb not null default '\[\]'::jsonb/)
    assert.match(sql, /audience text not null default 'customer' check \(audience in \('customer', 'engineering'\)\)/)
    assert.match(sql, /status not in \('published', 'scheduled'\) or \(audience = 'customer' and cover_media_id is not null\)/)
  })
  it('the existing engineering note stays unpublished (33.3)', () => {
    assert.match(sql, /update public\.articles set audience = 'engineering' where slug = 'concurrent-seat-booking'/)
  })
  it('the navigation item becomes articles, /articles', () => {
    assert.match(sql, /set key = 'articles', href = '\/articles', has_content = true where key = 'insights'/)
    assert.match(sql, /'about', 'articles', 'designSystem'/)
  })
  it('the public read repeats the rule (defence in depth)', () => {
    const lib = read('lib/insights.ts')
    assert.equal((lib.match(/\.eq\('audience', 'customer'\)/g) ?? []).length, 3)
    assert.equal((lib.match(/\.not\('cover_media_id', 'is', null\)/g) ?? []).length, 3)
  })
  it('the actions say why an article cannot go public', () => {
    const actions = read('app/actions/content.ts')
    assert.match(actions, /'missing-cover'/)
    assert.match(actions, /'not-for-customers'/)
    assert.match(actions, /function publicArticleProblem/)
  })
})

describe('/insights became /articles (33.1)', () => {
  it('the routes moved; the old addresses redirect permanently', () => {
    for (const file of ['app/[locale]/articles/page.tsx', 'app/[locale]/articles/[slug]/page.tsx', 'app/[locale]/articles/feed.xml/route.ts']) assert.ok(existsSync(new URL(`../../${file}`, import.meta.url)), file)
    assert.ok(!existsSync(new URL('../../app/[locale]/insights', import.meta.url)))
    const config = read('next.config.mjs')
    assert.match(config, /source: '\/:locale\(en\|fa\)\/insights', destination: '\/:locale\/articles', permanent: true/)
    assert.match(config, /source: '\/:locale\(en\|fa\)\/insights\/:path\*', destination: '\/:locale\/articles\/:path\*', permanent: true/)
  })
  it('the menu says «مقاله‌ها» / Articles', () => {
    const fa = JSON.parse(read('messages/fa.json'))
    const en = JSON.parse(read('messages/en.json'))
    assert.equal(fa.Nav.articles, 'مقاله‌ها')
    assert.equal(en.Nav.articles, 'Articles')
    assert.ok(!('Insights' in fa) && !('insights' in fa.Nav))
  })
  it('the card is the cover, the topic and the title (B-37)', () => {
    const card = read('components/articles/article-card.tsx')
    assert.match(card, /<ArticleCover/)
    assert.match(card, /cover=\{article\.cover \?/)
  })
})
