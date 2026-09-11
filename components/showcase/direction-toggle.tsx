'use client'

import { ArrowLeftRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

/**
 * Flips `<html dir>` so every section on `/design-system` can be previewed
 * mirrored, live — one toggle for the whole page rather than duplicating
 * each section's markup in both directions (roadmap § 4.7: "Light/Dark ×
 * LTR/RTL"). Resets to `ltr` on unmount so leaving the page never leaves
 * the real site (which is LTR-only until Phase 5's locale routing) mirrored.
 */
export function DirectionToggle() {
  const [isRtl, setIsRtl] = useState(false)

  useEffect(() => {
    return () => {
      document.documentElement.dir = 'ltr'
    }
  }, [])

  function toggle() {
    const next = !isRtl
    setIsRtl(next)
    document.documentElement.dir = next ? 'rtl' : 'ltr'
  }

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={toggle}
      aria-label={isRtl ? 'Preview left-to-right' : 'Preview right-to-left'}
      aria-pressed={isRtl}
    >
      <ArrowLeftRight />
    </Button>
  )
}
