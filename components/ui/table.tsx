import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Table — a real `<table>` at `md:` and above; below that, each row
 * restacks into a labelled card using each cell's `data-label` (set via
 * `TableCell`'s `label` prop), so no data is hidden on small screens.
 */
function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border" data-slot="table-container">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm max-md:block', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('border-b border-border bg-muted/50 max-md:hidden', className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('divide-y divide-border max-md:block', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'transition-colors hover:bg-muted/40',
        'max-md:flex max-md:flex-col max-md:gap-2 max-md:border-b max-md:border-border max-md:p-4 max-md:last:border-b-0',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn(
        'h-10 px-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wide',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  label,
  children,
  ...props
}: React.ComponentProps<'td'> & { label?: string }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'px-3 py-3 align-middle text-foreground',
        'max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-0',
        className,
      )}
      {...props}
    >
      {label ? (
        <span className="hidden text-xs font-medium text-muted-foreground uppercase max-md:inline" aria-hidden="true">
          {label}
        </span>
      ) : null}
      <span className="max-md:text-end">{children}</span>
    </td>
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
