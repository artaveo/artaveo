import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Vazirmatn } from 'next/font/google'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'
import { hasPublishedArticles } from '@/lib/insights'
import { siteConfig } from '@/lib/site'
import { SITE_URL, buildAlternates } from '@/lib/seo'
import { buildSiteJsonLd } from '@/lib/structured-data'
import { themeScript } from '@/lib/theme-script'
import { ThemeSync } from '@/components/theme-sync'
import { PwaManager } from '@/components/site/pwa-manager'
import { SiteFlagsProvider } from '@/components/site/site-flags'
import { JsonLd } from '@/components/site/json-ld'
import type { Locale } from '@/types/content'
import '../globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  variable: '--font-vazirmatn',
  display: 'swap',
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Common' })
  const title = `${siteConfig.name} — ${t('tagline')}`
  const description = t('siteDescription')

  return {
    title: {
      default: title,
      template: '%s — Artaveo',
    },
    description,
    generator: 'v0.app',
    manifest: '/manifest.webmanifest',
    /**
     * `metadataBase` — resolved against `SITE_URL` (`lib/seo.ts`), which
     * defaults to the interim Vercel URL while D-01 (production domain) is
     * open. Every relative image/URL below (and in every page's own
     * `generateMetadata`) now resolves to an absolute URL for crawlers
     * instead of being silently left relative, which was this layout's
     * previous state. Swap only needs `NEXT_PUBLIC_SITE_URL` set once the
     * real domain is DNS-authenticated — no code change, same pattern as
     * § 9.3's `EMAIL_PROVIDER` switch.
     */
    metadataBase: new URL(SITE_URL),
    alternates: buildAlternates(locale, ''),
    /**
     * Favicon: `/artaveo-icon.svg` (in `public/`, deliberately *not* named
     * `app/icon.svg`) already swaps light/dark via a `prefers-color-scheme`
     * media query inside the SVG itself. It lives outside `app/` because
     * Next's `icons` metadata export and the `app/icon.svg` file convention
     * don't compose — declaring `icons` explicitly suppresses the file
     * convention's own link tag, and re-declaring the same URL under the
     * `app/icon.svg` name still gets silently dropped, verified against a
     * clean build (`grep` for `svg+xml` in the rendered `<head>` came back
     * empty until the file was moved out of `app/`). The PNG entries below
     * are fallbacks for the browsers/contexts that ignore SVG favicons and
     * need a raster icon with an explicit scheme-media hint instead. All are
     * the TEMPORARY placeholder mark — see docs/design/art-direction.md →
     * "Known Issues".
     */
    icons: {
      icon: [
        { url: '/artaveo-icon.svg', type: 'image/svg+xml' },
        { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: light)' },
        { url: '/icon-dark-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: dark)' },
        { url: '/icon-light-16x16.png', sizes: '16x16', type: 'image/png', media: '(prefers-color-scheme: light)' },
        { url: '/icon-dark-16x16.png', sizes: '16x16', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      ],
      apple: '/apple-icon.png',
    },
    openGraph: {
      type: 'website',
      title,
      description,
      // `public/brand/og-image.png` — static render (not a dynamic `next/og`
      // route; this sandbox can't fetch the runtime font one would need).
      // Built from the TEMPORARY placeholder mark, same as the favicon above.
      images: [{ url: '/brand/og-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/brand/og-image.png'],
    },
  }
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fcfcfd' },
    { media: '(prefers-color-scheme: dark)', color: '#111318' },
  ],
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Enables static rendering for this locale segment (next-intl docs).
  setRequestLocale(locale)

  const dir = locale === 'fa' ? 'rtl' : 'ltr'

  /**
   * Phase 17 — "Insights hidden from nav until content exists" (§ 5.2):
   * the link follows whether any article is actually published. Tolerant
   * by design (returns `false` on any failure, see `lib/insights.ts`) so an
   * unreachable database can't take down routes that don't need it.
   * Publishing/unpublishing calls `revalidatePath('/', 'layout')`.
   */
  const insightsVisible = await hasPublishedArticles()

  /**
   * § 11.3 — fonts subset and preloaded carefully. `--font-vazirmatn` only
   * ever gets read inside a `[dir='rtl']` rule (`app/globals.css`), so on
   * `en` pages the variable is dead weight: Next.js preloads a font the
   * moment its `.variable` class is present in the rendered `<html>`,
   * regardless of whether any visible text actually resolves to it. Gating
   * it on `dir` keeps English requests from spending preload priority
   * (competing with the hero image / LCP element) on a font family they
   * never paint a single glyph with. Geist Sans/Mono stay unconditional —
   * both are genuinely used on every locale (Latin fallback in the
   * `font-persian` stack, and `font-mono` eyebrows/labels which render in
   * both directions per the letter-spacing reset above).
   */
  const fontVariables =
    dir === 'rtl'
      ? `${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable}`
      : `${geistSans.variable} ${geistMono.variable}`

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${fontVariables} bg-background`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <JsonLd data={buildSiteJsonLd(locale as Locale)} />
        <ThemeSync />
        <NextIntlClientProvider>
          <SiteFlagsProvider flags={{ insights: insightsVisible }}>
            {children}
            <PwaManager />
          </SiteFlagsProvider>
        </NextIntlClientProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
