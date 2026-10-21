'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { PortfolioList } from '@/components/brand/portfolio-row'
import { projectHref } from '@/lib/shell-menus'
import { cn } from '@/lib/utils'
import { filterByPlatform } from '@/lib/work-filters'
import type { Project, ProjectPlatform } from '@/types/content'

/**
 * Phase 30.2 — the portfolio rows with platform chips above them, used only
 * once `/work` has six projects or more (`platformFilters`). Chips are toggle
 * buttons (`aria-pressed`); the number of projects shown is announced.
 */
export function PortfolioFilter({ projects, platforms }: { projects: Project[]; platforms: ProjectPlatform[] }) {
  const tw = useTranslations('Work')
  const tp = useTranslations('Platforms')
  const [platform, setPlatform] = useState<ProjectPlatform | null>(null)
  const shown = filterByPlatform(projects, platform)

  const chip = (value: ProjectPlatform | null, label: string) => (
    <button
      key={value ?? 'all'}
      type="button"
      aria-pressed={platform === value}
      onClick={() => setPlatform(value)}
      className={cn(
        'min-h-11 rounded-pill border px-4 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/60',
        platform === value ? 'border-paper-foreground bg-paper-foreground text-paper-card' : 'border-paper-line bg-paper-card text-paper-foreground hover:border-paper-foreground',
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-8">
      <div role="group" aria-label={tw('filterLabel')} className="flex flex-wrap gap-2">
        {chip(null, tw('filterAll'))}
        {platforms.map((value) => chip(value, tp(value)))}
      </div>
      <p className="sr-only" aria-live="polite">
        {tw('shownCount', { count: shown.length })}
      </p>
      <PortfolioList projects={shown} href={projectHref} headingLevel="h2" priorityFirst />
    </div>
  )
}
