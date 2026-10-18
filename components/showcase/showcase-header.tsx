import { DirectionToggle } from '@/components/showcase/direction-toggle'
import { ThemeToggle } from '@/components/theme-toggle'

const nav = [
  { href: '#foundations', label: 'Foundations' },
  { href: '#ds2-tokens', label: '2.0 Tokens' },
  { href: '#ds2-glass', label: '2.0 Glass' },
  { href: '#ds2-components', label: '2.0 Components' },
  { href: '#color', label: 'Color' },
  { href: '#typography', label: 'Type' },
  { href: '#spacing', label: 'Spacing' },
  { href: '#buttons', label: 'Buttons' },
  { href: '#forms', label: 'Forms' },
  { href: '#actions', label: 'Actions' },
  { href: '#form-controls', label: 'Controls' },
  { href: '#overlays', label: 'Overlays' },
  { href: '#disclosure', label: 'Disclosure' },
  { href: '#data-content', label: 'Content' },
  { href: '#cards', label: 'Cards' },
  { href: '#layout', label: 'Layout' },
  { href: '#patterns', label: 'Patterns' },
  { href: '#states', label: 'States' },
  { href: '#frames', label: 'Frames' },
  { href: '#form-layouts', label: 'Form layouts' },
  { href: '#identity', label: 'Identity' },
]

export function ShowcaseHeader() {
  return (
    <header className="sticky top-0 z-sticky border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex shrink-0 items-center gap-3">
          <span dir="ltr" className="font-mono text-sm font-semibold tracking-[0.2em]">
            ARTAVEO
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            / Design System
          </span>
        </div>
        <nav
          aria-label="Design system sections"
          className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <DirectionToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
