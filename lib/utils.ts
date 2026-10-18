import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Phase 28: tailwind-merge must know Design System 2.0's type scale
 * (`--text-*` in app/globals.css). Unknown `text-*` classes are taken for
 * colours, so `text-small` next to `text-gold-foreground` silently dropped
 * the colour — the gold "Start a project" pill lost its dark text.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['h1', 'h2', 'h3', 'card-title', 'body', 'small'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
