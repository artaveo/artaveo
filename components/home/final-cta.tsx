import { CTASection } from '@/components/ui/patterns'

export function FinalCta() {
  return (
    <CTASection
      title={
        <>
          Have a project in mind?
          <span className="block text-muted-foreground">Let&apos;s build it.</span>
        </>
      }
      description="Share the idea, the timeline and what you need. You'll get a clear, direct reply about scope and next steps."
      primaryAction={{ href: '/contact', label: 'Start a project' }}
      secondaryAction={{ href: '/work', label: 'View work' }}
    />
  )
}
