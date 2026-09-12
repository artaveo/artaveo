import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { ArtaveoMark } from '@/components/site/artaveo-mark'
import { Link as ActionLink } from '@/components/ui/actions'
import { ExternalProfileLinks } from '@/components/ui/identity'
import { siteConfig, utilityNav, visibleMainNav, type NavItem } from '@/lib/site'

/**
 * § 5.2 also asks for "locale-aware legal links" in the footer. There is
 * no privacy/terms page to link to yet — those are built in § 11.2 — so
 * no placeholder link is added here (§ 3's "no fake content" rule). When
 * § 11.2 ships real legal pages, add them to a `legalNav` list in
 * `lib/site.ts` and render it in the bottom bar below via `Link` (already
 * locale-aware), not as a new hardcoded block.
 */
export function SiteFooter() {
  const year = new Date().getFullYear()
  const t = useTranslations('Footer')
  const tCommon = useTranslations('Common')

  return (
    <footer className="border-t border-border bg-elevated">
      <div className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href="/" className="flex items-center gap-2" aria-label="Artaveo home">
              <ArtaveoMark className="size-7 text-foreground" />
              <span dir="ltr" className="font-mono text-sm font-semibold tracking-[0.2em]">
                ARTAVEO
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
              {tCommon('siteDescription')}
            </p>
            <ActionLink
              href={`mailto:${siteConfig.email}`}
              variant="standalone"
              className="mt-6"
            >
              <span dir="ltr">{siteConfig.email}</span>
            </ActionLink>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <FooterCol title={t('explore')} items={visibleMainNav} />
            <FooterCol title={t('more')} items={utilityNav} />
            <div>
              <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                {t('social')}
              </h3>
              <ExternalProfileLinks className="mt-4 flex-col items-start gap-x-0 gap-y-3" />
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            © {year} {siteConfig.name}. {tCommon('location')}.
          </p>
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            {t('tagline')}
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  items,
}: {
  title: string
  items: NavItem[]
}) {
  const tNav = useTranslations('Nav')
  return (
    <div>
      <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
        {title}
      </h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {tNav(item.key)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
