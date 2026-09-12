'use client'

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileQuestion,
  Inbox,
  RefreshCw,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'
import type * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type StateAction = { label: string; onClick?: () => void; href?: string }
type StateSize = 'inline' | 'section' | 'page'

const sizeClasses: Record<StateSize, string> = {
  inline: 'gap-2 py-3 text-sm',
  section: 'gap-3 py-12',
  page: 'gap-4 py-24',
}

const iconSizeClasses: Record<StateSize, string> = {
  inline: 'size-4',
  section: 'size-8',
  page: 'size-10',
}

function StateActionButton({ action }: { action: StateAction }) {
  if (!action.href) {
    return (
      <Button size="sm" variant="outline" onClick={action.onClick}>
        {action.label}
      </Button>
    )
  }
  return (
    <Button size="sm" variant="outline" render={<a href={action.href} />}>
      {action.label}
    </Button>
  )
}

type StateShellProps = {
  icon: LucideIcon
  iconClassName: string
  title: React.ReactNode
  description?: React.ReactNode
  size?: StateSize
  action?: StateAction
  role?: 'status' | 'alert'
  className?: string
}

/** Shared layout every state pattern below is built from — keeps spacing, icon size, and copy hierarchy identical across Empty/Error/Success/Rate-limited/Offline. */
function StateShell({
  icon: Icon,
  iconClassName,
  title,
  description,
  size = 'section',
  action,
  role = 'status',
  className,
}: StateShellProps) {
  return (
    <div
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeClasses[size],
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn(iconSizeClasses[size], iconClassName)} />
      <p className={cn('font-medium text-foreground', size === 'inline' && 'text-sm')}>{title}</p>
      {description ? (
        <p
          className={cn(
            'max-w-sm text-muted-foreground text-pretty',
            size === 'inline' ? 'text-xs' : 'text-sm leading-relaxed',
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? <StateActionButton action={action} /> : null}
    </div>
  )
}

/**
 * EmptyState — "nothing here yet". Admin, preview, and CMS surfaces only
 * (per roadmap § 4.4) — the public site never shows an empty list, it hides
 * the section instead (see `/work`'s filter rule in § 6.1).
 */
function EmptyState({
  title = 'Nothing here yet',
  description,
  action,
  size = 'section',
  className,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: StateAction
  size?: StateSize
  className?: string
}) {
  return (
    <StateShell
      icon={Inbox}
      iconClassName="text-muted-foreground"
      title={title}
      description={description}
      action={action}
      size={size}
      className={className}
    />
  )
}

/**
 * LoadingState — wraps skeleton content with the `status`/`aria-live` region
 * a screen reader needs to announce "loading" once, instead of narrating
 * every `Skeleton` block individually. Pass the skeleton layout as children;
 * this component only owns the announcement, not the shape.
 */
function LoadingState({
  label = 'Loading…',
  children,
  className,
}: {
  label?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  )
}

/**
 * ErrorState — three sizes for three real placements: `inline` (a single
 * field or card failed), `section` (one section of a page failed to load),
 * `page` (the whole route failed — pairs with `app/error.tsx` boundaries).
 */
function ErrorState({
  title = 'Something went wrong',
  description,
  action,
  size = 'section',
  className,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: StateAction
  size?: StateSize
  className?: string
}) {
  return (
    <StateShell
      icon={AlertTriangle}
      iconClassName="text-destructive-text"
      title={title}
      description={description}
      action={action ?? { label: 'Try again' }}
      size={size}
      role="alert"
      className={className}
    />
  )
}

/**
 * NotFoundState — a route or resource genuinely doesn't exist (`size="page"`
 * pairs with `app/[locale]/not-found.tsx`; `size="section"` for a missing
 * item inside an otherwise-fine page, e.g. a bad case-study slug in § 6).
 * Distinct from `ErrorState`: this isn't a failure, it's an honest "not
 * here" — different icon, no destructive tone, default action points home
 * rather than retrying.
 */
function NotFoundState({
  title = 'Page not found',
  description,
  action,
  size = 'page',
  className,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: StateAction
  size?: StateSize
  className?: string
}) {
  return (
    <StateShell
      icon={FileQuestion}
      iconClassName="text-muted-foreground"
      title={title}
      description={description}
      action={action}
      size={size}
      className={className}
    />
  )
}

/** SuccessState — confirms a completed action (form submitted, brief sent…). */
function SuccessState({
  title = 'Done',
  description,
  action,
  size = 'section',
  className,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: StateAction
  size?: StateSize
  className?: string
}) {
  return (
    <StateShell
      icon={CheckCircle2}
      iconClassName="text-success-text"
      title={title}
      description={description}
      action={action}
      size={size}
      className={className}
    />
  )
}

/** RateLimitedState — too many attempts (contact form, Brief Builder submit). */
function RateLimitedState({
  title = "You're going a bit fast",
  description = 'Please wait a moment before trying again.',
  action,
  size = 'section',
  className,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: StateAction
  size?: StateSize
  className?: string
}) {
  return (
    <StateShell
      icon={Clock}
      iconClassName="text-warning-text"
      title={title}
      description={description}
      action={action}
      size={size}
      className={className}
    />
  )
}

/**
 * OfflineState — no network. Per § 10 (PWA), the Brief Builder must never
 * show a false success while offline — this is the honest state it shows
 * instead, with a retry action rather than a disabled dead end.
 */
function OfflineState({
  title = "You're offline",
  description = "This page needs a connection. It'll pick up automatically once you're back online.",
  action,
  size = 'section',
  className,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: StateAction
  size?: StateSize
  className?: string
}) {
  return (
    <StateShell
      icon={WifiOff}
      iconClassName="text-muted-foreground"
      title={title}
      description={description}
      action={action ?? { label: 'Retry', onClick: () => window.location.reload() }}
      size={size}
      className={className}
    />
  )
}

export { EmptyState, LoadingState, ErrorState, NotFoundState, SuccessState, RateLimitedState, OfflineState }
export { RefreshCw as RetryIcon }
