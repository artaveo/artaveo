import type { Project, ProjectMediaItem } from '@/types/content'

/**
 * Phase 30 — the screens a product or project page shows, each with its
 * one-line caption: the case-study screenshots (`story`, in their groups'
 * order) and then the gallery, never the hero image again (it is already in
 * the laptop at the top). A screenshot that appears twice is shown once.
 */
export function projectScreens(project: Pick<Project, 'media'>): ProjectMediaItem[] {
  const media = project.media ?? []
  const seen = new Set<string>()
  const out: ProjectMediaItem[] = []
  for (const item of [...media.filter((m) => m.placement === 'story'), ...media.filter((m) => m.placement === 'gallery')]) {
    if (seen.has(item.src)) continue
    seen.add(item.src)
    out.push(item)
  }
  return out
}
