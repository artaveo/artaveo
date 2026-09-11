'use client'

import { useState } from 'react'

import { Section, Subhead } from '@/components/showcase/section'
import { UsageNotes } from '@/components/showcase/usage-notes'
import { FileInput } from '@/components/ui/file-input'
import { Checkbox, Field, FieldDescription, FieldError, FieldLabel, FormMessage, Radio, RadioGroup, Switch } from '@/components/ui/form-controls'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'

export function FormControlsSection() {
  const [density, setDensity] = useState('comfortable')

  return (
    <Section
      id="form-controls"
      index="08 — Form controls"
      title="Selection &amp; feedback controls"
      description="Field wires a label, hint and error together with correct aria-describedby. The controls below share the same border, radius and focus treatment as Input."
      className="flex flex-col gap-10"
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Subhead>Field, checkbox &amp; radio</Subhead>

          <Field>
            <div className="flex items-center gap-2">
              <Checkbox id="ds-terms" defaultChecked />
              <FieldLabel htmlFor="ds-terms">I agree to the terms</FieldLabel>
            </div>
          </Field>

          <Field>
            <FieldLabel>Project type</FieldLabel>
            <RadioGroup defaultValue="web-app" className="gap-2.5">
              <div className="flex items-center gap-2">
                <Radio value="website" id="ds-r1" />
                <FieldLabel htmlFor="ds-r1" className="font-normal">
                  Website
                </FieldLabel>
              </div>
              <div className="flex items-center gap-2">
                <Radio value="web-app" id="ds-r2" />
                <FieldLabel htmlFor="ds-r2" className="font-normal">
                  Web application
                </FieldLabel>
              </div>
            </RadioGroup>
          </Field>

          <Field invalid>
            <div className="flex items-center gap-2">
              <Checkbox id="ds-invalid" aria-invalid />
              <FieldLabel htmlFor="ds-invalid">Required acknowledgement</FieldLabel>
            </div>
            <FieldError>This field is required.</FieldError>
          </Field>
        </div>

        <div className="flex flex-col gap-6">
          <Subhead>Switch, select &amp; segmented control</Subhead>

          <Field>
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <FieldLabel htmlFor="ds-switch">Email notifications</FieldLabel>
                <FieldDescription>Get notified when a project status changes.</FieldDescription>
              </div>
              <Switch id="ds-switch" defaultChecked />
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="ds-select">Budget range</FieldLabel>
            <Select defaultValue="medium">
              <SelectTrigger id="ds-select">
                <SelectValue placeholder="Select a range" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="small">$1,000 – $5,000</SelectItem>
                  <SelectItem value="medium">$5,000 – $15,000</SelectItem>
                  <SelectItem value="large">$15,000+</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Density</span>
            <SegmentedControl
              value={[density]}
              onValueChange={(value) => setDensity(value[0] as string)}
            >
              <SegmentedControlItem value="compact">Compact</SegmentedControlItem>
              <SegmentedControlItem value="comfortable">Comfortable</SegmentedControlItem>
              <SegmentedControlItem value="spacious">Spacious</SegmentedControlItem>
            </SegmentedControl>
          </div>
        </div>
      </div>

      <div>
        <Subhead>File input &amp; form message</Subhead>
        <div className="grid gap-6 lg:grid-cols-2">
          <FileInput hint="PDF or DOCX, up to 10MB" accept=".pdf,.docx" />
          <div className="flex flex-col gap-3">
            <FormMessage variant="success">Message sent — I&apos;ll get back to you shortly.</FormMessage>
            <FormMessage variant="destructive">Something went wrong. Please try again.</FormMessage>
          </div>
        </div>
      </div>
      <UsageNotes
        dos={[
          "Always pair an input with a real <Label> (or Field's built-in one) — placeholder text is not an accessible label.",
          'Use FormMessage to report success/error at the field or form level instead of a plain colored <p>.',
        ]}
        donts={[
          "Don't rely on color alone to show a field is invalid — Field/FormMessage already pair the color with text and aria-invalid.",
          "Don't build a custom checkbox/radio/switch from styled <div>s — the primitives here already handle keyboard, focus and RTL.",
        ]}
      />
    </Section>
  )
}
