import { Check } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { FaqList } from '@/components/brand/faq-list'
import { ScreenGallery } from '@/components/brand/screen-gallery'
import { videoEmbedUrl } from '@/lib/products/blocks'
import { t, type Locale, type LocalizedText, type Project, type ProjectBlock, type ProjectBlockType } from '@/types/content'

/**
 * Phase 27.2 / 30 — a project page's blocks, in the owner's order, on the warm
 * panel of Design System 2.0. Each block stands on its own (§ 2.24) with its own
 * heading — the owner's, or its type's default. Nothing here explains how a
 * system works inside (§ 16.1): the blocks hold what the owner wrote, the
 * features list is the project's own. Every colour is a warm-panel token, so the
 * blocks read the same in the light and the dark theme; small marks take the
 * project's own colour (`projectStyle()` on a parent).
 *
 * `exclude` leaves block types to another part of the page (a product page shows
 * its features in a band of their own and its questions after the ways to get it).
 */

function Paragraphs({ value, locale }: { value?: LocalizedText; locale: Locale }) {
  if (!value) return null
  const paragraphs = t(value, locale)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="max-w-[44rem] text-body text-pretty text-paper-muted">
          {paragraph}
        </p>
      ))}
    </>
  )
}

function CheckList({ items, locale }: { items: LocalizedText[]; locale: Locale }) {
  if (items.length === 0) return null
  return (
    <ul className="grid gap-3 @2xl:grid-cols-2">
      {items.map((item, index) => (
        <li key={`${item.en}-${index}`} className="flex min-w-0 items-start gap-3 rounded-card border border-paper-line bg-paper-card p-4 text-sm leading-relaxed">
          <span aria-hidden="true" className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-project text-project-on">
            <Check className="size-3.5" />
          </span>
          <span className="min-w-0 text-pretty">{t(item, locale)}</span>
        </li>
      ))}
    </ul>
  )
}

function BlockBody({ block, project, locale }: { block: ProjectBlock; project: Project; locale: Locale }) {
  const tCase = useTranslations('CaseStudy')
  switch (block.type) {
    case 'intro':
    case 'challenge':
    case 'result':
      return <Paragraphs value={block.text} locale={locale} />

    case 'features':
      return (
        <>
          <Paragraphs value={block.text} locale={locale} />
          <CheckList items={project.features} locale={locale} />
        </>
      )

    case 'audience':
      return (
        <>
          <Paragraphs value={block.text} locale={locale} />
          {block.items.length > 0 ? (
            <ul className="flex flex-wrap gap-2.5">
              {block.items.map((item, index) => (
                <li key={`${item.en}-${index}`} className="rounded-pill border border-paper-line bg-paper-card px-4 py-2 text-sm font-semibold">
                  {t(item, locale)}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )

    case 'features-by-role':
      return (
        <ul className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {block.groups.map((group, index) => (
            <li key={`${group.role.en}-${index}`} className="min-w-0 rounded-card-lg border border-paper-line bg-paper-card p-6 shadow-card">
              <h3 className="text-card-title">{t(group.role, locale)}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {group.items.map((item, i) => (
                  <li key={`${item.en}-${i}`} className="flex gap-2.5 text-sm leading-relaxed">
                    <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-gold-deep" />
                    <span className="min-w-0 text-pretty">{t(item, locale)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )

    case 'faq':
      return <FaqList items={block.items} />

    case 'gallery':
      return <ScreenGallery screens={block.images.map((image) => ({ src: image.src, alt: image.alt, caption: image.caption, width: image.width, height: image.height }))} />

    case 'video':
      return (
        <figure className="flex flex-col gap-3">
          <div className="relative aspect-video overflow-hidden rounded-card-lg border border-paper-line bg-ink shadow-card">
            <iframe
              src={videoEmbedUrl(block)}
              title={block.caption ? t(block.caption, locale) : tCase('videoTitle', { project: t(project.title, locale) })}
              loading="lazy"
              allow="encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 size-full"
            />
          </div>
          {block.caption ? <figcaption className="text-sm text-paper-muted">{t(block.caption, locale)}</figcaption> : null}
        </figure>
      )
  }
}

/** The blocks that will actually show — a features block with nothing to list is no section at all. */
export function visibleBlocks(project: Project, exclude: ProjectBlockType[] = []): ProjectBlock[] {
  return project.blocks.filter(
    (block) => !exclude.includes(block.type) && (block.type !== 'features' || project.features.length > 0 || Boolean(block.text)),
  )
}

export function ProjectBlocks({ project, exclude = [] }: { project: Project; exclude?: ProjectBlockType[] }) {
  const locale = useLocale() as Locale
  const tBlock = useTranslations('BlockTypes')
  const blocks = visibleBlocks(project, exclude)
  if (blocks.length === 0) return null

  return (
    <div className="flex flex-col gap-16" data-slot="project-blocks">
      {blocks.map((block) => (
        <section key={block.id} aria-labelledby={`block-${block.id}`} className="flex min-w-0 flex-col gap-6">
          <h2 id={`block-${block.id}`} className="text-h2 text-balance">
            {block.title ? t(block.title, locale) : tBlock(block.type)}
          </h2>
          <BlockBody block={block} project={project} locale={locale} />
        </section>
      ))}
    </div>
  )
}
