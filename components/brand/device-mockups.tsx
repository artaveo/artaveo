import Image from 'next/image'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Phase 28.5 — laptop and phone frames for real screenshots (§ 14.1 Imagery).
 * Deliberately plain: a bezel and a base, nothing else — no fake address bar
 * (it would show the portfolio's own URL), no fake status bar, no traffic
 * lights. The screen zooms slowly on hover (`media-zoom`, off under reduced
 * motion). `BrowserFrame` / `DeviceFrame` in components/ui/frames.tsx are the
 * revision 1–44 frames and are retired with the pages that use them.
 */

export type MockupImage = { src: string; alt: string; width?: number; height?: number }

export function LaptopMockup({
  image,
  sizes = '(min-width: 1024px) 600px, 92vw',
  priority = false,
  className,
}: {
  image: MockupImage
  sizes?: string
  priority?: boolean
  className?: string
}) {
  return (
    <div className={cn('w-full', className)} data-slot="laptop-mockup">
      <div className="media-zoom relative aspect-[16/10] rounded-t-[1.1rem] rounded-b-md border-[0.55rem] border-[#1c2029] bg-black shadow-device">
        <Image src={image.src} alt={image.alt} fill sizes={sizes} priority={priority} className="object-cover object-top" />
      </div>
      <div aria-hidden="true" className="-mx-[6%] h-3 rounded-b-[1.1rem] bg-[linear-gradient(180deg,#363c49,#14171e)]" />
    </div>
  )
}

export function PhoneMockup({
  image,
  sizes = '150px',
  className,
}: {
  image: MockupImage
  sizes?: string
  className?: string
}) {
  return (
    <div
      data-slot="phone-mockup"
      className={cn(
        'media-zoom relative aspect-[9/19] w-full rounded-[1.6rem] border-[0.4rem] border-[#1c2029] bg-black shadow-float',
        className,
      )}
    >
      <Image src={image.src} alt={image.alt} fill sizes={sizes} className="object-cover object-top" />
    </div>
  )
}

/**
 * The hero and portfolio composition: a laptop, a phone overlapping its lower
 * corner, and up to two glass chips. Without a phone image it is the laptop
 * alone; the chips hide on narrow widths so they never cover the screen.
 */
export function DeviceShowcase({
  laptop,
  phone,
  phoneSide = 'start',
  chips,
  priority,
  className,
}: {
  laptop: MockupImage
  phone?: MockupImage | null
  /** Which side of the laptop the phone overlaps, in reading order. */
  phoneSide?: 'start' | 'end'
  chips?: React.ReactNode
  priority?: boolean
  className?: string
}) {
  return (
    <div className={cn('@container relative w-full', className)}>
      <div className="relative mx-auto w-full max-w-[38.75rem] pt-6 pb-8">
        <LaptopMockup image={laptop} priority={priority} />
        {phone ? (
          <div
            className={cn(
              'absolute bottom-0 w-[22%] min-w-20 max-w-36',
              phoneSide === 'start' ? 'start-[-2%]' : 'end-[-2%]',
            )}
          >
            <PhoneMockup image={phone} />
          </div>
        ) : null}
        {chips ? <div className="hidden @lg:contents">{chips}</div> : null}
      </div>
    </div>
  )
}
