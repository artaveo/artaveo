import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Technical grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
      />

      <div className="container-page relative py-20 md:py-28 lg:py-36">
        <Badge variant="brand-soft" className="mb-6">
          <span className="me-1 inline-block size-1.5 rounded-full bg-brand" />
          Available for new projects
        </Badge>

        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl">
          We build full-stack products,
          <span className="text-muted-foreground"> end to end.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty md:text-xl">
          Artaveo is an independent development studio. We take web products
          from architecture and design systems all the way to shipped,
          production-grade software — fast, reliable, and built to scale.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button size="lg" className="h-11 px-5 text-[0.95rem]" render={<Link href="/contact" />}>
            Start a project
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11 px-5 text-[0.95rem]"
            render={<Link href="/work" />}
          >
            View our work
          </Button>
        </div>

        <dl className="mt-16 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
          {[
            { v: '40+', k: 'Products shipped' },
            { v: '8yrs', k: 'Building the web' },
            { v: '99.9%', k: 'Uptime delivered' },
            { v: '1', k: 'Team, no handoffs' },
          ].map((stat) => (
            <div key={stat.k}>
              <dt className="font-mono text-2xl font-semibold tracking-tight md:text-3xl">
                {stat.v}
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground text-pretty">
                {stat.k}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
