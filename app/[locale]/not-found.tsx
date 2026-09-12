import { getLocale, getTranslations } from 'next-intl/server'

import { SiteShell } from '@/components/site/site-shell'
import { NotFoundState } from '@/components/ui/states'

/**
 * § 5.2: "not-found … per locale, designed (not default)". Keeps the real
 * header/footer via `SiteShell` so a visitor who lands here (a stale link,
 * or a nav item whose page hasn't shipped yet — § 6–9) can still navigate
 * the site, rather than hitting a dead end.
 *
 * Not-found routes don't receive `params`, so the locale comes from
 * `getLocale()` (request-scoped, already set by `app/[locale]/layout.tsx`
 * before this can render) — used to build a locale-prefixed "back home"
 * link, since `NotFoundState`'s action renders a plain `<a>`, not the
 * locale-aware `Link`.
 */
export default async function LocaleNotFound() {
  const locale = await getLocale()
  const t = await getTranslations('NotFound')
  const tCommon = await getTranslations('Common')

  return (
    <SiteShell>
      <div className="container-page flex min-h-[60vh] items-center">
        <NotFoundState
          title={t('title')}
          description={t('description')}
          action={{ label: tCommon('backHome'), href: `/${locale}` }}
          className="mx-auto"
        />
      </div>
    </SiteShell>
  )
}
