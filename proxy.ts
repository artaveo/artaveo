import createMiddleware from 'next-intl/middleware'

import { routing } from '@/i18n/routing'

/**
 * Negotiates the locale on first visit (Accept-Language header) and
 * respects a stored choice afterwards via the `artaveo-locale` cookie
 * (roadmap § 5.1: "middleware negotiates the locale on first visit and
 * respects a stored choice").
 */
export default createMiddleware(routing)

export const config = {
  // Run on every path except Next.js internals, API routes and files that
  // already have an extension (images, the manifest, favicons, etc.).
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
