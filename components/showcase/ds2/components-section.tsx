import { ChartColumn, Ticket } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { ArticleCover } from '@/components/brand/article-card'
import { BandInner, InkBand, PaperPanel, SectionHeading } from '@/components/brand/bands'
import { BrandFooter } from '@/components/brand/brand-footer'
import { BrandLockup } from '@/components/brand/brand-lockup'
import { CtaBand } from '@/components/brand/cta-band'
import { DeviceShowcase } from '@/components/brand/device-mockups'
import { FeatureGrid } from '@/components/brand/feature-grid'
import { FloatingChip } from '@/components/brand/floating-chip'
import { PillLink } from '@/components/brand/pill'
import { PortfolioList } from '@/components/brand/portfolio-row'
import { ProcessSteps } from '@/components/brand/process-steps'
import { ProductBlockList } from '@/components/brand/product-block'
import { AfterSalesChips, SaleOptionGrid } from '@/components/brand/sale-option-card'
import { ServiceKindGrid } from '@/components/brand/service-card'
import { FloatingWhatsAppButton } from '@/components/brand/whatsapp-button'
import { ProductPage } from '@/components/products/product-page'
import { HeaderPreview } from '@/components/showcase/ds2/header-preview'
import { Preview } from '@/components/showcase/ds2/preview-width'
import { Section, Subhead } from '@/components/showcase/section'
import { projectPalette, projectStyle } from '@/lib/design/color'
import { pickMockupImages } from '@/lib/design/mockups'
import { formatNumber } from '@/lib/format'
import { t, type Locale, type LocalizedText, type ProductSaleOption, type ProductService, type Project, type Service } from '@/types/content'

const tx = (en: string, fa: string): LocalizedText => ({ en, fa })

/**
 * Sample ways to get a product, used only while no published product has any
 * (the owner sets them in the admin — O-8). Every price is left empty on
 * purpose: the card then says "price after a short conversation", which is
 * what a real option without a price shows. A price is never invented (D-04).
 */
const SAMPLE_OPTIONS: ProductSaleOption[] = [
  { id: 's-month', kind: 'licence-monthly', title: tx('Monthly licence', 'لایسنس ماهانه'), price: {}, billingPeriod: 'month', maintenance: 'included', included: [tx('Installation and set-up', 'نصب و راه‌اندازی'), tx('Updates', 'به‌روزرسانی‌ها'), tx('Support the whole time', 'پشتیبانی در تمام مدت')], highlighted: false, cta: 'purchase-request' },
  { id: 's-year', kind: 'licence-yearly', title: tx('Yearly licence', 'لایسنس سالانه'), price: {}, billingPeriod: 'year', maintenance: 'included', included: [tx('Installation and set-up', 'نصب و راه‌اندازی'), tx('Updates', 'به‌روزرسانی‌ها'), tx('Yearly support', 'پشتیبانی سالانه'), tx('Staff training', 'آموزش کارمندان')], highlighted: true, cta: 'purchase-request' },
  { id: 's-life', kind: 'licence-lifetime', title: tx('Lifetime licence', 'لایسنس دایمی'), price: {}, billingPeriod: 'once', maintenance: 'optional', maintenancePrice: {}, maintenancePeriod: 'year', included: [tx('Yours to use for good', 'استفاده‌ی همیشگی'), tx('Installation and set-up', 'نصب و راه‌اندازی')], highlighted: false, cta: 'purchase-request' },
  { id: 's-source', kind: 'source-code', title: tx('Source code', 'خرید کد منبع'), price: {}, billingPeriod: 'once', maintenance: 'not-offered', included: [tx('The complete system', 'کد کامل سیستم'), tx('Installation guide', 'راهنمای نصب')], highlighted: false, cta: 'contact' },
  { id: 's-custom', kind: 'custom-edition', title: tx('Custom edition', 'نسخه‌ی اختصاصی'), price: {}, billingPeriod: 'once', maintenance: 'optional', maintenancePrice: {}, maintenancePeriod: 'month', included: [tx('Built for you alone', 'ساخته‌شده فقط برای شما'), tx('Features your business needs', 'امکانات خاص کسب‌وکار شما'), tx('Your own name and colours', 'نام و رنگ برند خودتان')], highlighted: false, cta: 'demo-request' },
]

const SAMPLE_AFTER_SALES: ProductService[] = [
  { id: 'a-support', title: tx('Yearly support', 'پشتیبانی سالانه'), price: {}, period: 'year' },
  { id: 'a-training', title: tx('Staff training', 'آموزش کارمندان'), price: {}, period: 'once' },
  { id: 'a-data', title: tx('Moving your existing data', 'انتقال معلومات قبلی'), price: {}, period: 'once' },
  { id: 'a-hosting', title: tx('Hosting', 'میزبانی سیستم'), price: {}, period: 'month' },
]

/** The four steps of the design sample — Home's own copy of them is in messages (`Home.step1Title` …, Phase 29). */
const SAMPLE_STEPS = [
  { title: tx('A conversation', 'گفتگو'), line: tx('About what your business needs and where it wants to go.', 'گفتگو درباره‌ی نیاز و هدف کسب‌وکار شما.') },
  { title: tx('Design', 'طراحی'), line: tx('You see the screens and approve them before anything is built.', 'طرح صفحه‌ها را پیش از ساخت می‌بینید و تأیید می‌کنید.') },
  { title: tx('Build', 'ساخت'), line: tx('You see the progress at every stage.', 'پیشرفت کار را در هر مرحله می‌بینید.') },
  { title: tx('Launch and support', 'راه‌اندازی و پشتیبانی'), line: tx('The system goes live, and support continues after handover.', 'سیستم راه‌اندازی می‌شود و پشتیبانی بعد از تحویل هم ادامه دارد.') },
]

export function Ds2ComponentsSection({
  projects,
  products,
  services,
  whatsappHref,
}: {
  projects: Project[]
  products: Project[]
  services: Service[]
  whatsappHref: string | null
}) {
  const locale = useLocale() as Locale
  const tr = useTranslations('Brand')
  const workHref = (p: Project) => `/work/${p.slug}`
  const demoHref = (p: Project) => `/start?product=${p.slug}`
  // A product block needs a product; while none is published, the portfolio projects show what one would look like.
  const blockSource = products.length > 0 ? products : projects
  const showcaseProject = blockSource[0]
  const hero = showcaseProject ? pickMockupImages(showcaseProject, locale) : null
  const realOptions = products.find((p) => p.saleOptions.length > 0)
  const realAfterSales = products.find((p) => p.productServices.length > 0)
  const featureProject = blockSource.find((p) => p.features.length > 0)
  const articleCover = hero?.laptop ?? null

  const megaServices = services.map((s) => ({
    href: `/services/${s.slug}`,
    title: t(s.title, locale),
    line: s.tagline ? t(s.tagline, locale) : t(s.description, locale),
    kind: s.kind,
  }))
  const megaProducts = products.map((p) => ({
    href: workHref(p),
    title: t(p.title, locale),
    line: p.outcomeLine ? t(p.outcomeLine, locale) : t(p.summary, locale),
    accentColor: p.accentColor,
  }))

  return (
    <Section
      id="ds2-components"
      index="2.0 — Components"
      title="The components of the new site"
      description="Built here, put together into pages in Phases 29–33. Every one is fed by the admin's data, hides itself when that data is empty, works in both languages and both directions, and keeps the ink and warm grounds in both themes. Use the width switch above to see each at phone, tablet and desktop width."
      className="flex flex-col gap-14"
    >
      <div>
        <Subhead>Glass header · mega menus · mobile menu</Subhead>
        <Preview label={products.length === 0 ? 'No product is published yet, so the Products menu is not drawn — exactly as on the site.' : undefined}>
          <HeaderPreview
            products={megaProducts}
            services={megaServices}
            links={[
              { href: '/work', label: tr('work') },
              { href: '/about', label: tr('about') },
            ]}
            whatsappHref={whatsappHref}
          />
        </Preview>
      </div>

      {hero?.laptop ? (
        <div>
          <Subhead>Laptop and phone mock-ups · floating glass chips</Subhead>
          <Preview>
            <InkBand glow className="py-14">
              <BandInner>
                <DeviceShowcase
                  laptop={hero.laptop}
                  phone={hero.phone}
                  chips={
                    <>
                      <FloatingChip icon={Ticket} title={locale === 'fa' ? 'تکت آنلاین' : 'Online tickets'} line={locale === 'fa' ? 'از موبایل و کمپیوتر' : 'From a phone or a computer'} className="-top-1 end-6" />
                      <FloatingChip icon={ChartColumn} tone="cool" title={locale === 'fa' ? 'گزارش فروش' : 'Sales report'} line={locale === 'fa' ? 'هر روز، در یک نگاه' : 'Every day, at a glance'} className="end-[-2%] bottom-16" />
                    </>
                  }
                />
              </BandInner>
            </InkBand>
          </Preview>
        </div>
      ) : null}

      <div>
        <Subhead>Product block — one block per product, never in a grid with other tiles</Subhead>
        <Preview label={products.length === 0 ? 'No product is published yet: these are portfolio projects drawn as product blocks.' : undefined}>
          <InkBand className="py-14">
            <BandInner className="flex flex-col gap-10">
              <SectionHeading eyebrow={tr('products')} title={locale === 'fa' ? 'سیستم‌های آماده‌ی آرتاویو' : "Artaveo's ready-made systems"} />
              <ProductBlockList products={blockSource} productHref={workHref} demoHref={demoHref} />
            </BandInner>
          </InkBand>
        </Preview>
      </div>

      <div>
        <Subhead>Portfolio rows on the warm panel</Subhead>
        <Preview>
          <PaperPanel>
            <BandInner className="flex flex-col gap-10">
              <SectionHeading tone="paper" eyebrow={tr('work')} title={locale === 'fa' ? 'کارهایی که آرتاویو ساخته است' : 'What Artaveo has built'} />
              <PortfolioList projects={projects} href={workHref} />
            </BandInner>
          </PaperPanel>
        </Preview>
      </div>

      <div>
        <Subhead>Service cards · process steps</Subhead>
        <Preview>
          <PaperPanel>
            <BandInner className="flex flex-col gap-10">
              <SectionHeading tone="paper" eyebrow={tr('services')} title={locale === 'fa' ? 'هر نرم‌افزاری که کسب‌وکار شما به آن ضرورت دارد' : 'Whatever software your business needs'} />
              <ServiceKindGrid
                services={services}
                href={(s) => `/services/${s.slug}`}
                closingTile={
                  <div className="flex h-full flex-col justify-between gap-4 rounded-card-lg bg-paper-foreground bg-[radial-gradient(120%_100%_at_100%_0%,rgb(226_182_92/0.3),transparent_60%)] p-7 text-ink-foreground">
                    <p className="text-card-title">{locale === 'fa' ? 'نمی‌دانید از کجا شروع کنید؟' : 'Not sure where to start?'}</p>
                    <PillLink href="/consultation" variant="gold" size="sm" className="self-start">
                      {locale === 'fa' ? 'گرفتن وقت مشوره' : 'Book a free call'}
                    </PillLink>
                  </div>
                }
              />
              <ProcessSteps steps={SAMPLE_STEPS} />
            </BandInner>
          </PaperPanel>
        </Preview>
      </div>

      <div>
        <Subhead>Ways to get a product · after-sales chips — product page only</Subhead>
        <Preview label={realOptions ? undefined : 'Sample options with no price set: each says “price after a short conversation”, as a real option without a price does.'}>
          <PaperPanel>
            <BandInner className="flex flex-col gap-10">
              <SectionHeading
                tone="paper"
                eyebrow={locale === 'fa' ? 'روش‌های تهیه' : 'Ways to get it'}
                title={locale === 'fa' ? 'این محصول را چطور می‌توانید تهیه کنید' : 'How you can get this product'}
              />
              <SaleOptionGrid options={realOptions?.saleOptions ?? SAMPLE_OPTIONS} href={() => '/start'} />
              <AfterSalesChips services={realAfterSales?.productServices ?? SAMPLE_AFTER_SALES} />
            </BandInner>
          </PaperPanel>
        </Preview>
      </div>

      {showcaseProject ? (
        <div>
          <Subhead>Product page — the whole page (Phase 30)</Subhead>
          <Preview
            label={
              products.length === 0
                ? `No product is published yet: “${t(showcaseProject.title, locale)}” stands in, with the sample ways to get it (no price set). Its request form would be refused — it is not a product.`
                : undefined
            }
          >
            <ProductPage
              product={
                products[0] ?? {
                  ...showcaseProject,
                  isProduct: true,
                  saleOptions: SAMPLE_OPTIONS,
                  productServices: SAMPLE_AFTER_SALES,
                }
              }
              whatsappHref={whatsappHref}
            />
          </Preview>
        </div>
      ) : null}

      {featureProject ? (
        <div>
          <Subhead>Feature grid — features only, in the project&apos;s accent</Subhead>
          <Preview>
            <InkBand className="py-14" style={projectStyle(projectPalette(featureProject.brandColor, featureProject.accentColor))}>
              <BandInner className="flex flex-col gap-8">
                <SectionHeading title={locale === 'fa' ? 'امکانات' : 'Features'} />
                <FeatureGrid features={featureProject.features.map((title) => ({ title }))} />
              </BandInner>
            </InkBand>
          </Preview>
        </div>
      ) : null}

      <div>
        <Subhead>CTA band · compact CTA · floating WhatsApp button</Subhead>
        <Preview>
          <InkBand className="flex flex-col gap-8 px-4 py-14">
            <CtaBand
              title={tr('megaCardTitle')}
              line={tr('megaCardLine')}
              primary={{ href: '/start', label: tr('start') }}
              whatsappHref={whatsappHref}
              whatsappLabel={tr('whatsapp')}
            />
            <CtaBand
              compact
              headingLevel="h3"
              title={locale === 'fa' ? 'سؤالی دارید؟' : 'Any questions?'}
              line={locale === 'fa' ? 'درباره‌ی این محصول بپرسید؛ همان روز جواب می‌گیرید.' : "Ask about this product — you'll hear back the same day."}
              primary={{ href: '/start', label: tr('requestDemo') }}
              whatsappHref={whatsappHref}
              whatsappLabel={tr('whatsapp')}
            />
            <div className="flex justify-end">
              <FloatingWhatsAppButton href={whatsappHref} label={tr('whatsapp')} fixed={false} />
            </div>
          </InkBand>
        </Preview>
      </div>

      {articleCover ? (
        <div>
          <Subhead>Article card — a cover is required</Subhead>
          <Preview label="Sample article: a project screenshot stands in for the cover.">
            <PaperPanel>
              <BandInner>
                <ul className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
                  <li>
                    <ArticleCover
                      href="/insights"
                      cover={articleCover}
                      tag={locale === 'fa' ? 'ترانسپورت' : 'Transport'}
                      title={locale === 'fa' ? 'فروش آنلاین تکت برای یک شرکت ترانسپورتی چه چیزی را تغییر می‌دهد' : 'What online ticket sales change for a transport company'}
                    />
                  </li>
                </ul>
              </BandInner>
            </PaperPanel>
          </Preview>
        </div>
      ) : null}

      <div>
        <Subhead>Footer</Subhead>
        <Preview>
          <BrandFooter
            mark={<BrandLockup />}
            tagline={tr('footerTagline')}
            year={formatNumber(new Date().getFullYear(), locale, { useGrouping: false })}
            columns={[
              { title: tr('products'), links: products.map((p) => ({ href: workHref(p), label: t(p.title, locale) })) },
              { title: tr('services'), links: services.slice(0, 5).map((s) => ({ href: `/services/${s.slug}`, label: t(s.title, locale) })) },
              {
                title: tr('footerArtaveo'),
                links: [
                  { href: '/about', label: tr('about') },
                  { href: '/work', label: tr('work') },
                  { href: '/contact', label: locale === 'fa' ? 'تماس' : 'Contact' },
                ],
              },
            ]}
            legal={[
              { href: '/privacy', label: locale === 'fa' ? 'حریم خصوصی' : 'Privacy' },
              { href: '/terms', label: locale === 'fa' ? 'شرایط استفاده' : 'Terms' },
            ]}
          />
        </Preview>
      </div>
    </Section>
  )
}
