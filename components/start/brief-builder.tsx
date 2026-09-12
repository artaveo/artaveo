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

const steps: StepId[] = [...dataSteps, 'review']

/**
 * A client-side submit guard only — not the real rate limiting § 9.2 will
 * add server-side (per IP/e-mail, honeypot). This just stops accidental
 * double-submits from a fast double-click or repeated Enter, and is framed
 * to the visitor as exactly that, never as a server response.
 */
const RESUBMIT_COOLDOWN_MS = 8000

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
  const lastSubmitAttempt = useRef<number>(0)
  const headingRef = useRef<HTMLHeadingElement>(null)

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

  function handleSubmit() {
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
    // No server exists yet to persist this (roadmap § 9.2, still unbuilt) —
    // this short delay is the normal "sending" transition, not a fake
    // network call. The outcome below is always the honest one: never a
    // fabricated success (§ 2 principle 15).
    window.setTimeout(() => {
      setStatus('server-error')
    }, 600)
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
    return (
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <ErrorState
          title={t18n('notLiveTitle')}
          description={t18n('notLiveDescription')}
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
    // Reserved for once § 9.2 ships real persistence — see
    // `types/inquiry.ts#BriefBuilderStatus`. No code path sets this today.
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
