import { ThemeToggle } from '@/components/theme-toggle'

const nav = [
  { href: '#foundations', label: 'Foundations' },
  { href: '#color', label: 'Color' },
  { href: '#typography', label: 'Type' },
  { href: '#spacing', label: 'Spacing' },
  { href: '#buttons', label: 'Buttons' },
  { href: '#forms', label: 'Forms' },
  { href: '#cards', label: 'Cards' },
  { href: '#layout', label: 'Layout' },
]

export function ShowcaseHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-semibold tracking-[0.2em]">
            ARTAVEO
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            / Design System
          </span>
        </div>
        <nav
          aria-label="Design system sections"
          className="hidden items-center gap-1 lg:flex"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}
