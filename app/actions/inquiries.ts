'use server'

import { MAX_ATTACHMENTS_PER_INQUIRY } from '@/lib/media-upload'
import { bindRequestId, getRequestId } from '@/lib/observability/context'
import { log } from '@/lib/observability/logger'
import { captureError, track } from '@/lib/observability/store'
import { getClientIp, hashIp } from '@/lib/request-ip'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getDbClient } from '@/lib/db/server'
import { snapshotToSummaryProduct } from '@/lib/inquiry-summary'
import { validateAllSteps, validateProductRequest } from '@/lib/inquiry-validation'
import { enqueueInquiryNotifications, enqueueProductRequestNotifications } from '@/lib/notifications/events'
import { processAfterEnqueue } from '@/lib/notifications/outbox'
import { resolveProductSelection } from '@/lib/products/resolve'
import type {
  InquiryDraft,
  InquiryKind,
  InquirySubmissionMeta,
  InquirySubmissionResult,
  ProductRequestDraft,
  ProductSnapshot,
} from '@/types/inquiry'

/**
 * § 9.2 — Server handling & persistence; Phase 27.5 — product purchase and demo
 * requests through the same path.
 *
 * One schema shared by client and server: `validateAllSteps` / `validateStep` /
 * `validateProductRequest` (`lib/inquiry-validation.ts`) have no browser
 * dependency, so this reuses them directly rather than duplicating rules in a
 * second schema library.
 *
 * Both entry points — `submitInquiry` (the Brief Builder) and
 * `submitProductRequest` (Phase 30's product pages) — run the same guarded
 * submission (`runSubmission`): validation, honeypot and minimum fill time, the
 * attempt limit, idempotent replay, per-visitor limits, the insert, the timeline
 * event, the notifications. Success is returned only after the row is stored
 * (§ 2 principle 15).
 */

/** A real visitor cannot fill and review a multi-step form this fast. */
const MIN_FORM_FILL_MS = 3000
/** A product request is one short form, not six steps. */
const MIN_PRODUCT_FORM_FILL_MS = 2000

/** Deliberately generous — this guards against abuse, not normal reuse (a client resubmitting after fixing a typo, etc). */
const MAX_PER_IP_PER_HOUR = 5
const MAX_PER_EMAIL_PER_DAY = 3

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Db = NonNullable<ReturnType<typeof getDbClient>>

function metaValid(meta: InquirySubmissionMeta | undefined): meta is InquirySubmissionMeta {
  return Boolean(
    meta &&
      typeof meta.idempotencyKey === 'string' &&
      meta.idempotencyKey.length >= 8 &&
      meta.idempotencyKey.length <= 100 &&
      typeof meta.honeypot === 'string',
  )
}

/**
 * The guarded part every inquiry shares. `row` is the inquiry's own columns;
 * `notify` queues its e-mails (idempotent per inquiry, so the replay paths may
 * call it again — a visitor whose first attempt saved but whose notifications
 * failed gets what they were owed, never a second pair).
 */
async function runSubmission(input: {
  meta: InquirySubmissionMeta
  email: string
  minFillMs: number
  kind: InquiryKind
  /** Resolved once the cheap checks have passed (it may read the database). `null` = the request names something that does not exist. */
  buildRow: (db: Db) => Promise<Record<string, unknown> | null>
  eventNote: string
  attachmentIds?: string[]
  notify: (db: Db, inquiryId: string) => Promise<unknown>
  trackData: Record<string, unknown>
  route: string
}): Promise<InquirySubmissionResult> {
  const { meta } = input

  // Anti-spam: honeypot + minimum fill time. Both collapse to the same generic
  // 'rejected' code — never signal which check tripped.
  if (meta.honeypot.trim().length > 0) {
    log.info('inquiry.rejected', { reason: 'honeypot', kind: input.kind })
    return { ok: false, code: 'rejected' }
  }
  if (Date.now() - meta.formRenderedAt < input.minFillMs) {
    log.info('inquiry.rejected', { reason: 'too-fast', kind: input.kind })
    return { ok: false, code: 'rejected' }
  }

  // No database configured in this environment: honest "not configured", never a fabricated success.
  const db = getDbClient()
  if (!db) {
    log.error('inquiry.not_configured', { consequence: 'a visitor tried to send a request and nothing was saved', kind: input.kind })
    return { ok: false, code: 'not-configured' }
  }

  // Phase 23: the attempt limit comes before any query.
  const attempts = await checkRateLimit('inquiry.submit')
  if (!attempts.ok) {
    log.info('inquiry.rejected', { reason: 'rate-limited', dimension: attempts.dimension, kind: input.kind })
    return { ok: false, code: 'rejected' }
  }

  const ipHash = hashIp(await getClientIp())
  const email = input.email.trim().toLowerCase()
  const requestId = await getRequestId()

  // Idempotency replay: this exact submission already persisted — that is a success, not a new insert.
  const { data: existing } = await db.from('inquiries').select('id').eq('idempotency_key', meta.idempotencyKey).maybeSingle()
  if (existing) {
    log.info('inquiry.replayed', { inquiryId: existing.id as string })
    await safeNotify(db, existing.id as string, input.notify)
    return { ok: true, id: existing.id as string, replay: true }
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [ipCountResult, emailCountResult] = await Promise.all([
    db.from('inquiries').select('id', { count: 'exact', head: true }).eq('submitter_ip_hash', ipHash).gte('created_at', oneHourAgo),
    db.from('inquiries').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', oneDayAgo),
  ])
  if ((ipCountResult.count ?? 0) >= MAX_PER_IP_PER_HOUR || (emailCountResult.count ?? 0) >= MAX_PER_EMAIL_PER_DAY) {
    log.info('inquiry.rejected', { reason: 'per-visitor-limit', kind: input.kind })
    return { ok: false, code: 'rejected' }
  }

  const row = await input.buildRow(db)
  if (!row) {
    log.info('inquiry.rejected', { reason: 'unknown-product', kind: input.kind })
    return { ok: false, code: 'invalid' }
  }

  // Insert. The unique constraint on idempotency_key is the real guard against a race with the replay check.
  const { data: inserted, error } = await db
    .from('inquiries')
    .insert({
      ...row,
      inquiry_kind: input.kind,
      idempotency_key: meta.idempotencyKey,
      email,
      source_referrer: meta.sourceReferrer ?? null,
      source_utm_source: meta.sourceUtmSource ?? null,
      source_utm_medium: meta.sourceUtmMedium ?? null,
      source_utm_campaign: meta.sourceUtmCampaign ?? null,
      source_channel: meta.sourceChannel ?? null,
      submitter_ip_hash: ipHash,
      request_id: requestId ?? null,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    if (error?.code === '23505') {
      const { data: raced } = await db.from('inquiries').select('id').eq('idempotency_key', meta.idempotencyKey).maybeSingle()
      if (raced) {
        log.info('inquiry.replayed', { inquiryId: raced.id as string, via: 'insert-race' })
        await safeNotify(db, raced.id as string, input.notify)
        return { ok: true, id: raced.id as string, replay: true }
      }
    }
    await captureError(error ?? new Error('insert returned no row'), {
      event: 'inquiry.persist_failed',
      source: 'action',
      route: input.route,
      fields: { consequence: 'the request was NOT saved', kind: input.kind },
      db,
    })
    return { ok: false, code: 'error' }
  }
  const inquiryId = inserted.id as string

  // Append-only timeline. Best-effort: never undoes the insert above.
  const { error: eventError } = await db.from('inquiry_events').insert({
    inquiry_id: inquiryId,
    type: 'created',
    actor: 'system',
    note: input.eventNote,
    request_id: requestId ?? null,
  })
  if (eventError) {
    await captureError(eventError, { event: 'inquiry.timeline_write_failed', source: 'database', level: 'warn', fields: { inquiryId, consequence: 'the inquiry itself was saved' }, db })
  }

  // § 15's Brief Builder attachments: link what was uploaded before this submit. Only files that are still
  // UNLINKED can be linked, and the cap is enforced here. Best-effort.
  const fileIds = [...new Set(input.attachmentIds ?? [])].filter((id) => UUID.test(id)).slice(0, MAX_ATTACHMENTS_PER_INQUIRY)
  if (fileIds.length > 0) {
    const { error: attachmentError } = await db.from('inquiry_files').update({ inquiry_id: inquiryId }).in('id', fileIds).is('inquiry_id', null)
    if (attachmentError) {
      await captureError(attachmentError, { event: 'inquiry.attachments_link_failed', source: 'database', level: 'warn', fields: { inquiryId, consequence: 'the inquiry itself was saved' }, db })
    }
  }

  // Notifications: outbox pattern ("persist first, send after").
  await safeNotify(db, inquiryId, input.notify)

  // The funnel's top line. Ids and labels only — never the visitor's name, address or text.
  await track('inquiry.submitted', {
    subject: { type: 'inquiry', id: inquiryId },
    data: { ...input.trackData, kind: input.kind, channel: meta.sourceChannel ?? null, attachments: fileIds.length },
    db,
  })

  return { ok: true, id: inquiryId }
}

/** Best-effort in full: a failure here never undoes or masks the stored inquiry. */
async function safeNotify(db: Db, inquiryId: string, notify: (db: Db, inquiryId: string) => Promise<unknown>): Promise<void> {
  try {
    const rows = (await notify(db, inquiryId)) as { id: string }[]
    await processAfterEnqueue(
      db,
      rows.map((row) => row.id),
    )
  } catch (err) {
    await captureError(err, { event: 'inquiry.notifications_failed', source: 'notification', fields: { inquiryId, consequence: 'the inquiry itself was saved' }, db })
  }
}

function productColumns(resolved: { projectId: string; saleOptionId: string | null; serviceIds: string[]; snapshot: ProductSnapshot }) {
  return {
    product_project_id: resolved.projectId,
    product_sale_option_id: resolved.saleOptionId,
    product_service_ids: resolved.serviceIds,
    product_snapshot: resolved.snapshot,
  }
}

/** The Brief Builder (§ 9.1 / 9.2). "Buy one of our products" becomes a purchase request for that product (27.5). */
export async function submitInquiry(draft: InquiryDraft, meta: InquirySubmissionMeta): Promise<InquirySubmissionResult> {
  // Phase 24: every log line, error record and database call of this request carries its correlation id.
  bindRequestId(await getRequestId())

  // Phase 23: every argument of a Server Action is untrusted, whatever its type says.
  if (!metaValid(meta)) {
    log.info('inquiry.rejected', { reason: 'malformed-meta' })
    return { ok: false, code: 'invalid' }
  }
  if (!validateAllSteps(draft)) {
    log.info('inquiry.rejected', { reason: 'invalid' })
    return { ok: false, code: 'invalid' }
  }

  const buying = draft.projectType === 'buy-product'
  let snapshot: ProductSnapshot | null = null

  return runSubmission({
    meta,
    email: draft.email,
    minFillMs: MIN_FORM_FILL_MS,
    kind: buying ? 'product-purchase' : 'project',
    route: '/[locale]/start',
    eventNote: buying ? 'Purchase request received via Brief Builder.' : 'Inquiry received via Brief Builder.',
    attachmentIds: draft.attachmentMediaIds,
    buildRow: async (db) => {
      const row: Record<string, unknown> = {
        service_slug: draft.serviceSlug ?? null,
        package_id: draft.packageId ?? null,
        project_type: draft.projectType ?? null,
        goal: draft.goal.trim(),
        feature_tags: draft.featureTags,
        feature_other_note: draft.featureOtherNote.trim(),
        timeline: draft.timeline ?? null,
        budget_band: draft.budgetBand ?? null,
        links: draft.links.filter((link) => link.url.trim()).map((link) => ({ url: link.url.trim() })),
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        preferred_locale: draft.preferredLocale,
        preferred_channel: draft.preferredChannel,
        consent: draft.consent,
      }
      if (!buying) return row
      const resolved = await resolveProductSelection(db, { productSlug: draft.productSlug ?? '', saleOptionId: draft.saleOptionId ?? null })
      if (!resolved) return null
      snapshot = resolved.snapshot
      return { ...row, ...productColumns(resolved) }
    },
    notify: async (db, inquiryId) => {
      // On a replay the snapshot comes from the stored row.
      const stored = snapshot ?? (buying ? await storedSnapshot(db, inquiryId) : null)
      return enqueueInquiryNotifications(db, inquiryId, draft, snapshotToSummaryProduct(stored))
    },
    trackData: { service: draft.serviceSlug ?? null, locale: draft.preferredLocale, product: buying ? (draft.productSlug ?? null) : null },
  })
}

async function storedSnapshot(db: Db, inquiryId: string): Promise<ProductSnapshot | null> {
  const { data } = await db.from('inquiries').select('product_snapshot').eq('id', inquiryId).maybeSingle()
  return ((data as { product_snapshot?: ProductSnapshot } | null)?.product_snapshot as ProductSnapshot) ?? null
}

/**
 * Phase 27.5 — a product purchase request (product + chosen way to get it +
 * after-sales services) or a demo request. The product page forms of Phase 30
 * send it; until then nothing public calls it. The product, option and services
 * must exist and be published (`resolveProductSelection`).
 */
export async function submitProductRequest(request: ProductRequestDraft, meta: InquirySubmissionMeta): Promise<InquirySubmissionResult> {
  bindRequestId(await getRequestId())

  if (!metaValid(meta)) {
    log.info('inquiry.rejected', { reason: 'malformed-meta', kind: 'product' })
    return { ok: false, code: 'invalid' }
  }
  if (Object.keys(validateProductRequest(request)).length > 0) {
    log.info('inquiry.rejected', { reason: 'invalid', kind: 'product' })
    return { ok: false, code: 'invalid' }
  }

  const demo = request.kind === 'product-demo'
  let snapshot: ProductSnapshot | null = null

  return runSubmission({
    meta,
    email: request.email,
    minFillMs: MIN_PRODUCT_FORM_FILL_MS,
    kind: request.kind,
    route: '/[locale]/products/[slug]',
    eventNote: demo ? 'Demo request received from a product page.' : 'Purchase request received from a product page.',
    buildRow: async (db) => {
      const resolved = await resolveProductSelection(db, {
        productSlug: request.productSlug,
        // A demo request is about the product, not one way of buying it.
        saleOptionId: demo ? null : (request.saleOptionId ?? null),
        productServiceIds: demo ? [] : request.productServiceIds,
      })
      if (!resolved) return null
      snapshot = resolved.snapshot
      return {
        ...productColumns(resolved),
        project_type: 'buy-product',
        goal: request.message.trim(),
        name: request.name.trim(),
        phone: request.phone.trim(),
        preferred_locale: request.preferredLocale,
        preferred_channel: request.preferredChannel,
        consent: request.consent,
      }
    },
    notify: async (db, inquiryId) => {
      const stored = snapshot ?? (await storedSnapshot(db, inquiryId))
      if (!stored) return []
      return enqueueProductRequestNotifications(db, inquiryId, request, snapshotToSummaryProduct(stored)!)
    },
    trackData: { product: request.productSlug, locale: request.preferredLocale },
  })
}
