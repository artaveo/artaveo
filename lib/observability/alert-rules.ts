/**
 * The alert rules (Phase 24), as pure functions over a snapshot of facts.
 *
 * WHY STATELESS. An alert here is not a thing that was "raised" and must be
 * "acknowledged": it is a question the data answers every time it is asked —
 * "are three or more messages failing right now?". Ask it again after the cause is
 * fixed and the answer is no; nothing to clear, nothing to get out of sync with
 * the world. What IS remembered is only that an e-mail about it was sent today
 * (the outbox's `dedupe_key`), so one problem is one e-mail a day, not one per
 * check.
 *
 * WHAT MAKES A RULE WORTH HAVING on a site with one owner: it names a failure the
 * owner would otherwise learn about from a client, and the fix is in the owner's
 * hands. Everything below passes that test; the thresholds are engineering
 * judgements about a low-traffic site (recorded in `docs/observability.md`), not
 * measurements, and each one is a named constant so it can be changed in one place.
 *
 * SEVERITY. `error` = something is broken now or a person is waiting: it is
 * e-mailed (once a day per rule) and makes the external check fail. `warning` = look
 * when you can: shown on the admin page and in the check's output, never e-mailed.
 */

export const ALERT_IDS = [
  'notifications.failing',
  'notifications.uncovered',
  'notifications.stuck',
  'errors.spike',
  'errors.new',
  'audit.write_failed',
  'rate_limit.unavailable',
  'cron.stale',
  'backup.failing',
  'backup.stale',
  'backup.restore_failed',
  'monitor.silent',
  'config.invalid',
  'auth.sign_in_pressure',
  'backup.restore_stale',
] as const
export type AlertId = (typeof ALERT_IDS)[number]

export type AlertSeverity = 'error' | 'warning'

export type Alert = {
  id: AlertId
  severity: AlertSeverity
  /** How many of the thing the rule counts (messages, groups, events). 1 for yes/no rules. */
  count: number
  /** Optional plain-text specifics: a variable name, an event name. Already free of private data. */
  detail?: string
}

export const THRESHOLDS = {
  /** Failed send attempts inside one hour that count as "the channel is failing", not "one bad address". */
  failedAttemptsPerHour: 3,
  /** Occurrences of one error inside its one-hour window that count as a spike. */
  errorSpikePerHour: 10,
  /** A message due this long ago is stuck: the daily run alone would have sent it. (24 h + a margin.) */
  stuckMessageHours: 26,
  /** An inquiry younger than this may still be between "saved" and "e-mails queued". */
  uncoveredGraceMinutes: 10,
  /** No completed daily run for this long. (24 h + a margin for a late run.) */
  cronStaleHours: 36,
  /** The external check has checked in at least once and then stopped for this long. */
  monitorSilentHours: 3,
  /** Sign-in limit crossings in a day that mean somebody is knocking, not the owner mistyping. */
  signInLimitCrossingsPerDay: 2,
  /** A completed backup older than this (Phase 25's daily run + a margin) is stale. */
  backupStaleHours: 50,
  /** A verified restore older than this (the weekly restore test + a margin) is stale. */
  restoreTestStaleHours: 24 * 10,
} as const

export type AlertFacts = {
  now: Date
  notifications: {
    failedAttemptsLastHour: number
    exhaustedLast24h: number
    /** Messages waiting (pending or failed) whose due time is more than `stuckMessageHours` ago. */
    stuckMessages: number
    /** Inquiries older than the grace period, from the last 7 days, that have no message in the outbox at all. */
    inquiriesWithoutMessages: number
  }
  errors: {
    /** Open groups whose current one-hour window holds at least `errorSpikePerHour` occurrences. */
    spikes: { event: string; windowCount: number }[]
    /** Open groups first seen in the last 24 hours. */
    newOpenLast24h: number
  }
  events: {
    limiterUnavailableLastHour: number
    auditWriteFailedLast24h: number
    lastCronAt: string | null
    lastMonitorAt: string | null
    signInLimitCrossingsLast24h: number
    /** Most recent `backup.completed` / `backup.failed` event, so a failure that comes after the last success is caught even before staleness would be. */
    lastBackupAt: string | null
    lastBackupFailedAt: string | null
    /** Most recent `backup.restore_verified` / `backup.restore_failed` event (Phase 25's own restore test, not a platform feature). */
    lastRestoreVerifiedAt: string | null
    lastRestoreFailedAt: string | null
  }
  /** Names of security-relevant variables that are missing or malformed, from `checkSecurityConfig`. Names only. */
  configErrors: string[]
}

const HOUR_MS = 60 * 60 * 1000

function hoursSince(iso: string | null, now: Date): number | null {
  if (!iso) return null
  const then = Date.parse(iso)
  return Number.isNaN(then) ? null : (now.getTime() - then) / HOUR_MS
}

/** Every rule that is firing for this snapshot, errors first. */
export function deriveAlerts(facts: AlertFacts): Alert[] {
  const alerts: Alert[] = []
  const { notifications, errors, events, now } = facts

  // A person is waiting: an inquiry arrived and nobody was told.
  if (notifications.inquiriesWithoutMessages > 0) {
    alerts.push({ id: 'notifications.uncovered', severity: 'error', count: notifications.inquiriesWithoutMessages })
  }

  // The e-mail channel itself is failing, or something already failed for good.
  if (notifications.failedAttemptsLastHour >= THRESHOLDS.failedAttemptsPerHour || notifications.exhaustedLast24h > 0) {
    alerts.push({
      id: 'notifications.failing',
      severity: 'error',
      count: Math.max(notifications.failedAttemptsLastHour, notifications.exhaustedLast24h),
    })
  }

  if (errors.spikes.length > 0) {
    alerts.push({
      id: 'errors.spike',
      severity: 'error',
      count: errors.spikes.length,
      detail: errors.spikes
        .slice(0, 3)
        .map((spike) => spike.event)
        .join(', '),
    })
  }

  // The security trail lost an entry: sign-ins and admin changes are not all being recorded.
  if (events.auditWriteFailedLast24h > 0) {
    alerts.push({ id: 'audit.write_failed', severity: 'error', count: events.auditWriteFailedLast24h })
  }

  const cronAge = hoursSince(events.lastCronAt, now)
  if (cronAge !== null && cronAge > THRESHOLDS.cronStaleHours) {
    alerts.push({ id: 'cron.stale', severity: 'error', count: 1, detail: `${Math.floor(cronAge)} h` })
  }

  // The last completed backup attempt failed (fires immediately — a failed first run matters
  // as much as a failed hundredth one, unlike staleness, which needs a prior success to compare to).
  if (events.lastBackupFailedAt !== null && (events.lastBackupAt === null || events.lastBackupFailedAt > events.lastBackupAt)) {
    alerts.push({ id: 'backup.failing', severity: 'error', count: 1 })
  }

  // Same "only if it ever ran" convention as cron.stale: a site that has never backed up yet is
  // an onboarding step (docs/runbooks/backup-restore.md), not a failure to alert on forever.
  const backupAge = hoursSince(events.lastBackupAt, now)
  if (backupAge !== null && backupAge > THRESHOLDS.backupStaleHours) {
    alerts.push({ id: 'backup.stale', severity: 'error', count: 1, detail: `${Math.floor(backupAge)} h` })
  }

  // A backup that cannot be restored is not a backup — this is the one Phase 25 rule that
  // fires on the restore test's own failure, not merely its absence.
  if (events.lastRestoreFailedAt !== null && (events.lastRestoreVerifiedAt === null || events.lastRestoreFailedAt > events.lastRestoreVerifiedAt)) {
    alerts.push({ id: 'backup.restore_failed', severity: 'error', count: 1 })
  }

  if (facts.configErrors.length > 0) {
    alerts.push({ id: 'config.invalid', severity: 'error', count: facts.configErrors.length, detail: facts.configErrors.join(', ') })
  }

  // ---- warnings ----------------------------------------------------------------------------

  if (notifications.stuckMessages > 0) {
    alerts.push({ id: 'notifications.stuck', severity: 'warning', count: notifications.stuckMessages })
  }
  if (errors.newOpenLast24h > 0) {
    alerts.push({ id: 'errors.new', severity: 'warning', count: errors.newOpenLast24h })
  }
  if (events.limiterUnavailableLastHour > 0) {
    alerts.push({ id: 'rate_limit.unavailable', severity: 'warning', count: events.limiterUnavailableLastHour })
  }
  const monitorAge = hoursSince(events.lastMonitorAt, now)
  if (monitorAge !== null && monitorAge > THRESHOLDS.monitorSilentHours) {
    alerts.push({ id: 'monitor.silent', severity: 'warning', count: 1, detail: `${Math.floor(monitorAge)} h` })
  }
  if (events.signInLimitCrossingsLast24h >= THRESHOLDS.signInLimitCrossingsPerDay) {
    alerts.push({ id: 'auth.sign_in_pressure', severity: 'warning', count: events.signInLimitCrossingsLast24h })
  }
  const restoreAge = hoursSince(events.lastRestoreVerifiedAt, now)
  if (restoreAge !== null && restoreAge > THRESHOLDS.restoreTestStaleHours) {
    alerts.push({ id: 'backup.restore_stale', severity: 'warning', count: 1, detail: `${Math.floor(restoreAge / 24)} d` })
  }

  const rank = (alert: Alert) => (alert.severity === 'error' ? 0 : 1)
  return alerts.sort((a, b) => rank(a) - rank(b) || ALERT_IDS.indexOf(a.id) - ALERT_IDS.indexOf(b.id))
}

/** English wording for the e-mail and the check's JSON output. (The admin page has its own translated copy.) */
export const ALERT_TEXT: Record<AlertId, { title: string; what: string; action: string }> = {
  'notifications.uncovered': {
    title: 'An inquiry arrived and no e-mail was queued for it',
    what: 'At least one recent brief was saved but has no notification at all, so nobody was told about it.',
    action: 'Open Leads and read the newest briefs; then check Notifications.',
  },
  'notifications.failing': {
    title: 'E-mail messages are failing',
    what: 'Several send attempts failed within the last hour, or a message failed for good in the last day.',
    action: 'Open Notifications, read the last error on a failed message, fix the cause (provider, key, sender domain) and press Retry.',
  },
  'errors.spike': {
    title: 'The same error is repeating',
    what: 'One error occurred ten or more times within an hour.',
    action: 'Open Observability, find the group with the highest count and use its request reference to read the log line.',
  },
  'audit.write_failed': {
    title: 'The audit log is missing entries',
    what: 'A sign-in or an admin change could not be written to the audit log.',
    action: 'Check that the database is reachable and migration 0008 is applied; the log lines named audit.write_failed have the cause.',
  },
  'cron.stale': {
    title: 'The daily run has not completed',
    what: 'Retries, scheduled publishing and clean-up run once a day; the last completed run is over 36 hours old.',
    action: 'Check that CRON_SECRET is set in Vercel (16+ characters) and that the deployment is the current one; see the notifications runbook.',
  },
  'config.invalid': {
    title: 'The deployment is missing required settings',
    what: 'A security-relevant environment variable is missing or too weak.',
    action: 'Set the named variables in the Vercel project settings and redeploy (docs/security.md, section 6).',
  },
  'notifications.stuck': {
    title: 'Messages are waiting longer than a day',
    what: 'Some messages were due more than 26 hours ago and are still unsent.',
    action: 'Open Notifications and press "Send due messages now"; if they stay, look at the last error.',
  },
  'errors.new': {
    title: 'New errors in the last day',
    what: 'At least one error that had not been seen before appeared.',
    action: 'Open Observability and read the newest groups; mark them resolved or ignored once understood.',
  },
  'rate_limit.unavailable': {
    title: 'The rate limiter is not answering',
    what: 'Requests are being allowed without being counted (the limiter fails open by design).',
    action: 'Check the database and that migration 0020 is applied; older per-record limits still apply meanwhile.',
  },
  'monitor.silent': {
    title: 'The external check has stopped checking in',
    what: 'The scheduled uptime check used to call the site and has not for several hours.',
    action: 'Open the repository’s Actions tab: scheduled workflows are switched off after 60 days without repository activity and must be re-enabled.',
  },
  'auth.sign_in_pressure': {
    title: 'Repeated sign-in limit crossings',
    what: 'The admin sign-in limit was crossed more than once today.',
    action: 'Check Audit log entries named admin.sign_in_rate_limited; if it is not you, consider enabling MFA and Vercel’s Attack Challenge Mode.',
  },
  'backup.failing': {
    title: 'The last backup failed',
    what: 'The daily backup workflow ran and did not complete successfully.',
    action: 'Open the "Backup" workflow in the repository’s Actions tab, read the failed step, and re-run it; docs/runbooks/backup-restore.md has the recovery steps if it keeps failing.',
  },
  'backup.stale': {
    title: 'No backup has completed recently',
    what: 'Backups run once a day; the last completed one is older than the daily schedule plus a margin.',
    action: 'Check that the "Backup" workflow is scheduled and enabled in the repository’s Actions tab (GitHub disables a schedule after 60 days with no repository activity).',
  },
  'backup.restore_failed': {
    title: 'The last restore test failed',
    what: 'A backup exists, but restoring it into a throw-away database did not reproduce the data — the backup may not be usable.',
    action: 'Open the "Backup" workflow’s restore-test job and read the failed step; docs/runbooks/backup-restore.md § Restore has the manual procedure to try in the meantime.',
  },
  'backup.restore_stale': {
    title: 'No restore has been verified recently',
    what: 'The restore test runs weekly; the last one that actually restored and checked the data is older than that plus a margin.',
    action: 'Open the "Backup" workflow in the repository’s Actions tab and check that its weekly restore-test job is running.',
  },
}
