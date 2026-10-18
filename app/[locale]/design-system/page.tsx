import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ActionsSection } from '@/components/showcase/actions-section'
import { ButtonsSection } from '@/components/showcase/buttons-section'
import { CardsSection } from '@/components/showcase/cards-section'
import { ColorsSection } from '@/components/showcase/colors-section'
import { DataContentSection } from '@/components/showcase/data-content-section'
import { DisclosureSection } from '@/components/showcase/disclosure-section'
import { FormControlsSection } from '@/components/showcase/form-controls-section'
import { FormLayoutsSection } from '@/components/showcase/form-layouts-section'
import { FormsSection } from '@/components/showcase/forms-section'
import { FramesSection } from '@/components/showcase/frames-section'
import { IdentitySection } from '@/components/showcase/identity-section'
import { LayoutSection } from '@/components/showcase/layout-section'
import { OverlaysSection } from '@/components/showcase/overlays-section'
import { PatternsSection } from '@/components/showcase/patterns-section'
import { ShowcaseHeader } from '@/components/showcase/showcase-header'
import { StatesSection } from '@/components/showcase/states-section'
import { SpacingSection } from '@/components/showcase/spacing-section'
import { TypographySection } from '@/components/showcase/typography-section'
import { Ds2ComponentsSection } from '@/components/showcase/ds2/components-section'
import { Ds2GlassSection, Ds2MotionSection, Ds2TokensSection, Ds2TypeSection } from '@/components/showcase/ds2/foundations'
import { PreviewWidthProvider } from '@/components/showcase/ds2/preview-width'
import { Badge } from '@/components/ui/badge'
import { getAllProjects, getProducts } from '@/lib/home-content-projects'
import { getAllServices } from '@/lib/services-content'
import { getShellData } from '@/lib/shell-settings-server'
import { whatsappHref } from '@/lib/shell-settings'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'DesignSystemPage' })
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  }
}

/**
 * Internal, `noindex` tooling page (roadmap § 4.7) — not part of the
 * bilingual public-site content scope. Only the metadata is translated
 * here; the showcase content itself stays in English, same as before
 * Phase 5.1.
 *
 * Phase 28: Design System 2.0 comes first — its tokens, type, glass, motion
 * and components, fed by the same data the site uses (published projects,
 * products, services, the WhatsApp number from the admin). The numbered
 * sections after it are the revision 1–44 primitives, still used by the
 * admin and by the pages Phases 29–33 rebuild.
 */
export default async function DesignSystemPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const [projects, products, services, shell] = await Promise.all([getAllProjects(), getProducts(), getAllServices(), getShellData()])
  const whatsapp = shell.contact.whatsappNumber ? whatsappHref(shell.contact.whatsappNumber) : null
  const screenshot = projects.find((p) => p.coverImage)?.coverImage

  return (
    <div className="min-h-screen bg-background">
      <ShowcaseHeader />
      <main className="container-page pb-24">
        {/* Foundations / intro */}
        <section id="foundations" className="scroll-mt-24 py-16 md:py-24">
          <Badge variant="brand-soft" className="mb-6">
            01 — Foundations
          </Badge>
          <h1 className="max-w-3xl text-h1 text-balance">The Artaveo Design System</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
            Design System 2.0 (Phase 28): ink bands for impact, warm panels for
            reading, brand gold, each project in its own colour, glass in five
            places only, and motion that the design never depends on. Below it,
            the earlier primitives the admin is still built from.
          </p>
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            {[
              { k: 'Modes', v: 'Light · Dark' },
              { k: 'Direction', v: 'LTR · RTL' },
              { k: 'Fonts', v: 'Geist · Vazirmatn' },
              { k: 'Sizes', v: 'Phone · Tablet · Desktop' },
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

        <PreviewWidthProvider>
          <Ds2TokensSection projects={projects} />
          <Ds2TypeSection />
          <Ds2GlassSection screenshot={screenshot} />
          <Ds2MotionSection />
          <Ds2ComponentsSection projects={projects} products={products} services={services} whatsappHref={whatsapp} />
        </PreviewWidthProvider>

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
        <PatternsSection />
        <StatesSection />
        <FramesSection />
        <FormLayoutsSection />
        <IdentitySection />
      </main>

      <footer className="border-t border-border">
        <div className="container-page flex flex-col items-start justify-between gap-2 py-8 sm:flex-row sm:items-center">
          <span dir="ltr" className="font-mono text-sm font-semibold tracking-[0.2em]">
            ARTAVEO
          </span>
          <span className="text-sm text-muted-foreground">
            Design System 2.0 · Phase 28
          </span>
        </div>
      </footer>
    </div>
  )
}
