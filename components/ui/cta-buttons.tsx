'use client'

import { ArrowRight } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/analytics'

/**
 * The interactive half of `CTASection` (`components/ui/patterns.tsx`),
 * split into its own small Client Component so `CTASection` itself — and
 * every Server Component that renders it (`about-content.tsx`,
 * `process-content.tsx`, …) — doesn't have to become a Client Component
 * just to attach a `cta_click` (§ 11.1) handler. Only plain strings cross
 * the Server → Client boundary here, never a function or icon component.
 */
export function CtaButtons({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  trackTarget,
}: {
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  trackTarget: string
}) {
  return (
    <>
      <Button
        size="lg"
        className="h-11 px-5 text-[0.95rem]"
        onClick={() => trackEvent('cta_click', { target: `${trackTarget}_primary`, href: primaryHref })}
        render={<Link href={primaryHref} />}
      >
        {primaryLabel}
        <ArrowRight data-icon="inline-end" aria-hidden="true" className="rtl:rotate-180" />
      </Button>
      {secondaryHref && secondaryLabel ? (
        <Button
          size="lg"
          variant="outline"
          className="h-11 px-5 text-[0.95rem]"
          onClick={() => trackEvent('cta_click', { target: `${trackTarget}_secondary`, href: secondaryHref })}
          render={<Link href={secondaryHref} />}
        >
          {secondaryLabel}
        </Button>
      ) : null}
    </>
  )
}
