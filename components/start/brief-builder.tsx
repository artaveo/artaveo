'use client'

import { ArrowLeft, ArrowRight, Send } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Stepper, type StepStatus } from '@/components/ui/stepper'
import { ErrorState, OfflineState, RateLimitedState, SuccessState } from '@/components/ui/states'
import { FormMessage } from '@/components/ui/form-controls'
import { createEmptyInquiryDraft, type BriefBuilderStatus, type InquiryDraft, type StepId } from '@/types/inquiry'
import { dataSteps, validateStep, type StepErrors } from '@/lib/inquiry-validation'
import { buildInquiryMailtoHref } from '@/lib/inquiry-summary'
import { type Locale } from '@/types/content'
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
  initialServiceSlug,
  initialPackageId,
}: {
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
  const [isOnline, setIsOnline] = useState(true)
  const [honeypot, setHoneypot] = useState('')
  const [serverErrorReason, setServerErrorReason] = useState<'not-configured' | 'unexpected'>('unexpected')
  const lastSubmitAttempt = useRef<number>(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const idempotencyKey = useRef<string>(randomId())
  const formRenderedAt = useRef<number>(Date.now())
  const sourceMeta = useRef<{
    referrer?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
    channel?: string
  }>({})

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
    setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
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

  const errors: StepErrors = useMemo(() => validateStep(currentStep, draft), [currentStep, draft])
  const showErrors = touchedSteps.has(currentStep)

  function updateDraft(patch: Partial<InquiryDraft>) {
    setStatus('editing')
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  function goNext() {
    const stepErrors = validateStep(currentStep, draft)
    if (Object.keys(stepErrors).length > 0) {
      setTouchedSteps((prev) => new Set(prev).add(currentStep))
      setStatus('step-error')
      return
    }
    setStatus('editing')
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }

  function goBack() {
    setStatus('editing')
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  async function handleSubmit() {
    if (!isOnline) {
      setStatus('offline')
      return
    }

    const now = Date.now()
    if (now - lastSubmitAttempt.current < RESUBMIT_COOLDOWN_MS) {
      setStatus('rate-limited')
      return
    }
    lastSubmitAttempt.current = now

    setStatus('submitting')

    const result = await submitInquiry(draft, {
      idempotencyKey: idempotencyKey.current,
      honeypot,
      formRenderedAt: formRenderedAt.current,
      sourceReferrer: sourceMeta.current.referrer,
      sourceUtmSource: sourceMeta.current.utmSource,
      sourceUtmMedium: sourceMeta.current.utmMedium,
      sourceUtmCampaign: sourceMeta.current.utmCampaign,
      sourceChannel: sourceMeta.current.channel,
    })

    if (result.ok) {
      // Real persistence, confirmed by the server (principle 15: a form
      // shows success only after the record is persisted) — `success` is
      // reachable for the first time as of § 9.2.
      setStatus('success')
      return
    }

    if (result.code === 'rejected') {
      // Anti-spam rejection (honeypot / too-fast / rate limit) — a real
      // visitor essentially never sees this; reusing the client-side
      // cooldown's copy is fine since the cause reads the same from their
      // side (submitting too fast or too often).
      setStatus('rate-limited')
      return
    }

    setServerErrorReason(result.code === 'not-configured' ? 'not-configured' : 'unexpected')
    setStatus('server-error')
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
    return (
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <OfflineState action={{ label: t18n('back'), onClick: () => setStatus('editing') }} />
      </div>
    )
  }

  if (status === 'rate-limited') {
    return (
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <RateLimitedState action={{ label: t18n('back'), onClick: () => setStatus('editing') }} />
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
          action={{ label: t18n('emailInstead'), href: buildInquiryMailtoHref(draft, locale) }}
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
    // row was actually persisted (see `handleSubmit` above) — never on
    // queueing or optimistic UI alone.
    return (
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <SuccessState title={t18n('successTitle')} description={t18n('successDescription')} />
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
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
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

        {currentStep === 'service' ? <ServiceStep {...stepProps} /> : null}
        {currentStep === 'project' ? <ProjectStep {...stepProps} /> : null}
        {currentStep === 'scope' ? <ScopeStep {...stepProps} /> : null}
        {currentStep === 'timeline' ? <TimelineStep {...stepProps} /> : null}
        {currentStep === 'links' ? <LinksStep {...stepProps} /> : null}
        {currentStep === 'contact' ? <ContactStep {...stepProps} /> : null}
        {isReview ? <ReviewStep draft={draft} locale={locale} /> : null}

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
