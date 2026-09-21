import { runWithRequestId } from '@/lib/observability/context'
import { readJsonBody } from '@/lib/observability/read-body'
import { newRequestId } from '@/lib/observability/request-id'
import { cspMessage, parseCspReports } from '@/lib/observability/reports'
import { captureError } from '@/lib/observability/store'
import { checkRateLimit } from '@/lib/security/rate-limit'

/**
 * Where browsers send Content Security Policy violation reports (Phase 24) — the
 * endpoint Phase 23 deferred. The policy has never been seen against real
 * production content; this is how the owner finds out what it blocks without
 * opening the browser console on every page.
 *
 * OPEN TO THE INTERNET, so: rate-limited per address and overall
 * (`observe.csp`), body capped at 8 KB, every field validated and reduced
 * (`lib/observability/reports.ts` — an origin or a keyword, a path without private
 * tokens), reports about the visitor's own browser extensions dropped, and the answer
 * is always an empty 204 so it reveals nothing and cannot be probed. What it stores
 * lands in `error_groups` with source `csp`, which never raises an alert — a forged
 * report can make noise on the admin page, not wake the owner.
 */
export const dynamic = 'force-dynamic'

const NO_CONTENT = () => new Response(null, { status: 204 })

export function POST(request: Request) {
  return runWithRequestId(newRequestId(), async () => {
    const limited = await checkRateLimit('observe.csp')
    if (!limited.ok) return NO_CONTENT()

    const body = await readJsonBody(request)
    if (body === undefined) return NO_CONTENT()

    for (const report of parseCspReports(body)) {
      const violation = new Error(cspMessage(report))
      violation.name = 'CspViolation'
      await captureError(violation, { event: 'csp.violation', source: 'csp', level: 'warn', route: report.page, fields: { directive: report.directive, blocked: report.blocked, disposition: report.disposition } })
    }
    return NO_CONTENT()
  })
}

/** Anything but POST: nothing here, and no hint that a form of it exists. */
export function GET() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } })
}
