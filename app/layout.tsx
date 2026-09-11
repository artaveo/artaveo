import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Vazirmatn } from 'next/font/google'

import { siteConfig } from '@/lib/site'
import './globals.css'

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

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: '%s — Artaveo',
  },
  description: siteConfig.description,
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
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    // `public/brand/og-image.png` — static render (not a dynamic `next/og`
    // route; this sandbox can't fetch the runtime font one would need).
    // Built from the TEMPORARY placeholder mark, same as the favicon above.
    images: [{ url: '/brand/og-image.png', width: 1200, height: 630, alt: `${siteConfig.name} — ${siteConfig.tagline}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: ['/brand/og-image.png'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fcfcfd' },
    { media: '(prefers-color-scheme: dark)', color: '#111318' },
  ],
}

const themeScript = `
(function () {
  try {
    var root = document.documentElement;
    var stored = localStorage.getItem('artaveo-theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored ? stored === 'dark' : systemDark;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);

    var lang = localStorage.getItem('artaveo-lang');
    if (lang === 'fa') {
      root.lang = 'fa';
      root.dir = 'rtl';
    }
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} bg-background`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
