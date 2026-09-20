/**
 * The browser-side outbox for one pending Brief Builder submission
 * (lib/inquiry-offline-queue.ts, § 10.3), against a fake `window.localStorage`.
 */
import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { clearQueuedInquiry, readQueuedInquiry, writeQueuedInquiry } from '../../lib/inquiry-offline-queue.ts'

const KEY = 'artaveo:pending-inquiry'
let store
const install = (overrides = {}) => {
  store = new Map()
  globalThis.window = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => void store.set(k, String(v)),
      removeItem: (k) => void store.delete(k),
      ...overrides,
    },
  }
}
const draft = { goal: 'Rebuild our booking system', email: 'a@b.co' }
const meta = { idempotencyKey: 'key-1', honeypot: '', formRenderedAt: 1 }

beforeEach(() => install())
afterEach(() => void delete globalThis.window)

describe('offline outbox', () => {
  it('nothing queued → null', () => assert.equal(readQueuedInquiry(), null))
  it('write then read returns the same draft and meta, with a timestamp', () => {
    const before = Date.now()
    writeQueuedInquiry(draft, meta)
    const queued = readQueuedInquiry()
    assert.deepEqual(queued.draft, draft)
    assert.deepEqual(queued.meta, meta)
    assert.ok(queued.queuedAt >= before && queued.queuedAt <= Date.now())
  })
  it('is one slot: a second write replaces the first', () => {
    writeQueuedInquiry(draft, meta)
    writeQueuedInquiry({ ...draft, goal: 'Second' }, { ...meta, idempotencyKey: 'key-2' })
    assert.equal(readQueuedInquiry().meta.idempotencyKey, 'key-2')
  })
  it('clear removes it', () => {
    writeQueuedInquiry(draft, meta)
    clearQueuedInquiry()
    assert.equal(readQueuedInquiry(), null)
  })
  it('a corrupt entry reads as "nothing queued" instead of throwing', () => {
    for (const bad of ['{not json', '"a string"', '42', 'null', '{}', JSON.stringify({ draft: {}, meta: {} }), JSON.stringify({ draft: null, meta: { idempotencyKey: 'x' } })]) {
      store.set(KEY, bad)
      assert.equal(readQueuedInquiry(), null, bad)
    }
  })
  it('the idempotency key is required, so a replayed retry can never double-insert', () => {
    store.set(KEY, JSON.stringify({ draft: {}, meta: { honeypot: '' }, queuedAt: 1 }))
    assert.equal(readQueuedInquiry(), null)
  })
  it('storage that throws (disabled, quota) never breaks the form', () => {
    install({
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('quota') },
      removeItem: () => { throw new Error('denied') },
    })
    assert.doesNotThrow(() => writeQueuedInquiry(draft, meta))
    assert.equal(readQueuedInquiry(), null)
    assert.doesNotThrow(() => clearQueuedInquiry())
  })
  it('on the server (no window) every call is a safe no-op', () => {
    delete globalThis.window
    assert.equal(readQueuedInquiry(), null)
    assert.doesNotThrow(() => (writeQueuedInquiry(draft, meta), clearQueuedInquiry()))
  })
})
