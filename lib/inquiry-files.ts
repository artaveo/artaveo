import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

import { INQUIRY_FILES_BUCKET } from '@/lib/media-upload'
import { captureError } from '@/lib/observability/store'

/** How long an unlinked upload may wait for its brief to be sent. A visitor who uploads and walks away leaves nothing behind after this. */
export const UNLINKED_FILE_TTL_HOURS = 24

export type InquiryFile = {
  id: string
  inquiryId: string
  originalName: string
  contentType: string
  sizeBytes: number
  createdAt: string
}

/** Files attached to one inquiry — the owner's lead page. The caller has already checked the owner role. */
export async function listInquiryFiles(supabase: SupabaseClient, inquiryId: string): Promise<InquiryFile[]> {
  const { data, error } = await supabase
    .from('inquiry_files')
    .select('id, inquiry_id, original_name, content_type, size_bytes, created_at')
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true })
  if (error || !data) {
    if (error) await captureError(error, { event: 'admin.list_inquiry_files_failed', source: 'database' })
    return []
  }
  return data.map((row) => ({
    id: row.id as string,
    inquiryId: row.inquiry_id as string,
    originalName: row.original_name as string,
    contentType: row.content_type as string,
    sizeBytes: row.size_bytes as number,
    createdAt: row.created_at as string,
  }))
}

/**
 * Deletes uploads that never got linked to a submitted brief: the object first,
 * then the row (a row without an object is harmless; an object without a row
 * would be invisible and permanent). Bounded per run so the daily job stays
 * well inside its time budget.
 */
export async function sweepUnlinkedInquiryFiles(supabase: SupabaseClient, limit = 200): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - UNLINKED_FILE_TTL_HOURS * 3600 * 1000).toISOString()
  const { data, error } = await supabase
    .from('inquiry_files')
    .select('id, storage_path')
    .is('inquiry_id', null)
    .lt('created_at', cutoff)
    .limit(limit)
  if (error) throw new Error(`unlinked file sweep failed: ${error.message}`)
  if (!data || data.length === 0) return { deleted: 0 }

  await supabase.storage.from(INQUIRY_FILES_BUCKET).remove(data.map((row) => row.storage_path as string))
  const ids = data.map((row) => row.id as string)
  const { error: deleteError } = await supabase.from('inquiry_files').delete().in('id', ids).is('inquiry_id', null)
  if (deleteError) throw new Error(`unlinked file sweep failed: ${deleteError.message}`)
  return { deleted: ids.length }
}
