/**
 * The dependency-advisory gate's policy (scripts/audit-gate.mjs → evaluate), as a
 * pure function: which advisories block a release, which are allowed and why.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { evaluate } from '../../scripts/audit-gate.mjs'

const adv = (id, severity, module = 'pkg') => ({ id: Number(id.replace(/\D/g, '').slice(0, 6)) || 1, github_advisory_id: id, severity, module_name: module, title: `${module} advisory`, patched_versions: '>=9' })
const map = (...list) => Object.fromEntries(list.map((a) => [a.github_advisory_id, a]))
const NOW = new Date('2026-09-20T00:00:00Z')
const entry = (id, over = {}) => ({ id, reason: 'reviewed: not reachable', expires: '2026-12-19', ...over })

describe('what blocks', () => {
  it('a high advisory in the production tree blocks unless allow-listed', () => {
    const a = adv('GHSA-aaaa-1', 'high')
    const result = evaluate({ prod: map(a), all: map(a) }, { entries: [] }, NOW)
    assert.equal(result.ok, false)
    assert.equal(result.blocking[0].why, 'not in the allowlist')
  })
  it('critical blocks in the production tree; moderate and low never do', () => {
    const critical = adv('GHSA-aaaa-2', 'critical')
    const moderate = adv('GHSA-aaaa-3', 'moderate')
    const low = adv('GHSA-aaaa-4', 'low')
    const result = evaluate({ prod: map(critical, moderate, low), all: map(critical, moderate, low) }, { entries: [] }, NOW)
    assert.deepEqual(result.blocking.map((b) => b.id), ['GHSA-aaaa-2'])
    assert.deepEqual(result.informational.map((i) => i.id).sort(), ['GHSA-aaaa-3', 'GHSA-aaaa-4'])
  })
  it('a high advisory that exists only in the development tree does not block; a critical one does', () => {
    const high = adv('GHSA-bbbb-1', 'high')
    const critical = adv('GHSA-bbbb-2', 'critical')
    const result = evaluate({ prod: {}, all: map(high, critical) }, { entries: [] }, NOW)
    assert.deepEqual(result.blocking.map((b) => b.id), ['GHSA-bbbb-2'])
    assert.equal(result.informational[0].tree, 'development')
  })
})

describe('the allowlist', () => {
  const a = adv('GHSA-cccc-1', 'high')
  const run = (entries, now = NOW) => evaluate({ prod: map(a), all: map(a) }, { entries }, now)

  it('an entry with a reason and a future review date lets it through, and is reported as allowed', () => {
    const result = run([entry('GHSA-cccc-1')])
    assert.equal(result.ok, true)
    assert.equal(result.allowed[0].reason, 'reviewed: not reachable')
  })
  it('an expired entry blocks again — the judgement has to be repeated', () => {
    const result = run([entry('GHSA-cccc-1', { expires: '2026-09-01' })])
    assert.equal(result.ok, false)
    assert.match(result.blocking[0].why, /expired on 2026-09-01/)
  })
  it('an entry with no reason, or no date, does not count', () => {
    assert.equal(run([entry('GHSA-cccc-1', { reason: '' })]).ok, false)
    assert.equal(run([entry('GHSA-cccc-1', { expires: undefined })]).ok, false)
  })
  it('the day it expires it is still valid; the day after it is not', () => {
    assert.equal(run([entry('GHSA-cccc-1', { expires: '2026-09-20T23:59:59Z' })]).ok, true)
    assert.equal(run([entry('GHSA-cccc-1', { expires: '2026-09-19' })]).ok, false)
  })
  it('an entry for an advisory that no longer exists is reported stale (and does not fail anything)', () => {
    const result = evaluate({ prod: {}, all: {} }, { entries: [entry('GHSA-gone-1')] }, NOW)
    assert.equal(result.ok, true)
    assert.deepEqual(result.stale, ['GHSA-gone-1'])
  })
  it('an allowlist entry for one advisory never covers another', () => {
    const b = adv('GHSA-cccc-2', 'high')
    const result = evaluate({ prod: map(a, b), all: map(a, b) }, { entries: [entry('GHSA-cccc-1')] }, NOW)
    assert.deepEqual(result.blocking.map((x) => x.id), ['GHSA-cccc-2'])
  })
})
