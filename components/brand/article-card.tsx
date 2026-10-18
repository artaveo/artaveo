import Image from 'next/image'

import { Link } from '@/i18n/navigation'

/**
 * Phase 28.5 — an article as a cover, a tag and a title (§ 14.0 Article Card,
 * B-37). The cover is required (33.1): without one the card is not rendered
 * — an article never shows a grey placeholder box.
 */
export function ArticleCover({
  href,
  title,
  tag,
  cover,
}: {
  href: string
  title: string
  tag?: string | null
  cover: { src: string; alt: string } | null | undefined
}) {
  if (!cover) return null
  return (
    <Link
      href={href}
      data-slot="article-card"
      className="hover-lift group flex h-full flex-col overflow-hidden rounded-card-lg border border-paper-line bg-paper-card text-paper-foreground outline-none hover:shadow-card-hover focus-visible:ring-3 focus-visible:ring-ring/60"
    >
      <div className="media-zoom relative aspect-[16/10] bg-paper">
        <Image src={cover.src} alt={cover.alt} fill sizes="(min-width: 1024px) 380px, 90vw" className="object-cover" />
      </div>
      <div className="flex flex-col gap-2 p-5">
        {tag ? <span className="self-start rounded-pill bg-paper px-3 py-1 text-xs font-semibold text-gold-deep">{tag}</span> : null}
        <span className="text-card-title text-balance">{title}</span>
      </div>
    </Link>
  )
}
