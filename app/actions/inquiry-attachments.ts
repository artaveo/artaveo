'use server'

import { captureError } from '@/lib/observability/store'
import { bindRequestId, getRequestId } from '@/lib/observability/context'
import { getClientIp, hashIp } from '@/lib/request-ip'
import { INQUIRY_FILES_BUCKET, MAX_MEDIA_FILE_SIZE_BYTES, VISITOR_MIME_TYPES, displayFileName, safeStoragePath } from '@/lib/media-upload'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { inspectUpload } from '@/lib/upload-inspection'

/**
 * § 15's "attachments for the Brief Builder" — public, so nobody is signed in
 * to rate-limit against.
 *
 * Phase 23 rebuilt where these files go. They used to be written to the PUBLIC
 * `media` bucket and to `media_assets`, the editors' CMS library: an editor
 * (who § 13 says has no access to leads) could see, delete and embed a lead's
 * private files, and anyone with a file's URL could read it. They now go to the
 * PRIVATE `inquiry-files` bucket and a table only the server can read
 * (`inquiry_files`, migration 0020); the owner opens them from the lead page
 * through `/api/admin/inquiry-files/[id]`, which checks the owner role and
 * hands out a short-lived download link.
 *
 * What is enforced, all server-side, in this order (cheapest first):
 *  - declared type is one of four raster types (no SVG from strangers) and the
 *    size is within the limit;
 *  - the per-address and global attempt limits (`inquiry.upload`);
 *  - a cap on how many unlinked uploads one address may hold at a time — the
 *    daily sweep frees the rest;
 *  - the BYTES must be the declared image type with a sane header and size
 *    (`lib/upload-inspection.ts`) — the declared type alone is what a sender
 *    chooses;
 *  - a name from the platform's random source (`safeStoragePath`).
 *
 * The id returned is a random UUID only the uploader has seen: it is the
 * capability to link the file to their brief or to remove it, so linking and
 * removal do not depend on the visitor's address staying the same between
 * choosing a file and pressing Send (phones switch networks).
 */

const MAX_UNLINKED_PER_IP = 6

export type InquiryAttachmentUploadResult =
  | { ok: false; code: 'invalid-type' | 'too-large' | 'not-configured' | 'rejected' | 'error' }
  | { ok: true; mediaId: string; fileName: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function removeInquiryAttachment(mediaId: string): Promise<{ ok: boolean }> {
  bindRequestId(await getRequestId())
  if (typeof mediaId !== 'string' || !UUID.test(mediaId)) return { ok: false }

  const limit = await checkRateLimit('inquiry.upload-remove')
  if (!limit.ok) return { ok: false }

  const supabase = getSupabaseServerClient()
  if (!supabase) return { ok: false }

  // Only an UNLINKED file can be removed by the visitor — never a general-purpose public delete.
  const { data: file } = await supabase
    .from('inquiry_files')
    .select('id, storage_path')
    .eq('id', mediaId)
    .is('inquiry_id', null)
    .maybeSingle()
  if (!file) return { ok: false }

  await supabase.from('inquiry_files').delete().eq('id', file.id).is('inquiry_id', null)
  await supabase.storage.from(INQUIRY_FILES_BUCKET).remove([file.storage_path as string])
  return { ok: true }
}

export async function uploadInquiryAttachment(formData: FormData): Promise<InquiryAttachmentUploadResult> {
  bindRequestId(await getRequestId())
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, code: 'error' }

  if (!(VISITOR_MIME_TYPES as readonly string[]).includes(file.type)) return { ok: false, code: 'invalid-type' }
  if (file.size > MAX_MEDIA_FILE_SIZE_BYTES) return { ok: false, code: 'too-large' }

  const supabase = getSupabaseServerClient()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const limit = await checkRateLimit('inquiry.upload')
  if (!limit.ok) return { ok: false, code: 'rejected' }

  const ipHash = hashIp(await getClientIp())
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('inquiry_files')
    .select('id', { count: 'exact', head: true })
    .eq('uploaded_by_ip_hash', ipHash)
    .is('inquiry_id', null)
    .gte('created_at', dayAgo)
  if ((count ?? 0) >= MAX_UNLINKED_PER_IP) return { ok: false, code: 'rejected' }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const inspection = inspectUpload(bytes, file.type, { allowSvg: false })
  if (!inspection.ok) return { ok: false, code: 'invalid-type' }

  const path = safeStoragePath(file.name)
  const { error: uploadError } = await supabase.storage
    .from(INQUIRY_FILES_BUCKET)
    .upload(path, bytes, { contentType: inspection.contentType, upsert: false })
  if (uploadError) {
    await captureError(uploadError, { event: 'inquiry.upload_storage_failed', source: 'action', supabase })
    return { ok: false, code: 'error' }
  }

  const fileName = displayFileName(file.name)
  const { data: inserted, error: insertError } = await supabase
    .from('inquiry_files')
    .insert({
      storage_path: path,
      content_type: inspection.contentType,
      size_bytes: bytes.length,
      original_name: fileName,
      uploaded_by_ip_hash: ipHash,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    await captureError(insertError ?? new Error('insert returned no row'), { event: 'inquiry.upload_persist_failed', source: 'action', supabase })
    await supabase.storage.from(INQUIRY_FILES_BUCKET).remove([path])
    return { ok: false, code: 'error' }
  }

  return { ok: true, mediaId: inserted.id as string, fileName }
}
