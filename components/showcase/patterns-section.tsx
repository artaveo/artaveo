import { Rocket, ShieldCheck, Sparkles } from 'lucide-react'

import { Section, Subhead } from '@/components/showcase/section'
import {
  CTASection,
  FeatureList,
  PageHeader,
  ProofRow,
  SectionHeader,
} from '@/components/ui/patterns'

const features = [
  {
    id: 'perf',
    icon: Rocket,
    title: 'Built for speed',
    description: 'Server-rendered by default, hydrated only where it needs to be.',
  },
  {
    id: 'secure',
    icon: ShieldCheck,
    title: 'Row-level security',
    description: 'Access rules live in the database, not just the UI.',
  },
  {
    id: 'polish',
    icon: Sparkles,
    title: 'No placeholder polish',
    description: 'Every screen ships with real states, not lorem ipsum.',
  },
]

export function PatternsSection() {
  return (
    <Section
      id="patterns"
      index="12 — Patterns"
      title="Headers, CTAs & proof"
      description="The repeatable page-level blocks every route is assembled from, per roadmap § 4.4."
      className="flex flex-col gap-12"
    >
      <div>
        <Subhead>Page header</Subhead>
        <div className="rounded-xl border border-border bg-card px-4">
          <PageHeader
            eyebrow="Example"
            title="Work"
            description="Two real projects, shown honestly — status, stack and role included."
            meta={[
              { k: 'Case studies', v: '2' },
              { k: 'Status', v: 'In development' },
            ]}
            className="py-10 md:py-12"
          />
        </div>
      </div>

      <div>
        <Subhead>Section header</Subhead>
        <div className="rounded-xl border border-border bg-card p-6">
          <SectionHeader
            id="ds-section-header-example"
            eyebrow="Services"
            title="What Artaveo builds"
            description="From a single website to a complete business platform."
            action={{ href: '#patterns', label: 'All services' }}
            className="mb-0"
          />
        </div>
      </div>

      <div>
        <Subhead>Feature list — grid</Subhead>
        <FeatureList items={features} />
      </div>

      <div>
        <Subhead>Proof row — no invented numbers</Subhead>
        <ProofRow
          items={[
            'Server-side seat holds',
            'Row-level security on every table',
            'Bilingual from the ground up',
            'Two real, verifiable case studies',
          ]}
        />
      </div>

      <div>
        <Subhead>CTA section</Subhead>
        <CTASection
          id="ds-cta-example"
          title="Have a project in mind?"
          description="Share the idea, the timeline and what you need."
          primaryAction={{ href: '#patterns', label: 'Start a project' }}
          secondaryAction={{ href: '#patterns', label: 'View work' }}
          className="!py-0"
        />
      </div>
    </Section>
  )
}
