'use client'

import { AlertTriangle, Check, Info, Lightbulb, XCircle } from 'lucide-react'
import { useState } from 'react'
import type * as React from 'react'

import { IconButton } from '@/components/ui/actions'
import { cn } from '@/lib/utils'

/** Callout — an in-content aside (note, warning, tip) inside an article, distinct from `FormMessage` (form/section-level status). */
const calloutConfig = {
  info: { icon: Info, classes: 'border-info/20 bg-info/10 text-info-text' },
  warning: { icon: AlertTriangle, classes: 'border-warning/25 bg-warning/15 text-warning-text' },
  danger: { icon: XCircle, classes: 'border-destructive/20 bg-destructive/10 text-destructive-text' },
  tip: { icon: Lightbulb, classes: 'border-success/25 bg-success/10 text-success-text' },
} as const

function Callout({
  variant = 'info',
  title,
  children,
  className,
}: {
  variant?: keyof typeof calloutConfig
  title?: string
  children: React.ReactNode
  className?: string
}) {
  const { icon: Icon, classes } = calloutConfig[variant]
  return (
    <div
      data-slot="callout"
      role={variant === 'danger' ? 'alert' : 'note'}
      className={cn('flex gap-3 rounded-lg border p-4 text-sm', classes, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        {title ? <p className="font-medium">{title}</p> : null}
        <div className="leading-relaxed [&_p]:m-0">{children}</div>
      </div>
    </div>
  )
}

/** CodeBlock — always LTR (code, paths, and URLs never mirror), with a copy button. Syntax highlighting is out of scope here; pass pre-highlighted `children` if needed later. */
function CodeBlock({
  code,
  language,
  className,
}: {
  code: string
  language?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard permission denied or unavailable — no destructive fallback needed.
    }
  }

  return (
    <div
      dir="ltr"
      data-slot="code-block"
      className={cn('group/code relative overflow-hidden rounded-lg border border-border bg-elevated', className)}
    >
      {language ? (
        <div className="flex items-center justify-between border-b border-border px-4 py-1.5">
          <span className="font-mono text-xs text-muted-foreground">{language}</span>
        </div>
      ) : null}
      <IconButton
        aria-label="Copy code"
        variant="ghost"
        size="xs"
        onClick={handleCopy}
        className="absolute end-2 top-2 opacity-0 transition-opacity group-hover/code:opacity-100 focus-visible:opacity-100"
      >
        {copied ? <Check className="text-success-text" /> : <CopyIcon />}
      </IconButton>
      <pre className="overflow-x-auto p-4 text-sm">
        <code className="font-mono text-foreground">{code}</code>
      </pre>
    </div>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

/** Blockquote — for pull-quotes inside article prose. */
function Blockquote({ className, ...props }: React.ComponentProps<'blockquote'>) {
  return (
    <blockquote
      data-slot="blockquote"
      className={cn(
        'border-s-2 border-brand ps-4 text-base leading-relaxed text-muted-foreground italic',
        className,
      )}
      {...props}
    />
  )
}

export { Callout, CodeBlock, Blockquote }
