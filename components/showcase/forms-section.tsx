import { Check } from 'lucide-react'

import { Section, Subhead } from '@/components/showcase/section'
import { Badge } from '@/components/ui/badge'
import { Input, Label, Textarea } from '@/components/ui/input'

export function FormsSection() {
  return (
    <Section
      id="forms"
      index="06 — Forms &amp; Badges"
      title="Inputs &amp; badges"
      description="Form controls share one border, radius, and focus treatment. Focus uses a soft brand ring, and validation states are expressed through color tokens, never raw colors."
      className="flex flex-col gap-10"
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <Subhead>Inputs</Subhead>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ds-name">Name</Label>
            <Input id="ds-name" placeholder="Jane Developer" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ds-email">Email</Label>
            <Input
              id="ds-email"
              type="email"
              defaultValue="not-an-email"
              aria-invalid="true"
            />
            <p className="text-xs text-destructive">
              Please enter a valid email address.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ds-disabled">Disabled</Label>
            <Input id="ds-disabled" placeholder="Unavailable" disabled />
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <Subhead>Textarea &amp; success</Subhead>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ds-msg">Project description</Label>
            <Textarea
              id="ds-msg"
              placeholder="Tell me about what you want to build…"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-sm text-success-text">
            <Check className="size-4 shrink-0" />
            Message sent — I&apos;ll get back to you shortly.
          </div>
        </div>
      </div>

      <div>
        <Subhead>Badges &amp; tags</Subhead>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Featured</Badge>
          <Badge variant="secondary">Web App</Badge>
          <Badge variant="outline">Full-Stack</Badge>
          <Badge variant="muted">Draft</Badge>
          <Badge variant="brand">Next.js</Badge>
          <Badge variant="brand-soft">TypeScript</Badge>
          <Badge variant="success">Published</Badge>
          <Badge variant="warning">In Review</Badge>
          <Badge variant="info">Beta</Badge>
          <Badge variant="destructive">Archived</Badge>
        </div>
      </div>
    </Section>
  )
}
