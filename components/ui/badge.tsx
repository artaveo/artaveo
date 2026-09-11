import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors [&_svg]:size-3 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border bg-transparent text-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
        brand: 'border-transparent bg-brand text-brand-foreground',
        'brand-soft': 'border-brand/20 bg-brand/10 text-foreground',
        success: 'border-success/20 bg-success/10 text-success-text',
        warning: 'border-warning/25 bg-warning/15 text-warning-text',
        info: 'border-info/20 bg-info/10 text-info-text',
        destructive: 'border-destructive/20 bg-destructive/10 text-destructive-text',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
