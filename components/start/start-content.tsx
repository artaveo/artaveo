import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { BandInner, InkBand } from '@/components/brand/bands'
import { PageHero } from '@/components/brand/page-hero'
import { PillLink } from '@/components/brand/pill'
import { WhatsAppIcon } from '@/components/brand/whatsapp-icon'
import { ClientMessages } from '@/components/site/client-messages'
import { BriefBuilder } from '@/components/start/brief-builder'
import type { Service } from '@/types/content'
import type { ProductChoice } from '@/types/inquiry'

/**
 * Phase 31.4 — `/start`, the target of every "Start a project" action (§ 15):
 * the Brief Builder (Phase 9.1, project types by kind of software from 27.5)
 * on the ink band, in a panel that follows the visitor's light/dark theme like
 * every other form, with what happens after sending beside it and WhatsApp
 * for anyone who would rather just write. Success is shown only after the
 * request is stored (`submitInquiry`).
 *
 * `services` and the published `products` are fetched by the page (a Server
 * Component) and passed down: the Brief Builder is a Client Component.
 */
export function StartContent({
  services,
  products,
  initialServiceSlug,
  initialPackageId,
  initialProductSlug,
  whatsappHref,
}: {
  services: Service[]
  products: ProductChoice[]
  initialServiceSlug?: string
  initialPackageId?: string
  initialProductSlug?: string
  whatsappHref: string | null
}) {
  const ts = useTranslations('StartPage')
  const tb = useTranslations('Brand')
  const tNav = useTranslations('Nav')

  return (
    <div className="bg-ink">
      <PageHero titleId="start-title" trail={[{ href: '/', label: tNav('home') }]} current={tNav('start')} eyebrow={ts('eyebrow')} title={ts('title')} lead={ts('lead')} className="pb-10 @3xl:pb-12" />
      <InkBand aria-label={ts('formLabel')} className="pb-20 @3xl:pb-24" data-slot="start-form">
        <BandInner className="grid items-start gap-10 @5xl:grid-cols-[0.7fr_1.3fr]">
          <div className="flex flex-col gap-6 @5xl:sticky @5xl:top-24">
            <div>
              <h2 className="text-card-title">{ts('nextTitle')}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {(['next1', 'next2', 'next3'] as const).map((key) => (
                  <li key={key} className="flex gap-3 text-sm text-pretty text-ink-muted">
                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold" />
                    <span>{ts(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
            {whatsappHref ? (
              <div className="flex flex-col items-start gap-3 border-t border-ink-line pt-6">
                <p className="text-sm text-ink-muted">{ts('whatsappLine')}</p>
                <PillLink href={whatsappHref} variant="glass" external>
                  <WhatsAppIcon className="text-whatsapp-glyph" />
                  {tb('whatsapp')}
                </PillLink>
              </div>
            ) : null}
          </div>
          <div className="min-w-0 rounded-panel bg-background p-4 text-foreground @3xl:p-6">
            <ClientMessages scope="briefBuilder">
              <BriefBuilder
                services={services}
                products={products}
                initialServiceSlug={initialServiceSlug}
                initialPackageId={initialPackageId}
                initialProductSlug={initialProductSlug}
              />
            </ClientMessages>
          </div>
        </BandInner>
      </InkBand>
    </div>
  )
}
