#!/usr/bin/env node
/**
 * Phase 17 — unit tests for the pure article helpers (Markdown subset
 * parser, ToC, reading time, placeholder gate). Zero dependencies: runs on
 * Node's built-in test runner with native TypeScript stripping.
 *
 *   npm run test:articles
 *
 * A general test setup (Vitest + CI) is Phase 21's job; these cover the
 * one piece of Phase 17 logic that is both pure and easy to get subtly
 * wrong, so it does not have to wait for Phase 21 to be checked.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  collectMediaIds,
  countWords,
  extractToc,
  inlineText,
  parseArticleBody,
  parseInline,
  slugifyHeading,
} from '../lib/articles/markdown.ts'
import { estimateReadingMinutes } from '../lib/articles/reading-time.ts'
import { findPlaceholders } from '../lib/articles/placeholders.ts'

const UUID = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b'

test('headings: levels are clamped to h2/h3, ids are unique', () => {
  const { blocks } = parseArticleBody('# One\n\n## One\n\n### Two\n\n###### Deep')
  const headings = blocks.filter((b) => b.type === 'heading')
  assert.deepEqual(headings.map((h) => h.level), [2, 2, 3, 3])
  assert.deepEqual(headings.map((h) => h.id), ['one', 'one-2', 'two', 'deep'])
})

test('headings: Persian text keeps its letters in the id (ZWNJ dropped)', () => {
  assert.equal(slugifyHeading('چرا پایگاه داده تصمیم می‌گیرد؟'), 'چرا-پایگاه-داده-تصمیم-میگیرد')
  assert.equal(slugifyHeading('!!!'), 'section')
})

test('toc lists every heading in order', () => {
  const { blocks } = parseArticleBody('## A\n\ntext\n\n### B\n\n## C')
  assert.deepEqual(extractToc(blocks), [
    { id: 'a', text: 'A', level: 2 },
    { id: 'b', text: 'B', level: 3 },
    { id: 'c', text: 'C', level: 2 },
  ])
})

test('code fences are verbatim, including markdown-looking lines and blank lines', () => {
  const src = '```ts\n## not a heading\n\n- not a list\n**not bold**\n```\n\nafter'
  const { blocks } = parseArticleBody(src)
  assert.equal(blocks.length, 2)
  assert.deepEqual(blocks[0], { type: 'code', language: 'ts', code: '## not a heading\n\n- not a list\n**not bold**' })
  assert.equal(blocks[1].type, 'paragraph')
})

test('an unterminated fence runs to the end instead of swallowing nothing', () => {
  const { blocks } = parseArticleBody('```sql\nselect 1;')
  assert.deepEqual(blocks, [{ type: 'code', language: 'sql', code: 'select 1;' }])
})

test('inline: code, strong, emphasis, nesting and escapes', () => {
  const nodes = parseInline('a `x*y` **b *c*** \\*lit\\*')
  assert.equal(inlineText(nodes), 'a x*y b c *lit*')
  assert.equal(nodes.find((n) => n.type === 'code').value, 'x*y')
  assert.ok(nodes.some((n) => n.type === 'strong'))
})

test('inline: snake_case and lone asterisks stay literal', () => {
  assert.equal(inlineText(parseInline('call hold_seats and use a * b')), 'call hold_seats and use a * b')
})

test('links: safe schemes pass, unsafe ones degrade to text with a warning', () => {
  const ok = parseArticleBody('[a](https://example.com) [b](/work/x) [c](mailto:a@b.co) [d](#top)')
  assert.equal(ok.warnings.length, 0)
  assert.equal(ok.blocks[0].children.filter((n) => n.type === 'link').length, 4)

  const bad = parseArticleBody('[x](javascript:alert(1)) and [y](data:text/html,hi) and [z](//evil.com)')
  assert.deepEqual(bad.warnings, ['unsafe-link'])
  assert.equal(bad.blocks[0].children.some((n) => n.type === 'link'), false)
})

test('raw HTML is inert text — there is no HTML output path at all', () => {
  const { blocks } = parseArticleBody('<script>alert(1)</script> <img src=x onerror=alert(1)>')
  assert.equal(blocks[0].type, 'paragraph')
  assert.equal(inlineText(blocks[0].children), '<script>alert(1)</script> <img src=x onerror=alert(1)>')
})

test('images: only media-library references are images', () => {
  const ok = parseArticleBody(`![A caption](media:${UUID.toUpperCase()})`)
  assert.equal(ok.blocks[0].type, 'image')
  assert.equal(ok.blocks[0].mediaId, UUID)
  assert.equal(inlineText(ok.blocks[0].caption), 'A caption')
  assert.deepEqual(collectMediaIds(ok.blocks), [UUID])

  const remote = parseArticleBody('![x](https://evil.example/pixel.png)')
  assert.equal(remote.blocks[0].type, 'paragraph')
  assert.deepEqual(remote.warnings, ['unsupported-image'])
})

test('lists: ordered vs unordered are separate blocks; wrapped items continue', () => {
  const { blocks } = parseArticleBody('- a\n  wrapped\n- b\n1. one\n2) two')
  assert.equal(blocks.length, 2)
  assert.equal(blocks[0].ordered, false)
  assert.equal(inlineText(blocks[0].items[0]), 'a wrapped')
  assert.equal(blocks[1].ordered, true)
  assert.equal(blocks[1].items.length, 2)
})

test('callouts and quotes', () => {
  const { blocks } = parseArticleBody('> [!WARNING] Careful\n> first\n>\n> second\n\n> plain quote')
  assert.equal(blocks[0].type, 'callout')
  assert.equal(blocks[0].variant, 'warning')
  assert.equal(blocks[0].title, 'Careful')
  assert.equal(blocks[0].paragraphs.length, 2)
  assert.equal(blocks[1].type, 'quote')
})

test('paragraphs soft-wrap and stop at the next block', () => {
  const { blocks } = parseArticleBody('line one\nline two\n## Next')
  assert.equal(inlineText(blocks[0].children), 'line one line two')
  assert.equal(blocks[1].type, 'heading')
})

test('CRLF input parses the same as LF', () => {
  assert.deepEqual(parseArticleBody('## A\r\n\r\ntext\r\n').blocks, parseArticleBody('## A\n\ntext\n').blocks)
})

test('reading time: per locale, code weighs half, empty is zero', () => {
  const words = (n) => Array.from({ length: n }, () => 'word').join(' ')
  assert.equal(estimateReadingMinutes('', 'en'), 0)
  assert.equal(estimateReadingMinutes('hi', 'en'), 1)
  assert.equal(estimateReadingMinutes(words(400), 'en'), 2)
  assert.equal(estimateReadingMinutes(words(400), 'fa'), 3) // 400 / 180 → 3
  const withCode = `${words(100)}\n\n\`\`\`\n${words(200)}\n\`\`\``
  assert.deepEqual(countWords(parseArticleBody(withCode).blocks), { prose: 100, code: 200 })
  assert.equal(estimateReadingMinutes(withCode, 'en'), 1) // 100 + 100 = 200 → 1
})

test('placeholder gate matches UPPER_SNAKE tokens only', () => {
  assert.deepEqual(findPlaceholders('done [CLIENT_NAME] and [PROJECT_YEAR]', '[link](https://x.y) [!NOTE] [x] [38%]'), [
    '[CLIENT_NAME]',
    '[PROJECT_YEAR]',
  ])
})
