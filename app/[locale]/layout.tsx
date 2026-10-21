import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Vazirmatn } from 'next/font/google'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'
import { pickMessages, SHELL_CLIENT_NAMESPACES } from '@/lib/i18n/client-messages'
import { countPublishedArticles } from '@/lib/insights'
import { siteConfig } from '@/lib/site'
import { SITE_URL, buildAlternates } from '@/lib/seo'
import { buildSiteJsonLd } from '@/lib/structured-data'
import { themeScript } from '@/lib/theme-script'
import { ErrorReporter } from '@/components/site/error-reporter'
import { ThemeSync } from '@/components/theme-sync'
import { PwaManager } from '@/components/site/pwa-manager'
import { SiteFlagsProvider } from '@/components/site/site-flags'
import { applyArticleRule } from '@/lib/shell-settings'
import { getShellData, getShellMenus } from '@/lib/shell-settings-server'
import { JsonLd } from '@/components/site/json-ld'
import type { Locale } from '@/types/content'
import '../globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
})

/**
 * Phase 34 font audit. next/font preloads every listed subset of every font in
 * this module on every page, whatever its language — the class gating below
 * decides which font applies, not which file downloads. Before: four files,
 * ~132 KB, preloaded on every page. Now two:
 * - Geist Mono is only eyebrows and small labels: not preloaded; it swaps in
 *   from a metric-matched fallback.
 * - Vazirmatn preloads only its Arabic-script file — the Dari text. Its Latin
 *   file stays declared and downloads only when a Latin glyph is painted in it.
 * Geist (English body) and Vazirmatn's Arabic file stay preloaded on every page:
 * both languages share this root layout, so a preload cannot follow the locale.
 */
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
  preload: false,
})

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
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
    // Google Search Console ownership for artaveo-seven.vercel.app (owner, 21 October 2026).
    // Public by design; a new domain is verified by DNS instead and needs no code.
    verification: { google: 'X-oOznobY8Y4DCZGGQSQ2leptwCqSP-2FBuaQSrU_ZY' },
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
   * "Hidden until content exists" (§ 5.2) and Phase 33.2: the articles link
   * follows how many articles a visitor can read — none, nowhere; from the
   * first, the footer and the search; from the fourth, the header too
   * (`applyArticleRule`). Tolerant by design (0 on any failure, see
   * `lib/insights.ts`) so an unreachable database can't take down routes that
   * don't need it. Publishing/unpublishing calls `revalidatePath('/', 'layout')`.
   */
  // Phase 27.6 — navigation and contact channels as the owner set them in the admin.
  // Phase 29.1 — and the published products and services for the mega menus and the footer.
  const [articleCount, shellSettings, menus, messages] = await Promise.all([countPublishedArticles(), getShellData(), getShellMenus(locale as Locale), getMessages()])
  const articlesVisible = articleCount > 0
  const shell = applyArticleRule(shellSettings, articleCount)

  /**
   * § 11.3 — `--font-vazirmatn` is only read inside a `[dir='rtl']` rule
   * (`app/globals.css`), so English pages leave its class off. (Phase 34
   * measured that this does not stop the preload — next/font preloads per
   * module, see the font declarations above — but it keeps English text from
   * ever resolving to Vazirmatn.) Geist Sans/Mono stay on every locale: the
   * Latin fallback in the `font-persian` stack and the `font-mono` labels.
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
      {/* The font utility follows the direction: a `font-sans` class on <body> outranks the
          `[dir='rtl'] body` rule in globals.css, which is how Persian pages used to fall back
          to the device font and never even download Vazirmatn. */}
      <body className={`${dir === 'rtl' ? 'font-persian' : 'font-sans'} antialiased`}>
        <JsonLd data={buildSiteJsonLd(locale as Locale)} />
        <ThemeSync />
        <ErrorReporter />
        {/* Phase 34: only the shell's Client Components' namespaces reach the browser; a form's page
            adds its own with <ClientMessages>, the admin gets all (lib/i18n/client-messages.ts). */}
        <NextIntlClientProvider messages={pickMessages(messages, SHELL_CLIENT_NAMESPACES)}>
          <SiteFlagsProvider flags={{ articles: articlesVisible }} shell={shell} menus={menus}>
            {children}
            <PwaManager />
          </SiteFlagsProvider>
        </NextIntlClientProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
        {/* Phase 34 — field data: each visit's LCP, INP and CLS by route, on the project's Speed
            Insights page in Vercel (it collects once the owner turns it on there). */}
        {process.env.NODE_ENV === 'production' && <SpeedInsights />}
      </body>
    </html>
  )
}
