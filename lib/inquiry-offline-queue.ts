import type { InquiryDraft, InquirySubmissionMeta } from '@/types/inquiry'

/**
 * Browser-side outbox for a single pending Brief Builder submission
 * (roadmap § 10.3 — "queue the payload locally and retry automatically
 * once back online (browser-side outbox, same idea as the server-side
 * outbox in Phase 19)").
 *
 * One slot, not a real queue: this form has one submission at a time per
 * visitor, so there's nothing to gain from a list, and a single
 * `localStorage` key keeps this trivially simple to reason about. If two
 * different browser tabs each queue a submission while offline, the
 * second write wins — an acceptable limitation for a low-volume contact
 * form (not fixed here; noted in docs/phases/PHASE-10.3-README.md).
 *
 * `localStorage`, not IndexedDB or the Background Sync API: the payload
 * is small, plain JSON, and only needs to survive a reload/reopen while
 * this tab (or a future tab hitting `/start` again) does the retry — it
 * does not need to send while the site is fully closed, which is the one
 * thing only Background Sync could add, and that API isn't available in
 * every browser this site supports (notably Safari). See known issues in
 * the phase doc.
 */

const STORAGE_KEY = 'artaveo:pending-inquiry'

export type QueuedInquiry = {
  draft: InquiryDraft
  meta: InquirySubmissionMeta
  queuedAt: number
}

function isQueuedInquiry(value: unknown): value is QueuedInquiry {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<QueuedInquiry>
  return (
    typeof candidate.draft === 'object' &&
    candidate.draft !== null &&
    typeof candidate.meta === 'object' &&
    candidate.meta !== null &&
    typeof (candidate.meta as InquirySubmissionMeta).idempotencyKey === 'string'
  )
}

export function readQueuedInquiry(): QueuedInquiry | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isQueuedInquiry(parsed) ? parsed : null
  } catch {
    // Corrupt entry, storage disabled, or private-browsing quota — treat
    // exactly like "nothing queued" rather than surfacing an error for
    // what is purely a best-effort convenience feature.
    return null
  }
}

export function writeQueuedInquiry(draft: InquiryDraft, meta: InquirySubmissionMeta): void {
  if (typeof window === 'undefined') return
  try {
    const payload: QueuedInquiry = { draft, meta, queuedAt: Date.now() }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Best-effort only (e.g. storage full or disabled in this context).
    // The visitor still sees the honest "you're offline" message either
    // way — see brief-builder.tsx — they just won't get an automatic
    // retry-on-reconnect if this particular write failed, and should
    // resubmit by hand once back online instead.
  }
}

export function clearQueuedInquiry(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Best-effort — see writeQueuedInquiry.
  }
}
