import { LEGAL_KEYS, navFor, type ShellData, type ShellNavItem } from '@/lib/shell-settings'
import type { NavKey } from '@/lib/site'
import { t, type Locale, type Project, type Service, type ServiceKind } from '@/types/content'

/**
 * Phase 29.1 — what the glass header, its mobile menu and the footer show,
 * worked out from the owner's data: the navigation items (`navigation_items`,
 * Phase 27.6), the published products and the published services. Pure (no
 * database, no React) so the rules are unit-tested; the server read is
 * `getShellMenus()` in `lib/shell-settings-server.ts`, the client side
 * `components/site/site-header.tsx` and `site-footer.tsx`.
 *
 * - **Products** is a mega menu, drawn only while at least one published
 *   product has a page to open (§ 15: Products stays out of the menu until a
 *   product is published). Its "All products" link appears once the owner
 *   turns the `products` navigation item on (Phase 30 builds `/products`).
 * - **Services** is a mega menu when the `services` item is in the header and
 *   at least one service is published; otherwise it is an ordinary link.
 * - Every other header item (Work, About, …) is a plain link, in the owner's
 *   order. Home is the logo, so it is never a link of its own.
 */

/** One entry of a mega menu, already in the page's language. */
export type MenuEntry = {
  href: string
  title: string
  line: string
  kind?: ServiceKind
  accentColor?: string | null
}

export type ShellMenus = { products: MenuEntry[]; services: MenuEntry[] }

export const EMPTY_MENUS: ShellMenus = { products: [], services: [] }

export type NavLink = { key: NavKey; href: string }

/** Keys the header draws itself — the logo and the two mega menus. */
const MENU_KEYS: NavKey[] = ['home', 'products', 'services']

/**
 * The page a product opens. Until Phase 30 builds `/products/[slug]`, a
 * product's page is its project page, which exists only while the project is
 * in the portfolio; a product without one has no page yet (`null`) and is
 * offered through its demo request only.
 */
export function productPageHref(product: Pick<Project, 'slug' | 'showInPortfolio'>): string | null {
  return product.showInPortfolio ? `/work/${product.slug}` : null
}

/** "Request a demo" for a product: the Brief Builder with the product chosen (Phase 27.5). */
export function productDemoHref(product: Pick<Project, 'slug'>): string {
  return `/start?product=${encodeURIComponent(product.slug)}`
}

export function buildShellMenus(products: Project[], services: Service[], locale: Locale): ShellMenus {
  return {
    products: products.flatMap((product) => {
      const href = productPageHref(product)
      if (!href) return []
      return [{
        href,
        title: t(product.title, locale),
        line: product.outcomeLine ? t(product.outcomeLine, locale) : t(product.summary, locale),
        accentColor: product.accentColor ?? null,
      }]
    }),
    services: services.map((service) => ({
      href: `/services/${service.slug}`,
      title: t(service.title, locale),
      line: service.tagline ? t(service.tagline, locale) : t(service.description, locale),
      kind: service.kind,
    })),
  }
}

function toLink(item: ShellNavItem): NavLink {
  return { key: item.key, href: item.href }
}

/** The visible item for `key`, on any surface — the owner turned it on. */
function visibleItem(shell: ShellData, key: NavKey): ShellNavItem | undefined {
  return shell.nav.find((item) => item.key === key)
}

export type HeaderModel = {
  products: MenuEntry[]
  allProductsHref?: string
  services: MenuEntry[]
  allServicesHref?: string
  /** Plain links beside the menus, in the owner's order. */
  links: NavLink[]
  /** The mobile menu's plain links: its own items, then the footer-only pages (Contact, …) except the legal ones. */
  mobileLinks: NavLink[]
}

export function buildHeaderModel(shell: ShellData, menus: ShellMenus): HeaderModel {
  const header = navFor(shell, 'header')
  const inHeader = new Set(header.map((item) => item.key))
  const servicesItem = header.find((item) => item.key === 'services')
  const productsItem = visibleItem(shell, 'products')
  const servicesAsMenu = !!servicesItem && menus.services.length > 0

  const plain = (items: ShellNavItem[]) =>
    items.filter((item) => item.key !== 'home' && item.key !== 'products' && (item.key !== 'services' || !servicesAsMenu))

  const mobile = navFor(shell, 'mobile')
  const mobileKeys = new Set(mobile.map((item) => item.key))
  const extras = navFor(shell, 'footer').filter(
    (item) => !mobileKeys.has(item.key) && !inHeader.has(item.key) && !LEGAL_KEYS.includes(item.key) && !MENU_KEYS.includes(item.key) && item.key !== 'designSystem',
  )

  return {
    products: menus.products,
    allProductsHref: productsItem?.href,
    services: servicesAsMenu ? menus.services : [],
    allServicesHref: servicesAsMenu ? servicesItem.href : undefined,
    links: plain(header).map(toLink),
    mobileLinks: [...plain(mobile), ...extras].map(toLink),
  }
}

export type FooterModel = {
  products: MenuEntry[]
  services: MenuEntry[]
  /** "All services", when there are more services than the column lists. */
  allServicesHref?: string
  /** The site's own pages (Work, About, Contact, …) — everything in the footer except the menus' keys and the legal links. */
  pages: NavLink[]
  legal: NavLink[]
}

/** How many services the footer lists before "All services" — a column, not a catalogue. */
export const FOOTER_SERVICE_LIMIT = 5

export function buildFooterModel(shell: ShellData, menus: ShellMenus): FooterModel {
  const footer = navFor(shell, 'footer')
  return {
    products: menus.products,
    services: menus.services.slice(0, FOOTER_SERVICE_LIMIT),
    allServicesHref: menus.services.length > FOOTER_SERVICE_LIMIT ? visibleItem(shell, 'services')?.href : undefined,
    pages: footer.filter((item) => !MENU_KEYS.includes(item.key) && !LEGAL_KEYS.includes(item.key)).map(toLink),
    legal: footer.filter((item) => LEGAL_KEYS.includes(item.key)).map(toLink),
  }
}
