import { Check } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

type StepStatus = 'complete' | 'current' | 'upcoming'

/** Stepper — horizontal step progress for a multi-step flow (Brief Builder, per roadmap § 4.3). */
function Stepper({
  steps,
  className,
}: {
  steps: { label: string; status: StepStatus }[]
  className?: string
}) {
  return (
    <ol
      data-slot="stepper"
      aria-label="Progress"
      className={cn('flex w-full items-center', className)}
    >
      {steps.map((step, index) => (
        <li key={step.label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <span
              data-status={step.status}
              aria-current={step.status === 'current' ? 'step' : undefined}
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors',
                step.status === 'complete' && 'border-brand bg-brand text-brand-foreground',
                step.status === 'current' && 'border-brand text-brand-text',
                step.status === 'upcoming' && 'border-border text-muted-foreground',
              )}
            >
              {step.status === 'complete' ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                'max-w-20 text-center text-xs whitespace-nowrap',
                step.status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <div
              aria-hidden="true"
              className={cn(
                'mx-2 h-px flex-1 transition-colors',
                step.status === 'complete' ? 'bg-brand' : 'bg-border',
              )}
            />
          ) : null}
        </li>
      ))}
    </ol>
  )
}

export { Stepper, type StepStatus }
