import { Check } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Link } from '@/components/ui/actions'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/icon'
import { t, type HireChannel, type Locale } from '@/types/content'

/**
 * HireChannelSelector — the § 8.3 "Hire Channel Selector" component
 * (component inventory § 14: "Direct vs via platform, with trade-offs").
 * Two cards, side by side on desktop, stacked on mobile — deliberately not
 * the `PackageComparison` table pattern, since there is no shared feature
 * matrix to align row-by-row here, only two genuinely different
 * relationships with their own trade-offs.
 *
 * Data comes from `lib/contact-content.ts#getHireChannels()` — real
 * channels only (D-05 default). Renders nothing for a channel whose real
 * link doesn't exist, and renders nothing at all if the list is empty.
 */
export function HireChannelSelector({ channels }: { channels: HireChannel[] }) {
  const locale = useLocale() as Locale
  const t18n = useTranslations('ContactPage')

  if (channels.length === 0) return null

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {channels.map((channel) => (
        <div
          key={channel.id}
          className="flex flex-col rounded-xl border border-border bg-card p-6 md:p-8"
        >
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-elevated text-brand-text"
          >
            <Icon name={channel.icon} className="size-5" />
          </span>

          <h3 className="mt-4 text-lg font-semibold tracking-tight">{t(channel.title, locale)}</h3>
          <p className="mt-1.5 leading-relaxed text-muted-foreground text-pretty">
            {t(channel.summary, locale)}
          </p>

          <ul className="mt-5 flex grow flex-col gap-2.5 border-t border-border pt-5">
            {channel.points.map((point) => (
              <li key={point.en} className="flex gap-2.5 text-sm leading-relaxed">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success-text" />
                <span className="text-pretty">{t(point, locale)}</span>
              </li>
            ))}
          </ul>

          <Button
            className="mt-6 w-full justify-center"
            variant={channel.kind === 'direct' ? 'default' : 'outline'}
            render={<Link href={channel.href} showExternalIcon={channel.kind === 'platform'} />}
          >
            {t(channel.ctaLabel, locale)}
          </Button>
        </div>
      ))}

      <p className="text-sm text-muted-foreground sm:col-span-2">{t18n('hireChannelsNote')}</p>
    </div>
  )
}
