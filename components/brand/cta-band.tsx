import { MessageCircle } from 'lucide-react'
import type * as React from 'react'

import { ForwardArrow } from '@/components/brand/brand-icons'
import { PillLink } from '@/components/brand/pill'
import { cn } from '@/lib/utils'

/** On a phone a long label ("Chat on WhatsApp") may take two lines rather than run off the band. */
const WRAP = 'max-w-full whitespace-normal py-2 text-center'

/**
 * Phase 28.5 — the full-width call-to-action band (§ 14.0 CTA Band): a
 * heading, one line, the primary action and — when the owner set a WhatsApp
 * number in the admin — a WhatsApp action. `compact` is the row version used
 * at the end of a product page ("Questions? — Request a demo").
 */
export function CtaBand({
  title,
  line,
  primary,
  whatsappHref,
  whatsappLabel,
  compact = false,
  headingLevel = 'h2',
}: {
  title: React.ReactNode
  line?: React.ReactNode
  primary: { href: string; label: string }
  /** From `site_settings` (lib/shell-settings.ts `whatsappHref`); without it the second action is not shown. */
  whatsappHref?: string | null
  whatsappLabel?: string
  compact?: boolean
  headingLevel?: 'h2' | 'h3'
}) {
  const Heading = headingLevel
  return (
    <div
      data-slot="cta-band"
      className={cn(
        '@container relative mx-auto w-full max-w-[77.5rem] overflow-hidden rounded-panel border border-ink-line bg-ink-raised bg-[radial-gradient(60%_90%_at_50%_0%,rgb(226_182_92/0.24),transparent_70%)] text-ink-foreground',
        compact ? 'flex flex-wrap items-center justify-between gap-5 px-5 py-7 @2xl:px-8 @2xl:py-8' : 'px-6 py-14 text-center @3xl:px-8 @3xl:py-16',
      )}
    >
      <div className={cn(!compact && 'mx-auto max-w-[34rem]')}>
        <Heading className={compact ? 'text-card-title' : 'text-h2 text-balance'}>{title}</Heading>
        {line ? <p className={cn('text-body text-ink-muted', compact ? 'mt-1' : 'mt-3')}>{line}</p> : null}
      </div>
      <div className={cn('flex max-w-full min-w-0 flex-wrap gap-3', compact ? '' : 'mt-7 justify-center')}>
        <PillLink href={primary.href} variant="gold" size={compact ? 'md' : 'lg'} className={WRAP}>
          {primary.label}
          {compact ? null : <ForwardArrow />}
        </PillLink>
        {whatsappHref && whatsappLabel ? (
          <PillLink href={whatsappHref} variant="glass" size={compact ? 'md' : 'lg'} className={WRAP} external>
            <MessageCircle aria-hidden="true" />
            {whatsappLabel}
          </PillLink>
        ) : null}
      </div>
    </div>
  )
}
