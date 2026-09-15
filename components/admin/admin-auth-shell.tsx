import { ArtaveoMark } from '@/components/site/artaveo-mark'

/**
 * Deliberately outside `SiteShell` (no `SiteHeader`/`SiteFooter`/command
 * palette) — the admin panel is an internal tool, not a marketing page,
 * same reasoning `/design-system` already uses for going chrome-free.
 */
export function AdminAuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <ArtaveoMark className="h-8 w-auto text-foreground" />
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-balance">{title}</h1>
            {description ? (
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
