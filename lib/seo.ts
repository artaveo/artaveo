import { routing } from '@/i18n/routing'
import { buildOgImageUrl } from '@/lib/og'

/**
 * Roadmap § 11.1 (SEO & analytics events).
 *
 * `NEXT_PUBLIC_SITE_URL` is intentionally read with a fallback to the
 * interim Vercel URL rather than left unset: D-01 (production domain) is
 * still open (see the Decision Register / `lib/site.ts`), and the
 * owner's own 13 Sep 2026 call in D-01 was to build against the interim
 * Vercel URL now rather than wait — the same reasoning § 9.3's
 * notifications already applied. Canonical URLs, hreflang alternates,
 * the sitemap and `metadataBase` all need *some* absolute origin to
 * resolve against; an unset `metadataBase` (the previous state — see the
 * removed comment in `app/[locale]/layout.tsx`) left every relative image
 * path unresolved for crawlers, which is worse than a value that will
 * need a one-line env var swap once D-01's real domain lands.
 *
 * Set `NEXT_PUBLIC_SITE_URL` in Vercel once the real domain is
 * DNS-authenticated — no code change needed, exactly like § 9.3's
 * `EMAIL_PROVIDER` switch.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artaveo-seven.vercel.app').replace(
  /\/+$/,
  '',
)

/** Resolves a site-relative path (e.g. `/en/work`) to an absolute URL against `SITE_URL`. */
export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}

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
