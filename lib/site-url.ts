/**
 * The site's absolute origin — split out of `lib/seo.ts` in Phase 19 so
 * server code that only needs a link (notification e-mails) does not have to
 * import the routing/OG modules `lib/seo.ts` pulls in. `lib/seo.ts`
 * re-exports both names unchanged, so every existing import keeps working.
 *
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

