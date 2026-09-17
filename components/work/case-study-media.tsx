import Image from 'next/image'

import { BrowserFrame, DeviceFrame } from '@/components/ui/frames'
import { cn } from '@/lib/utils'
import { t, type Locale, type ProjectMediaItem } from '@/types/content'

/**
 * Shared sizing logic for CaseStudyHeroMedia / CaseStudyEvidenceGroup —
 * out-of-sequence work, roadmap § 23.1 (not a phase), replacing the
 * fixed `aspect-[16/9]` + `object-cover` crop the old single `main`
 * sequence used with each screenshot's real aspect ratio. A landscape
 * shot is capped by width (it reads comfortably at that width and its
 * height falls out of the ratio); a portrait/tall shot — several of
 * the real Pazhuhesh Portal captures are narrower-than-tall — is
 * capped by height instead, so it never towers over the viewport, and
 * its width falls out of the ratio. Either way the container's own
 * aspect-ratio exactly matches the image's, so `object-contain` never
 * needs to letterbox or crop anything.
 */
function mediaBoxDimensions(
  width: number | undefined,
  height: number | undefined,
  { maxWidthPx, maxHeightPx }: { maxWidthPx: number; maxHeightPx: number },
) {
  const w = width ?? 1600
  const h = height ?? 900
  const isPortrait = h > w
  const cappedMaxWidth = isPortrait ? Math.round(maxHeightPx * (w / h)) : maxWidthPx
  return { width: w, height: h, maxWidthPx: cappedMaxWidth }
}

function MediaFrame({
  item,
  locale,
  projectSlug,
  priority,
  maxWidthPx,
  maxHeightPx,
  sizes,
}: {
  item: ProjectMediaItem
  locale: Locale
  projectSlug: string
  priority: boolean
  maxWidthPx: number
  maxHeightPx: number
  sizes: string
}) {
  const { width, height, maxWidthPx: boxMaxWidth } = mediaBoxDimensions(item.width, item.height, {
    maxWidthPx,
    maxHeightPx,
  })

  const image = (
    <div
      className="relative mx-auto w-full"
      style={{ maxWidth: `${boxMaxWidth}px`, aspectRatio: `${width} / ${height}` }}
    >
      <Image
        src={item.src}
        alt={t(item.alt, locale)}
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain"
      />
    </div>
  )

  return item.kind === 'mobile' ? (
    <DeviceFrame variant="phone">{image}</DeviceFrame>
  ) : (
    <BrowserFrame url={`artaveo.dev/work/${projectSlug}`}>{image}</BrowserFrame>
  )
}

/**
 * CaseStudyHeroMedia — the single lead image at the top of a case
 * study (`placement: 'hero'`, exactly one per project). Prominent but
 * controlled: capped width on a landscape shot, capped height on a
 * portrait one, centered, with whitespace around it rather than
 * touching the viewport edges — "here is the product", not "here is a
 * full-screen image".
 */
export function CaseStudyHeroMedia({
  item,
  locale,
  projectSlug,
}: {
  item: ProjectMediaItem
  locale: Locale
  projectSlug: string
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <MediaFrame
        item={item}
        locale={locale}
        projectSlug={projectSlug}
        priority
        maxWidthPx={896}
        maxHeightPx={640}
        sizes="(min-width: 1024px) 768px, 100vw"
      />
    </div>
  )
}

/**
 * CaseStudyEvidenceGroup — one "evidence moment": one or more `'story'`
 * screenshots that share a `storyKey`, rendered together next to the
 * prose section they support (never as separate full-width blocks in a
 * row). One shot renders alone at content-column width. Two shots
 * render as a balanced side-by-side pair, neither dominating (§9's
 * "balanced composition"). Three or more shots that form one flow give
 * the first item more visual emphasis and lay the rest out as
 * supporting evidence in a 2-column grid on desktop, stacked on mobile
 * — e.g. Transportation System's booking flow (search results
 * emphasized, seat-selection + confirmation as supporting evidence,
 * §8). Every image keeps its real caption (already-verified copy from
 * 0013, not new copy) so the reader always knows why the shot is
 * there. Always lazy-loaded — only the hero is `priority`.
 */
export function CaseStudyEvidenceGroup({
  items,
  locale,
  projectSlug,
  className,
}: {
  items: ProjectMediaItem[]
  locale: Locale
  projectSlug: string
  className?: string
}) {
  if (items.length === 0) return null

  function EvidenceFigure({
    item,
    priority,
    maxWidthPx,
    maxHeightPx,
    sizes,
    captionSize = 'text-sm',
  }: {
    item: ProjectMediaItem
    priority: boolean
    maxWidthPx: number
    maxHeightPx: number
    sizes: string
    captionSize?: string
  }) {
    return (
      <figure>
        <MediaFrame
          item={item}
          locale={locale}
          projectSlug={projectSlug}
          priority={priority}
          maxWidthPx={maxWidthPx}
          maxHeightPx={maxHeightPx}
          sizes={sizes}
        />
        {item.caption ? (
          <figcaption className={cn('mt-2.5 text-center text-muted-foreground', captionSize)}>
            {t(item.caption, locale)}
          </figcaption>
        ) : null}
      </figure>
    )
  }

  // Single shot: one frame, content-column width — no grid needed.
  if (items.length === 1) {
    return (
      <div className={cn('not-prose my-8', className)}>
        <EvidenceFigure item={items[0]} priority={false} maxWidthPx={768} maxHeightPx={520} sizes="(min-width: 1024px) 640px, 100vw" />
      </div>
    )
  }

  // Two shots: a balanced side-by-side pair — neither dominates (§9).
  if (items.length === 2) {
    return (
      <div className={cn('not-prose my-8 grid gap-4 sm:grid-cols-2', className)}>
        {items.map((item) => (
          <EvidenceFigure
            key={item.src}
            item={item}
            priority={false}
            maxWidthPx={480}
            maxHeightPx={480}
            sizes="(min-width: 1024px) 320px, 50vw"
          />
        ))}
      </div>
    )
  }

  // Three or more shots forming one flow: the first gets emphasis
  // (full width), the rest render as supporting evidence in a 2-column
  // grid — one cohesive workflow, not a stack of equal full-width
  // blocks (§8's booking-flow spec).
  const [primary, ...supporting] = items
  return (
    <div className={cn('not-prose my-8', className)}>
      <EvidenceFigure item={primary} priority={false} maxWidthPx={768} maxHeightPx={520} sizes="(min-width: 1024px) 640px, 100vw" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {supporting.map((item) => (
          <EvidenceFigure
            key={item.src}
            item={item}
            priority={false}
            maxWidthPx={420}
            maxHeightPx={420}
            sizes="(min-width: 1024px) 320px, 50vw"
            captionSize="text-xs"
          />
        ))}
      </div>
    </div>
  )
}
