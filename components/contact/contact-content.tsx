import { Fragment } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { PageHeader } from '@/components/ui/patterns'
import { Link } from '@/components/ui/actions'
import { AvailabilityCard, ExternalProfileLinks } from '@/components/ui/identity'
import { Icon } from '@/components/icon'
import { HireChannelSelector } from '@/components/contact/hire-channel-selector'
import { LatinTerm } from '@/components/site/latin-term'
import { getDirectContactChannels, getHireChannels } from '@/lib/contact-content'
import { getDeveloperProfile } from '@/lib/home-content'
import { t, type Locale } from '@/types/content'

/**
 * ContactContent — the `/contact` page (roadmap § 8.3, page map § 15:
 * "Direct contact + hire channels"). Layout mirrors `AboutContent`'s 8/4
 * split: the Hire Channel Selector (the actual § 8.3 deliverable) takes
 * the wide column, a sticky card with the fastest direct channels,
 * response commitment and verified profiles sits alongside it — so
 * whichever way a visitor prefers to reach out, it's one click away
 * without scrolling past the comparison first.
 *
 * The Brief Builder (roadmap § 9.1, `/start`) is a later phase; until it
 * ships, email and WhatsApp are the only ways to start a project, and
 * every "Start a project" CTA site-wide already points here.
 */
export function ContactContent() {
  const locale = useLocale() as Locale
  const t18n = useTranslations('ContactPage')
  const developer = getDeveloperProfile()
  const directChannels = getDirectContactChannels()
  const hireChannels = getHireChannels()

  return (
    <Fragment>
      <div className="container-page py-16 md:py-24">
        <PageHeader eyebrow={t18n('eyebrow')} title={t18n('title')} description={t18n('description')} />

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-8">
            <h2 className="text-2xl font-semibold tracking-tight text-balance">
              {t18n('hireChannelsTitle')}
            </h2>
            <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
              {t18n('hireChannelsDescription')}
            </p>
            <div className="mt-8">
              <HireChannelSelector channels={hireChannels} />
            </div>
          </div>

          <aside className="lg:col-span-4">
            <div className="flex flex-col gap-6 lg:sticky lg:top-24">
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  {t18n('directTitle')}
                </h2>

                {directChannels.length ? (
                  <ul className="mt-4 flex flex-col gap-3">
                    {directChannels.map((channel) => (
                      <li key={channel.id}>
                        <Link
                          href={channel.href}
                          variant="standalone"
                          showExternalIcon={false}
                          className="flex items-center gap-3 rounded-lg border border-border p-3 text-foreground no-underline hover:bg-elevated"
                        >
                          <span
                            aria-hidden
                            className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-elevated text-brand-text"
                          >
                            <Icon name={channel.icon} className="size-4" />
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="text-sm font-medium">{t(channel.label, locale)}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              <LatinTerm>{channel.value}</LatinTerm>
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {developer.availability ? (
                  <AvailabilityCard
                    availability={developer.availability}
                    locale={locale}
                    className="mt-5 border-0 border-t border-border p-0 pt-5 rounded-none"
                  />
                ) : null}

                <div className="mt-5 border-t border-border pt-5">
                  <ExternalProfileLinks className="flex-col items-start gap-2.5" />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Fragment>
  )
}
