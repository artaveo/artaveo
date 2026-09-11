import { ArrowUpRight } from 'lucide-react'

import { Section } from '@/components/showcase/section'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function CardsSection() {
  return (
    <Section
      id="cards"
      index="07 — Cards"
      title="Cards"
      description="Cards use borders and spacing to establish hierarchy rather than heavy shadows. The same primitive composes into project cards, service cards, and stat blocks without every card looking identical."
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
    >
      {/* Project card */}
      <Card className="overflow-hidden">
        <div
          aria-hidden="true"
          className="flex aspect-[16/10] items-center justify-center border-b border-border bg-muted"
        >
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Project image
          </span>
        </div>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="brand-soft">Full-Stack</Badge>
            <span className="font-mono text-xs text-muted-foreground">2025</span>
          </div>
          <CardTitle>Transportation System</CardTitle>
          <CardDescription>
            End-to-end platform for managing routes, fleets, and scheduling.
          </CardDescription>
        </CardHeader>
        <CardFooter className="mt-auto">
          <Button variant="outline" size="sm">
            Case Study
            <ArrowUpRight data-icon="inline-end" className="rtl:-scale-x-100" />
          </Button>
        </CardFooter>
      </Card>

      {/* Service card */}
      <Card>
        <CardHeader>
          <CardTitle>Web Application Development</CardTitle>
          <CardDescription>
            Modern, performant web applications built with React, Next.js, and
            TypeScript.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="muted">React</Badge>
          <Badge variant="muted">Next.js</Badge>
          <Badge variant="muted">PostgreSQL</Badge>
        </CardContent>
        <CardFooter className="mt-auto">
          <Button variant="link" className="px-0">
            Explore service
            <ArrowUpRight data-icon="inline-end" className="rtl:-scale-x-100" />
          </Button>
        </CardFooter>
      </Card>

      {/* Emphasis / brand card */}
      <Card className="border-brand/30 bg-brand-muted/40">
        <CardHeader>
          <span className="font-mono text-xs tracking-widest text-brand uppercase">
            Start
          </span>
          <CardTitle className="text-balance">
            Have a project in mind? Let&apos;s build it.
          </CardTitle>
          <CardDescription>
            Direct communication, end-to-end execution, one accountable
            developer.
          </CardDescription>
        </CardHeader>
        <CardFooter className="mt-auto">
          <Button>Start a Project</Button>
        </CardFooter>
      </Card>
    </Section>
  )
}
