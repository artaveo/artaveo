/**
 * Runs once when a server instance starts (Phase 23). Prints what is wrong with
 * the security-relevant configuration — names only, never values — so a missing
 * secret shows up in the deployment log at the first request instead of as a
 * silent behaviour ("the daily run never happens"). It does not stop the server:
 * a misconfiguration should be loud, not an outage.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { checkSecurityConfig } = await import('./lib/security/config-check')
  for (const finding of checkSecurityConfig(process.env)) {
    const line = `[security-config] ${finding.id} ${finding.message}`
    if (finding.severity === 'error') console.error(line)
    else console.warn(line)
  }
}
