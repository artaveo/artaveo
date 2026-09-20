'use server'

import { revalidatePath } from 'next/cache'

import { getAdminSession, mfaSatisfied } from '@/lib/admin/auth'
import { writeAuditLog } from '@/lib/admin/audit'
import { requireSupabase } from '@/lib/admin/pipeline'
import { routing } from '@/i18n/routing'
import { ALLOWED_MEDIA_MIME_TYPES, MAX_MEDIA_FILE_SIZE_BYTES, MEDIA_BUCKET, clampFocal, safeStoragePath } from '@/lib/media-upload'
import { inspectUpload } from '@/lib/upload-inspection'
import type { MediaAltInput, ProjectMediaInput } from '@/types/cms'

/**
 * § 15's media-upload pipeline: "type/size validation server-side, safe
 * names, storage policy, required alt text, focal-point cropping for
 * responsive crops." Every rule below is enforced here, not just
 * client-side — a client check is a UX nicety, this is the real gate.
 * Shared constants/helpers live in `lib/media-upload.ts` — the public
 * Brief Builder upload path (`app/actions/inquiry-attachments.ts`)
 * enforces the identical type/size/naming rules from the same source.
 */

export type MediaActionResult =
  | { ok: false; code: 'forbidden' | 'not-configured' | 'invalid-type' | 'too-large' | 'missing-alt' | 'error' }
  | { ok: true }

export type MediaUploadResult =
  | { ok: false; code: 'forbidden' | 'not-configured' | 'invalid-type' | 'too-large' | 'missing-alt' | 'error' }
  | { ok: true; id: string; url: string }

async function requireEditorSession(): Promise<{ userId: string } | { code: 'forbidden' }> {
  const session = await getAdminSession()
  if (!session || !mfaSatisfied(session)) return { code: 'forbidden' }
  return { userId: session.userId }
}

/** Every field arrives via `FormData` (`file` is a real `File`) — Server Actions accept this directly from a `<form>` or a client-built `FormData`, no extra upload library needed. */
export async function uploadMedia(formData: FormData): Promise<MediaUploadResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, code: 'error' }

  const altEn = String(formData.get('altEn') ?? '').trim()
  const altFa = String(formData.get('altFa') ?? '').trim()
  if (!altEn || !altFa) return { ok: false, code: 'missing-alt' }

  if (!(ALLOWED_MEDIA_MIME_TYPES as readonly string[]).includes(file.type)) return { ok: false, code: 'invalid-type' }
  if (file.size > MAX_MEDIA_FILE_SIZE_BYTES) return { ok: false, code: 'too-large' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  // Phase 23: the bytes must be what the declared type says (lib/upload-inspection.ts).
  // SVG is allowed here — an editor is signed in — but only after its markup passes the
  // script/foreign-content/external-reference checks; it is only ever shown through <img>.
  const bytes = new Uint8Array(await file.arrayBuffer())
  const inspection = inspectUpload(bytes, file.type, { allowSvg: true })
  if (!inspection.ok) return { ok: false, code: 'invalid-type' }

  const path = safeStoragePath(file.name)
  const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, bytes, {
    contentType: inspection.contentType,
    upsert: false,
  })
  if (uploadError) return { ok: false, code: 'error' }

  const { data: publicUrlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)

  const focalX = clampFocal(Number(formData.get('focalX') ?? 0.5))
  const focalY = clampFocal(Number(formData.get('focalY') ?? 0.5))

  const { data: inserted, error: insertError } = await supabase
    .from('media_assets')
    .insert({
      url: publicUrlData.publicUrl,
      alt: { en: altEn, fa: altFa },
      type: inspection.contentType,
      size_bytes: bytes.length,
      width: inspection.width,
      height: inspection.height,
      focal_x: focalX,
      focal_y: focalY,
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    // Row insert failed after a real upload — don't leave an orphaned file with no admin-visible record of it.
    await supabase.storage.from(MEDIA_BUCKET).remove([path])
    return { ok: false, code: 'error' }
  }

  await writeAuditLog({ actor: auth.userId, action: 'content.media_uploaded', entity: 'media_asset', entityId: inserted.id })
  return { ok: true, id: inserted.id, url: publicUrlData.publicUrl }
}

export async function updateMediaAlt(id: string, input: MediaAltInput): Promise<MediaActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  if (!input.alt.en.trim() || !input.alt.fa.trim()) return { ok: false, code: 'missing-alt' }

  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase
    .from('media_assets')
    .update({
      alt: { en: input.alt.en.trim(), fa: input.alt.fa.trim() },
      focal_x: clampFocal(input.focalX),
      focal_y: clampFocal(input.focalY),
    })
    .eq('id', id)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.media_updated', entity: 'media_asset', entityId: id })
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function deleteMedia(id: string): Promise<MediaActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { data: asset } = await supabase.from('media_assets').select('url').eq('id', id).maybeSingle()
  const { error } = await supabase.from('media_assets').delete().eq('id', id)
  if (error) return { ok: false, code: 'error' }

  if (asset?.url) {
    const path = asset.url.split(`/${MEDIA_BUCKET}/`).pop()
    if (path) await supabase.storage.from(MEDIA_BUCKET).remove([path])
  }

  await writeAuditLog({ actor: auth.userId, action: 'content.media_deleted', entity: 'media_asset', entityId: id })
  return { ok: true }
}

function revalidateProjectRoutes(slug: string | null | undefined): void {
  for (const locale of routing.locales) {
    if (slug) revalidatePath(`/${locale}/work/${slug}`)
  }
}

export async function addProjectMedia(projectId: string, projectSlug: string | null, input: ProjectMediaInput): Promise<MediaActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { count } = await supabase.from('project_media').select('id', { count: 'exact', head: true }).eq('project_id', projectId)

  const { error } = await supabase.from('project_media').insert({
    project_id: projectId,
    media_id: input.mediaId,
    kind: input.kind,
    caption: input.caption ? { en: input.caption.en.trim(), fa: input.caption.fa.trim() } : null,
    sort_order: count ?? 0,
  })
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.project_media_added', entity: 'project', entityId: projectId })
  revalidateProjectRoutes(projectSlug)
  return { ok: true }
}

export async function removeProjectMedia(rowId: string, projectId: string, projectSlug: string | null): Promise<MediaActionResult> {
  const auth = await requireEditorSession()
  if ('code' in auth) return { ok: false, code: 'forbidden' }
  const supabase = requireSupabase()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const { error } = await supabase.from('project_media').delete().eq('id', rowId)
  if (error) return { ok: false, code: 'error' }

  await writeAuditLog({ actor: auth.userId, action: 'content.project_media_removed', entity: 'project', entityId: projectId })
  revalidateProjectRoutes(projectSlug)
  return { ok: true }
}
