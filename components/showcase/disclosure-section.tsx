'use client'

import { useState } from 'react'

import { Section, Subhead } from '@/components/showcase/section'
import { UsageNotes } from '@/components/showcase/usage-notes'
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from '@/components/ui/accordion'
import { Pagination, PaginationEllipsis, PaginationItem, PaginationNav } from '@/components/ui/pagination'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/data-display'
import { Stepper } from '@/components/ui/stepper'
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'

export function DisclosureSection() {
  const [page, setPage] = useState(2)

  return (
    <Section
      id="disclosure"
      index="10 — Disclosure &amp; navigation"
      title="Tabs, accordion, pagination, stepper &amp; progress"
      description="Patterns for revealing content progressively and showing where someone is in a sequence."
      className="flex flex-col gap-10"
    >
      <div>
        <Subhead>Tabs</Subhead>
        <Tabs defaultValue="overview" className="max-w-md">
          <TabsList>
            <TabsIndicator />
            <TabsTab value="overview">Overview</TabsTab>
            <TabsTab value="stack">Stack</TabsTab>
            <TabsTab value="decisions">Decisions</TabsTab>
          </TabsList>
          <TabsPanel value="overview">A booking and operations platform for intercity bus companies.</TabsPanel>
          <TabsPanel value="stack">Next.js, React, TypeScript, PostgreSQL, Supabase, Tailwind CSS.</TabsPanel>
          <TabsPanel value="decisions">Seat holds and confirmation are enforced server-side, never in the browser.</TabsPanel>
        </Tabs>
      </div>

      <div>
        <Subhead>Accordion</Subhead>
        <Accordion className="max-w-md" multiple={false} defaultValue={['faq-1']}>
          <AccordionItem value="faq-1">
            <AccordionTrigger>How do you handle project scope changes?</AccordionTrigger>
            <AccordionPanel>
              Scope changes are discussed before any code is written — the plan and timeline are updated together, not silently.
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem value="faq-2">
            <AccordionTrigger>Do you work with existing codebases?</AccordionTrigger>
            <AccordionPanel>
              Yes — maintenance and improvement work is one of the core services.
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <Subhead>Pagination</Subhead>
          <Pagination>
            <PaginationNav direction="prev" onClick={() => setPage((p) => Math.max(1, p - 1))} />
            <PaginationItem active={page === 1} onClick={() => setPage(1)}>1</PaginationItem>
            <PaginationItem active={page === 2} onClick={() => setPage(2)}>2</PaginationItem>
            <PaginationItem active={page === 3} onClick={() => setPage(3)}>3</PaginationItem>
            <PaginationEllipsis />
            <PaginationItem active={page === 8} onClick={() => setPage(8)}>8</PaginationItem>
            <PaginationNav direction="next" onClick={() => setPage((p) => Math.min(8, p + 1))} />
          </Pagination>
        </div>

        <div>
          <Subhead>Progress</Subhead>
          <div className="flex flex-col gap-4">
            <Progress value={62}>
              <div className="mb-1.5 flex items-center justify-between">
                <ProgressLabel>Uploading brief</ProgressLabel>
                <ProgressValue />
              </div>
            </Progress>
            <Progress value={null} />
          </div>
        </div>
      </div>

      <div>
        <Subhead>Stepper — Brief Builder</Subhead>
        <Stepper
          className="max-w-lg"
          steps={[
            { label: 'Basics', status: 'complete' },
            { label: 'Scope', status: 'complete' },
            { label: 'Budget', status: 'current' },
            { label: 'Review', status: 'upcoming' },
          ]}
        />
      </div>
      <UsageNotes
        dos={[
          'Use Tabs when only one panel is relevant at a time, Accordion when several sections can stay open together.',
          'Use Stepper for a linear, ordered flow (like the Brief Builder) — Pagination is for paged lists of independent items instead.',
        ]}
        donts={[
          "Don't fake a tab UI with buttons plus manually-toggled divs — Tabs already wires aria-selected, roving focus and panel association.",
          "Don't use Pagination controls to represent a multi-step form — Stepper's semantics (current/complete/upcoming step) fit that case, Pagination's don't.",
        ]}
      />
    </Section>
  )
}
