'use client'

import { Avatar, AvatarFallback, Separator, Skeleton } from '@/components/ui/data-display'
import { Section, Subhead } from '@/components/showcase/section'
import { UsageNotes } from '@/components/showcase/usage-notes'
import { Blockquote, Callout, CodeBlock } from '@/components/ui/content'
import { Prose } from '@/components/ui/prose'
import { StatusBadge, Tag } from '@/components/ui/tag'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const rows = [
  { project: 'Transportation System', status: 'in-development' as const, stack: 'Next.js · PostgreSQL' },
  { project: 'Pezhohesh Complex Portal', status: 'in-development' as const, stack: 'React · Supabase' },
]

export function DataContentSection() {
  return (
    <Section
      id="data-content"
      index="11 — Data display &amp; content"
      title="Table, tags, avatar &amp; article content"
      description="Primitives for showing structured data and long-form content — case studies and insights articles."
      className="flex flex-col gap-10"
    >
      <div>
        <Subhead>Table (resize the window to see the stacked mobile mode)</Subhead>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stack</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.project}>
                <TableCell label="Project">{row.project}</TableCell>
                <TableCell label="Status">
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell label="Stack">{row.stack}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <Subhead>Status badges &amp; tags</Subhead>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="live" />
            <StatusBadge status="in-development" />
            <StatusBadge status="private" />
            <StatusBadge status="archived" />
            <StatusBadge status="concept" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag onRemove={() => {}}>Next.js</Tag>
            <Tag onRemove={() => {}}>PostgreSQL</Tag>
            <Tag>Read-only</Tag>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <Subhead>Avatar &amp; separator</Subhead>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>ZN</AvatarFallback>
            </Avatar>
            <Separator orientation="vertical" className="h-8" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Separator />
        </div>
      </div>

      <div>
        <Subhead>Callout &amp; code block</Subhead>
        <div className="grid gap-4 lg:grid-cols-2">
          <Callout variant="tip" title="Server-side enforcement">
            Seat holds and booking confirmation are always checked on the server, never trusted from the browser.
          </Callout>
          <CodeBlock
            language="ts"
            code={`export async function holdSeat(tripId: string, seatId: string) {\n  return db.transaction(async (tx) => {\n    // ...\n  })\n}`}
          />
        </div>
      </div>

      <div>
        <Subhead>Prose &amp; blockquote</Subhead>
        <Prose>
          <p>
            Case studies and insight articles share one typographic scale, capped at a comfortable
            reading width.
          </p>
          <Blockquote>The database, not the browser, decides who owns a seat.</Blockquote>
          <p>Inline <code>code</code> and links keep the same treatment across every article.</p>
        </Prose>
      </div>
      <UsageNotes
        dos={[
          "Use Table's stacked mobile mode for anything wider than a few columns instead of letting it overflow.",
          'Reach for Prose to wrap long-form article content so heading, link and quote styles stay consistent with the rest of the site.',
        ]}
        donts={[
          "Don't build a data table as a plain <div> grid — Table already handles the responsive stacked layout and correct semantics.",
          "Don't apply Prose to short UI copy (buttons, labels) — it's tuned for reading-width article text, not interface chrome.",
        ]}
      />
    </Section>
  )
}
