'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { ProjectCard } from '@/components/work/project-card'
import { WORK_FILTER_THRESHOLD } from '@/lib/site'
import { t, type Locale, type Project } from '@/types/content'

/**
 * WorkGrid — the `/work` index (roadmap § 6.1): a responsive project grid,
 * featured-first, with category/technology filters that only appear once
 * there are enough projects to need them (`WORK_FILTER_THRESHOLD`). With
 * today's two projects the filters stay hidden and every project shows.
 *
 * Filter options are derived from the projects actually on the page, so a
 * selection can never produce an empty grid — the public site doesn't have
 * an empty-results state here (see `components/ui/states.tsx`'s `EmptyState`
 * comment), it simply can't be reached.
 */
export function WorkGrid({ projects }: { projects: Project[] }) {
  const locale = useLocale() as Locale
  const tWork = useTranslations('Work')
  const showFilters = projects.length >= WORK_FILTER_THRESHOLD

  const categories = useMemo(() => {
    const labels = new Set(projects.map((project) => t(project.category, locale)))
    return Array.from(labels)
  }, [projects, locale])

  const technologies = useMemo(() => {
    const values = new Set(projects.flatMap((project) => project.technologies))
    return Array.from(values)
  }, [projects])

  const [category, setCategory] = useState<string | null>(null)
  const [technology, setTechnology] = useState<string | null>(null)

  const filtered = showFilters
    ? projects.filter((project) => {
        const matchesCategory = !category || t(project.category, locale) === category
        const matchesTechnology = !technology || project.technologies.includes(technology)
        return matchesCategory && matchesTechnology
      })
    : projects

  return (
    <div>
      {showFilters ? (
        <div className="mb-10 flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {tWork('filterByCategory')}
            </span>
            <SegmentedControl
              value={category ? [category] : ['all']}
              onValueChange={(value) => {
                const next = value[0] as string
                setCategory(next === 'all' ? null : next)
              }}
            >
              <SegmentedControlItem value="all">{tWork('allCategories')}</SegmentedControlItem>
              {categories.map((label) => (
                <SegmentedControlItem key={label} value={label}>
                  {label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {tWork('filterByTechnology')}
            </span>
            <SegmentedControl
              value={technology ? [technology] : ['all']}
              onValueChange={(value) => {
                const next = value[0] as string
                setTechnology(next === 'all' ? null : next)
              }}
            >
              <SegmentedControlItem value="all">{tWork('allTechnologies')}</SegmentedControlItem>
              {technologies.map((tech) => (
                <SegmentedControlItem key={tech} value={tech}>
                  {tech}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project, index) => (
          <ProjectCard key={project.id} project={project} priority={index === 0} />
        ))}
      </div>
    </div>
  )
}
