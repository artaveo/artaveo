import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden border-b border-border"
    >
      {/* Technical grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4] [background-image:linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
      />

      <div className="container-page relative grid items-center gap-14 py-20 md:py-28 lg:grid-cols-12 lg:gap-10 lg:py-32">
        <div className="lg:col-span-7">
          <Badge variant="brand-soft" className="mb-6">
            <span className="me-1 inline-block size-1.5 rounded-full bg-brand" />
            Available for new projects
          </Badge>

          <h1
            id="hero-title"
            className="max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl xl:text-7xl"
          >
            Full-stack products,
            <span className="text-muted-foreground"> built end to end.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty md:text-xl">
            Artaveo is an independent development studio for modern web
            applications, business platforms and digital products — taken from
            the first idea through architecture, interface, backend and
            database to a deployed product.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" className="h-11 px-5 text-[0.95rem]" render={<Link href="/work" />}>
              View our work
              <ArrowRight data-icon="inline-end" className="rtl:rotate-180" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-5 text-[0.95rem]"
              render={<Link href="/contact" />}
            >
              Start a project
            </Button>
          </div>
        </div>

        <HeroVisual className="hidden md:block lg:col-span-5" />
      </div>
    </section>
  )
}

/**
 * A typed "project definition" panel: a quiet, technical visual that says
 * what Artaveo delivers in the language of the work itself. Decorative —
 * the same information is in the copy — so it is hidden from assistive tech.
 * Code always reads left-to-right, including in the Persian layout.
 */
function HeroVisual({ className }: { className?: string }) {
  return (
    <div aria-hidden className={className}>
      <div className="relative mx-auto max-w-lg lg:max-w-none">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-md">
          <div className="flex items-center justify-between border-b border-border bg-elevated px-4 py-2.5">
            <span className="font-mono text-xs text-muted-foreground">
              project.ts
            </span>
            <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              TypeScript
            </span>
          </div>

          <pre
            dir="ltr"
            className="overflow-x-auto p-5 text-left font-mono text-[13px] leading-6 md:text-sm md:leading-7 lg:text-[13px] lg:leading-6 xl:text-sm xl:leading-7"
          >
            <code>
              <Line n={1}>
                <Kw>export const</Kw> <Id>project</Id> <P>=</P> <P>{'{'}</P>
              </Line>
              <Line n={2}>
                {'  '}
                <Prop>studio</Prop>
                <P>:</P> <Str>&apos;Artaveo&apos;</Str>
                <P>,</P>
              </Line>
              <Line n={3}>
                {'  '}
                <Prop>scope</Prop>
                <P>: [</P>
                <Str>&apos;architecture&apos;</Str>
                <P>,</P> <Str>&apos;interface&apos;</Str>
                <P>,</P>
              </Line>
              <Line n={4}>
                {'          '}
                <Str>&apos;api&apos;</Str>
                <P>,</P> <Str>&apos;database&apos;</Str>
                <P>],</P>
              </Line>
              <Line n={5}>
                {'  '}
                <Prop>stack</Prop>
                <P>: [</P>
                <Str>&apos;Next.js&apos;</Str>
                <P>,</P> <Str>&apos;TypeScript&apos;</Str>
                <P>,</P>
              </Line>
              <Line n={6}>
                {'          '}
                <Str>&apos;PostgreSQL&apos;</Str>
                <P>],</P>
              </Line>
              <Line n={7}>
                {'  '}
                <Prop>delivery</Prop>
                <P>:</P> <Str>&apos;end-to-end&apos;</Str>
                <P>,</P>
              </Line>
              <Line n={8}>
                {'  '}
                <Prop>handoffs</Prop>
                <P>:</P> <Kw>false</Kw>
                <P>,</P>
              </Line>
              <Line n={9}>
                <P>{'}'}</P> <Kw>satisfies</Kw> <Id>Product</Id>
              </Line>
            </code>
          </pre>

          <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
            <span className="inline-block size-1.5 rounded-full bg-success" />
            Typed from database to interface
          </div>
        </div>
      </div>
    </div>
  )
}

function Line({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <span className="block whitespace-pre">
      <span className="inline-block w-6 text-muted-foreground/50 select-none">
        {n}
      </span>
      {children}
    </span>
  )
}

function Kw({ children }: { children: React.ReactNode }) {
  return <span className="text-brand">{children}</span>
}
function Id({ children }: { children: React.ReactNode }) {
  return <span className="text-foreground">{children}</span>
}
function Prop({ children }: { children: React.ReactNode }) {
  return <span className="text-foreground/80">{children}</span>
}
function Str({ children }: { children: React.ReactNode }) {
  return <span className="text-success">{children}</span>
}
function P({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>
}
