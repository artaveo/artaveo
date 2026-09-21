/**
 * Runs once when a server instance starts, and receives every unhandled request
 * error (Phase 24).
 *
 * `register()` (Phase 23) prints what is wrong with the security-relevant
 * configuration — names only, never values — so a missing secret shows up in the
 * deployment log at the first request instead of as a silent behaviour ("the daily
 * run never happens"). It does not stop the server: a misconfiguration should be
 * loud, not an outage. The same findings feed the `config.invalid` alert.
 *
 * `onRequestError` is Next.js's hook for errors that escape a render, a route
 * handler, a Server Action or the proxy. It files them in `error_groups` with the
 * request's correlation id and the digest the visitor's error page shows.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const [{ checkSecurityConfig }, { log }] = await Promise.all([import('./lib/security/config-check'), import('./lib/observability/logger')])
  for (const finding of checkSecurityConfig(process.env)) {
    log[finding.severity === 'error' ? 'error' : 'warn']('config.finding', { variable: finding.id, severity: finding.severity, problem: finding.message })
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routerKind?: string; routePath?: string; routeType?: string; renderSource?: string },
) {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { captureRequestError } = await import('./lib/observability/request-error')
  await captureRequestError(err, request, context)
}
