import 'server-only'

import { log } from '@/lib/observability/logger'
import { requestIdFrom } from '@/lib/observability/request-id'
import { captureError, type ErrorSource } from '@/lib/observability/store'

/**
 * What `instrumentation.ts`'s `onRequestError` hook hands us: Next.js calls it for
 * every error that escapes a page render, a route handler, a Server Action or the
 * proxy — the errors nobody wrote a `catch` for. This is the site's "unhandled
 * error" record.
 *
 * The shapes are Next's (`OnRequestError`); they are declared here because the
 * hook receives plain objects and the tests should not need Next to build one.
 */
export type RequestInfo = {
  path: string
  method: string
  headers: Record<string, string | string[] | undefined>
}
export type ErrorContext = {
  routerKind?: string
  /** The route PATTERN (`/[locale]/consultation/[token]`), not the concrete path — so it carries no token. */
  routePath?: string
  routeType?: 'render' | 'route' | 'action' | 'middleware' | string
  renderSource?: string
}

const SOURCE: Record<string, ErrorSource> = { render: 'render', route: 'route', action: 'action', middleware: 'server' }

export function sourceOf(routeType: string | undefined): ErrorSource {
  return (routeType && SOURCE[routeType]) || 'server'
}

export async function captureRequestError(err: unknown, request: RequestInfo, context: ErrorContext): Promise<void> {
  try {
    const header = (name: string) => {
      const value = request.headers[name]
      return Array.isArray(value) ? value[0] : value
    }
    const digest = (err as { digest?: unknown } | null)?.digest
    const source = sourceOf(context.routeType)
    await captureError(err, {
      event: `request.${source}_error`,
      source,
      // Only ever the pattern. If Next did not provide one, say so rather than fall back to the raw path.
      route: context.routePath ?? '(unknown route)',
      digest: typeof digest === 'string' ? digest : undefined,
      requestId: requestIdFrom(header),
      fields: { method: request.method, renderSource: context.renderSource, routerKind: context.routerKind },
    })
  } catch (failure) {
    // The hook must never throw: Next would report the failure of the failure.
    log.error('observability.request_error_hook_failed', { err: failure })
  }
}
