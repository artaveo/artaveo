import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { Separator as SeparatorPrimitive } from '@base-ui/react/separator'
import { ArrowUpRight } from 'lucide-react'
import NextLink from 'next/link'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Link — inline, standalone, and external variants.
 *
 * `variant="inline"` sits inside a paragraph (underline, no colour change).
 * `variant="standalone"` behaves like a small link-button (brand colour,
 * underline-on-hover, optional leading/trailing icon via `data-icon`).
 * External links (`external` or an `href` outside the app) automatically
 * get an arrow indicator and `target`/`rel`, unless `showExternalIcon` is
 * turned off.
 */
type LinkProps = React.ComponentProps<typeof NextLink> & {
  variant?: 'inline' | 'standalone'
  external?: boolean
  showExternalIcon?: boolean
}

function isExternalHref(href: LinkProps['href']) {
  const value = typeof href === 'string' ? href : (href?.pathname ?? '')
  return /^([a-z]+:)?\/\//i.test(value) || value.startsWith('mailto:') || value.startsWith('tel:')
}

function Link({
  className,
  variant = 'inline',
  external,
  showExternalIcon = true,
  href,
  children,
  ...props
}: LinkProps) {
  const isExternal = external ?? isExternalHref(href)

  return (
    <NextLink
      data-slot="link"
      href={href}
      className={cn(
        'group/link rounded-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        variant === 'inline' &&
          'text-inherit underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground',
        variant === 'standalone' &&
          'inline-flex items-center gap-1 text-sm font-medium text-brand-text underline-offset-4 hover:underline',
        className,
      )}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
    >
      {children}
      {isExternal && showExternalIcon ? (
        <ArrowUpRight
          data-icon="inline-end"
          aria-hidden="true"
          className="inline size-3.5 shrink-0 rtl:-scale-x-100"
        />
      ) : null}
    </NextLink>
  )
}

/** Square icon-only button. Requires `aria-label` since there is no visible text. */
type IconButtonProps = ButtonPrimitive.Props & {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
  size?: 'xs' | 'sm' | 'default' | 'lg'
  'aria-label': string
}

const iconButtonSize: Record<NonNullable<IconButtonProps['size']>, string> = {
  xs: "size-6 rounded-[min(var(--radius-md),10px)] [&_svg:not([class*='size-'])]:size-3",
  sm: "size-7 rounded-[min(var(--radius-md),12px)] [&_svg:not([class*='size-'])]:size-3.5",
  default: 'size-8',
  lg: 'size-9',
}

const iconButtonVariant: Record<NonNullable<IconButtonProps['variant']>, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/80',
  outline:
    'border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50',
  destructive:
    'bg-destructive/10 text-destructive-text hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30',
}

function IconButton({
  className,
  variant = 'ghost',
  size = 'default',
  ...props
}: IconButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="icon-button"
      className={cn(
        'group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        iconButtonVariant[variant],
        iconButtonSize[size],
        className,
      )}
      {...props}
    />
  )
}

/** Groups related buttons into one visually joined control (in‑`data-slot="button-group"`). */
function ButtonGroup({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<'div'> & { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(
        'inline-flex w-fit rounded-lg shadow-xs',
        orientation === 'horizontal'
          ? '[&>*]:rounded-none [&>*:not(:last-child)]:border-e-0 [&>*:first-child]:rounded-s-lg [&>*:last-child]:rounded-e-lg'
          : 'flex-col [&>*]:rounded-none [&>*:not(:last-child)]:border-b-0 [&>*:first-child]:rounded-t-lg [&>*:last-child]:rounded-b-lg',
        className,
      )}
      {...props}
    />
  )
}

/** Visual divider between buttons inside a `ButtonGroup`. */
function ButtonGroupSeparator({ className, ...props }: React.ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      orientation="vertical"
      data-slot="button-group-separator"
      className={cn('my-1 w-px self-stretch bg-border', className)}
      {...props}
    />
  )
}

/** Renders a keyboard shortcut, e.g. `<Kbd>⌘</Kbd><Kbd>K</Kbd>`. Always LTR — key glyphs never mirror. */
function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      dir="ltr"
      data-slot="kbd"
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-muted px-1.5 font-mono text-[0.7rem] font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Link, IconButton, ButtonGroup, ButtonGroupSeparator, Kbd }
