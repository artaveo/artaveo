import { routing } from '@/i18n/routing'
import { buildOgImageUrl } from '@/lib/og'
import { SITE_URL, absoluteUrl } from '@/lib/site-url'

/**
 * `SITE_URL` and `absoluteUrl()` live in `lib/site-url.ts` (Phase 19) and are
 * re-exported here so every existing `import { SITE_URL } from '@/lib/seo'`
 * keeps working. See that file for the D-01 reasoning.
 */
export { SITE_URL, absoluteUrl }

/**
 * Builds the `alternates` block (canonical + per-locale hreflang, with an
 * `x-default` pointing at the default locale per standard practice) for a
 * given locale and locale-less pathname.
 *
 * `pathname` is the route *without* a locale prefix, e.g. `/work` or
 * `/work/pezhohesh-portal` — every locale in `routing.locales` is combined
 * with it (`localePrefix: 'always'`, § 5.1, so every locale — including
 * `en` — carries an explicit prefix).
 */
export function buildAlternates(locale: string, pathname: string = '') {
  const clean = pathname === '/' ? '' : pathname
  const languages: Record<string, string> = {}
  for (const loc of routing.locales) {
    languages[loc] = absoluteUrl(`/${loc}${clean}`)
  }
  languages['x-default'] = absoluteUrl(`/${routing.defaultLocale}${clean}`)

  return {
    canonical: absoluteUrl(`/${locale}${clean}`),
    languages,
  }
}

/**
 * Per-page `openGraph`/`twitter` image block. `en` gets the dynamic
 * `/api/og` render with the real page title; `fa` keeps the static
 * `/brand/og-image.png` fallback (see `lib/og.ts`'s doc comment for why).
 * Returns a full `openGraph`/`twitter` pair rather than just `images` so
 * a page's `generateMetadata` can spread it in without accidentally
 * dropping the parent layout's `type/title/description` defaults for the
 * fields it doesn't override — Next.js does not deep-merge `openGraph`
 * across nested `generateMetadata` calls.
 */
export function buildPageOpenGraph({
  locale,
  title,
  description,
  eyebrow,
}: {
  locale: string
  title: string
  description: string
  eyebrow?: string
}) {
  const image =
    locale === 'en'
      ? { url: buildOgImageUrl({ title, eyebrow }), width: 1200, height: 630, alt: title }
      : { url: '/brand/og-image.png', width: 1200, height: 630, alt: title }

  return {
    openGraph: {
      type: 'website' as const,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [image.url],
    },
  }
}
