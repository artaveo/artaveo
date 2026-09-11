'use client'

import { useState } from 'react'

import { Section, Subhead } from '@/components/showcase/section'
import { UsageNotes } from '@/components/showcase/usage-notes'
import { FormLayout, MultiStepFormLayout } from '@/components/ui/form-layout'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'

const steps = ['Contact', 'Project', 'Review']

export function FormLayoutsSection() {
  const [stepIndex, setStepIndex] = useState(0)

  return (
    <Section
      id="form-layouts"
      index="17 — Form layouts"
      title="Single-column & multi-step"
      description="Every form on the site is one of these two shapes — a plain contact form, or the Brief Builder's step flow."
      className="grid gap-10 lg:grid-cols-2"
    >
      <div>
        <Subhead>Single-column</Subhead>
        <FormLayout
          onSubmit={(event) => event.preventDefault()}
          footer={<Button type="submit">Send message</Button>}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="ds-fl-name">Name</Label>
            <Input id="ds-fl-name" placeholder="Jane Developer" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ds-fl-message">Message</Label>
            <Textarea id="ds-fl-message" rows={4} placeholder="What are you building?" />
          </div>
        </FormLayout>
      </div>

      <div>
        <Subhead>Multi-step</Subhead>
        <MultiStepFormLayout
          steps={steps}
          currentStepIndex={stepIndex}
          isLastStep={stepIndex === steps.length - 1}
          onBack={() => setStepIndex((i) => Math.max(0, i - 1))}
          onNext={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
        >
          <p className="text-sm text-muted-foreground">
            Step content: {steps[stepIndex]} fields go here.
          </p>
        </MultiStepFormLayout>
      </div>
      <UsageNotes
        dos={[
          'Use FormLayout for any single-column form and MultiStepFormLayout specifically for a linear, ordered flow like the Brief Builder.',
          "Let MultiStepFormLayout's aria-live region announce the step change — don't add a second, competing announcement.",
        ]}
        donts={[
          "Don't build a multi-step form's header from a bespoke progress bar — Stepper inside MultiStepFormLayout already covers current/complete/upcoming.",
          "Don't gate step advancement inside the layout component — validation belongs to whichever real form (e.g. the Brief Builder) uses it.",
        ]}
      />
    </Section>
  )
}
