import 'server-only'

import { requireSupabase } from '@/lib/admin/pipeline'
import type { AdminMediaAsset, AdminProjectMediaItem } from '@/types/cms'

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
  }
}

const ASSET_COLUMNS = 'id, url, alt, width, height, type, size_bytes, focal_x, focal_y, created_at'

export async function listMediaAssets(): Promise<AdminMediaAsset[] | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data, error } = await supabase.from('media_assets').select(ASSET_COLUMNS).order('created_at', { ascending: false })
  if (error || !data) {
    console.error('listMediaAssets failed:', error)
    return []
  }
  return data.map(assembleAsset)
}

export async function getMediaAsset(id: string): Promise<AdminMediaAsset | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data, error } = await supabase.from('media_assets').select(ASSET_COLUMNS).eq('id', id).maybeSingle()
  if (error || !data) return null
  return assembleAsset(data)
}

export async function listProjectMedia(projectId: string): Promise<AdminProjectMediaItem[] | null> {
  const supabase = requireSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('project_media')
    .select(`id, media_id, kind, caption, sort_order, media_assets (${ASSET_COLUMNS})`)
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
  if (error || !data) {
    console.error('listProjectMedia failed:', error)
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
