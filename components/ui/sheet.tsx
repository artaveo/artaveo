import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Sheet — an edge-anchored panel (mobile nav, filter drawer, quick-view).
 * Built on the same `Dialog` root as `dialog.tsx` (focus trap, scroll lock,
 * Escape-to-close all come from there) rather than Base UI's swipeable
 * `Drawer`, which is tuned for a different case (mobile bottom-sheet with
 * drag-to-dismiss). `side="start"/"end"` are logical — they flip with
 * `dir="rtl"` automatically; `"top"/"bottom"` don't need to.
 */
const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close

type Side = 'start' | 'end' | 'top' | 'bottom'

const sheetSide: Record<Side, string> = {
  start:
    'inset-y-0 start-0 h-full w-[85vw] max-w-sm border-e data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full rtl:data-[ending-style]:translate-x-full rtl:data-[starting-style]:translate-x-full',
  end: 'inset-y-0 end-0 h-full w-[85vw] max-w-sm border-s data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full rtl:data-[ending-style]:-translate-x-full rtl:data-[starting-style]:-translate-x-full',
  top: 'inset-x-0 top-0 w-full border-b data-[ending-style]:-translate-y-full data-[starting-style]:-translate-y-full',
  bottom:
    'inset-x-0 bottom-0 w-full border-t data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full',
}

function SheetContent({
  className,
  children,
  side = 'end',
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup> & { side?: Side; showClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn(
          'fixed inset-0 z-overlay bg-overlay',
          'transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
        )}
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          'fixed z-modal flex flex-col gap-4 border-border bg-card p-6 text-card-foreground shadow-lg outline-none',
          'transition-transform duration-300 ease-standard',
          sheetSide[side],
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute top-4 end-4 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <X className="size-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="sheet-header" className={cn('flex flex-col gap-1.5 pe-6', className)} {...props} />
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-lg font-semibold tracking-tight text-balance', className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex items-center justify-end gap-3', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
}
