import { Section, Subhead } from '@/components/showcase/section'
import { UsageNotes } from '@/components/showcase/usage-notes'
import {
  AvailabilityCard,
  AvailabilityChip,
  ExternalProfileLinks,
  IdentityCta,
  IdentityHeader,
  ResponseCommitmentNote,
  StickyMobileCta,
} from '@/components/ui/identity'
import { getDeveloperProfile } from '@/lib/home-content'
import { siteConfig } from '@/lib/site'
import type { Availability } from '@/types/content'

const demoAvailability: Record<Availability['state'], Availability> = {
  available: {
    state: 'available',
    updatedAt: '2026-09-11',
    responseCommitment: { en: 'Replies within a few hours, same day', fa: 'Replies within a few hours, same day' },
  },
  limited: {
    state: 'limited',
    updatedAt: '2026-09-01',
    responseCommitment: { en: 'Replies within 1–2 business days', fa: 'Replies within 1–2 business days' },
  },
  unavailable: {
    state: 'unavailable',
    updatedAt: '2026-08-20',
    responseCommitment: { en: 'Not accepting new inquiries right now', fa: 'Not accepting new inquiries right now' },
  },
}

export function IdentitySection() {
  const profile = getDeveloperProfile()
  const profileNoPortrait = { ...profile, portrait: undefined }

  return (
    <Section
      id="identity"
      index="18 — Identity"
      title="Identity &amp; availability"
      description="The owner-facing building blocks from roadmap § 4.5 — header, availability, external links, and the two hire CTAs."
      className="flex flex-col gap-12"
    >
      <div>
        <Subhead>Identity header</Subhead>
        <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-start sm:justify-between">
          <IdentityHeader profile={profile} title={siteConfig.tagline} />
          <IdentityHeader profile={profileNoPortrait} title={siteConfig.tagline} size="compact" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Left: with portrait. Right: compact size, no portrait — the fallback initial degrades gracefully.
        </p>
      </div>

      <div>
        <Subhead>Availability chip</Subhead>
        <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-6">
          <AvailabilityChip availability={demoAvailability.available} />
          <AvailabilityChip availability={demoAvailability.limited} />
          <AvailabilityChip availability={demoAvailability.unavailable} />
        </div>
      </div>

      <div>
        <Subhead>Availability card &amp; response commitment</Subhead>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(demoAvailability) as Availability['state'][]).map((state) => (
            <AvailabilityCard key={state} availability={demoAvailability[state]} />
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-border bg-card p-6">
          <p className="mb-2 text-xs text-muted-foreground">Standalone, e.g. next to a contact form:</p>
          <ResponseCommitmentNote commitment={demoAvailability.available.responseCommitment} />
        </div>
      </div>

      <div>
        <Subhead>External profile links</Subhead>
        <div className="rounded-xl border border-border bg-card p-6">
          <ExternalProfileLinks />
        </div>
      </div>

      <div>
        <Subhead>Hire &amp; consultation CTAs</Subhead>
        <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-6">
          <IdentityCta variant="hire" />
          <IdentityCta variant="consultation" />
        </div>
      </div>

      <div>
        <Subhead>Sticky mobile CTA</Subhead>
        <p className="mb-3 text-sm text-muted-foreground">
          Fixed to the viewport bottom on real pages (mobile only, § 5.4 decides which routes) — shown here inside a
          contained frame so it doesn&apos;t cover the rest of this page.
        </p>
        <div className="relative mx-auto h-24 w-full max-w-sm overflow-hidden rounded-xl border border-border bg-background">
          <StickyMobileCta availability={demoAvailability.available} className="static" />
        </div>
      </div>
      <UsageNotes
        dos={[
          'Read name/portrait/availability from one DeveloperProfile object (getDeveloperProfile()) rather than hard-coding them again in a new component.',
          "Let IdentityHeader's portrait fall back to an initial when the image is missing instead of showing a broken image or an invented stock photo.",
        ]}
        donts={[
          "Don't invent an evidence count, a fake response time, or a city the owner hasn't confirmed — every field here is optional-safe specifically so it can stay empty until it's real.",
          "Don't wire StickyMobileCta into every route by default — § 5.4 decides which content pages actually show it.",
        ]}
      />
    </Section>
  )
}
