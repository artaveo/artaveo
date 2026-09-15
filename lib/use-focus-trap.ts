'use client'

import { useEffect, useRef } from 'react'

/**
 * § 11.3 keyboard-only pass. `components/ui/dialog.tsx` / `sheet.tsx` sit on
 * top of Base UI's `Dialog` primitive, which already traps focus, restores
 * it on close, and wires Escape — but `MobileNav` and `CommandPalette`
 * predate that primitive and are hand-rolled `role="dialog"` overlays with
 * none of that behaviour. Without this, Tab could walk a keyboard user
 * straight through the backdrop into the page underneath, and closing the
 * overlay left focus wherever it happened to land (often lost to
 * `document.body`) instead of back on the control that opened it.
 *
 * This hook is the shared fix for both: while `active`, it moves focus into
 * the container (or a given `initialFocusRef`), cycles Tab/Shift+Tab between
 * the container's first and last focusable elements, and restores focus to
 * whatever was focused before opening once `active` goes false again.
 * `onEscape` is optional since `MobileNav` already had its own listener —
 * new call sites should just pass `onClose` here instead of adding another.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null,
  )
}

export function useFocusTrap(
  active: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  options?: {
    initialFocusRef?: React.RefObject<HTMLElement | null>
    onEscape?: () => void
  },
) {
  const initialFocusRef = options?.initialFocusRef
  const onEscape = options?.onEscape
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    previouslyFocused.current = document.activeElement as HTMLElement | null

    const frame = requestAnimationFrame(() => {
      const target = initialFocusRef?.current ?? (containerRef.current && getFocusable(containerRef.current)[0])
      target?.focus()
    })

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onEscape?.()
        return
      }
      if (event.key !== 'Tab') return
      const container = containerRef.current
      if (!container) return
      const focusable = getFocusable(container)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}
