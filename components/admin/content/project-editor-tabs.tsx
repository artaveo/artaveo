import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * Phase 27 — the project editor's three tabs, as links (`?tab=`), so each tab is
 * a real page: it survives a reload, can be bookmarked and needs no client state.
 */
export function ProjectEditorTabs({ active, projectId, isProduct }: { active: 'project' | 'page' | 'product'; projectId: string; isProduct: boolean }) {
  const t = useTranslations('Admin')
  const tabs = [
    { id: 'project', label: t('cmsTabProject') },
    { id: 'page', label: t('cmsTabPage') },
    { id: 'product', label: isProduct ? t('cmsTabProduct') : `${t('cmsTabProduct')} · ${t('cmsTabProductOff')}` },
  ] as const

  return (
    <nav aria-label={t('cmsTabsLabel')} className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted p-0.5">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          id={`tab-${tab.id}`}
          href={`/admin/content/projects/${projectId}${tab.id === 'project' ? '' : `?tab=${tab.id}`}`}
          aria-current={active === tab.id ? 'page' : undefined}
          className={cn(
            'inline-flex h-8 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
            active === tab.id && 'bg-card text-foreground shadow-xs',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
