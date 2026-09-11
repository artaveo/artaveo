import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'relative inline-flex w-fit items-center gap-1 rounded-lg border border-border bg-muted p-0.5',
        className,
      )}
      {...props}
    />
  )
}

function TabsTab({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        'relative z-1 inline-flex h-7 items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none select-none transition-colors',
        'hover:text-foreground',
        'data-[selected]:text-foreground',
        'focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

function TabsIndicator({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Indicator>) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        'absolute top-0.5 bottom-0.5 z-0 rounded-md bg-card shadow-xs transition-all duration-200 ease-standard',
        'left-(--active-tab-left) w-(--active-tab-width)',
        className,
      )}
      {...props}
    />
  )
}

function TabsPanel({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn('mt-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTab, TabsIndicator, TabsPanel }
