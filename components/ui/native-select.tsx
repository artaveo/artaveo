import { ChevronDown } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * A native `<select>`, styled like `Input`. Chosen over the Base UI `Select`
 * for the consultation forms on purpose: a time-zone list has ~400 entries,
 * a time list has 48, and on a phone the platform's own picker is the best
 * control for both — searchable, accessible, no custom popup to get wrong in
 * right-to-left. The chevron sits on the logical end edge so it mirrors in RTL.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative w-full min-w-0">
      <select
        data-slot="native-select"
        className={cn(
          'h-9 w-full min-w-0 appearance-none rounded-lg border border-input bg-card ps-3 pe-9 text-sm text-foreground shadow-xs transition-colors outline-none',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

export { NativeSelect }
