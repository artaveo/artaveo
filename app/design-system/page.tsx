import type { Metadata } from 'next'

import { ActionsSection } from '@/components/showcase/actions-section'
import { ButtonsSection } from '@/components/showcase/buttons-section'
import { CardsSection } from '@/components/showcase/cards-section'
import { ColorsSection } from '@/components/showcase/colors-section'
import { DataContentSection } from '@/components/showcase/data-content-section'
import { DisclosureSection } from '@/components/showcase/disclosure-section'
import { FormControlsSection } from '@/components/showcase/form-controls-section'
import { FormsSection } from '@/components/showcase/forms-section'
import { LayoutSection } from '@/components/showcase/layout-section'
import { OverlaysSection } from '@/components/showcase/overlays-section'
import { ShowcaseHeader } from '@/components/showcase/showcase-header'
import { SpacingSection } from '@/components/showcase/spacing-section'
import { TypographySection } from '@/components/showcase/typography-section'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Design System — Artaveo',
  description:
    'The visual foundation of Artaveo: color tokens, typography, spacing, and core UI components.',
  robots: { index: false, follow: false },
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background">
      <ShowcaseHeader />
      <main className="container-page pb-24">
        {/* Foundations / intro */}
        <section id="foundations" className="scroll-mt-24 py-16 md:py-24">
          <Badge variant="brand-soft" className="mb-6">
            01 — Foundations
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            The Artaveo Design System
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
            The visual foundation for an independent full-stack development
            studio — semantic color tokens, a typographic scale, spacing rhythm,
            and the core component primitives that every page is built from.
            Precise, minimal, and intentional in both light and dark.
          </p>
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            {[
              { k: 'Modes', v: 'Light · Dark' },
              { k: 'Direction', v: 'LTR · RTL' },
              { k: 'Fonts', v: 'Geist · Vazirmatn' },
              { k: 'Base unit', v: '4px' },
            ].map((item) => (
              <div key={item.k} className="bg-card p-4">
                <dt className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  {item.k}
                </dt>
                <dd className="mt-1 font-medium">{item.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <ColorsSection />
        <TypographySection />
        <SpacingSection />
        <ButtonsSection />
        <FormsSection />
        <ActionsSection />
        <FormControlsSection />
        <OverlaysSection />
        <DisclosureSection />
        <DataContentSection />
        <CardsSection />
        <LayoutSection />
      </main>

      <footer className="border-t border-border">
        <div className="container-page flex flex-col items-start justify-between gap-2 py-8 sm:flex-row sm:items-center">
          <span dir="ltr" className="font-mono text-sm font-semibold tracking-[0.2em]">
            ARTAVEO
          </span>
          <span className="text-sm text-muted-foreground">
            Design System · Phase 1
          </span>
        </div>
      </footer>
    </div>
  )
}
