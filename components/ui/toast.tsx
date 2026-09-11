'use client'

import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import { AlertCircle, Check, Info, X } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Toast — wrap the app once in `ToastProvider`, render one `Toaster` near
 * the root (it owns its own viewport/portal), then call `useToast().add(...)`
 * from anywhere to queue a toast. `type` maps to the same semantic tokens
 * used everywhere else (success/destructive/warning/info), default is a
 * plain neutral toast.
 */
const ToastProvider = ToastPrimitive.Provider
const useToast = ToastPrimitive.useToastManager

const toastTypeStyle: Record<string, { icon: React.ReactNode; classes: string }> = {
  success: {
    icon: <Check aria-hidden="true" className="size-4 shrink-0" />,
    classes: 'border-success/25 bg-success/10 text-success-text',
  },
  destructive: {
    icon: <AlertCircle aria-hidden="true" className="size-4 shrink-0" />,
    classes: 'border-destructive/20 bg-destructive/10 text-destructive-text',
  },
  warning: {
    icon: <AlertCircle aria-hidden="true" className="size-4 shrink-0" />,
    classes: 'border-warning/25 bg-warning/15 text-warning-text',
  },
  info: {
    icon: <Info aria-hidden="true" className="size-4 shrink-0" />,
    classes: 'border-info/20 bg-info/10 text-info-text',
  },
}

function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        data-slot="toast-viewport"
        className="fixed inset-x-4 bottom-4 z-toast flex w-auto flex-col gap-2 sm:inset-x-auto sm:end-4 sm:w-80"
      >
        {toasts.map((toast) => {
          const tone = toastTypeStyle[toast.type ?? ''] ?? {
            icon: null,
            classes: 'border-border bg-popover text-popover-foreground',
          }
          return (
            <ToastPrimitive.Root
              key={toast.id}
              toast={toast}
              data-slot="toast"
              className={cn(
                'relative flex items-start gap-2.5 rounded-lg border p-3 pe-8 text-sm shadow-lg outline-none',
                'transition-[transform,opacity] data-[ending-style]:opacity-0 data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0',
                tone.classes,
              )}
            >
              {tone.icon}
              <div className="flex flex-col gap-0.5">
                {toast.title ? (
                  <ToastPrimitive.Title className="font-medium" />
                ) : null}
                {toast.description ? (
                  <ToastPrimitive.Description className="text-muted-foreground" />
                ) : null}
              </div>
              <ToastPrimitive.Close
                aria-label="Dismiss"
                className="absolute top-2 end-2 inline-flex size-5 items-center justify-center rounded outline-none transition-colors hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <X className="size-3.5" aria-hidden="true" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          )
        })}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  )
}

export { ToastProvider, Toaster, useToast }
