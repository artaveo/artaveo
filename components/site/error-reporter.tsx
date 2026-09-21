'use client'

import { useEffect } from 'react'

/**
 * Tells the site about errors only the browser can see (Phase 24). The server
 * records its own errors (`instrumentation.ts`); a JavaScript exception in an event
 * handler on somebody's phone, a failed hydration, an unhandled promise rejection
 * in the Brief Builder — nobody else will ever hear about those.
 *
 * Deliberately small and defensive: at most three reports per page load, the same
 * message never twice, browser-extension and cross-origin noise dropped, every
 * field length-capped before it leaves, and it can never itself throw or block. The
 * endpoint (`/api/observe/client-error`) validates and scrubs again — this is
 * politeness, not the control.
 */

type Kind = 'boundary' | 'window' | 'rejection'

const ENDPOINT = '/api/observe/client-error'
const MAX_REPORTS_PER_PAGE = 3

const seen = new Set<string>()
let sent = 0

/** Errors that are not the site's: extensions, and cross-origin scripts the browser hides ("Script error."). */
function isNoise(message: string, source?: string): boolean {
  if (source && /^(chrome|moz|safari|safari-web)-extension:/i.test(source)) return true
  return message === 'Script error.' || /ResizeObserver loop/i.test(message) || message.length === 0
}

export function reportClientError(input: { error: unknown; kind: Kind; digest?: string; source?: string }): void {
  try {
    const err = input.error
    const message = (err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error').slice(0, 300)
    if (isNoise(message, input.source)) return
    const key = `${input.kind}:${message}`
    if (seen.has(key) || sent >= MAX_REPORTS_PER_PAGE) return
    seen.add(key)
    sent += 1

    const body = JSON.stringify({
      message,
      name: err instanceof Error ? err.name : 'Error',
      stack: err instanceof Error ? err.stack?.slice(0, 2000) : undefined,
      path: window.location.pathname,
      digest: input.digest,
      kind: input.kind,
    })
    const blob = new Blob([body], { type: 'application/json' })
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(ENDPOINT, blob)) return
    void fetch(ENDPOINT, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => undefined)
  } catch {
    // Reporting must never be the second error.
  }
}

export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => reportClientError({ error: event.error ?? event.message, kind: 'window', source: event.filename })
    const onRejection = (event: PromiseRejectionEvent) => reportClientError({ error: event.reason, kind: 'rejection' })
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
