'use client'

import { ChevronDown, Menu, MessageCircle, Package, Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState } from 'react'
import type * as React from 'react'

import { ForwardArrow, ServiceKindIcon } from '@/components/brand/brand-icons'
import { PillLink } from '@/components/brand/pill'
import { Link, usePathname } from '@/i18n/navigation'
import { ensureContrast } from '@/lib/design/color'
import { cn } from '@/lib/utils'
import type { ServiceKind } from '@/types/content'

/**
 * Phase 28.5 — the glass header of Design System 2.0 (§ 14.0 Glass Header +
 * Mega Menus, § 14.1 Glass). Logo; Products and Services as mega menus (icon
 * and one line per entry, plus a "Start a Project" card); Work; About; a
 * search icon (no "⌘K" text); the language switch; Start a Project. Below the
 * header's container width of 56rem the links fold into a glass mobile menu.
 *
 * Every entry is data — products from `projects` (`is_product`), services
 * from `services`, links from `navigation_items` — and the Products menu is
 * not drawn while no product is published (§ 15: Products stays out of the
 * menu until one is).
 *
 * Menus are disclosure buttons (`aria-expanded` + `aria-controls`): one open
 * at a time; Escape closes and returns focus to the button; a click outside,
 * or moving to another page, closes them. Glass layers: the header and one
 * open menu — two, under § 14.1's limit of three.
 */

export type MegaProduct = { href: string; title: string; line: string; accentColor?: string | null }
export type MegaService = { href: string; title: string; line: string; kind?: ServiceKind }
export type HeaderLink = { href: string; label: string }

type OpenMenu = 'products' | 'services' | 'mobile' | null

/** The dark glass behind a menu (its solid fallback and its fill over ink): an icon there needs 3:1. */
const MENU_GROUNDS = ['#171a22', '#11141c']

export function GlassHeader({
  logo,
  homeHref = '/',
  products,
  allProductsHref,
  services,
  allServicesHref,
  links,
  startHref,
  whatsappHref,
  languageSwitch,
  onSearch,
  sticky = true,
}: {
  logo: React.ReactNode
  homeHref?: string
  products: MegaProduct[]
  allProductsHref?: string
  services: MegaService[]
  allServicesHref?: string
  /** Work, About — in order. */
  links: HeaderLink[]
  startHref: string
  whatsappHref?: string | null
  languageSwitch?: React.ReactNode
  /** Opens the site search (the command palette). Without it the search icon is not shown. */
  onSearch?: () => void
  /** `false` on /design-system, where the header is previewed inside the page. */
  sticky?: boolean
}) {
  const tr = useTranslations('Brand')
  const [open, setOpen] = useState<OpenMenu>(null)
  const rootRef = useRef<HTMLElement>(null)
  const triggers = useRef<Partial<Record<Exclude<OpenMenu, null>, HTMLButtonElement | null>>>({})
  const pathname = usePathname()
  const id = useId()
  const panelId = (menu: Exclude<OpenMenu, null>) => `${id}-${menu}`

  // A new page closes any open menu.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(null)
  }

  useEffect(() => {
    if (!open) return
    const current = open
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(null)
      triggers.current[current]?.focus()
    }
    function onPointer(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  const toggle = (menu: Exclude<OpenMenu, null>) => setOpen((current) => (current === menu ? null : menu))
  const close = () => setOpen(null)
  const hasProducts = products.length > 0

  const menuButton = (menu: 'products' | 'services', label: string) => (
    <button
      ref={(node) => {
        triggers.current[menu] = node
      }}
      type="button"
      aria-expanded={open === menu}
      aria-controls={panelId(menu)}
      onClick={() => toggle(menu)}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3.5 text-sm font-medium text-glass-foreground outline-none hover:bg-white/6 focus-visible:ring-2 focus-visible:ring-ring/70',
        open === menu && 'bg-white/9',
      )}
    >
      {label}
      <ChevronDown aria-hidden="true" className={cn('size-4 transition-transform motion-reduce:transition-none', open === menu && 'rotate-180')} />
    </button>
  )

  return (
    <header
      ref={rootRef}
      data-slot="glass-header"
      className={cn('@container glass z-sticky w-full border-b border-glass-line text-glass-foreground', sticky ? 'sticky top-0' : 'relative')}
    >
      <div className="mx-auto flex min-h-16 max-w-[77.5rem] items-center gap-3 px-4 @3xl:px-6">
        <Link href={homeHref} className="flex shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/70">
          {logo}
        </Link>

        <nav aria-label={tr('mainNav')} className="ms-4 hidden items-center gap-0.5 @4xl:flex">
          {hasProducts ? menuButton('products', tr('products')) : null}
          {services.length > 0 ? menuButton('services', tr('services')) : null}
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center rounded-pill px-3.5 text-sm font-medium outline-none hover:bg-white/6 focus-visible:ring-2 focus-visible:ring-ring/70"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        {onSearch ? (
          <button
            type="button"
            onClick={onSearch}
            aria-label={tr('search')}
            className="hidden size-11 place-items-center rounded-pill text-glass-muted outline-none hover:bg-white/6 focus-visible:ring-2 focus-visible:ring-ring/70 @4xl:grid"
          >
            <Search aria-hidden="true" className="size-5" />
          </button>
        ) : null}
        {languageSwitch ? <div className="hidden @4xl:block">{languageSwitch}</div> : null}
        <PillLink href={startHref} variant="gold" size="sm" className="hidden @md:inline-flex">
          {tr('start')}
        </PillLink>
        <button
          ref={(node) => {
            triggers.current.mobile = node
          }}
          type="button"
          aria-expanded={open === 'mobile'}
          aria-controls={panelId('mobile')}
          aria-label={open === 'mobile' ? tr('closeMenu') : tr('openMenu')}
          onClick={() => toggle('mobile')}
          className="grid size-11 place-items-center rounded-2xl border border-glass-line outline-none hover:bg-white/6 focus-visible:ring-2 focus-visible:ring-ring/70 @4xl:hidden"
        >
          {open === 'mobile' ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </div>

      {open === 'services' ? (
        <MenuPanel id={panelId('services')} wide>
          <ul className="grid min-w-0 flex-[2_1_34rem] gap-1 @3xl:grid-cols-2">
            {services.map((entry) => (
              <li key={entry.href}>
                <MegaEntry
                  href={entry.href}
                  title={entry.title}
                  line={entry.line}
                  onNavigate={close}
                  icon={<ServiceKindIcon kind={entry.kind} className="size-5" />}
                  iconClassName="bg-gold/13 text-gold"
                />
              </li>
            ))}
            {allServicesHref ? (
              <li>
                <AllLink href={allServicesHref} label={tr('allServices')} onNavigate={close} />
              </li>
            ) : null}
          </ul>
          <StartCard startHref={startHref} whatsappHref={whatsappHref} onNavigate={close} />
        </MenuPanel>
      ) : null}

      {open === 'products' && hasProducts ? (
        <MenuPanel id={panelId('products')}>
          <ul className="flex w-full flex-col gap-1">
            {products.map((entry) => {
              const accent = ensureContrast(entry.accentColor || '#e2b65c', MENU_GROUNDS, 3, '#ffffff')
              return (
                <li key={entry.href}>
                  <MegaEntry
                    href={entry.href}
                    title={entry.title}
                    line={entry.line}
                    onNavigate={close}
                    icon={<Package aria-hidden="true" className="size-5" style={{ color: accent }} />}
                    iconClassName="bg-white/7"
                  />
                </li>
              )
            })}
            {allProductsHref ? (
              <li>
                <AllLink href={allProductsHref} label={tr('allProducts')} onNavigate={close} />
              </li>
            ) : null}
          </ul>
        </MenuPanel>
      ) : null}

      {open === 'mobile' ? (
        <div id={panelId('mobile')} className="absolute inset-x-0 top-full px-3 pt-2 @4xl:hidden">
          <nav aria-label={tr('mobileNav')} className="glass-strong motion-safe:animate-menu-in flex flex-col rounded-[1.25rem] border border-glass-line p-2.5 shadow-float">
            {hasProducts ? <MobileLink href={allProductsHref ?? products[0].href} label={tr('products')} onNavigate={close} /> : null}
            {services.length > 0 ? <MobileLink href={allServicesHref ?? services[0].href} label={tr('services')} onNavigate={close} /> : null}
            {links.map((link) => (
              <MobileLink key={link.href} href={link.href} label={link.label} onNavigate={close} />
            ))}
            {onSearch ? (
              <button
                type="button"
                onClick={() => {
                  close()
                  onSearch()
                }}
                className="flex min-h-11 items-center gap-2 rounded-xl px-4 text-start font-semibold outline-none hover:bg-white/6 focus-visible:ring-2 focus-visible:ring-ring/70"
              >
                <Search aria-hidden="true" className="size-4" />
                {tr('search')}
              </button>
            ) : null}
            {languageSwitch ? <div className="px-4 py-2">{languageSwitch}</div> : null}
            <PillLink href={startHref} variant="gold" className="m-2 @md:hidden" onClick={close}>
              {tr('start')}
            </PillLink>
          </nav>
        </div>
      ) : null}
    </header>
  )
}

function MenuPanel({ id, wide = false, children }: { id: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div id={id} className="absolute inset-x-0 top-full px-3 pt-2.5 @3xl:px-6">
      <div className="mx-auto max-w-[77.5rem]">
        <div
          className={cn(
            'glass-strong motion-safe:animate-menu-in flex flex-wrap gap-3 rounded-card-lg border border-glass-line p-3.5 shadow-float',
            !wide && 'max-w-[45rem]',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function MegaEntry({
  href,
  title,
  line,
  icon,
  iconClassName,
  onNavigate,
}: {
  href: string
  title: string
  line: string
  icon: React.ReactNode
  iconClassName: string
  onNavigate: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex gap-3.5 rounded-card p-3.5 outline-none hover:bg-white/6 focus-visible:ring-2 focus-visible:ring-ring/70"
    >
      <span className={cn('grid size-11 shrink-0 place-items-center rounded-[0.8rem]', iconClassName)}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-small text-glass-muted">{line}</span>
      </span>
    </Link>
  )
}

function AllLink({ href, label, onNavigate }: { href: string; label: string; onNavigate: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex min-h-11 items-center justify-between gap-3 rounded-card px-4 text-small font-bold text-gold outline-none hover:bg-white/6 focus-visible:ring-2 focus-visible:ring-ring/70"
    >
      {label}
      <ForwardArrow className="size-4" />
    </Link>
  )
}

function StartCard({ startHref, whatsappHref, onNavigate }: { startHref: string; whatsappHref?: string | null; onNavigate: () => void }) {
  const tr = useTranslations('Brand')
  return (
    <div className="flex min-w-0 flex-[1_1_16rem] flex-col justify-between gap-4 rounded-card border border-gold/22 bg-[#151922] bg-[radial-gradient(120%_120%_at_100%_0%,rgb(226_182_92/0.24),transparent_60%)] p-5 rtl:bg-[radial-gradient(120%_120%_at_0%_0%,rgb(226_182_92/0.24),transparent_60%)]">
      <div>
        <p className="text-card-title">{tr('megaCardTitle')}</p>
        <p className="mt-1.5 text-small text-glass-muted">{tr('megaCardLine')}</p>
      </div>
      <div className="flex flex-col items-start gap-2.5">
        <PillLink href={startHref} variant="gold" size="sm" onClick={onNavigate}>
          {tr('start')}
          <ForwardArrow />
        </PillLink>
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-md text-small font-semibold text-glass-muted outline-none hover:text-glass-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            {tr('whatsappLine')}
          </a>
        ) : null}
      </div>
    </div>
  )
}

function MobileLink({ href, label, onNavigate }: { href: string; label: string; onNavigate: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex min-h-11 items-center rounded-xl px-4 font-semibold outline-none hover:bg-white/6 focus-visible:ring-2 focus-visible:ring-ring/70"
    >
      {label}
    </Link>
  )
}
