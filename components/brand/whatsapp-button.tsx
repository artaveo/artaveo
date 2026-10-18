import { MessageCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Phase 28.5 — the floating WhatsApp button (§ 14.0): WhatsApp is the main
 * contact channel in Afghanistan. The number comes from the admin
 * (`site_settings.whatsapp_number` → `whatsappHref()`); with no number the
 * button is not rendered. It sits at the bottom of the reading-end side
 * (left on Dari pages, right on English ones); the shell (Phase 29) keeps it
 * clear of content and of the mobile call-to-action. `fixed = false` places
 * it in flow, for the /design-system preview.
 */
export function FloatingWhatsAppButton({
  href,
  label,
  fixed = true,
  className,
}: {
  href: string | null | undefined
  label: string
  fixed?: boolean
  className?: string
}) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      data-slot="whatsapp-button"
      className={cn(
        'grid size-14 place-items-center rounded-full bg-whatsapp text-white shadow-float outline-none hover:brightness-110 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-offset-2',
        fixed && 'fixed end-6 bottom-6 z-sticky',
        className,
      )}
    >
      <MessageCircle aria-hidden="true" className="size-6" />
    </a>
  )
}
