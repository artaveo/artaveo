/**
 * D-14: when a recommender's e-mail address must be gone
 * (lib/recommendation-privacy.ts → shouldClearRecipient, pure).
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { shouldClearRecipient } from '../../lib/recommendation-privacy.ts'

const NOW = new Date('2026-09-20T12:00:00Z')
const row = (extra = {}) => ({
  id: 'r', recipient_email: 'rec@example.com', revoked_at: null, expires_at: null,
  used_at: null, recommendation_id: null, recommendations: null, ...extra,
})

describe('shouldClearRecipient', () => {
  it('nothing to clear when there is no address', () => assert.equal(shouldClearRecipient(row({ recipient_email: null, revoked_at: 'x' }), NOW), false))
  it('a live, unused, unexpired request keeps its address (it still has to send the link)', () => {
    assert.equal(shouldClearRecipient(row({ expires_at: '2026-10-01T00:00:00Z' }), NOW), false)
    assert.equal(shouldClearRecipient(row(), NOW), false, 'no expiry, never used: kept until revoked (disclosed in the privacy policy)')
  })
  it('revoked → clear', () => assert.equal(shouldClearRecipient(row({ revoked_at: '2026-09-19T00:00:00Z' }), NOW), true))
  it('the recommendation was approved or rejected → clear (object or array embed)', () => {
    for (const status of ['approved', 'rejected']) {
      assert.equal(shouldClearRecipient(row({ used_at: 't', recommendation_id: 'x', recommendations: { status } }), NOW), true, status)
      assert.equal(shouldClearRecipient(row({ used_at: 't', recommendation_id: 'x', recommendations: [{ status }] }), NOW), true, `${status} (array)`)
    }
  })
  it('still being moderated (pending / changes-requested) → keep: the changes e-mail needs it', () => {
    for (const status of ['pending', 'changes-requested']) {
      assert.equal(shouldClearRecipient(row({ used_at: 't', recommendation_id: 'x', recommendations: { status } }), NOW), false, status)
    }
  })
  it('used but its recommendation was deleted → clear', () => assert.equal(shouldClearRecipient(row({ used_at: 't', recommendation_id: null }), NOW), true))
  it('expired without ever being used → clear; expired but used → judged by the recommendation', () => {
    assert.equal(shouldClearRecipient(row({ expires_at: '2026-09-01T00:00:00Z' }), NOW), true)
    assert.equal(shouldClearRecipient(row({ expires_at: '2026-09-01T00:00:00Z', used_at: 't', recommendation_id: 'x', recommendations: { status: 'pending' } }), NOW), false)
  })
})
