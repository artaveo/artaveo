'use client'

import { Expand, X } from 'lucide-react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { t, type Locale, type LocalizedText, type ProjectMediaKind } from '@/types/content'

export type Screen = { src: string; alt: LocalizedText; caption?: LocalizedText; kind?: ProjectMediaKind; width?: number; height?: number }

/**
 * Phase 30 — a project's screens with one-line captions (§ 14.0 Product Page
 * Sections "screens with captions", § 14.1 Imagery): real screenshots in
 * plain rounded frames — no fake address bar, no status bar — on the warm
 * panel. A phone screenshot keeps its tall shape. Each opens larger in a
 * native `<dialog>` (Escape and the close button close it, focus returns to
 * the screen that opened it). Nothing when there are no screens.
 */
export function ScreenGallery({ screens }: { screens: Screen[] }) {
  const locale = useLocale() as Locale
  const tb = useTranslations('Brand')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open !== null && !dialog.open) dialog.showModal()
    if (open === null && dialog.open) dialog.close()
  }, [open])

  if (screens.length === 0) return null
  const current = open !== null ? screens[open] : null

  return (
    <>
      <ul className="grid gap-5 @3xl:grid-cols-2" data-slot="screen-gallery">
        {screens.map((screen, index) => {
          const tall = screen.kind === 'mobile' || (screen.width && screen.height ? screen.height > screen.width : false)
          return (
            <li key={screen.src} className={cn(tall && '@3xl:row-span-2')}>
              <figure className="flex h-full flex-col gap-3">
                <button
                  type="button"
                  onClick={(event) => {
                    openerRef.current = event.currentTarget
                    setOpen(index)
                  }}
                  className={cn(
                    'media-zoom group relative w-full overflow-hidden rounded-card border border-paper-line bg-paper-card shadow-card outline-none focus-visible:ring-3 focus-visible:ring-ring/60',
                    tall ? 'mx-auto aspect-[9/17] max-w-[16rem]' : 'aspect-[16/10]',
                  )}
                >
                  <Image
                    src={screen.src}
                    alt={t(screen.alt, locale)}
                    fill
                    sizes={tall ? '256px' : '(min-width: 1024px) 600px, 92vw'}
                    className="object-cover object-top"
                  />
                  <span aria-hidden="true" className="absolute end-3 bottom-3 grid size-9 place-items-center rounded-full bg-ink/75 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Expand className="size-4" />
                  </span>
                  <span className="sr-only">{tb('openScreen')}</span>
                </button>
                {screen.caption ? <figcaption className="text-sm text-paper-muted">{t(screen.caption, locale)}</figcaption> : null}
              </figure>
            </li>
          )
        })}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={() => {
          setOpen(null)
          openerRef.current?.focus()
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(null)
        }}
        aria-label={current ? t(current.alt, locale) : undefined}
        className="m-auto max-h-[92vh] w-[min(64rem,94vw)] overflow-visible bg-transparent p-0 backdrop:bg-ink/85"
      >
        {current ? (
          <figure className="flex flex-col gap-3">
            <button
              type="button"
              autoFocus
              onClick={() => setOpen(null)}
              aria-label={tb('closeScreen')}
              className="grid size-11 place-items-center self-end rounded-full bg-white/12 text-white outline-none hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-ring/70"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
            {/* Phase 34: through the image optimizer at the dialog's width, not the original file (up to
                1.5 MB of PNG). The size given only reserves space; the screen keeps its own shape. */}
            <Image
              src={current.src}
              alt={t(current.alt, locale)}
              width={current.width ?? 1600}
              height={current.height ?? 1000}
              sizes="(min-width: 1090px) 1024px, 94vw"
              className="h-auto max-h-[78vh] w-full rounded-card object-contain"
            />
            {current.caption ? <figcaption className="text-center text-sm text-white">{t(current.caption, locale)}</figcaption> : null}
          </figure>
        ) : null}
      </dialog>
    </>
  )
}
