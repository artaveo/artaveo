import { Eye, Handshake, LifeBuoy, Puzzle } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { BandInner, InkBand, PaperPanel, SectionHeading } from '@/components/brand/bands'
import { CtaBand } from '@/components/brand/cta-band'
import { PageHero } from '@/components/brand/page-hero'
import { PillLink } from '@/components/brand/pill'
import { getDeveloperProfile } from '@/lib/home-content'

const VALUES = [
  { key: 'value1', icon: Eye },
  { key: 'value2', icon: Puzzle },
  { key: 'value3', icon: Handshake },
  { key: 'value4', icon: LifeBuoy },
] as const

/**
 * Phase 31.3 — `/about`: Artaveo, the studio — what it builds and for whom,
 * what it cares about in every project — and its founder, with name and
 * photo (D-02). No "one person" framing, no technical focus list, no tools,
 * no languages or time-zone widget (§ 6.7, § 14.0 retired list). The founder's
 * name and photo come from the one profile record (`getDeveloperProfile()`);
 * without a photo the card is the name alone.
 */
export function AboutContent({ whatsappHref }: { whatsappHref: string | null }) {
  const ta = useTranslations('AboutPage')
  const tb = useTranslations('Brand')
  const tNav = useTranslations('Nav')
  const founder = getDeveloperProfile()

  return (
    <div className="bg-ink">
      <PageHero
        titleId="about-title"
        trail={[{ href: '/', label: tNav('home') }]}
        current={tb('about')}
        eyebrow={tb('about')}
        title={ta('title')}
        lead={ta('lead')}
        actions={
          <>
            <PillLink href="/work" variant="gold" size="lg">
              {ta('seeWork')}
            </PillLink>
            <PillLink href="/services" variant="glass" size="lg">
              {ta('seeServices')}
            </PillLink>
          </>
        }
      />

      <PaperPanel aria-labelledby="about-story-title" data-slot="about-story">
        <BandInner className="flex flex-col gap-20">
          <section className="grid gap-8 @4xl:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading tone="paper" id="about-story-title" eyebrow={ta('storyEyebrow')} title={ta('storyTitle')} />
            <div className="flex flex-col gap-4">
              {(['story1', 'story2', 'story3'] as const).map((key) => (
                <p key={key} className="max-w-[44rem] text-body text-pretty text-paper-muted">
                  {ta(key)}
                </p>
              ))}
            </div>
          </section>

          <section aria-labelledby="about-values-title" className="flex flex-col gap-10">
            <SectionHeading tone="paper" id="about-values-title" eyebrow={ta('valuesEyebrow')} title={ta('valuesTitle')} />
            <ul className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-4">
              {VALUES.map(({ key, icon: Icon }) => (
                <li key={key} className="flex flex-col gap-3 rounded-card-lg border border-paper-line bg-paper-card p-7 shadow-card">
                  <span className="grid size-12 place-items-center rounded-2xl bg-paper-ink text-gold">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-1 text-card-title">{ta(`${key}Title`)}</h3>
                  <p className="text-sm leading-relaxed text-pretty text-paper-muted">{ta(`${key}Line`)}</p>
                </li>
              ))}
            </ul>
          </section>

          {founder.name ? (
            <section aria-labelledby="about-founder-title" className="grid items-center gap-8 rounded-panel bg-paper-ink p-6 text-ink-foreground @3xl:grid-cols-[auto_1fr] @3xl:p-10" data-slot="about-founder">
              {founder.portrait ? (
                <Image
                  src={founder.portrait}
                  alt={ta('founderPhotoAlt', { name: founder.name })}
                  width={176}
                  height={176}
                  className="size-32 rounded-full object-cover ring-4 ring-gold/40 @3xl:size-44"
                />
              ) : null}
              <div className="flex flex-col gap-2">
                <p className="text-small font-bold text-gold">{ta('founderEyebrow')}</p>
                <h2 id="about-founder-title" className="text-h2">
                  {ta('founderName')}
                </h2>
                <p className="text-body font-semibold text-ink-foreground">{ta('founderRole')}</p>
                <p className="max-w-[40rem] text-body text-pretty text-ink-muted">{ta('founderLine')}</p>
              </div>
            </section>
          ) : null}
        </BandInner>
      </PaperPanel>

      <InkBand aria-label={tb('megaCardTitle')} className="px-4 pt-16 pb-20 @3xl:pt-20 @3xl:pb-24" data-slot="about-cta">
        <CtaBand title={tb('megaCardTitle')} line={tb('megaCardLine')} primary={{ href: '/start', label: tb('start') }} whatsappHref={whatsappHref} whatsappLabel={tb('whatsapp')} />
      </InkBand>
    </div>
  )
}
