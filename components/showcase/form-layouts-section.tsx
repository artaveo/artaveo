'use client'

import { useState } from 'react'

import { Section, Subhead } from '@/components/showcase/section'
import { FormLayout, MultiStepFormLayout } from '@/components/ui/form-layout'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'

const steps = ['Contact', 'Project', 'Review']

export function FormLayoutsSection() {
  const [stepIndex, setStepIndex] = useState(0)

  return (
    <Section
      id="form-layouts"
      index="15 — Form layouts"
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
    </Section>
  )
}
