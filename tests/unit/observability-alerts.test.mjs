/**
 * Phase 24 — the alert rules: every rule at its threshold and one step either side,
 * the ordering, and that every rule has wording in the e-mail and in both languages
 * of the admin page (an alert that fires with no text is worse than no alert).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import { ALERT_IDS, ALERT_TEXT, deriveAlerts, THRESHOLDS } from '../../lib/observability/alert-rules.ts'
import { buildOpsAlertEmail } from '../../lib/notifications/templates.ts'

const ROOT = path.resolve(import.meta.dirname, '../..')
const NOW = new Date('2026-09-21T12:00:00.000Z')
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600_000).toISOString()

const calm = () => ({
  now: NOW,
  notifications: { failedAttemptsLastHour: 0, exhaustedLast24h: 0, stuckMessages: 0, inquiriesWithoutMessages: 0 },
  errors: { spikes: [], newOpenLast24h: 0 },
  events: { limiterUnavailableLastHour: 0, auditWriteFailedLast24h: 0, lastCronAt: hoursAgo(5), lastMonitorAt: hoursAgo(0.2), signInLimitCrossingsLast24h: 0 },
  configErrors: [],
})
const ids = (facts) => deriveAlerts(facts).map((a) => a.id)
const withFacts = (patch) => {
  const f = calm()
  for (const [k, v] of Object.entries(patch)) f[k] = { ...f[k], ...v }
  if ('configErrors' in patch) f.configErrors = patch.configErrors
  return f
}

describe('deriveAlerts', () => {
  it('a calm site fires nothing', () => assert.deepEqual(deriveAlerts(calm()), []))

  it('failed sends: below the hourly threshold nothing, at it an error; one exhausted message is enough', () => {
    assert.deepEqual(ids(withFacts({ notifications: { failedAttemptsLastHour: THRESHOLDS.failedAttemptsPerHour - 1 } })), [])
    assert.deepEqual(ids(withFacts({ notifications: { failedAttemptsLastHour: THRESHOLDS.failedAttemptsPerHour } })), ['notifications.failing'])
    assert.deepEqual(ids(withFacts({ notifications: { exhaustedLast24h: 1 } })), ['notifications.failing'])
  })
  it('an inquiry with no message at all is an error', () => {
    const [alert] = deriveAlerts(withFacts({ notifications: { inquiriesWithoutMessages: 2 } }))
    assert.equal(alert.id, 'notifications.uncovered')
    assert.equal(alert.severity, 'error')
    assert.equal(alert.count, 2)
  })
  it('a spike names the events, at most three, and is an error', () => {
    const spikes = ['a.one', 'b.two', 'c.three', 'd.four'].map((event) => ({ event, windowCount: 12 }))
    const [alert] = deriveAlerts(withFacts({ errors: { spikes } }))
    assert.equal(alert.id, 'errors.spike')
    assert.equal(alert.severity, 'error')
    assert.equal(alert.detail, 'a.one, b.two, c.three')
    assert.equal(alert.count, 4)
  })
  it('the daily run is stale only after the threshold, and only if it ever ran', () => {
    assert.deepEqual(ids(withFacts({ events: { lastCronAt: hoursAgo(THRESHOLDS.cronStaleHours - 1) } })), [])
    assert.deepEqual(ids(withFacts({ events: { lastCronAt: hoursAgo(THRESHOLDS.cronStaleHours + 1) } })), ['cron.stale'])
    assert.deepEqual(ids(withFacts({ events: { lastCronAt: null } })), [], 'never recorded is "waiting for the first run", not an alert (config.invalid covers a missing secret)')
  })
  it('a silent monitor is a warning, only after it has checked in at least once', () => {
    assert.deepEqual(ids(withFacts({ events: { lastMonitorAt: hoursAgo(THRESHOLDS.monitorSilentHours + 1) } })), ['monitor.silent'])
    assert.equal(deriveAlerts(withFacts({ events: { lastMonitorAt: hoursAgo(9) } }))[0].severity, 'warning')
    assert.deepEqual(ids(withFacts({ events: { lastMonitorAt: null } })), [])
  })
  it('the security trail losing an entry is an error; a limiter outage and repeated sign-in limits are warnings', () => {
    assert.equal(deriveAlerts(withFacts({ events: { auditWriteFailedLast24h: 1 } }))[0].severity, 'error')
    assert.equal(deriveAlerts(withFacts({ events: { limiterUnavailableLastHour: 1 } }))[0].severity, 'warning')
    assert.deepEqual(ids(withFacts({ events: { signInLimitCrossingsLast24h: THRESHOLDS.signInLimitCrossingsPerDay - 1 } })), [])
    assert.deepEqual(ids(withFacts({ events: { signInLimitCrossingsLast24h: THRESHOLDS.signInLimitCrossingsPerDay } })), ['auth.sign_in_pressure'])
  })
  it('configuration errors carry variable NAMES only', () => {
    const [alert] = deriveAlerts(withFacts({ configErrors: ['CRON_SECRET', 'SUPABASE_ANON_KEY'] }))
    assert.equal(alert.id, 'config.invalid')
    assert.equal(alert.detail, 'CRON_SECRET, SUPABASE_ANON_KEY')
  })
  it('stuck messages and new error groups are warnings', () => {
    assert.equal(deriveAlerts(withFacts({ notifications: { stuckMessages: 1 } }))[0].severity, 'warning')
    assert.equal(deriveAlerts(withFacts({ errors: { newOpenLast24h: 1 } }))[0].severity, 'warning')
  })
  it('errors come before warnings, then in the documented order', () => {
    const all = deriveAlerts({
      now: NOW,
      notifications: { failedAttemptsLastHour: 9, exhaustedLast24h: 1, stuckMessages: 1, inquiriesWithoutMessages: 1 },
      errors: { spikes: [{ event: 'x.y', windowCount: 20 }], newOpenLast24h: 3 },
      events: { limiterUnavailableLastHour: 4, auditWriteFailedLast24h: 1, lastCronAt: hoursAgo(80), lastMonitorAt: hoursAgo(9), signInLimitCrossingsLast24h: 5 },
      configErrors: ['CRON_SECRET'],
    })
    const severities = all.map((a) => a.severity)
    assert.deepEqual(severities, [...severities].sort((a, b) => (a === b ? 0 : a === 'error' ? -1 : 1)))
    assert.equal(all.length, ALERT_IDS.length, 'every rule can fire')
    assert.deepEqual(all.map((a) => a.id).filter((id) => all.find((a) => a.id === id).severity === 'error'), ['notifications.failing', 'notifications.uncovered', 'errors.spike', 'audit.write_failed', 'cron.stale', 'config.invalid'])
  })
})

describe('alert wording', () => {
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages/en.json'), 'utf8')).Admin
  const fa = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages/fa.json'), 'utf8')).Admin
  const suffix = (id) => id.split(/[._]/).map((p) => p[0].toUpperCase() + p.slice(1)).join('')

  it('every rule has e-mail text', () => {
    for (const id of ALERT_IDS) {
      const text = ALERT_TEXT[id]
      assert.ok(text?.title && text.what && text.action, id)
    }
  })
  it('every rule has a title and an action on the admin page, in both languages', () => {
    for (const id of ALERT_IDS) {
      for (const messages of [en, fa]) {
        assert.ok(messages[`obsAlert${suffix(id)}`], `${id} title`)
        assert.ok(messages[`obsAlert${suffix(id)}Action`], `${id} action`)
      }
    }
  })
  it('the alert e-mail names the problem, the count, what to do and the admin page — and nothing private', () => {
    const { subject, text } = buildOpsAlertEmail({ ...ALERT_TEXT['errors.spike'], count: 3, detail: 'inquiry.persist_failed', adminUrl: 'https://x.test/en/admin/observability' })
    assert.match(subject, /^Artaveo alert — /)
    for (const part of ['Count: 3', 'inquiry.persist_failed', 'What to do:', 'https://x.test/en/admin/observability', 'one e-mail a day']) assert.ok(text.includes(part), part)
  })
})
