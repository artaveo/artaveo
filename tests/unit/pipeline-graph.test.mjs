/**
 * The lead-pipeline stage graph as data (types/pipeline.ts). Its agreement
 * with the database trigger is checked exhaustively — all 81 pairs — in the
 * integration suite (tests/integration/pipeline.integration.test.mjs).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { ALLOWED_STAGE_TRANSITIONS, PRIORITY_ORDER, STAGE_ORDER, emptyPipelineFilters } from '../../types/pipeline.ts'
import { computeSlaFromFirstResponse, isOwnerAction } from '../../lib/admin/pipeline.ts'

describe('stage graph', () => {
  it('STAGE_ORDER lists nine distinct stages and the map has exactly those keys', () => {
    assert.equal(new Set(STAGE_ORDER).size, 9)
    assert.deepEqual(Object.keys(ALLOWED_STAGE_TRANSITIONS).sort(), [...STAGE_ORDER].sort())
  })
  it('every target is a known stage and nothing transitions to itself', () => {
    for (const [from, targets] of Object.entries(ALLOWED_STAGE_TRANSITIONS)) {
      assert.ok(!targets.includes(from), `${from} → ${from}`)
      for (const target of targets) assert.ok(STAGE_ORDER.includes(target), `${from} → ${target}`)
    }
  })
  it('"archived" is terminal; "won" and "lost" can only be archived', () => {
    assert.deepEqual(ALLOWED_STAGE_TRANSITIONS.archived, [])
    assert.deepEqual(ALLOWED_STAGE_TRANSITIONS.won, ['archived'])
    assert.deepEqual(ALLOWED_STAGE_TRANSITIONS.lost, ['archived'])
  })
  it('every open stage can be marked lost, and only forward moves exist', () => {
    const open = ['new', 'reviewed', 'qualified', 'contacted', 'discovery', 'proposal']
    for (const stage of open) assert.ok(ALLOWED_STAGE_TRANSITIONS[stage].includes('lost'), stage)
    const index = (s) => STAGE_ORDER.indexOf(s)
    for (const [from, targets] of Object.entries(ALLOWED_STAGE_TRANSITIONS)) {
      for (const to of targets) assert.ok(index(to) > index(from), `${from} → ${to} goes backwards`)
    }
  })
  it('from "new" the whole pipeline is reachable', () => {
    const seen = new Set(['new'])
    const queue = ['new']
    while (queue.length) {
      for (const next of ALLOWED_STAGE_TRANSITIONS[queue.shift()]) {
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
      }
    }
    assert.equal(seen.size, STAGE_ORDER.length)
  })
})

describe('small pipeline values', () => {
  it('priorities are ordered low → high', () => assert.deepEqual(PRIORITY_ORDER, ['low', 'normal', 'high']))
  it('default filters start on page 1 with 20 rows', () => assert.deepEqual(emptyPipelineFilters(), { page: 1, pageSize: 20 }))
})

describe('SLA ("same day", in the site time zone)', () => {
  it('no response yet → nothing to judge', () => {
    assert.deepEqual(computeSlaFromFirstResponse('2026-09-10T08:00:00Z', null, 'UTC'), { firstResponseAt: null, metSameDay: null })
  })
  it('same calendar day → met; next day → not met', () => {
    assert.equal(computeSlaFromFirstResponse('2026-09-10T08:00:00Z', '2026-09-10T20:00:00Z', 'UTC').metSameDay, true)
    assert.equal(computeSlaFromFirstResponse('2026-09-10T08:00:00Z', '2026-09-11T00:30:00Z', 'UTC').metSameDay, false)
  })
  it('the day is judged in the configured zone, not UTC', () => {
    // 19:00Z and 20:00Z are the same day in UTC, but 23:30 and 00:30 (next day) in Kabul (UTC+4:30).
    assert.equal(computeSlaFromFirstResponse('2026-09-10T19:00:00Z', '2026-09-10T20:00:00Z', 'UTC').metSameDay, true)
    assert.equal(computeSlaFromFirstResponse('2026-09-10T19:00:00Z', '2026-09-10T20:00:00Z', 'Asia/Kabul').metSameDay, false)
  })
  it('an empty zone falls back to UTC instead of throwing', () => {
    assert.equal(computeSlaFromFirstResponse('2026-09-10T08:00:00Z', '2026-09-10T09:00:00Z', '').metSameDay, true)
  })
  it('only a person other than the system or the client counts as responding', () => {
    assert.equal(isOwnerAction({ type: 'stage-changed', actor: '00000000-0000-4000-8000-0000000000a1' }), true)
    assert.equal(isOwnerAction({ type: 'created', actor: 'system' }), false)
    assert.equal(isOwnerAction({ type: 'consultation-requested', actor: 'system' }), false)
    assert.equal(isOwnerAction({ type: 'consultation-cancelled', actor: 'client' }), false)
    assert.equal(isOwnerAction({ type: 'created', actor: 'someone' }), false)
  })
})
