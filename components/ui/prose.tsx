import type * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Prose — article-body typography (headings, paragraphs, lists, inline
 * code, links, blockquotes) for `en`/`fa` content. Width caps at
 * `--width-prose` (§4.2's reading-width token). Uses logical properties
 * throughout so it needs no separate RTL variant — `dir="rtl"` on an
 * ancestor is enough; only the numeral/Latin-run rules from D-03 (§5.3)
 * are still pending real Persian copy to apply them to.
 */
function Prose({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="prose"
      className={cn(
        'max-w-(--width-prose) text-base leading-relaxed text-foreground',
        // Vertical rhythm between block children, independent of tag order.
        '[&>*+*]:mt-5',
        // Headings
        '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-balance',
        '[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:text-balance',
        '[&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold',
        // Paragraphs & inline
        '[&_p]:leading-relaxed [&_p]:text-pretty',
        '[&_strong]:font-semibold [&_strong]:text-foreground',
        '[&_a]:text-inherit [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-foreground/30 [&_a:hover]:decoration-foreground',
        // Lists — logical padding so markers sit on the correct side in RTL
        '[&_ul]:ps-5 [&_ul]:list-disc [&_ol]:ps-5 [&_ol]:list-decimal [&_li]:mt-1.5',
        // Inline code
        "[&_:not(pre)>code]:rounded-sm [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em] [&_:not(pre)>code]:text-foreground",
        // Blockquote — matches components/ui/content.tsx's Blockquote
        '[&_blockquote]:border-s-2 [&_blockquote]:border-brand [&_blockquote]:ps-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic',
        // Images
        '[&_img]:rounded-lg [&_img]:border [&_img]:border-border',
        className,
      )}
      {...props}
    />
  )
}

export { Prose }
