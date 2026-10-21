import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { BandInner, InkBand, PaperPanel, SectionHeading } from '@/components/brand/bands'
import { CtaBand } from '@/components/brand/cta-band'
import { PortfolioList } from '@/components/brand/portfolio-row'
import { JsonLd } from '@/components/site/json-ld'
import { SiteShell } from '@/components/site/site-shell'
import { PortfolioFilter } from '@/components/work/portfolio-filter'
import { getAllProjects } from '@/lib/home-content-projects'
import { buildAlternates, buildPageOpenGraph } from '@/lib/seo'
import { projectHref } from '@/lib/shell-menus'
import { whatsappHref } from '@/lib/shell-settings'
import { getShellData } from '@/lib/shell-settings-server'
import { buildBreadcrumbJsonLd } from '@/lib/structured-data'
import { platformFilters } from '@/lib/work-filters'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Work' })
  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale, '/work'),
    ...buildPageOpenGraph({ locale, title: t('title'), description: t('description'), eyebrow: t('eyebrow') }),
  }
}

/**
 * Phase 30.2 — `/work`: one project per row, full width, each in its own
 * colour (Phase 28's `PortfolioRow`, owner 18 October 2026 — not two-column
 * cards), laptop and phone screens, industry and platforms instead of
 * technical labels; a product's row opens its product page. Platform filters
 * appear only from six projects.
 */
export default async function WorkPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const [projects, shell, t, tNav, tBrand] = await Promise.all([
    getAllProjects(),
    getShellData(),
    getTranslations('Work'),
    getTranslations('Nav'),
    getTranslations('Brand'),
  ])
  const platforms = platformFilters(projects)

  return (
    <SiteShell>
      <JsonLd
        data={buildBreadcrumbJsonLd(locale as Locale, [
          { name: tNav('home'), path: '/' },
          { name: t('title'), path: '/work' },
        ])}
      />
      <div className="bg-ink">
        <InkBand glow aria-labelledby="work-title" className="pt-14 pb-14 @3xl:pt-20 @3xl:pb-16">
          <BandInner>
            <SectionHeading as="h1" id="work-title" eyebrow={t('eyebrow')} title={t('title')} lead={t('description')} />
          </BandInner>
        </InkBand>
        <PaperPanel aria-labelledby="work-title" data-slot="work-list">
          <BandInner>
            {platforms.length > 0 ? (
              <PortfolioFilter projects={projects} platforms={platforms} />
            ) : (
              <PortfolioList projects={projects} href={projectHref} headingLevel="h2" priorityFirst />
            )}
          </BandInner>
        </PaperPanel>
        <InkBand aria-label={tBrand('megaCardTitle')} className="px-4 pt-16 pb-20">
          <CtaBand
            title={tBrand('megaCardTitle')}
            line={tBrand('megaCardLine')}
            primary={{ href: '/start', label: tBrand('start') }}
            whatsappHref={shell.contact.whatsappNumber ? whatsappHref(shell.contact.whatsappNumber) : null}
            whatsappLabel={tBrand('whatsapp')}
          />
        </InkBand>
      </div>
    </SiteShell>
  )
}
