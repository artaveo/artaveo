import 'server-only'
import crypto from 'node:crypto'

/**
 * `Authorization: Bearer $CRON_SECRET`, compared in constant time. Fails CLOSED:
 * with no secret configured nothing is authorised (Phase 19 — see the cron route's
 * header for why). Shared by the daily run and the external check
 * (`/api/ops/check`), so the two can never disagree about what "authorised" means.
 */
export function checkCronAuth(request: Request, env: NodeJS.ProcessEnv = process.env): 'ok' | 'not-configured' | 'unauthorized' {
  const secret = env.CRON_SECRET
  if (!secret) return 'not-configured'

  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  if (given.length !== expected.length) return 'unauthorized'
  return crypto.timingSafeEqual(given, expected) ? 'ok' : 'unauthorized'
}
