import Link from 'next/link'

import { ArtaveoMark } from '@/components/site/artaveo-mark'
import { Link as ActionLink } from '@/components/ui/actions'
import { ExternalProfileLinks } from '@/components/ui/identity'
import { mainNav, siteConfig, utilityNav } from '@/lib/site'

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-elevated">
      <div className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href="/" className="flex items-center gap-2" aria-label="Artaveo home">
              <ArtaveoMark className="size-7 text-foreground" />
              <span dir="ltr" className="font-mono text-sm font-semibold tracking-[0.2em]">
                ARTAVEO
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
              {siteConfig.description}
            </p>
            <ActionLink
              href={`mailto:${siteConfig.email}`}
              variant="standalone"
              className="mt-6"
            >
              {siteConfig.email}
            </ActionLink>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <FooterCol title="Explore" items={mainNav} />
            <FooterCol title="More" items={utilityNav} />
            <div>
              <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                Social
              </h3>
              <ExternalProfileLinks className="mt-4 flex-col items-start gap-x-0 gap-y-3" />
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            © {year} {siteConfig.name}. {siteConfig.location}.
          </p>
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Built full-stack, shipped end to end
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  items,
}: {
  title: string
  items: { href: string; label: string }[]
}) {
  return (
    <div>
      <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
        {title}
      </h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
