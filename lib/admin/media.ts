import 'server-only'

import { requireDb } from '@/lib/admin/pipeline'
import type { AdminMediaAsset, AdminProjectMediaItem, MediaProjectOption, MediaUsage } from '@/types/cms'
import { captureError } from '@/lib/observability/store'

/**
 * Admin read layer for § 15's media pipeline. `media_assets` has no
 * `published` concept (0007's own header note: "no public read need
 * yet — media is only ever reached through `project_media`/`articles`,
 * which already carry their own gated policies") — every row here is
 * always the real, current row, there is no draft state to filter.
 */

function assembleAsset(row: Record<string, any>): AdminMediaAsset {
  return {
    id: row.id,
    url: row.url,
    alt: row.alt ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
    type: row.type ?? null,
    sizeBytes: row.size_bytes ?? null,
    focalX: row.focal_x ?? null,
    focalY: row.focal_y ?? null,
    createdAt: row.created_at,
    projectId: row.project_id ?? null,
    usages: [],
  }
}

type UsageRows = {
  covers: { id: string; cover_media_id: string | null }[]
  screenshots: { media_id: string | null; project_id: string; placement: string }[]
  galleries: { project_id: string; body: { images?: { mediaId?: string }[] } | null }[]
}

/** Where every image is used — one pass over covers, case-study screenshots and gallery blocks. */
function usagesByMedia(rows: UsageRows): Map<string, MediaUsage[]> {
  const map = new Map<string, MediaUsage[]>()
  const add = (mediaId: string | null | undefined, usage: MediaUsage) => {
    if (!mediaId) return
    const list = map.get(mediaId) ?? []
    if (!list.some((u) => u.kind === usage.kind && u.projectId === usage.projectId)) list.push(usage)
    map.set(mediaId, list)
  }
  for (const p of rows.covers) add(p.cover_media_id, { kind: 'cover', projectId: p.id })
  for (const m of rows.screenshots) {
    const kind = m.placement === 'hero' || m.placement === 'story' ? m.placement : 'gallery'
    add(m.media_id, { kind, projectId: m.project_id })
  }
  for (const b of rows.galleries) for (const image of b.body?.images ?? []) add(image.mediaId, { kind: 'block', projectId: b.project_id })
  return map
}

const ASSET_COLUMNS = 'id, url, alt, width, height, type, size_bytes, focal_x, focal_y, created_at, project_id'

export async function listMediaAssets(): Promise<AdminMediaAsset[] | null> {
  const db = requireDb()
  if (!db) return null

  const [{ data, error }, covers, screenshots, galleries] = await Promise.all([
    db.from('media_assets').select(ASSET_COLUMNS).order('created_at', { ascending: false }),
    db.from('projects').select('id, cover_media_id'),
    db.from('project_media').select('media_id, project_id, placement'),
    db.from('project_blocks').select('project_id, body').eq('type', 'gallery'),
  ])
  if (error || !data) {
    await captureError(error, { event: 'admin.list_media_assets_failed', source: 'database' })
    return []
  }
  const usages = usagesByMedia({
    covers: (covers.data ?? []) as UsageRows['covers'],
    screenshots: (screenshots.data ?? []) as UsageRows['screenshots'],
    galleries: (galleries.data ?? []) as unknown as UsageRows['galleries'],
  })
  return data.map((row: Record<string, unknown>) => ({ ...assembleAsset(row), usages: usages.get(row.id as string) ?? [] }))
}

/** Phase 27 — every project (published or not), for the pickers' grouping and filters. */
export async function listMediaProjects(): Promise<MediaProjectOption[]> {
  const db = requireDb()
  if (!db) return []
  const { data } = await db.from('projects').select('id, title').order('sort_order', { ascending: true })
  return ((data ?? []) as unknown as MediaProjectOption[]).map((p) => ({ id: p.id, title: p.title }))
}

export async function getMediaAsset(id: string): Promise<AdminMediaAsset | null> {
  const db = requireDb()
  if (!db) return null

  const { data, error } = await db.from('media_assets').select(ASSET_COLUMNS).eq('id', id).maybeSingle()
  if (error || !data) return null
  return assembleAsset(data)
}

export async function listProjectMedia(projectId: string): Promise<AdminProjectMediaItem[] | null> {
  const db = requireDb()
  if (!db) return null

  const { data, error } = await db
    .from('project_media')
    .select(`id, media_id, kind, caption, sort_order, media_assets (${ASSET_COLUMNS})`)
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
  if (error || !data) {
    await captureError(error, { event: 'admin.list_project_media_failed', source: 'database' })
    return []
  }

  return data.map((row: any) => ({
    id: row.id,
    mediaId: row.media_id,
    kind: row.kind,
    caption: row.caption ?? null,
    sortOrder: row.sort_order,
    asset: row.media_assets ? assembleAsset(row.media_assets) : null,
  }))
}
