import type { NextRequest, NextResponse } from 'next/server'

import { getNeonAuth } from './server'

/**
 * The cheap half of the admin guard, for `proxy.ts` (roadmap § 13): is there a
 * live Neon Auth session on this request? Runs the SDK's own middleware —
 * which validates the session and refreshes its cookies when they are due —
 * but keeps the DECISION in `proxy.ts`, which owns the locale-aware login
 * redirect, the CSP and the request id. `setCookies` are the cookies the SDK
 * wants written (a refreshed session, or a stale one cleared); `proxy.ts`
 * copies them onto whichever response it returns, so a session is refreshed
 * transparently instead of silently dying at expiry.
 *
 * `configured: false` when Neon Auth is not configured, so `proxy.ts` decides
 * how to treat that case explicitly.
 */
export async function checkAdminAuthSession(
  request: NextRequest,
  loginUrl: URL,
): Promise<{ configured: boolean; signedIn: boolean; setCookies: string[] }> {
  const auth = getNeonAuth()
  if (!auth) return { configured: false, signedIn: false, setCookies: [] }

  const result = await auth.middleware({ loginUrl: loginUrl.toString() })(request)

  const location = result.headers.get('location')
  const sentToLogin =
    result.status >= 300 && result.status < 400 && location !== null && new URL(location, request.url).pathname === loginUrl.pathname
  return { configured: true, signedIn: !sentToLogin, setCookies: result.headers.getSetCookie() }
}

/**
 * Writes `setCookies` onto the response for the browser AND onto the request
 * the page renders with.
 *
 * The second half matters: a Server Component cannot set cookies, so if the
 * page's own `getSession()` found a stale session cache it would ask the auth
 * service, and a refreshed cookie in that answer would throw mid-render. With
 * the fresh cookies already on the request, the page finds a valid cache and
 * never has to. Next carries request-header overrides from the proxy as
 * `x-middleware-override-headers` (the full list of request header names) plus
 * one `x-middleware-request-<name>` per header — the encoding
 * `NextResponse.next({ request: { headers } })` produces, which next-intl
 * already used to build `response`.
 */
export function applyAuthCookies(request: NextRequest, response: NextResponse, setCookies: string[]): void {
  if (setCookies.length === 0) return

  const jar = new Map<string, string>()
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const index = part.indexOf('=')
    if (index > 0) jar.set(part.slice(0, index).trim(), part.slice(index + 1).trim())
  }

  for (const cookie of setCookies) {
    response.headers.append('Set-Cookie', cookie)
    const [pair, ...attributes] = cookie.split(';')
    const index = pair.indexOf('=')
    if (index <= 0) continue
    const name = pair.slice(0, index).trim()
    const deleted = attributes.some((attribute) => /^\s*max-age\s*=\s*0\s*$/i.test(attribute))
    if (deleted) jar.delete(name)
    else jar.set(name, pair.slice(index + 1).trim())
  }

  const cookieHeader = [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
  const listed = response.headers.get('x-middleware-override-headers')
  const names = listed ? listed.split(',').filter(Boolean) : [...request.headers.keys()]
  if (!listed) {
    for (const [name, value] of request.headers) response.headers.set(`x-middleware-request-${name}`, value)
  }
  if (!names.includes('cookie')) names.push('cookie')
  response.headers.set('x-middleware-override-headers', names.join(','))
  response.headers.set('x-middleware-request-cookie', cookieHeader)
}
