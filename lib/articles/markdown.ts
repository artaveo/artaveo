/**
 * Phase 17 — the article body format.
 *
 * `articles.body` is `{ en, fa }` plain text (0005, unchanged). Phase 15's
 * admin already stores it as a textarea value; Phase 17 gives that text a
 * small, documented Markdown subset and renders it to an AST that React
 * turns into elements. There is deliberately **no HTML string** anywhere
 * in this pipeline (no `dangerouslySetInnerHTML`, no raw-HTML passthrough):
 * an unknown or unsafe construct can only ever degrade to plain text, never
 * to markup. It is also why this is ~300 lines of parser instead of a
 * dependency — the subset is small, the safety property is the point, and
 * the site needs the heading list (ToC), the media ids (image resolution)
 * and the word count from the same parse the renderer uses.
 *
 * Supported blocks
 * - `##` / `###` headings. The page title is the only `h1`, so `#` is
 *   read as `##` and `####`–`######` as `###`.
 * - paragraphs (soft-wrapped lines join with a space)
 * - unordered (`-`, `*`, `+`) and ordered (`1.`, `1)`) lists — one level;
 *   an indented marker is read as another item at the same level
 * - blockquotes (`>`), and callouts: a quote whose first line is
 *   `[!NOTE]`, `[!TIP]`, `[!WARNING]` or `[!DANGER]` (optionally followed
 *   by a title on the same line)
 * - fenced code (```` ```lang ````) — content is kept byte-for-byte
 * - `---` thematic break
 * - images, only from the media library, on their own line:
 *   `![optional caption](media:<asset-uuid>)`. The asset's own bilingual
 *   `alt` (required at upload, § 15) is what is announced; the bracket
 *   text is an optional visible caption. Any other image syntax is not an
 *   image — it renders as text and raises a warning.
 *
 * Supported inline: `` `code` ``, `**strong**`, `*emphasis*`,
 * `[text](url)` (http(s), mailto, site-relative `/…`, in-page `#…` only —
 * anything else, e.g. `javascript:`, is dropped to its text with a
 * warning), and backslash escapes. `_underscore_` emphasis is intentionally
 * not supported so identifiers like `hold_seats` never turn italic.
 */

export type Inline =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'em'; children: Inline[] }
  | { type: 'link'; href: string; children: Inline[] }

export type CalloutVariant = 'info' | 'tip' | 'warning' | 'danger'

export type ArticleBlock =
  | { type: 'heading'; level: 2 | 3; id: string; text: string; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] }
  | { type: 'quote'; paragraphs: Inline[][] }
  | { type: 'callout'; variant: CalloutVariant; title: string | null; paragraphs: Inline[][] }
  | { type: 'code'; language: string | null; code: string }
  | { type: 'image'; mediaId: string; caption: Inline[] | null }
  | { type: 'rule' }

export type ArticleWarning = 'unsafe-link' | 'unsupported-image'

export type ParsedArticle = {
  blocks: ArticleBlock[]
  warnings: ArticleWarning[]
}

export type TocEntry = { id: string; text: string; level: 2 | 3 }

/**
 * A table of contents for two headings is noise; it appears from this many
 * on. Lives here, not next to the client `ArticleToc` component: a Server
 * Component that imports a *value* from a `'use client'` file receives a
 * client reference, not the number — `toc.length >= <reference>` is always
 * false, which is exactly how the ToC silently vanished in the first build.
 */
export const TOC_MIN_ENTRIES = 3

const CALLOUT_TAGS: Record<string, CalloutVariant> = {
  NOTE: 'info',
  INFO: 'info',
  TIP: 'tip',
  WARNING: 'warning',
  CAUTION: 'danger',
  DANGER: 'danger',
}

const ESCAPABLE = '\\`*[]()#>-!_.+'

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

const RE_FENCE_OPEN = /^```[ \t]*([A-Za-z0-9_+#.-]*)[ \t]*$/
const RE_FENCE_CLOSE = /^```[ \t]*$/
const RE_HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/
const RE_RULE = /^(?:-{3,}|\*{3,}|_{3,})[ \t]*$/
const RE_IMAGE = new RegExp(`^!\\[([^\\]]*)\\]\\(media:(${UUID})\\)[ \\t]*$`)
const RE_LOOSE_IMAGE = /!\[[^\]]*\]\([^)]*\)/
const RE_LIST_ITEM = /^([ \t]*)([-*+]|\d{1,3}[.)])[ \t]+(.*)$/
const RE_QUOTE = /^[ \t]{0,3}>[ \t]?(.*)$/
const RE_CALLOUT_TAG = /^\[!([A-Za-z]+)\][ \t]*(.*)$/

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------

type Ctx = { warnings: Set<ArticleWarning> }

function sanitizeHref(raw: string): string | null {
  const href = raw.trim()
  if (!href) return null
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href)
      return url.protocol === 'http:' || url.protocol === 'https:' ? href : null
    } catch {
      return null
    }
  }
  if (/^mailto:[^\s]+$/i.test(href)) return href
  // `\` is read as `/` by browsers, so `/\evil.example` would be the protocol-relative `//evil.example`.
  if (href.startsWith('/') && !href.startsWith('//') && !/[\s\\]/.test(href)) return href
  if (href.startsWith('#') && href.length > 1 && !/\s/.test(href)) return href
  return null
}

/** Index of the next unescaped `marker` at or after `from`, skipping code spans; -1 if none. */
function findClose(src: string, from: number, marker: '*' | '**'): number {
  let j = from
  while (j < src.length) {
    const ch = src[j]
    if (ch === '\\') {
      j += 2
      continue
    }
    if (ch === '`') {
      let n = 1
      while (src[j + n] === '`') n++
      const end = src.indexOf('`'.repeat(n), j + n)
      j = end === -1 ? j + n : end + n
      continue
    }
    if (src.startsWith(marker, j)) {
      // A lone `*` must not be the first half of a `**`.
      if (marker === '*' && src[j + 1] === '*') {
        j += 2
        continue
      }
      // In a run of three (`*c***`) the inner `*` closes first and the
      // last two close the strong — so `**b *c***` nests as strong(b, em(c)).
      if (marker === '**' && src[j + 2] === '*') return j + 1
      return j
    }
    j++
  }
  return -1
}

function findClosingBracket(src: string, open: number): number {
  let depth = 0
  for (let j = open; j < src.length; j++) {
    const ch = src[j]
    if (ch === '\\') {
      j++
      continue
    }
    if (ch === '[') depth++
    else if (ch === ']') {
      depth--
      if (depth === 0) return j
    }
  }
  return -1
}

export function parseInline(src: string, ctx: Ctx = { warnings: new Set() }): Inline[] {
  const out: Inline[] = []
  let buf = ''
  const flush = () => {
    if (buf) {
      out.push({ type: 'text', value: buf })
      buf = ''
    }
  }

  let i = 0
  while (i < src.length) {
    const ch = src[i]

    if (ch === '\\' && i + 1 < src.length && ESCAPABLE.includes(src[i + 1])) {
      buf += src[i + 1]
      i += 2
      continue
    }

    if (ch === '`') {
      let n = 1
      while (src[i + n] === '`') n++
      const fence = '`'.repeat(n)
      // The closing run must be exactly `n` long.
      let end = src.indexOf(fence, i + n)
      while (end !== -1 && src[end + n] === '`') {
        let run = n
        while (src[end + run] === '`') run++
        end = src.indexOf(fence, end + run)
      }
      if (end !== -1 && end > i + n) {
        flush()
        out.push({ type: 'code', value: src.slice(i + n, end).replace(/^ (.*[^ ].*) $/, '$1') })
        i = end + n
        continue
      }
      buf += fence
      i += n
      continue
    }

    if (ch === '*') {
      const marker = src[i + 1] === '*' ? '**' : '*'
      const close = findClose(src, i + marker.length, marker)
      if (close > i + marker.length) {
        const inner = src.slice(i + marker.length, close)
        if (!/^\s|\s$/.test(inner)) {
          flush()
          out.push({ type: marker === '**' ? 'strong' : 'em', children: parseInline(inner, ctx) })
          i = close + marker.length
          continue
        }
      }
      buf += marker
      i += marker.length
      continue
    }

    if (ch === '[') {
      const closeBracket = findClosingBracket(src, i)
      if (closeBracket !== -1 && src[closeBracket + 1] === '(') {
        const closeParen = src.indexOf(')', closeBracket + 2)
        if (closeParen !== -1) {
          const label = src.slice(i + 1, closeBracket)
          const href = sanitizeHref(src.slice(closeBracket + 2, closeParen))
          flush()
          if (href) {
            out.push({ type: 'link', href, children: parseInline(label, ctx) })
          } else {
            ctx.warnings.add('unsafe-link')
            out.push(...parseInline(label, ctx))
          }
          i = closeParen + 1
          continue
        }
      }
    }

    buf += ch
    i++
  }

  flush()
  return out
}

/** Plain text of an inline run — used for heading text, ToC labels and word counts. */
export function inlineText(nodes: Inline[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text' || node.type === 'code') return node.value
      return inlineText(node.children)
    })
    .join('')
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/** Heading id: letters and digits from any script (Persian included), everything else collapsed to `-`. */
export function slugifyHeading(text: string): string {
  const slug = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u200c\u200d]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/[\s-]+/g, '-')
  return slug || 'section'
}

function startsNewBlock(line: string): boolean {
  return (
    RE_FENCE_OPEN.test(line) ||
    RE_HEADING.test(line) ||
    RE_RULE.test(line) ||
    RE_IMAGE.test(line) ||
    RE_QUOTE.test(line) ||
    RE_LIST_ITEM.test(line)
  )
}

function splitQuoteParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = []
  let current: string[] = []
  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length) paragraphs.push(current.join(' '))
      current = []
    } else {
      current.push(line.trim())
    }
  }
  if (current.length) paragraphs.push(current.join(' '))
  return paragraphs
}

export function parseArticleBody(source: string): ParsedArticle {
  const ctx: Ctx = { warnings: new Set() }
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ArticleBlock[] = []
  const usedIds = new Map<string, number>()

  const uniqueId = (text: string): string => {
    const base = slugifyHeading(text)
    const seen = usedIds.get(base) ?? 0
    usedIds.set(base, seen + 1)
    return seen === 0 ? base : `${base}-${seen + 1}`
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    // Fenced code — verbatim, unterminated fence runs to the end of the body.
    const fence = RE_FENCE_OPEN.exec(line)
    if (fence) {
      const code: string[] = []
      i++
      while (i < lines.length && !RE_FENCE_CLOSE.test(lines[i])) {
        code.push(lines[i])
        i++
      }
      i++ // closing fence (or past the end)
      blocks.push({ type: 'code', language: fence[1] ? fence[1].toLowerCase() : null, code: code.join('\n') })
      continue
    }

    const heading = RE_HEADING.exec(line)
    if (heading) {
      const level: 2 | 3 = heading[1].length <= 2 ? 2 : 3
      const children = parseInline(heading[2], ctx)
      const text = inlineText(children).trim()
      blocks.push({ type: 'heading', level, id: uniqueId(text), text, children })
      i++
      continue
    }

    if (RE_RULE.test(line)) {
      blocks.push({ type: 'rule' })
      i++
      continue
    }

    const image = RE_IMAGE.exec(line)
    if (image) {
      const caption = image[1].trim()
      blocks.push({ type: 'image', mediaId: image[2].toLowerCase(), caption: caption ? parseInline(caption, ctx) : null })
      i++
      continue
    }

    if (RE_QUOTE.test(line)) {
      const quoted: string[] = []
      while (i < lines.length) {
        const match = RE_QUOTE.exec(lines[i])
        if (!match) break
        quoted.push(match[1])
        i++
      }
      // The `[!TAG] optional title` marker must be the first quoted line on
      // its own — the lines after it are the callout's paragraphs.
      const tag = RE_CALLOUT_TAG.exec(quoted[0].trim())
      const variant = tag ? CALLOUT_TAGS[tag[1].toUpperCase()] : undefined
      if (tag && variant) {
        const rest = splitQuoteParagraphs(quoted.slice(1)).map((p) => parseInline(p, ctx))
        blocks.push({ type: 'callout', variant, title: tag[2].trim() || null, paragraphs: rest })
      } else {
        blocks.push({ type: 'quote', paragraphs: splitQuoteParagraphs(quoted).map((p) => parseInline(p, ctx)) })
      }
      continue
    }

    const listStart = RE_LIST_ITEM.exec(line)
    if (listStart) {
      const ordered = /\d/.test(listStart[2])
      const items: string[] = []
      while (i < lines.length) {
        const current = lines[i]
        const item = RE_LIST_ITEM.exec(current)
        if (item && /\d/.test(item[2]) === ordered) {
          items.push(item[3])
          i++
        } else if (item) {
          break // a list of the other kind starts a new block
        } else if (current.trim() !== '' && /^[ \t]+\S/.test(current) && !startsNewBlock(current)) {
          items[items.length - 1] += ` ${current.trim()}` // wrapped continuation of the previous item
          i++
        } else {
          break
        }
      }
      blocks.push({ type: 'list', ordered, items: items.map((item) => parseInline(item, ctx)) })
      continue
    }

    // Paragraph: runs until a blank line or the start of another block.
    const paragraph: string[] = [line.trim()]
    i++
    while (i < lines.length && lines[i].trim() !== '' && !startsNewBlock(lines[i])) {
      paragraph.push(lines[i].trim())
      i++
    }
    const text = paragraph.join(' ')
    if (RE_LOOSE_IMAGE.test(text)) ctx.warnings.add('unsupported-image')
    blocks.push({ type: 'paragraph', children: parseInline(text, ctx) })
  }

  return { blocks, warnings: [...ctx.warnings] }
}

// ---------------------------------------------------------------------------
// Derived views over the same parse
// ---------------------------------------------------------------------------

export function extractToc(blocks: ArticleBlock[]): TocEntry[] {
  const toc: TocEntry[] = []
  for (const block of blocks) {
    if (block.type === 'heading') toc.push({ id: block.id, text: block.text, level: block.level })
  }
  return toc
}

export function collectMediaIds(blocks: ArticleBlock[]): string[] {
  const ids = new Set<string>()
  for (const block of blocks) {
    if (block.type === 'image') ids.add(block.mediaId)
  }
  return [...ids]
}

/** Prose vs. code word counts — `lib/articles/reading-time.ts` weights them differently. */
export function countWords(blocks: ArticleBlock[]): { prose: number; code: number } {
  const count = (text: string) => text.split(/\s+/).filter(Boolean).length
  let prose = 0
  let code = 0
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        prose += count(block.text)
        break
      case 'paragraph':
        prose += count(inlineText(block.children))
        break
      case 'list':
        for (const item of block.items) prose += count(inlineText(item))
        break
      case 'quote':
        for (const p of block.paragraphs) prose += count(inlineText(p))
        break
      case 'callout':
        if (block.title) prose += count(block.title)
        for (const p of block.paragraphs) prose += count(inlineText(p))
        break
      case 'code':
        code += count(block.code)
        break
      case 'image':
        if (block.caption) prose += count(inlineText(block.caption))
        break
    }
  }
  return { prose, code }
}
