'use client'

import { useState } from 'react'

import { BandGlow } from '@/components/brand/bands'
import { BrandLockup } from '@/components/brand/brand-lockup'
import { GlassHeader, type HeaderLink, type MegaProduct, type MegaService } from '@/components/brand/glass-header'
import { LocaleLink } from '@/components/brand/locale-link'

/**
 * The glass header previewed inside /design-system: not sticky, over an ink
 * band tall enough for an open mega menu. The search icon only reports that
 * it was pressed — on the site (Phase 29) it opens the command palette.
 */
export function HeaderPreview(props: {
  products: MegaProduct[]
  services: MegaService[]
  links: HeaderLink[]
  whatsappHref: string | null
}) {
  const [searched, setSearched] = useState(false)
  return (
    <div className="relative isolate min-h-[34rem] overflow-hidden bg-ink text-ink-foreground">
      <BandGlow />
      <GlassHeader
        sticky={false}
        logo={<BrandLockup />}
        products={props.products}
        services={props.services}
        allServicesHref="/services"
        links={props.links}
        startHref="/start"
        whatsappHref={props.whatsappHref}
        languageSwitch={<LocaleLink />}
        onSearch={() => setSearched(true)}
      />
      <p className="px-6 pt-40 text-center font-mono text-xs text-ink-muted" aria-live="polite">
        {searched ? 'Search pressed — on the site it opens the command palette.' : 'Open Products or Services. On a narrow width the links fold into the menu button.'}
      </p>
    </div>
  )
}
