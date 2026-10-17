import { useLocale, useTranslations } from 'next-intl'

import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from '@/components/ui/accordion'
import { ProjectGallery } from '@/components/work/project-gallery'
import { videoEmbedUrl } from '@/lib/products/blocks'
import { t, type Locale, type LocalizedText, type Project, type ProjectBlock, type ProjectMediaItem } from '@/types/content'

/**
 * Phase 27.2 — renders a project page's blocks, in the owner's order. Each block
 * stands on its own (§ 2.24) with its own heading — the owner's, or its type's
 * default. Nothing here explains how a system works inside (§ 16.1): the blocks
 * hold what the owner wrote, the features list is the project's own.
 *
 * Phase 30 restyles these with Design System 2.0; the data they read is final.
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
        <p key={index} className="leading-relaxed text-pretty text-muted-foreground">
          {paragraph}
        </p>
      ))}
    </>
  )
}

function BulletList({ items, locale }: { items: LocalizedText[]; locale: Locale }) {
  if (items.length === 0) return null
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <li key={`${item.en}-${index}`} className="flex min-w-0 gap-3 rounded-lg border border-border bg-card p-4 text-sm leading-relaxed">
          <span aria-hidden className="mt-[0.45rem] size-1.5 shrink-0 rounded-[2px] bg-[var(--project-accent,var(--color-brand))]" />
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
          <BulletList items={project.features} locale={locale} />
        </>
      )

    case 'audience':
      return (
        <>
          <Paragraphs value={block.text} locale={locale} />
          <BulletList items={block.items} locale={locale} />
        </>
      )

    case 'features-by-role':
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {block.groups.map((group, index) => (
            <div key={`${group.role.en}-${index}`} className="min-w-0 rounded-xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold text-foreground">{t(group.role, locale)}</h3>
              <ul className="mt-3 space-y-2">
                {group.items.map((item, i) => (
                  <li key={`${item.en}-${i}`} className="flex gap-3 text-sm leading-relaxed">
                    <span aria-hidden className="mt-[0.45rem] size-1.5 shrink-0 rounded-[2px] bg-[var(--project-accent,var(--color-brand))]" />
                    <span className="min-w-0 text-pretty">{t(item, locale)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )

    case 'faq':
      return (
        <Accordion multiple defaultValue={[]}>
          {block.items.map((item, index) => (
            <AccordionItem key={`${item.question.en}-${index}`} value={`${block.id}-${index}`}>
              <AccordionTrigger>{t(item.question, locale)}</AccordionTrigger>
              <AccordionPanel>{t(item.answer, locale)}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      )

    case 'gallery': {
      const items: ProjectMediaItem[] = block.images.map((image) => ({
        src: image.src,
        alt: image.alt,
        caption: image.caption,
        kind: 'desktop',
        placement: 'gallery',
        width: image.width,
        height: image.height,
      }))
      return <ProjectGallery items={items} />
    }

    case 'video':
      return (
        <figure className="flex flex-col gap-3">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
            <iframe
              src={videoEmbedUrl(block)}
              title={block.caption ? t(block.caption, locale) : tCase('videoTitle', { project: t(project.title, locale) })}
              loading="lazy"
              allow="encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 size-full"
            />
          </div>
          {block.caption ? <figcaption className="text-sm text-muted-foreground">{t(block.caption, locale)}</figcaption> : null}
        </figure>
      )
  }
}

export function ProjectBlocks({ project }: { project: Project }) {
  const locale = useLocale() as Locale
  const tBlock = useTranslations('BlockTypes')
  // A features block with no features to show would be an empty section.
  const blocks = project.blocks.filter((block) => block.type !== 'features' || project.features.length > 0 || block.text)
  if (blocks.length === 0) return null

  return (
    <div className="flex flex-col gap-14 md:gap-16">
      {blocks.map((block) => (
        <section key={block.id} aria-labelledby={`block-${block.id}`} className="flex min-w-0 flex-col gap-5">
          <h2 id={`block-${block.id}`} className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            {block.title ? t(block.title, locale) : tBlock(block.type)}
          </h2>
          <BlockBody block={block} project={project} locale={locale} />
        </section>
      ))}
    </div>
  )
}
