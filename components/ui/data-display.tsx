import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'
import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { Separator as SeparatorPrimitive } from '@base-ui/react/separator'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/** Progress — determinate bar. Pass `value={null}` for an indeterminate state. */
function Progress({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    >
      {children}
      <ProgressPrimitive.Track className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <ProgressPrimitive.Indicator className="block h-full rounded-full bg-brand transition-[width] duration-300 ease-standard data-[indeterminate]:w-1/3 data-[indeterminate]:animate-pulse" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

function ProgressLabel({
  className,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Label>) {
  return (
    <ProgressPrimitive.Label
      data-slot="progress-label"
      className={cn('text-sm font-medium text-foreground', className)}
      {...props}
    />
  )
}

function ProgressValue({
  className,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Value>) {
  return (
    <ProgressPrimitive.Value
      data-slot="progress-value"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

/** Avatar — falls back to initials/icon while the image loads or if it fails. */
function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        'relative flex size-9 shrink-0 overflow-hidden rounded-full bg-muted',
        className,
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('size-full object-cover', className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center text-xs font-medium text-muted-foreground select-none',
        className,
      )}
      {...props}
    />
  )
}

/** Separator — horizontal by default. Purely decorative unless given a real label via `aria-label`. */
function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}

/** Skeleton — a loading placeholder shaped like the content it replaces. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

export {
  Progress,
  ProgressLabel,
  ProgressValue,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
  Skeleton,
}
