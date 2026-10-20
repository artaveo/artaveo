import { WORK_FILTER_THRESHOLD } from '@/lib/site'
import { PROJECT_PLATFORMS, type Project, type ProjectPlatform } from '@/types/content'

/**
 * Phase 30.2 — `/work`'s filters: only from six projects (§ 6.1,
 * `WORK_FILTER_THRESHOLD`), and by platform — what a customer recognises
 * (web, Android, Windows…), never a technology. Only platforms that at least
 * one shown project has are offered, so a choice never ends on an empty page;
 * a platform every project has is no choice at all and is left out.
 */
export function platformFilters(projects: Pick<Project, 'platforms'>[]): ProjectPlatform[] {
  if (projects.length < WORK_FILTER_THRESHOLD) return []
  return PROJECT_PLATFORMS.filter((platform) => {
    const count = projects.filter((project) => project.platforms.includes(platform)).length
    return count > 0 && count < projects.length
  })
}

export function filterByPlatform<T extends Pick<Project, 'platforms'>>(projects: T[], platform: ProjectPlatform | null): T[] {
  return platform ? projects.filter((project) => project.platforms.includes(platform)) : projects
}
