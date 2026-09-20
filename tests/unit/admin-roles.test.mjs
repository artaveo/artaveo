/**
 * Admin authorization rules that are pure functions (lib/admin/auth.ts):
 * the role matrix (§ 13: editor = content only, no leads) and the MFA
 * routing truth table (MFA is optional — owner decision, revision 27).
 * The database-backed half (getAdminSession, real sign-in) is in
 * tests/integration/admin-authorization.integration.test.mjs.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { canAccessLeads, canAccessNotifications, mfaDestination, mfaSatisfied } from '../../lib/admin/auth.ts'

const session = (role, current = 'aal1', next = 'aal1') => ({ userId: 'u', email: 'e@x.dev', role, aal: { current, next } })

describe('role matrix', () => {
  it('the owner may see leads and the notification log', () => {
    assert.equal(canAccessLeads(session('owner')), true)
    assert.equal(canAccessNotifications(session('owner')), true)
  })
  it('an editor may not — both areas hold lead data', () => {
    assert.equal(canAccessLeads(session('editor')), false)
    assert.equal(canAccessNotifications(session('editor')), false)
  })
  it('an unknown role gets nothing (fail closed)', () => {
    assert.equal(canAccessLeads(session('viewer')), false)
    assert.equal(canAccessNotifications(session(undefined)), false)
  })
})

describe('MFA routing', () => {
  it('no factor enrolled (aal1 → aal1): satisfied, nobody is forced to enrol', () => {
    for (const role of ['owner', 'editor']) assert.equal(mfaSatisfied(session(role, 'aal1', 'aal1')), true)
  })
  it('a verified factor exists but this session has not used it (aal1 → aal2): NOT satisfied → challenge', () => {
    const s = session('owner', 'aal1', 'aal2')
    assert.equal(mfaSatisfied(s), false)
    assert.equal(mfaDestination(s), 'mfa-challenge')
  })
  it('challenge completed (aal2 → aal2): satisfied', () => {
    assert.equal(mfaSatisfied(session('owner', 'aal2', 'aal2')), true)
  })
  it('the security page is never a forced destination for an unenrolled user', () => {
    assert.equal(mfaSatisfied(session('owner', 'aal1', 'aal1')), true)
    assert.equal(mfaDestination(session('owner', 'aal1', 'aal1')), 'security')
  })
})
