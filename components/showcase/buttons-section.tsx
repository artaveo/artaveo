import { ArrowRight, Code, LoaderCircle, Plus } from 'lucide-react'

import { Section, Subhead } from '@/components/showcase/section'
import { UsageNotes } from '@/components/showcase/usage-notes'
import { Button } from '@/components/ui/button'

export function ButtonsSection() {
  return (
    <Section
      id="buttons"
      index="05 — Buttons"
      title="Buttons"
      description="A single button primitive with consistent variants and sizes. Variants map to intent — solid primary for the main action, outline and ghost for secondary paths."
      className="flex flex-col gap-10"
    >
      <div>
        <Subhead>Variants</Subhead>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Start a Project</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
      </div>

      <div>
        <Subhead>Sizes</Subhead>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>

      <div>
        <Subhead>With icons &amp; states</Subhead>
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            View Our Work
            <ArrowRight data-icon="inline-end" className="rtl:rotate-180" />
          </Button>
          <Button variant="outline">
            <Code data-icon="inline-start" />
            GitHub
          </Button>
          <Button variant="secondary">
            <Plus data-icon="inline-start" />
            Add Project
          </Button>
          <Button disabled>
            <LoaderCircle className="animate-spin" data-icon="inline-start" />
            Submitting
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Add">
            <Plus />
          </Button>
        </div>
      </div>
      <UsageNotes
        dos={[
          "Use the size that matches its context (xs/sm inside dense toolbars, lg for a page's primary CTA).",
          'Pick variant by intent — default for the primary action per screen, outline/ghost for secondary, destructive only for irreversible actions.',
        ]}
        donts={[
          "Don't style a <div onClick> to look like a button — it breaks keyboard focus and screen-reader semantics that Button/IconButton already handle.",
          "Don't put more than one default (filled) button in the same view — it defeats the point of a visual hierarchy.",
        ]}
      />
    </Section>
  )
}
