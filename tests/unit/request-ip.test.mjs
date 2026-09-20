/**
 * Client IP + one-way hash (lib/request-ip.ts) — the value the per-IP rate
 * limit compares. The raw address must never be what is stored.
 */
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import { resetRequest } from '../support/next-runtime.mjs'
import { getClientIp, hashIp } from '../../lib/request-ip.ts'

afterEach(() => resetRequest())

describe('getClientIp', () => {
  it('takes the FIRST hop of x-forwarded-for, trimmed', async () => {
    resetRequest({ 'x-forwarded-for': ' 203.0.113.7 , 10.0.0.1, 10.0.0.2' })
    assert.equal(await getClientIp(), '203.0.113.7')
  })
  it('falls back to x-real-ip, then to a fixed placeholder', async () => {
    resetRequest({ 'x-real-ip': '198.51.100.2' })
    assert.equal(await getClientIp(), '198.51.100.2')
    resetRequest({})
    assert.equal(await getClientIp(), '0.0.0.0')
  })
})

describe('hashIp', () => {
  it('is deterministic, hex, 64 chars, and does not contain the address', () => {
    const h = hashIp('203.0.113.7')
    assert.equal(h, hashIp('203.0.113.7'))
    assert.match(h, /^[0-9a-f]{64}$/)
    assert.ok(!h.includes('203'))
  })
  it('different addresses hash differently', () => assert.notEqual(hashIp('203.0.113.7'), hashIp('203.0.113.8')))
  it('the secret salts it: another secret gives another hash', () => {
    const before = process.env.INQUIRY_IP_HASH_SECRET
    process.env.INQUIRY_IP_HASH_SECRET = 'one'
    const a = hashIp('203.0.113.7')
    process.env.INQUIRY_IP_HASH_SECRET = 'two'
    const b = hashIp('203.0.113.7')
    if (before === undefined) delete process.env.INQUIRY_IP_HASH_SECRET
    else process.env.INQUIRY_IP_HASH_SECRET = before
    assert.notEqual(a, b)
  })
})
