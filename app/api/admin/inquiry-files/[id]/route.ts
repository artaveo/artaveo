import { NextResponse } from 'next/server'

import { writeAuditLog } from '@/lib/admin/audit'
import { canAccessLeads, getAdminSession, mfaSatisfied } from '@/lib/admin/auth'
import { INQUIRY_FILES_BUCKET } from '@/lib/media-upload'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * A lead's attachment, for the owner (Phase 23).
 *
 * The file lives in a PRIVATE bucket, so it has no public URL. This route is
 * the only way to it: it checks — itself, not through a layout — that the caller
 * is a signed-in owner whose MFA state is satisfied (attachments are lead data,
 * and § 13 keeps leads owner-only), then redirects to a download link that
 * expires in 60 seconds. The file itself is served by Storage with
 * `Content-Disposition: attachment`, so it is never rendered in a page.
 *
 * Everything that is not "a real owner asking for a real file" answers the same
 * plain 404 — anonymous, editor, unknown id, malformed id — so the route is not
 * an oracle for which ids exist or who is who.
 */
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SIGNED_URL_SECONDS = 60

const NOT_FOUND = () =>
  new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) return NOT_FOUND()

  const session = await getAdminSession()
  if (!session || !mfaSatisfied(session) || !canAccessLeads(session)) return NOT_FOUND()

  const supabase = getSupabaseServerClient()
  if (!supabase) return NOT_FOUND()

  // Only a file that belongs to a submitted brief: an unlinked upload is nobody's lead data yet.
  const { data: file } = await supabase
    .from('inquiry_files')
    .select('id, inquiry_id, storage_path, original_name')
    .eq('id', id)
    .not('inquiry_id', 'is', null)
    .maybeSingle()
  if (!file) return NOT_FOUND()

  const { data: signed, error } = await supabase.storage
    .from(INQUIRY_FILES_BUCKET)
    .createSignedUrl(file.storage_path as string, SIGNED_URL_SECONDS, { download: file.original_name as string })
  if (error || !signed?.signedUrl) return NOT_FOUND()

  await writeAuditLog({
    actor: session.userId,
    action: 'pipeline.file_opened',
    entity: 'inquiry_file',
    entityId: file.id as string,
    after: { inquiryId: file.inquiry_id },
  })

  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: signed.signedUrl,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex',
    },
  })
}
