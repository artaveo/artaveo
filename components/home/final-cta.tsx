import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="py-20 md:py-28">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-16 text-center md:px-12 md:py-24">
          {/* Same technical grid as the hero, so the page opens and closes alike. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.4] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          />

          <div className="relative mx-auto max-w-2xl">
            <h2
              id="cta-title"
              className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl"
            >
              Have a project in mind?
              <span className="block text-muted-foreground">Let&apos;s build it.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl leading-relaxed text-muted-foreground text-pretty md:text-lg">
              Share the idea, the timeline and what you need. You&apos;ll get a
              clear, direct reply about scope and next steps.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-11 px-5 text-[0.95rem]" render={<Link href="/contact" />}>
                Start a project
                <ArrowRight data-icon="inline-end" className="rtl:rotate-180" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-5 text-[0.95rem]"
                render={<Link href="/work" />}
              >
                View work
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
