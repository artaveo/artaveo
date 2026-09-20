import crypto from 'node:crypto'

/**
 * Shared between `app/actions/media.ts` (admin library uploads) and
 * `app/actions/inquiry-attachments.ts` (public Brief Builder uploads) so
 * the two upload paths enforce the exact same rules rather than two
 * copies that could drift — § 15's "type/size validation server-side,
 * safe names" applies equally to both.
 */

export const ALLOWED_MEDIA_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'] as const
export const MAX_MEDIA_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB — matches the `media` bucket's own `file_size_limit` (0012)
export const MEDIA_BUCKET = 'media'

/** Brief Builder attachments: a PRIVATE bucket (migration 0020), raster images only — no SVG from strangers. */
export const INQUIRY_FILES_BUCKET = 'inquiry-files'
export const VISITOR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
export const MAX_ATTACHMENTS_PER_INQUIRY = 3

/**
 * Strips everything but ASCII letters/digits/hyphens from the original
 * filename (never trusts a browser-supplied name directly — no path
 * separators, no unicode homograph tricks, no ".." traversal) and
 * prefixes it with a timestamp + random suffix so two uploads of
 * "screenshot.png" in the same second never collide or overwrite.
 */
export function safeStoragePath(originalName: string): string {
  const lastDot = originalName.lastIndexOf('.')
  const ext = lastDot >= 0 ? originalName.slice(lastDot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : ''
  const base = (lastDot >= 0 ? originalName.slice(0, lastDot) : originalName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const stamp = Date.now().toString(36)
  // Phase 23: 96 bits from the platform CSPRNG. The old suffix (`Math.random`, six base-36
  // characters) was predictable; a stored file's URL is a capability, so it must not be.
  const random = crypto.randomBytes(12).toString('hex')
  const safeBase = base || 'file'
  return ext ? `${stamp}-${random}-${safeBase}.${ext}` : `${stamp}-${random}-${safeBase}`
}

export function clampFocal(value: number): number {
  if (Number.isNaN(value)) return 0.5
  return Math.min(1, Math.max(0, value))
}

/** What is shown to the owner later, and used as the download name: letters, digits, spaces and a little punctuation; never a path. */
export function displayFileName(raw: string): string {
  const cleaned = raw
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} ._()-]/gu, '_')
    .replace(/\.{2,}/g, '.')
    .trim()
    .slice(0, 120)
  return cleaned || 'file'
}
