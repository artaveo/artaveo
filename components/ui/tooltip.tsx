import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/** Wrap the app (or a section) once so tooltips share open/close delay timing. */
const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

function TooltipContent({
  className,
  children,
  side = 'top',
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Popup> &
  Pick<React.ComponentProps<typeof TooltipPrimitive.Positioner>, 'side' | 'sideOffset'>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset} className="z-dropdown">
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            'rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-sm',
            'origin-[var(--transform-origin)] transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent }
