import { Check } from 'lucide-react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'

import { ForwardArrow } from '@/components/brand/brand-icons'
import { PillLink } from '@/components/brand/pill'
import { PROJECT_GLOW_ALPHA, projectPalette, projectStyle, withAlpha } from '@/lib/design/color'
import { pickMockupImages } from '@/lib/design/mockups'
import { cn } from '@/lib/utils'
import { t, type Locale, type Project } from '@/types/content'

/**
 * Phase 28.5 — one product as its own block (§ 2.24, § 14.1): its colour,
 * a real screenshot, one line, up to four features, *Request a Demo* and *See
 * the product*. A block stands alone — never in a grid with unrelated tiles
 * (the owner rejected exactly that in the design sample) — and blocks are
 * stacked with ≥ 28 px between them by the caller. The image side alternates
 * with `reverse`. Ways to get the product never appear here: they belong on
 * the product page only.
 */
export function ProductBlock({
  product,
  productHref,
  demoHref,
  reverse = false,
  headingLevel = 'h3',
}: {
  product: Project
  /** The product's page; `null` while it has none yet — the block then offers the demo request alone. */
  productHref: string | null
  demoHref: string
  reverse?: boolean
  headingLevel?: 'h2' | 'h3'
}) {
  const locale = useLocale() as Locale
  const tr = useTranslations('Brand')
  const palette = projectPalette(product.brandColor, product.accentColor)
  const { laptop } = pickMockupImages(product, locale)
  const line = product.outcomeLine ? t(product.outcomeLine, locale) : t(product.summary, locale)
  const features = product.features.slice(0, 4)
  const Heading = headingLevel

  return (
    <article
      style={{
        ...projectStyle(palette),
        backgroundImage: `radial-gradient(70% 90% at ${reverse ? '100%' : '0%'} 100%, ${withAlpha(palette.accent, PROJECT_GLOW_ALPHA)}, transparent 60%), linear-gradient(160deg, ${palette.surface}, ${palette.deep})`,
      }}
      className="@container mx-auto w-full max-w-[68.75rem] rounded-panel border border-white/10 text-project-on"
      data-slot="product-block"
    >
      <div className={cn('flex flex-col gap-8 p-6 @3xl:items-center @3xl:gap-11 @3xl:p-11', reverse ? '@3xl:flex-row-reverse' : '@3xl:flex-row')}>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {product.industry ? (
            <span className="self-start rounded-pill bg-project-accent/15 px-3 py-1 text-xs font-bold text-project-accent-text">
              {t(product.industry, locale)}
            </span>
          ) : null}
          <Heading className="text-h3 text-balance">{t(product.title, locale)}</Heading>
          <p className="text-body text-pretty text-project-on-muted">{line}</p>
          {features.length > 0 ? (
            <ul className="grid gap-x-5 gap-y-2 text-sm @xl:grid-cols-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-project-accent-text" />
                  <span>{t(feature, locale)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-1 flex flex-wrap gap-2.5">
            <PillLink href={demoHref} variant="project">
              {tr('requestDemo')}
            </PillLink>
            {productHref ? (
              <PillLink href={productHref} variant="glass">
                {tr('seeProduct')}
                <ForwardArrow />
              </PillLink>
            ) : null}
          </div>
        </div>
        {laptop ? (
          <div className="media-zoom relative aspect-[16/9.5] min-w-0 flex-1 overflow-hidden rounded-card border border-white/10 shadow-float">
            <Image src={laptop.src} alt={laptop.alt} fill sizes="(min-width: 1024px) 560px, 90vw" className="object-cover object-top" />
          </div>
        ) : null}
      </div>
    </article>
  )
}

/** Products stacked one under another, image side alternating; nothing at all when no product is published. */
export function ProductBlockList({
  products,
  productHref,
  demoHref,
  headingLevel,
}: {
  products: Project[]
  productHref: (product: Project) => string | null
  demoHref: (product: Project) => string
  /** `h2` where the list is the page's main content (/products). */
  headingLevel?: 'h2' | 'h3'
}) {
  if (products.length === 0) return null
  return (
    <div className="flex flex-col gap-8">
      {products.map((product, index) => (
        <ProductBlock key={product.id} product={product} productHref={productHref(product)} demoHref={demoHref(product)} reverse={index % 2 === 1} headingLevel={headingLevel} />
      ))}
    </div>
  )
}
