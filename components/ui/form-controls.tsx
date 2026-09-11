import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Field as FieldPrimitive } from '@base-ui/react/field'
import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { AlertCircle, Check } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Field — groups a Label, its control, an optional hint, and validation
 * error into one accessible unit (`aria-describedby` wiring handled by
 * Base UI's Field primitive). Use `Field.Label` / `Field.Description` /
 * `Field.Error` as children alongside the control, or the convenience
 * exports below for a plain-HTML control.
 */
function Field({ className, ...props }: React.ComponentProps<typeof FieldPrimitive.Root>) {
  return (
    <FieldPrimitive.Root
      data-slot="field"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof FieldPrimitive.Label>) {
  return (
    <FieldPrimitive.Label
      data-slot="field-label"
      className={cn('text-sm font-medium text-foreground select-none', className)}
      {...props}
    />
  )
}

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<typeof FieldPrimitive.Description>) {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  )
}

/** Field-level error text, only rendered by Base UI when the field is actually invalid. */
function FieldError({ className, ...props }: React.ComponentProps<typeof FieldPrimitive.Error>) {
  return (
    <FieldPrimitive.Error
      data-slot="field-error"
      className={cn('flex items-center gap-1 text-xs text-destructive-text', className)}
      {...props}
    >
      <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
      {props.children}
    </FieldPrimitive.Error>
  )
}

/**
 * FormMessage — a standalone status/inline message strip for a whole form or
 * section (submit success, submit error, rate-limit notice), as opposed to
 * `FieldError`, which attaches to one control.
 */
const formMessageVariant = {
  success: 'border-success/25 bg-success/10 text-success-text',
  destructive: 'border-destructive/20 bg-destructive/10 text-destructive-text',
  warning: 'border-warning/25 bg-warning/15 text-warning-text',
  info: 'border-info/20 bg-info/10 text-info-text',
} as const

function FormMessage({
  className,
  variant = 'info',
  icon,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  variant?: keyof typeof formMessageVariant
  icon?: React.ReactNode
}) {
  return (
    <div
      role={variant === 'destructive' ? 'alert' : 'status'}
      data-slot="form-message"
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
        formMessageVariant[variant],
        className,
      )}
      {...props}
    >
      {icon ?? (variant === 'destructive' ? (
        <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
      ) : (
        <Check aria-hidden="true" className="size-4 shrink-0" />
      ))}
      {children}
    </div>
  )
}

/** Checkbox — supports `indeterminate`. Renders a real hidden `<input>` for forms. */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-card shadow-xs outline-none transition-colors',
        'data-[checked]:border-brand data-[checked]:bg-brand data-[checked]:text-brand-foreground',
        'data-[indeterminate]:border-brand data-[indeterminate]:bg-brand data-[indeterminate]:text-brand-foreground',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {props.indeterminate ? (
          <span aria-hidden="true" className="block h-px w-2 rounded-full bg-current" />
        ) : (
          <Check aria-hidden="true" className="size-3" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

/** RadioGroup — wrap `Radio` items inside. `orientation` controls arrow-key navigation. */
function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive>) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function Radio({ className, ...props }: React.ComponentProps<typeof RadioPrimitive.Root>) {
  return (
    <RadioPrimitive.Root
      data-slot="radio"
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-card shadow-xs outline-none transition-colors',
        'data-[checked]:border-brand',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="block size-2 rounded-full bg-brand" />
    </RadioPrimitive.Root>
  )
}

/** Switch — on/off toggle. The thumb slides using logical `inset-inline-start`, so it is RTL-correct without a manual mirror. */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-8 shrink-0 items-center rounded-full border border-transparent bg-muted shadow-xs outline-none transition-colors',
        'data-[checked]:bg-brand',
        'focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block size-4 rounded-full bg-background shadow-sm transition-transform',
          'ms-0.5 data-[checked]:translate-x-[calc(100%-2px)] rtl:data-[checked]:-translate-x-[calc(100%-2px)]',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FormMessage,
  Checkbox,
  RadioGroup,
  Radio,
  Switch,
}
