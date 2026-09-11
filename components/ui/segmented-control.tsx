import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * SegmentedControl — a single-select group of options rendered as one
 * joined control (view switchers, density toggles). For multi-select use
 * Base UI's `ToggleGroup` directly instead.
 */
function SegmentedControl({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive> & { size?: 'sm' | 'default' }) {
  return (
    <ToggleGroupPrimitive
      data-slot="segmented-control"
      data-size={size}
      multiple={false}
      className={cn(
        'inline-flex w-fit items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5',
        className,
      )}
      {...props}
    />
  )
}

function SegmentedControlItem({
  className,
  ...props
}: React.ComponentProps<typeof TogglePrimitive>) {
  return (
    <TogglePrimitive
      data-slot="segmented-control-item"
      className={cn(
        'inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all outline-none select-none',
        'in-data-[size=sm]:h-6 in-data-[size=sm]:px-2 in-data-[size=sm]:text-xs',
        'hover:text-foreground',
        'data-[pressed]:bg-card data-[pressed]:text-foreground data-[pressed]:shadow-xs',
        'focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:opacity-50',
        "[&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    />
  )
}

export { SegmentedControl, SegmentedControlItem }
