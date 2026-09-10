import type * as React from 'react'

import { cn } from '@/lib/utils'

type SectionProps = {
  id: string
  index: string
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Section({
  id,
  index,
  title,
  description,
  children,
  className,
}: SectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-border py-14 first:border-t-0 md:py-20"
    >
      <div className="mb-8 flex flex-col gap-3 md:mb-10">
        <span className="font-mono text-xs tracking-widest text-brand uppercase">
          {index}
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      <div className={cn(className)}>{children}</div>
    </section>
  )
}

export function Subhead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 font-mono text-xs font-medium tracking-widest text-muted-foreground uppercase">
      {children}
    </h3>
  )
}
