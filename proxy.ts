import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { routing } from '@/i18n/routing'
import { refreshSupabaseSession } from '@/lib/supabase/middleware'

const intlMiddleware = createMiddleware(routing)

/** e.g. `/en/admin/security` → `/admin/security`. Bare `/admin` has no locale segment and 404s under `localePrefix: 'always'`, so this is safe to assume. */
function stripLocale(pathname: string): string {
  return pathname.replace(/^\/(en|fa)(?=\/|$)/, '') || '/'
}

const ADMIN_LOGIN_PATH = '/admin/login'

function isAdminPath(pathname: string): boolean {
  const path = stripLocale(pathname)
  return path === '/admin' || path.startsWith('/admin/')
}

/**
 * Roadmap § 13 — "protected `/[locale]/admin` routes … no reliance on
 * hidden routes". This is the cheap, edge-runtime half of the guard: it
 * only checks "is there *any* authenticated Supabase user" and redirects
 * straight to `/admin/login` otherwise, for every `/admin/*` path except
 * the login page itself (`/admin/mfa-challenge` and `/admin/security`
 * both still require a session — a partially-authenticated user, not an
 * anonymous one). The authoritative check — is this user actually
 * provisioned as an admin, which role, has MFA been satisfied this
 * session — reads the `admin_users` table and belongs server-side in
 * `lib/admin/auth.ts`, run again independently by the protected layout
 * and by every admin Server Action, not here: a Postgres round-trip on
 * every edge request for every route is unnecessary cost this cheaper
 * check already avoids paying.
 */
export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request)

  if (!isAdminPath(request.nextUrl.pathname)) {
    return response
  }

  const { configured, userId } = await refreshSupabaseSession(request, response)
  const path = stripLocale(request.nextUrl.pathname)

  if (path === ADMIN_LOGIN_PATH) {
    return response
  }

  if (!configured || !userId) {
    const localeMatch = request.nextUrl.pathname.match(/^\/(en|fa)(?=\/|$)/)
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale
    const loginUrl = new URL(`/${locale}${ADMIN_LOGIN_PATH}`, request.url)
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  // Run on every path except Next.js internals, API routes and files that
  // already have an extension (images, the manifest, favicons, etc.).
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
