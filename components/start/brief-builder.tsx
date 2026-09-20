'use client'

import { ArrowLeft, ArrowRight, Send } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Stepper, type StepStatus } from '@/components/ui/stepper'
import { ErrorState, OfflineState, RateLimitedState, SuccessState } from '@/components/ui/states'
import { FormMessage } from '@/components/ui/form-controls'
import {
  createEmptyInquiryDraft,
  type BriefBuilderStatus,
  type InquiryDraft,
  type InquirySubmissionMeta,
  type StepId,
} from '@/types/inquiry'
import { dataSteps, validateStep, type StepErrors } from '@/lib/inquiry-validation'
import { buildInquiryMailtoHref } from '@/lib/inquiry-summary'
import { clearQueuedInquiry, readQueuedInquiry, writeQueuedInquiry } from '@/lib/inquiry-offline-queue'
import { trackEvent } from '@/lib/analytics'
import { type Locale, type EngagementModel, type Service } from '@/types/content'
import { ContactStep, LinksStep, ProjectStep, ScopeStep, ServiceStep, TimelineStep } from '@/components/start/steps'
import { ReviewStep } from '@/components/start/review'
import { submitInquiry } from '@/app/actions/inquiries'

const steps: StepId[] = [...dataSteps, 'review']

/**
 * A client-side submit guard only — separate from § 9.2's server-side
 * rate limiting (per IP/e-mail) in `app/actions/inquiries.ts`. This just
 * stops accidental double-submits from a fast double-click or repeated
 * Enter, and is framed to the visitor as exactly that, never as a server
 * response.
 */
const RESUBMIT_COOLDOWN_MS = 8000

/** A real visitor can't fill and review a multi-step form this fast — mirrors app/actions/inquiries.ts's own check, used here only to seed `formRenderedAt` from mount rather than from first keystroke. */
function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Extremely old browsers only — collision odds are irrelevant here since
  // the DB's unique constraint is the real guard, this just seeds it.
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function BriefBuilder({
  services,
  engagementModels,
  initialServiceSlug,
  initialPackageId,
}: {
  services: Service[]
  engagementModels: EngagementModel[]
  initialServiceSlug?: string
  initialPackageId?: string
}) {
  const t18n = useTranslations('BriefBuilder')
  const locale = useLocale() as Locale

  const [draft, setDraft] = useState<InquiryDraft>(() => {
    const base = createEmptyInquiryDraft(locale)
    return { ...base, serviceSlug: initialServiceSlug, packageId: initialPackageId }
  })
  const [stepIndex, setStepIndex] = useState(0)
  const [status, setStatus] = useState<BriefBuilderStatus>('idle')
  const [touchedSteps, setTouchedSteps] = useState<Set<StepId>>(new Set())
  /**
   * Read directly at mount rather than defaulting to `true` and
   * correcting inside an effect: the § 10.3 auto-retry effect below also
   * runs on this same first mount, and needs the *real* value from the
   * very start — a briefly-stale `true` default while actually offline
   * could let it attempt a submit it should have queued instead. Doesn't
   * affect hydration: `isOnline` plays no part in what the very first
   * render's JSX looks like (only `status`, which is unrelated, does).
   */
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [honeypot, setHoneypot] = useState('')
  const [serverErrorReason, setServerErrorReason] = useState<'not-configured' | 'unexpected'>('unexpected')
  /**
   * Set only when the just-shown `success` screen followed a queued,
   * delayed send (§ 10.3) — lets the success copy honestly say "you were
   * offline for part of this" instead of implying a normal, immediate
   * send. Never set for the ordinary online-submit path.
   */
  const [deliveredFromQueue, setDeliveredFromQueue] = useState(false)
  const lastSubmitAttempt = useRef<number>(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const idempotencyKey = useRef<string>(randomId())
  const formRenderedAt = useRef<number>(Date.now())
  /** Guards against the mount-hydration effect and the online-transition effect both firing an auto-retry for the same queued item. */
  const retryInFlight = useRef(false)
  const sourceMeta = useRef<{
    referrer?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
    channel?: string
  }>({})

  useEffect(() => {
    // § 11.1 analytics — fired once per mount regardless of whether this
    // turns out to be a fresh session or a queued-submission restore
    // (§ 10.3): both are a visitor arriving at the Brief Builder. No form
    // contents here, just the fact of a start.
    trackEvent('brief_start', { prefilled: Boolean(initialServiceSlug) })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount, by design
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const utmSource = params.get('utm_source') ?? undefined
    sourceMeta.current = {
      referrer: document.referrer || undefined,
      utmSource,
      utmMedium: params.get('utm_medium') ?? undefined,
      utmCampaign: params.get('utm_campaign') ?? undefined,
      channel: utmSource ?? (document.referrer ? 'referral' : 'direct'),
    }
  }, [])

  const currentStep = steps[stepIndex]

  useEffect(() => {
    function onOnline() {
      setIsOnline(true)
    }
    function onOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    // Move focus to the new step's heading on navigation, for keyboard and
    // screen-reader users — otherwise focus silently stays on the button
    // that was just clicked while the whole panel underneath changes.
    if (status === 'editing' || status === 'step-error' || status === 'idle') {
      headingRef.current?.focus()
    }
  }, [stepIndex, status])

  /**
   * § 10.3 — a previous visit (this tab reloaded, or the visitor closed
   * and reopened the site) may have left a queued submission behind. If
   * so: restore the exact draft and submission metadata it was queued
   * with (not fresh ones — a retry must reuse the same idempotency key),
   * jump to Review so the visitor can see what's about to send, and
   * attempt it immediately if already online. `navigator.onLine` is read
   * directly here rather than through the `isOnline` state, which may not
   * have been corrected from its default yet in the same commit.
   */
  useEffect(() => {
    const queued = readQueuedInquiry()
    if (!queued) return
    idempotencyKey.current = queued.meta.idempotencyKey
    formRenderedAt.current = queued.meta.formRenderedAt
    sourceMeta.current = {
      referrer: queued.meta.sourceReferrer,
      utmSource: queued.meta.sourceUtmSource,
      utmMedium: queued.meta.sourceUtmMedium,
      utmCampaign: queued.meta.sourceUtmCampaign,
      channel: queued.meta.sourceChannel,
    }
    setDraft(queued.draft)
    setStepIndex(steps.length - 1)
    const online = typeof navigator === 'undefined' || navigator.onLine
    if (online) {
      retryInFlight.current = true
      setStatus('submitting')
      void attemptSubmit(queued, { fromQueue: true }).finally(() => {
        retryInFlight.current = false
      })
    } else {
      setStatus('offline')
    }
    // Deliberately mount-only — the effect below handles a *later*
    // regain of connectivity for a queued item that was already restored
    // here (or queued fresh during this same session).
  }, [])

  /**
   * § 10.3 — the other half of "retry automatically once back online":
   * connectivity returning while a queued submission is still sitting
   * there (queued during this same session, or left over from the mount
   * effect above if it started offline). Guarded against the queued
   * item's own idempotency key so this never resends something the
   * visitor has since abandoned by editing the form again — `updateDraft`
   * below clears the queue on any real edit, which is what "abandoned"
   * means here.
   */
  useEffect(() => {
    if (!isOnline || retryInFlight.current) return
    const queued = readQueuedInquiry()
    if (!queued || queued.meta.idempotencyKey !== idempotencyKey.current) return
    retryInFlight.current = true
    setStatus('submitting')
    void attemptSubmit(queued, { fromQueue: true }).finally(() => {
      retryInFlight.current = false
    })
  }, [isOnline])

  const errors: StepErrors = useMemo(() => validateStep(currentStep, draft), [currentStep, draft])
  const showErrors = touchedSteps.has(currentStep)

  function updateDraft(patch: Partial<InquiryDraft>) {
    setStatus('editing')
    setDraft((prev) => ({ ...prev, ...patch }))
    // Any real edit invalidates a previously queued submission — "queued"
    // means "this exact brief is waiting to send", so once the visitor
    // changes something, resending the old snapshot automatically later
    // would be sending something they no longer agreed to. They'll queue
    // a fresh one if they go offline again before their next Submit.
    clearQueuedInquiry()
  }

  function goNext() {
    const stepErrors = validateStep(currentStep, draft)
    if (Object.keys(stepErrors).length > 0) {
      setTouchedSteps((prev) => new Set(prev).add(currentStep))
      setStatus('step-error')
      return
    }
    setStatus('editing')
    setStepIndex((i) => {
      const next = Math.min(i + 1, steps.length - 1)
      trackEvent('brief_step', { step: steps[next], direction: 'next' })
      return next
    })
  }

  function goBack() {
    setStatus('editing')
    setStepIndex((i) => {
      const next = Math.max(i - 1, 0)
      trackEvent('brief_step', { step: steps[next], direction: 'back' })
      return next
    })
  }

  /**
   * The one place that actually calls the server action, shared by a
   * normal Submit click, the mount-time queue hydration, and the
   * online-transition retry — so "never fake success" (principle 15) is
   * enforced in exactly one spot regardless of which path got here.
   *
   * § 10.3's real gap this closes beyond the pre-flight `isOnline` check:
   * connectivity can drop *during* the request itself (a flaky mobile
   * connection is the obvious case), which previously had no `catch` at
   * all and would have surfaced as an unhandled rejection instead of an
   * honest offline message. Any thrown error here — not just a
   * `navigator.onLine`-detected one — now queues the payload and shows
   * the same offline/queued state.
   */
  async function attemptSubmit(
    { draft: payloadDraft, meta }: { draft: InquiryDraft; meta: InquirySubmissionMeta },
    { fromQueue = false }: { fromQueue?: boolean } = {},
  ) {
    try {
      const result = await submitInquiry(payloadDraft, meta)

      if (result.ok) {
        // Real persistence, confirmed by the server — `success` is set
        // only here, never at queue time, regardless of how long the
        // queued payload waited for a connection.
        clearQueuedInquiry()
        setDeliveredFromQueue(fromQueue)
        setStatus('success')
        // § 11.1 — fired only after genuine server-confirmed persistence,
        // same event `attemptSubmit` itself enforces for `success`. No
        // form contents in the payload, just whether this was a delayed
        // (§ 10.3 queued) send.
        trackEvent('brief_submit', { fromQueue })
        return
      }

      if (result.code === 'rejected') {
        // Anti-spam rejection (honeypot / too-fast / rate limit) — a real
        // visitor essentially never sees this; reusing the client-side
        // cooldown's copy is fine since the cause reads the same from
        // their side (submitting too fast or too often). Retrying this
        // one automatically again wouldn't change the outcome, so the
        // queue is cleared rather than left to retry forever.
        clearQueuedInquiry()
        setStatus('rate-limited')
        return
      }

      clearQueuedInquiry()
      setServerErrorReason(result.code === 'not-configured' ? 'not-configured' : 'unexpected')
      setStatus('server-error')
    } catch {
      // A real network failure — either the pre-flight check in
      // `handleSubmit` was already stale, or connectivity dropped mid
      // request (this is the case that previously had no handling at
      // all). Save/keep the queued payload and show the same
      // offline/queued state either way; the online-transition effect
      // above will retry once connectivity genuinely returns.
      writeQueuedInquiry(payloadDraft, meta)
      setStatus('offline')
    }
  }

  async function handleSubmit() {
    const now = Date.now()
    if (now - lastSubmitAttempt.current < RESUBMIT_COOLDOWN_MS) {
      setStatus('rate-limited')
      return
    }
    lastSubmitAttempt.current = now

    const meta: InquirySubmissionMeta = {
      idempotencyKey: idempotencyKey.current,
      honeypot,
      formRenderedAt: formRenderedAt.current,
      sourceReferrer: sourceMeta.current.referrer,
      sourceUtmSource: sourceMeta.current.utmSource,
      sourceUtmMedium: sourceMeta.current.utmMedium,
      sourceUtmCampaign: sourceMeta.current.utmCampaign,
      sourceChannel: sourceMeta.current.channel,
    }

    if (!isOnline) {
      // Known offline before even trying — queue now rather than firing
      // a request already known to fail (principle 15: never pretend
      // this could succeed right now). The online-transition effect
      // above sends it the moment connectivity returns.
      writeQueuedInquiry(draft, meta)
      setStatus('offline')
      return
    }

    setStatus('submitting')
    await attemptSubmit({ draft, meta })
  }

  function resetToEditing() {
    setStatus('editing')
  }

  const stepLabels: Record<StepId, string> = {
    service: t18n('stepService'),
    project: t18n('stepProject'),
    scope: t18n('stepScope'),
    timeline: t18n('stepTimeline'),
    links: t18n('stepLinks'),
    contact: t18n('stepContact'),
    review: t18n('stepReview'),
  }

  const stepperItems = steps.map((step, index) => ({
    label: stepLabels[step],
    status: (index < stepIndex ? 'complete' : index === stepIndex ? 'current' : 'upcoming') as StepStatus,
  }))

  if (status === 'offline') {
    // § 10.3: this is a queued, not a dead-end, state — the payload is
    // already saved (writeQueuedInquiry, called just before this status
    // was set) and will send on its own the moment connectivity returns
    // (the online-transition effect above). "Back" lets the visitor keep
    // editing in the meantime without losing the queued copy unless they
    // actually change something (updateDraft clears it on a real edit).
    return (
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <OfflineState
          title={t18n('offlineQueuedTitle')}
          description={t18n('offlineQueuedDescription')}
          action={{ label: t18n('back'), onClick: () => setStatus('editing') }}
        />
      </div>
    )
  }

  if (status === 'rate-limited') {
    return (
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <RateLimitedState
          title={t18n('rateLimitedTitle')}
          description={t18n('rateLimitedDescription')}
          action={{ label: t18n('back'), onClick: () => setStatus('editing') }}
        />
      </div>
    )
  }

  if (status === 'server-error') {
    // 'not-configured' (D-10 still open, no live Supabase project/env yet)
    // and 'unexpected' (a real failure against a live database) get
    // distinct, honest copy rather than one message covering both — see
    // types/inquiry.ts#InquirySubmissionResult.
    const isNotConfigured = serverErrorReason === 'not-configured'
    return (
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <ErrorState
          title={isNotConfigured ? t18n('notLiveTitle') : t18n('genericErrorTitle')}
          description={isNotConfigured ? t18n('notLiveDescription') : t18n('genericErrorDescription')}
          action={{
            label: t18n('emailInstead'),
            href: buildInquiryMailtoHref(draft, locale, services, engagementModels),
          }}
        />
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="ghost" size="sm" onClick={resetToEditing}>
            {t18n('startOver')}
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    // Reachable as of § 9.2: set only after `submitInquiry` confirms the
    // row was actually persisted (see `attemptSubmit` above) — never on
    // queueing or optimistic UI alone, whether the send was immediate or
    // (§ 10.3) followed a period offline. `deliveredFromQueue` only adds
    // an honest extra line for the latter case; it never changes when
    // `success` itself is reachable.
    return (
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <SuccessState
          title={t18n('successTitle')}
          description={
            deliveredFromQueue ? (
              <>
                {t18n('successDescription')} {t18n('successQueuedNote')}
              </>
            ) : (
              t18n('successDescription')
            )
          }
        />
      </div>
    )
  }

  const stepProps = { draft, errors: showErrors ? errors : {}, locale, onChange: updateDraft }
  const isReview = currentStep === 'review'
  const isSubmitting = status === 'submitting'

  return (
    <div className="flex flex-col gap-8">
      {/*
        Honeypot (§ 9.2 anti-spam). Positioned off-screen rather than
        `display: none` / `sr-only` so it stays present for scripted bots
        that skip visibility checks, while `aria-hidden` + `tabIndex={-1}`
        + `autoComplete="off"` keep it invisible and unreachable for real
        keyboard/screen-reader users. A real visitor never sees or fills
        this; app/actions/inquiries.ts rejects any submission where it's
        non-empty.
      */}
      <div aria-hidden="true" style={{ position: 'absolute', insetInlineStart: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="bb-website">Leave this field blank</label>
        <input
          id="bb-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      <Stepper steps={stepperItems} />

      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        {/* Visually hidden focus target so step changes are announced and
            keyboard focus moves to the new panel instead of vanishing. */}
        <h2 tabIndex={-1} ref={headingRef} className="sr-only">
          {stepLabels[currentStep]}
        </h2>

        {currentStep === 'service' ? <ServiceStep {...stepProps} services={services} engagementModels={engagementModels} /> : null}
        {currentStep === 'project' ? <ProjectStep {...stepProps} /> : null}
        {currentStep === 'scope' ? <ScopeStep {...stepProps} /> : null}
        {currentStep === 'timeline' ? <TimelineStep {...stepProps} /> : null}
        {currentStep === 'links' ? <LinksStep {...stepProps} /> : null}
        {currentStep === 'contact' ? <ContactStep {...stepProps} /> : null}
        {isReview ? (
          <ReviewStep draft={draft} locale={locale} services={services} engagementModels={engagementModels} />
        ) : null}

        {isSubmitting ? (
          <FormMessage variant="info" className="mt-6">
            {t18n('submittingTitle')}
          </FormMessage>
        ) : null}

        {status === 'step-error' ? (
          <FormMessage variant="destructive" className="mt-6">
            {t18n('errorRequired')}
          </FormMessage>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={stepIndex === 0 || isSubmitting}
          >
            <ArrowLeft data-icon="inline-start" aria-hidden="true" className="rtl:rotate-180" />
            {t18n('back')}
          </Button>

          {isReview ? (
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
              {t18n('submit')}
              <Send data-icon="inline-end" aria-hidden="true" />
            </Button>
          ) : (
            <Button type="button" onClick={goNext}>
              {t18n('next')}
              <ArrowRight data-icon="inline-end" aria-hidden="true" className="rtl:rotate-180" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
