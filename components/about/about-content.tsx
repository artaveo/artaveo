import { Fragment } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { PageHeader, CTASection, FeatureList } from '@/components/ui/patterns'
import { Prose } from '@/components/ui/prose'
import { LatinTerm } from '@/components/site/latin-term'
import {
  AvailabilityCard,
  ExternalProfileLinks,
  IdentityCta,
  IdentityHeader,
} from '@/components/ui/identity'
import { Icon } from '@/components/icon'
import { getAboutStory, getWorkingLanguages } from '@/lib/about-content'
import { getDeveloperProfile, getDifferentiators, getTechStack } from '@/lib/home-content'
import { t, type Locale } from '@/types/content'

/**
 * AboutContent — the `/about` page (roadmap § 8.1). Every section reads
 * from data already established elsewhere in the codebase (the developer
 * profile from § 4.5, differentiators and tech stack from Home § 3.3) plus
 * the story/languages content added in this phase (`lib/about-content.ts`)
 * — nothing here is invented specifically for this page.
 *
 * Layout mirrors `ServiceDetail` (`components/services/service-detail.tsx`):
 * an 8/4 split with the long-form content on the start side and a sticky
 * identity/contact card on the end side, so the two most detailed content
 * pages on the site (`/services/[slug]`, `/about`) share one reading
 * pattern.
 */
export function AboutContent() {
  const locale = useLocale() as Locale
  const t18n = useTranslations('AboutPage')
  const developer = getDeveloperProfile()
  const story = getAboutStory()
  const languages = getWorkingLanguages()
  const differentiators = getDifferentiators()
  const techStack = getTechStack()

  const differentiatorItems = differentiators.map((item) => ({
    id: item.title.en,
    icon: (props: { className?: string }) => <Icon name={item.icon} {...props} />,
    title: t(item.title, locale),
    description: t(item.description, locale),
  }))

  return (
    <Fragment>
      <div className="container-page py-16 md:py-24">
        <PageHeader
        eyebrow={t18n('eyebrow')}
        title={
          developer.name
            ? t18n.rich('titleWithName', {
                name: () => <LatinTerm>{developer.name}</LatinTerm>,
              })
            : t18n('titleNoName')
        }
        description={t18n('description')}
      />

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-8">
          {/* Story — "not a CV" */}
          <Prose>
            {story.map((paragraph) => (
              <p key={paragraph.en}>{t(paragraph, locale)}</p>
            ))}
          </Prose>

          {/* Technical focus */}
          {developer.focus.length ? (
            <div className="mt-12 border-t border-border pt-10">
              <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                {t18n('technicalFocus')}
              </h2>
              <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
                {developer.focus.map((item) => (
                  <li
                    key={item.en}
                    className="flex items-center gap-3 border-b border-border py-3 text-sm"
                  >
                    <span aria-hidden className="size-1.5 shrink-0 rounded-[2px] bg-brand" />
                    {t(item, locale)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* How I work / values */}
          <div className="mt-12 border-t border-border pt-10">
            <h2 className="text-2xl font-semibold tracking-tight text-balance">
              {t18n('howIWork')}
            </h2>
            <p className="mt-2 leading-relaxed text-muted-foreground text-pretty">
              {t18n('howIWorkDescription')}
            </p>
            <FeatureList items={differentiatorItems} className="mt-6" />
          </div>

          {/* Languages */}
          <div className="mt-12 border-t border-border pt-10">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {t18n('languages')}
            </h2>
            <ul className="mt-4 flex flex-col gap-4">
              {languages.map((language) => (
                <li key={language.name.en} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                  <span className="w-40 shrink-0 font-medium">{t(language.name, locale)}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    {t(language.note, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools & technologies */}
          <div className="mt-12 border-t border-border pt-10">
            <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {t18n('tools')}
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {techStack.map((category) => (
                <div key={category.id}>
                  <div className="flex items-center gap-2">
                    <Icon name={category.icon} aria-hidden className="size-4 text-brand-text" />
                    <h3 className="text-sm font-medium">{t(category.title, locale)}</h3>
                  </div>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {category.items.map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="lg:col-span-4">
          <div className="flex flex-col gap-6 lg:sticky lg:top-24">
            <div className="rounded-xl border border-border bg-card p-6">
              <IdentityHeader profile={developer} title={t18n('identityTitle')} locale={locale} />

              {developer.timezone ? (
                <p className="mt-5 border-t border-border pt-5 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{t18n('timezoneLabel')}</span>{' '}
                  {developer.timezone} — {t18n('timezoneNote')}
                </p>
              ) : null}

              {developer.availability ? (
                <AvailabilityCard
                  availability={developer.availability}
                  locale={locale}
                  className="mt-5 border-0 bg-transparent p-0"
                />
              ) : null}

              <div className="mt-5 border-t border-border pt-5">
                <ExternalProfileLinks className="flex-col items-start gap-2.5" />
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <IdentityCta variant="hire" className="w-full justify-center" />
                <IdentityCta variant="consultation" className="w-full justify-center" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <CTASection
      title={t18n('ctaTitle')}
      description={t18n('ctaDescription')}
      primaryAction={{ href: '/contact', label: t18n('ctaPrimary') }}
      secondaryAction={{ href: '/work', label: t18n('ctaSecondary') }}
    />
    </Fragment>
  )
}
