import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { LatinTerm } from '@/components/site/latin-term'
import { Button } from '@/components/ui/button'
import { getDeveloperProfile } from '@/lib/home-content'
import { t, type DeveloperProfile, type Locale } from '@/types/content'

export function AboutPreview() {
  const developer = getDeveloperProfile()
  const locale = useLocale() as Locale
  const tSection = useTranslations('AboutPreview')

  return (
    <section
      aria-labelledby="about-title"
      className="border-t border-border section-y"
    >
      <div className="container-page grid items-center gap-10 md:grid-cols-12 lg:gap-16">
        <div className="md:col-span-5 lg:col-span-4">
          <Portrait developer={developer} locale={locale} t={tSection} />
        </div>

        <div className="md:col-span-7 lg:col-span-8">
          <span className="font-mono text-xs tracking-widest text-brand-text uppercase">
            {tSection('eyebrow')}
          </span>
          <h2
            id="about-title"
            className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl"
          >
            {developer.name
              ? tSection.rich('headingWithName', {
                  name: () => <LatinTerm>{developer.name}</LatinTerm>,
                })
              : tSection('headingNoName')}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
            {t(developer.bio, locale)}
          </p>

          <h3 className="mt-8 text-sm font-semibold">{tSection('technicalFocus')}</h3>
          <ul className="mt-4 grid max-w-2xl gap-x-8 sm:grid-cols-2">
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

          <Button
            size="lg"
            variant="outline"
            className="mt-8"
            render={<Link href="/about" />}
          >
            {tSection('moreAbout')}
            <ArrowRight data-icon="inline-end" className="rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </section>
  )
}

/** Real portrait when available, otherwise a neutral labelled placeholder. */
function Portrait({
  developer,
  locale,
  t: tSection,
}: {
  developer: DeveloperProfile
  locale: Locale
  t: ReturnType<typeof useTranslations<'AboutPreview'>>
}) {
  const alt = developer.name
    ? tSection('portraitAltNamed', { name: developer.name })
    : tSection('portraitAltGeneric')

  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[16rem] overflow-hidden rounded-xl border border-border bg-muted md:max-w-none">
      {developer.portrait ? (
        <Image
          src={developer.portrait}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 768px) 40vw, 16rem"
          className="object-cover"
        />
      ) : (
        <>
          <div
            aria-hidden
            className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:32px_32px]"
          />
          <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-6">
            <div className="aspect-square w-[34%] shrink-0 rounded-full border border-border bg-background/70" />
            <div className="h-[26%] w-[72%] shrink-0 rounded-t-full border border-b-0 border-border bg-background/70" />
          </div>
          <span className="absolute inset-x-0 bottom-3 text-center font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {tSection('portraitPlaceholder')}
          </span>
        </>
      )}
    </div>
  )
}
