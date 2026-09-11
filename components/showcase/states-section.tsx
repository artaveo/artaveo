import { Section, Subhead } from '@/components/showcase/section'
import { UsageNotes } from '@/components/showcase/usage-notes'
import { Skeleton } from '@/components/ui/data-display'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  OfflineState,
  RateLimitedState,
  SuccessState,
} from '@/components/ui/states'

export function StatesSection() {
  return (
    <Section
      id="states"
      index="15 — States"
      title="Empty, loading, error & more"
      description="Every list, form and async boundary resolves to one of these — never a blank screen or a silently-failed action."
      className="flex flex-col gap-10"
    >
      <div>
        <Subhead>Empty — admin / preview only</Subhead>
        <div className="rounded-xl border border-dashed border-border bg-card">
          <EmptyState
            title="No drafts yet"
            description="New drafts you save will show up here."
            action={{ label: 'New draft' }}
          />
        </div>
      </div>

      <div>
        <Subhead>Loading — skeleton</Subhead>
        <LoadingState label="Loading projects…" className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </LoadingState>
      </div>

      <div>
        <Subhead>Error — inline / section / page</Subhead>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card px-4">
            <ErrorState size="inline" title="Couldn't save" />
          </div>
          <div className="rounded-xl border border-border bg-card">
            <ErrorState size="section" title="Couldn't load projects" description="Check the connection and try again." />
          </div>
          <div className="rounded-xl border border-border bg-card">
            <ErrorState size="page" title="Something went wrong" description="The page failed to load." />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card">
          <Subhead>Success</Subhead>
          <SuccessState title="Message sent" description="You'll hear back within a day." />
        </div>
        <div className="rounded-xl border border-border bg-card">
          <Subhead>Rate-limited</Subhead>
          <RateLimitedState />
        </div>
        <div className="rounded-xl border border-border bg-card">
          <Subhead>Offline</Subhead>
          <OfflineState />
        </div>
      </div>
      <UsageNotes
        dos={[
          "Use ErrorState's size prop (inline/section/page) to match the actual blast radius of the failure, not always the full-page version.",
          "Show OfflineState instead of a false success whenever the Brief Builder (or anything else) can't confirm a submission actually went through.",
        ]}
        donts={[
          "Don't show EmptyState on the public site — it's reserved for admin/preview views; empty public sections hide themselves instead (§ 6.1).",
          "Don't let a failed submission report success — that's exactly the dishonest state OfflineState/ErrorState exist to prevent.",
        ]}
      />
    </Section>
  )
}
