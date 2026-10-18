/**
 * Phase 27 — which media-library images a picker or the library page shows.
 * Pure, so the rule is unit-tested and the same in every picker.
 *
 * `scope`: `'all'`, `'none'` (images not tied to a project) or a project id.
 * `query`: matched, case-insensitively, against the alt text in both languages
 * and the file name — every word must appear somewhere.
 */

export type FilterableAsset = {
  id: string
  url: string
  alt: { en: string; fa: string } | null
  projectId: string | null
  createdAt: string
}

export function filterMedia<T extends FilterableAsset>(assets: T[], scope: string, query: string): T[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return assets.filter((asset) => {
    if (scope === 'none' && asset.projectId !== null) return false
    if (scope !== 'all' && scope !== 'none' && asset.projectId !== scope) return false
    if (words.length === 0) return true
    const haystack = `${asset.alt?.en ?? ''} ${asset.alt?.fa ?? ''} ${decodeURIComponent(asset.url.split('/').pop() ?? '')}`.toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}

/** How many images each project has (and how many have none) — for the filter's labels. */
export function countByProject(assets: FilterableAsset[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const asset of assets) {
    const key = asset.projectId ?? 'none'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}
