import { absoluteUrl } from '@/lib/seo'

/**
 * Roadmap § 11.1 — dynamic Open Graph images.
 *
 * English-only: `app/api/og/route.tsx` renders through `next/og`'s Satori
 * engine, which needs a font file that actually contains Perso-Arabic
 * glyphs to render Persian text — none is bundled in this repo (only
 * Latin/Geist + Vazirmatn are loaded via `next/font/google` for normal
 * page rendering, not available inside an `ImageResponse`), and fetching
 * Vazirmatn from Google Fonts at request time isn't verifiable from this
 * sandbox (network egress is restricted to the allowed-domains list,
 * which doesn't include fonts.gstatic.com). Shipping an `fa` image that
 * silently renders Persian titles as tofu boxes would be worse than the
 * existing static fallback, so `fa` pages keep `/brand/og-image.png`
 * (see each page's `generateMetadata`) until a bundled Vazirmatn subset
 * is added — tracked as follow-up debt, not invented here.
 */
export function buildOgImageUrl({ title, eyebrow }: { title: string; eyebrow?: string }): string {
  const params = new URLSearchParams({ title })
  if (eyebrow) params.set('eyebrow', eyebrow)
  return absoluteUrl(`/api/og?${params.toString()}`)
}
