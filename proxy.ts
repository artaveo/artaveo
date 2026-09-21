import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'

import { routing } from '@/i18n/routing'
import { newRequestId, REQUEST_ID_HEADER } from '@/lib/observability/request-id'
import { buildCsp, cspHeaderName, newNonce } from '@/lib/security/csp'
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
export default async function middleware(incoming: NextRequest) {
  const admin = isAdminPath(incoming.nextUrl.pathname)

  // Phase 23 — Content Security Policy, per request (lib/security/csp.ts explains the
  // two variants). The admin's policy carries a nonce, and Next stamps that nonce on
  // its own inline scripts only if it finds the policy on the REQUEST it renders — so
  // for the admin the policy (and the nonce) are written onto the request headers
  // before next-intl sees it, and again onto the response for the browser. Public,
  // prerendered pages get the response header only: no nonce can exist in HTML that
  // was generated before the request.
  const csp = buildCsp({
    mode: admin ? 'admin' : 'public',
    nonce: admin ? newNonce() : undefined,
    dev: process.env.NODE_ENV !== 'production',
    supabaseUrl: process.env.SUPABASE_URL,
    upgradeInsecure: Boolean(process.env.VERCEL),
  })

  // Phase 24 — the correlation id. Always made here, never taken from the caller: the
  // header can be set by anyone, and the id ends up in logs and a uuid column. Written
  // onto the REQUEST (so Server Actions and pages can read it) and the response (so a
  // visitor's error report, or a support message, can quote it).
  const requestId = newRequestId()
  const requestHeaders = new Headers(incoming.headers)
  requestHeaders.set(REQUEST_ID_HEADER, requestId)
  if (admin) requestHeaders.set('content-security-policy', csp)
  const request = new NextRequest(incoming, { headers: requestHeaders })

  const response = intlMiddleware(request)
  response.headers.set(cspHeaderName(), csp)
  response.headers.set(REQUEST_ID_HEADER, requestId)

  if (!admin) {
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
    const redirect = NextResponse.redirect(loginUrl)
    redirect.headers.set(REQUEST_ID_HEADER, requestId)
    return redirect
  }

  return response
}

export const config = {
  // Run on every path except Next.js internals, API routes and files that
  // already have an extension (images, the manifest, favicons, etc.).
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
