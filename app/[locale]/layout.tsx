import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Vazirmatn } from 'next/font/google'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'
import { siteConfig } from '@/lib/site'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import { ThemeSync } from '@/components/theme-sync'
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
    /**
     * `metadataBase` is intentionally omitted — no production domain is
     * registered yet (D-01 open, see lib/site.ts). Image paths below resolve
     * relative to whatever host actually serves the site for now; set
     * `metadataBase` once the domain lands so crawlers get absolute URLs.
     */
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

/**
 * Theme only. Locale/direction no longer belong here (§ 5.1) — `lang` and
 * `dir` are now set server-side below from the `[locale]` segment, with no
 * client-side flip and no flash. `artaveo-lang` in `localStorage` is dead;
 * the source of truth is the `artaveo-locale` cookie set by the middleware.
 *
 * This blocking script only prevents a flash on the very first paint of a
 * hard page load. Client-side navigations (e.g. the language switcher) are
 * handled separately by `<ThemeSync>` below — see its doc comment for why
 * that's needed on top of this script.
 */
const themeScript = `
(function () {
  try {
    var root = document.documentElement;
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored ? stored === 'dark' : systemDark;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
  } catch (e) {}
})();
`

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

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} bg-background`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeSync />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
