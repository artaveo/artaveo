'use server'

import crypto from 'node:crypto'
import { headers } from 'next/headers'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ALLOWED_MEDIA_MIME_TYPES, MAX_MEDIA_FILE_SIZE_BYTES, MEDIA_BUCKET, safeStoragePath } from '@/lib/media-upload'

/**
 * § 15's "attachments for the Brief Builder, enabled here, behind the
 * same upload rules" — same type/size/safe-naming enforcement as the
 * admin media library (`app/actions/media.ts`, sharing `lib/media-upload.ts`),
 * but this one is public: no admin session, reached from `/start`.
 *
 * No alt text is collected here — a Brief Builder reference file has no
 * public-facing `<img alt>` to write (it's read once by the person
 * reviewing the inquiry, in the admin panel, never rendered on a public
 * page), so § 15's "required alt text" rule — written for `media_assets`
 * rows that *do* get rendered publicly — doesn't apply to this path.
 *
 * Rate limiting: capped at `MAX_ATTACHMENTS_PER_IP_PER_HOUR` per IP hash
 * per hour, the same `hashIp` construction `app/actions/inquiries.ts`
 * already uses (never storing the raw IP) — a real, live server-side
 * check, not a client-side-only suggestion. A stronger guard (e.g.
 * requiring a short-lived token issued when the Brief Builder page
 * loads, so an upload can't happen without first loading the form) is
 * disclosed as follow-up work in `docs/phases/PHASE-15-README.md`, not
 * silently treated as solved.
 */

const MAX_ATTACHMENTS_PER_IP_PER_HOUR = 15

export type InquiryAttachmentUploadResult =
  | { ok: false; code: 'invalid-type' | 'too-large' | 'not-configured' | 'rejected' | 'error' }
  | { ok: true; mediaId: string; url: string; fileName: string }

function hashIp(ip: string): string {
  const secret = process.env.INQUIRY_IP_HASH_SECRET ?? 'artaveo-dev-only-unset-secret'
  return crypto.createHash('sha256').update(`${ip}:${secret}`).digest('hex')
}

async function getClientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return h.get('x-real-ip') ?? '0.0.0.0'
}

export async function removeInquiryAttachment(mediaId: string): Promise<{ ok: boolean }> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return { ok: false }

  const ipHash = hashIp(await getClientIp())

  // Only ever deletes a row this same IP hash uploaded, that isn't
  // already linked to a submitted inquiry — never a general-purpose
  // public delete endpoint.
  const { data: linked } = await supabase.from('inquiry_attachments').select('id').eq('media_id', mediaId).limit(1)
  if (linked && linked.length > 0) return { ok: false }

  const { data: asset } = await supabase.from('media_assets').select('url').eq('id', mediaId).eq('uploaded_by_ip_hash', ipHash).maybeSingle()
  if (!asset) return { ok: false }

  await supabase.from('media_assets').delete().eq('id', mediaId)
  const path = asset.url.split(`/${MEDIA_BUCKET}/`).pop()
  if (path) await supabase.storage.from(MEDIA_BUCKET).remove([path])

  return { ok: true }
}

export async function uploadInquiryAttachment(formData: FormData): Promise<InquiryAttachmentUploadResult> {
  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, code: 'error' }

  if (!(ALLOWED_MEDIA_MIME_TYPES as readonly string[]).includes(file.type)) return { ok: false, code: 'invalid-type' }
  if (file.size > MAX_MEDIA_FILE_SIZE_BYTES) return { ok: false, code: 'too-large' }

  const supabase = getSupabaseServerClient()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const ipHash = hashIp(await getClientIp())
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('media_assets')
    .select('id', { count: 'exact', head: true })
    .eq('uploaded_by_ip_hash', ipHash)
    .gte('created_at', oneHourAgo)
  if ((count ?? 0) >= MAX_ATTACHMENTS_PER_IP_PER_HOUR) return { ok: false, code: 'rejected' }

  const path = safeStoragePath(file.name)
  const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) return { ok: false, code: 'error' }

  const { data: publicUrlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)

  const { data: inserted, error: insertError } = await supabase
    .from('media_assets')
    .insert({
      url: publicUrlData.publicUrl,
      type: file.type,
      size_bytes: file.size,
      uploaded_by_ip_hash: ipHash,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path])
    return { ok: false, code: 'error' }
  }

  return { ok: true, mediaId: inserted.id, url: publicUrlData.publicUrl, fileName: file.name }
}
