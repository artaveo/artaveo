/**
 * Is the deployment configured the way the security model assumes? (Phase 23 —
 * the secret inventory, made executable.) Pure: takes an environment, returns
 * findings. It never returns or logs a VALUE — only which variable and what is
 * wrong with it. `instrumentation.ts` prints the findings once when the server
 * starts; `docs/security.md` lists what each variable is for and how to rotate it.
 */

export type ConfigFinding = { id: string; severity: 'error' | 'warning'; message: string }

type Env = Record<string, string | undefined>

const MIN_SECRET_LENGTH = 16

export function checkSecurityConfig(env: Env): ConfigFinding[] {
  const findings: ConfigFinding[] = []
  const production = env.VERCEL_ENV === 'production' || (env.NODE_ENV === 'production' && env.VERCEL === undefined && Boolean(env.SUPABASE_URL))
  if (!production) return findings

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    findings.push({ id: 'SUPABASE_SERVICE_ROLE_KEY', severity: 'error', message: 'is not set: every database read and write is unavailable.' })
  }
  if (!env.SUPABASE_ANON_KEY) {
    findings.push({ id: 'SUPABASE_ANON_KEY', severity: 'error', message: 'is not set: admin sign-in cannot work.' })
  }
  if (!env.CRON_SECRET || env.CRON_SECRET.length < MIN_SECRET_LENGTH) {
    findings.push({
      id: 'CRON_SECRET',
      severity: 'error',
      message: `is missing or shorter than ${MIN_SECRET_LENGTH} characters: the daily run (retries, scheduled publishing, clean-up) refuses to run.`,
    })
  }
  if (!env.INQUIRY_IP_HASH_SECRET) {
    findings.push({
      id: 'INQUIRY_IP_HASH_SECRET',
      severity: 'warning',
      message: 'is not set: hashes and rate-limit keys are salted with a key derived from the service-role key instead. Set your own random value to make them independent of it.',
    })
  } else if (env.INQUIRY_IP_HASH_SECRET.length < MIN_SECRET_LENGTH) {
    findings.push({ id: 'INQUIRY_IP_HASH_SECRET', severity: 'warning', message: `is shorter than ${MIN_SECRET_LENGTH} characters.` })
  }
  if (env.EMAIL_PROVIDER === 'resend' && (!env.RESEND_API_KEY || !env.EMAIL_FROM_ADDRESS)) {
    findings.push({ id: 'EMAIL_PROVIDER', severity: 'warning', message: 'is "resend" but RESEND_API_KEY or EMAIL_FROM_ADDRESS is missing: e-mail falls back to the log-only provider.' })
  }
  if (env.CSP_REPORT_ONLY === '1') {
    findings.push({ id: 'CSP_REPORT_ONLY', severity: 'warning', message: 'is set: the Content Security Policy only reports, it does not block. Remove it once the cause is fixed.' })
  }
  return findings
}
