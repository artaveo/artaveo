import { Fragment } from 'react'
import type * as React from 'react'

import { Link } from '@/i18n/navigation'
import { Blockquote, Callout, CodeBlock } from '@/components/ui/content'
import { Prose } from '@/components/ui/prose'
import type { ArticleBlock, Inline } from '@/lib/articles/markdown'
import { t, type ArticleImage, type Locale } from '@/types/content'

/**
 * Renders the parsed article AST (`lib/articles/markdown.ts`) to React
 * elements. Nothing here builds an HTML string: text always goes through
 * React's escaping, and the only "markup" an author can influence is the
 * closed set of block/inline kinds the parser emits.
 */

// One Latin technical run: `PostgreSQL`, `Next.js`, `row level security`, `app/api/x`.
// Trailing punctuation (`Next.js.`) is deliberately left outside the run.
const LATIN_TERM = '[A-Za-z](?:[A-Za-z0-9_.\\-/]*[A-Za-z0-9])?'
const LATIN_RUN = new RegExp(`(${LATIN_TERM}(?: ${LATIN_TERM})*)`)

/** § 16.2 — Latin technical terms inside Persian text sit in `<bdi dir="ltr">` so bidi never reorders them. */
function isolateLatin(text: string, locale: Locale, keyPrefix: string): React.ReactNode {
  if (locale !== 'fa') return text
  return text.split(LATIN_RUN).map((part, index) =>
    index % 2 === 1 ? (
      <bdi key={`${keyPrefix}-${index}`} dir="ltr">
        {part}
      </bdi>
    ) : (
      part
    ),
  )
}

function renderInline(nodes: Inline[], locale: Locale, keyPrefix: string): React.ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`
    switch (node.type) {
      case 'text':
        return <Fragment key={key}>{isolateLatin(node.value, locale, key)}</Fragment>
      case 'code':
        // Code is always LTR, even inside an RTL paragraph.
        return (
          <bdi key={key} dir="ltr">
            <code>{node.value}</code>
          </bdi>
        )
      case 'strong':
        return <strong key={key}>{renderInline(node.children, locale, key)}</strong>
      case 'em':
        return <em key={key}>{renderInline(node.children, locale, key)}</em>
      case 'link': {
        const children = renderInline(node.children, locale, key)
        // Site-relative links go through the locale-aware Link (`/work/x` → `/fa/work/x`).
        if (node.href.startsWith('/')) {
          return (
            <Link key={key} href={node.href}>
              {children}
            </Link>
          )
        }
        const external = /^https?:/i.test(node.href)
        return (
          <a key={key} href={node.href} {...(external ? { rel: 'noopener noreferrer' } : {})}>
            {children}
          </a>
        )
      }
    }
  })
}

export function ArticleBody({
  blocks,
  locale,
  images,
  copyLabel,
  copiedLabel,
}: {
  blocks: ArticleBlock[]
  locale: Locale
  images: Record<string, ArticleImage>
  copyLabel: string
  copiedLabel: string
}) {
  return (
    <Prose>
      {blocks.map((block, index) => {
        const key = `b${index}`
        switch (block.type) {
          case 'heading': {
            const Tag = block.level === 2 ? 'h2' : 'h3'
            return (
              <Tag key={key} id={block.id} className="scroll-mt-24">
                {renderInline(block.children, locale, key)}
              </Tag>
            )
          }
          case 'paragraph':
            return <p key={key}>{renderInline(block.children, locale, key)}</p>
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul'
            return (
              <List key={key}>
                {block.items.map((item, i) => (
                  <li key={`${key}-${i}`}>{renderInline(item, locale, `${key}-${i}`)}</li>
                ))}
              </List>
            )
          }
          case 'quote':
            return (
              <Blockquote key={key}>
                {block.paragraphs.map((p, i) => (
                  <p key={`${key}-${i}`}>{renderInline(p, locale, `${key}-${i}`)}</p>
                ))}
              </Blockquote>
            )
          case 'callout':
            return (
              <Callout key={key} variant={block.variant} title={block.title ?? undefined}>
                {block.paragraphs.map((p, i) => (
                  <p key={`${key}-${i}`}>{renderInline(p, locale, `${key}-${i}`)}</p>
                ))}
              </Callout>
            )
          case 'code':
            return (
              <CodeBlock
                key={key}
                code={block.code}
                language={block.language ?? undefined}
                copyLabel={copyLabel}
                copiedLabel={copiedLabel}
              />
            )
          case 'image': {
            // An asset deleted after the article was written is skipped, never rendered broken.
            const image = images[block.mediaId]
            if (!image) return null
            return (
              <figure key={key}>
                {/* Plain <img>: uploaded media live on the Storage host, which next/image has no remotePattern for (see PHASE-17-README). Width/height reserve the space, so no layout shift. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={t(image.alt, locale)}
                  width={image.width ?? undefined}
                  height={image.height ?? undefined}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full"
                />
                {block.caption ? (
                  <figcaption className="mt-2 text-sm text-muted-foreground">
                    {renderInline(block.caption, locale, `${key}-cap`)}
                  </figcaption>
                ) : null}
              </figure>
            )
          }
          case 'rule':
            return <hr key={key} className="border-border" />
        }
      })}
    </Prose>
  )
}
