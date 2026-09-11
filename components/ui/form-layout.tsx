'use client'

import type * as React from 'react'

import { Button } from '@/components/ui/button'
import { Stepper, type StepStatus } from '@/components/ui/stepper'
import { cn } from '@/lib/utils'

/**
 * FormLayout — single-column form shell (contact form, most admin forms).
 * Owns spacing and max-width only; `Field`/inputs come from
 * `components/ui/form-controls.tsx`, submit-level status from
 * `FormMessage` in the same file.
 */
function FormLayout({
  children,
  footer,
  className,
  ...props
}: React.ComponentProps<'form'> & { footer?: React.ReactNode }) {
  return (
    <form data-slot="form-layout" className={cn('flex w-full max-w-lg flex-col gap-5', className)} {...props}>
      {children}
      {footer ? <div className="flex items-center gap-3 pt-2">{footer}</div> : null}
    </form>
  )
}

/**
 * MultiStepFormLayout — the Brief Builder shape: a `Stepper` header, one
 * step's fields in the body, and Back/Next (or Submit, on the last step)
 * navigation. The current step's fields are the caller's children — this
 * component only owns the stepper header, the footer nav, and announcing
 * the step change to assistive tech.
 */
function MultiStepFormLayout({
  steps,
  currentStepIndex,
  onBack,
  onNext,
  isLastStep = false,
  backLabel = 'Back',
  nextLabel = 'Continue',
  submitLabel = 'Submit',
  children,
  className,
}: {
  steps: string[]
  currentStepIndex: number
  onBack?: () => void
  onNext?: () => void
  isLastStep?: boolean
  backLabel?: string
  nextLabel?: string
  submitLabel?: string
  children: React.ReactNode
  className?: string
}) {
  const stepItems = steps.map((label, index) => ({
    label,
    status: (index < currentStepIndex
      ? 'complete'
      : index === currentStepIndex
        ? 'current'
        : 'upcoming') as StepStatus,
  }))

  return (
    <div data-slot="multi-step-form-layout" className={cn('flex w-full flex-col gap-8', className)}>
      <Stepper steps={stepItems} />
      <div role="status" aria-live="polite" className="sr-only">
        {`Step ${currentStepIndex + 1} of ${steps.length}: ${steps[currentStepIndex]}`}
      </div>
      <div className="flex flex-col gap-5">{children}</div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={currentStepIndex === 0}
        >
          {backLabel}
        </Button>
        <Button type={isLastStep ? 'submit' : 'button'} onClick={isLastStep ? undefined : onNext}>
          {isLastStep ? submitLabel : nextLabel}
        </Button>
      </div>
    </div>
  )
}

export { FormLayout, MultiStepFormLayout }
