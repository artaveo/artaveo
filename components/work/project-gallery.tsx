'use client'

import { Expand } from 'lucide-react'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import { useState } from 'react'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { t, type Locale, type ProjectMediaItem } from '@/types/content'

/**
 * ProjectGallery — the supporting-screenshot grid on a case study
 * (out-of-sequence work, roadmap § 23.1 — not a phase). Renders only
 * `placement: 'gallery'` items; the hero sequence (`placement: 'main'`)
 * is handled separately in `CaseStudy` itself. Each thumbnail opens a
 * lightbox with the full image and its caption — client-only because of
 * that open/close state, kept as its own component so `CaseStudy` stays
 * a server component otherwise.
 */
export function ProjectGallery({ items }: { items: ProjectMediaItem[] }) {
  const locale = useLocale() as Locale
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const openItem = openIndex !== null ? items[openIndex] : null

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item, index) => (
          <button
            key={item.src}
            type="button"
            onClick={() => setOpenIndex(index)}
            className={cn(
              'group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted outline-none',
              'focus-visible:ring-3 focus-visible:ring-ring/50',
            )}
          >
            <Image
              src={item.src}
              alt={t(item.alt, locale)}
              fill
              sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover object-top transition-transform duration-200 group-hover:scale-105"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100"
            >
              <Expand className="size-5 text-white" />
            </span>
          </button>
        ))}
      </div>

      <Dialog open={openItem !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent
          className="max-w-4xl border-none bg-transparent p-0 shadow-none"
          showClose
        >
          {openItem ? (
            <figure>
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-elevated">
                <Image
                  src={openItem.src}
                  alt={t(openItem.alt, locale)}
                  fill
                  sizes="90vw"
                  className="object-contain"
                />
              </div>
              {openItem.caption ? (
                <figcaption className="mt-3 text-center text-sm text-muted-foreground">
                  {t(openItem.caption, locale)}
                </figcaption>
              ) : null}
            </figure>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
