import { ArtaveoMarkGlyph } from '@/components/site/artaveo-mark'
import { cn } from '@/lib/utils'

/**
 * Phase 28.5 — the mark and the ARTAVEO wordmark for the ink bands (header,
 * footer): the mark in brand gold, the wordmark in the band's text colour.
 * The wordmark is Latin, tracked, and pinned left-to-right on Dari pages
 * (§ 4.1.3). The visible name is the wordmark, so the link it sits in needs
 * no other label.
 */
export function BrandLockup({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <ArtaveoMarkGlyph className={cn('shrink-0 text-gold', size === 'sm' ? 'size-6' : 'size-7')} />
      <span dir="ltr" lang="en" className={cn('font-sans font-extrabold tracking-[0.2em]', size === 'sm' ? 'text-[0.8125rem]' : 'text-sm')}>
        ARTAVEO
      </span>
    </span>
  )
}
