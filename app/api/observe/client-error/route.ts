import { runWithRequestId } from '@/lib/observability/context'
import { readJsonBody } from '@/lib/observability/read-body'
import { newRequestId } from '@/lib/observability/request-id'
import { parseClientErrorReport } from '@/lib/observability/reports'
import { captureError } from '@/lib/observability/store'
import { checkRateLimit } from '@/lib/security/rate-limit'

/**
 * Where the site's own pages report an error in their JavaScript (Phase 24): the
 * error boundary, `window.onerror`, unhandled promise rejections
 * (`components/site/error-reporter.tsx`). Server errors do not come here — the
 * server sees those itself (`instrumentation.ts`); this is for what only the
 * browser can see, above all the Brief Builder failing on somebody's phone.
 *
 * Same discipline as the CSP endpoint: rate-limited (`observe.client-error`), 8 KB
 * cap, validated, scrubbed (an e-mail address in a message becomes `[email]`, a
 * private-link token in the path becomes `[token]`), an empty 204 whatever
 * happens, stored with source `client` — which never raises an alert, because
 * anyone can post here.
 */
export const dynamic = 'force-dynamic'

const NO_CONTENT = () => new Response(null, { status: 204 })

export function POST(request: Request) {
  return runWithRequestId(newRequestId(), async () => {
    const limited = await checkRateLimit('observe.client-error')
    if (!limited.ok) return NO_CONTENT()

    const report = parseClientErrorReport(await readJsonBody(request))
    if (!report) return NO_CONTENT()

    const error = new Error(report.message)
    error.name = report.name
    if (report.stack) error.stack = report.stack
    await captureError(error, {
      event: 'client.error',
      source: 'client',
      level: 'warn',
      route: report.path,
      digest: report.digest ?? undefined,
      fields: { kind: report.kind },
    })
    return NO_CONTENT()
  })
}

export function GET() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } })
}
