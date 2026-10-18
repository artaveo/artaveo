'use client'

import { useEffect, useRef, useState } from 'react'
import type * as React from 'react'

/**
 * Phase 28.4 — per-element reveal (≤ 300 ms, app/globals.css
 * `[data-reveal]`). Replaces the whole-page fade that used to run on every
 * navigation.
 *
 * Nothing is hidden on the server or without JavaScript, and an element that
 * is already on screen when the page loads is never hidden either: only an
 * element that starts below the fold is marked `pending`, then `shown` once
 * it scrolls in. Under `prefers-reduced-motion` nothing is marked at all. The
 * change is opacity and transform only, so the layout never moves.
 */
export function Reveal({
  as: Tag = 'div',
  className,
  children,
}: {
  as?: 'div' | 'section' | 'li' | 'article'
  className?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [state, setState] = useState<'pending' | 'shown' | undefined>(undefined)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (element.getBoundingClientRect().top < window.innerHeight) return

    setState('pending')
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState('shown')
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag ref={ref as React.Ref<never>} className={className} data-reveal={state}>
      {children}
    </Tag>
  )
}
