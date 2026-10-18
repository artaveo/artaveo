'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * Phase 27 (owner's review) — getting around the admin. The top links mark the
 * section you are in; under them, a clickable path shows where you are inside it
 * (Admin › Content › Projects › Edit) so every page has a way back up, without the
 * browser's back button.
 */

export type AdminNavLink = { href: string; labelKey: string }

/** Path segment → `Admin.<key>`. Ids get a generic "Edit" step. */
const SEGMENT_LABEL: Record<string, string> = {
  admin: 'dashboardEyebrow',
  content: 'cmsNavLink',
  projects: 'cmsProjectsNavLink',
  services: 'cmsServicesNavLink',
  articles: 'cmsArticlesNavLink',
  media: 'cmsMediaNavLink',
  navigation: 'cmsNavigationNavLink',
  settings: 'cmsSettingsNavLink',
  faqs: 'cmsGlobalFaqsNavLink',
  recommendations: 'cmsRecommendationsNavLink',
  'engagement-models': 'cmsEngagementModelsNavLink',
  leads: 'leadsNavLink',
  consultations: 'consultationsNavLink',
  notifications: 'notifNavLink',
  observability: 'obsNavLink',
  security: 'securityEyebrow',
  new: 'crumbNew',
  preview: 'cmsPreview',
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminNavLinks({ links }: { links: AdminNavLink[] }) {
  const t = useTranslations('Admin')
  const pathname = usePathname()
  return (
    <nav aria-label={t('adminNavLabel')} className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1">
      {links.map((link) => {
        const active = isActive(pathname, link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(link.labelKey)}
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminBreadcrumbs() {
  const t = useTranslations('Admin')
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  if (segments[0] !== 'admin' || segments.length < 2) return null

  const steps = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`
    const key = SEGMENT_LABEL[segment]
    const label = key ? t(key) : UUID.test(segment) ? t('crumbItem') : segment
    return { href, label }
  })

  return (
    <nav aria-label={t('crumbLabel')} className="mx-auto mb-6 w-full max-w-5xl">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {steps.map((step, index) => {
          const last = index === steps.length - 1
          return (
            <li key={step.href} className="flex items-center gap-1">
              {index > 0 ? (
                <>
                  <ChevronRight aria-hidden="true" className="size-3.5 rtl:hidden" />
                  <ChevronLeft aria-hidden="true" className="size-3.5 ltr:hidden" />
                </>
              ) : null}
              {last ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {step.label}
                </span>
              ) : (
                <Link href={step.href} className="rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                  {step.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
