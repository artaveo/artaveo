/**
 * What an uploaded file actually IS, judged from its bytes (Phase 23 — upload
 * hardening). Until now the only evidence was `file.type`, a string the sender
 * chooses: an HTML page uploaded as "image/png" was stored and served as
 * whatever the sender said. Nothing here trusts the declared type — it must
 * MATCH what the first bytes say, and the image's own header must be readable
 * and of a sane size.
 *
 * Deliberate limits: this identifies the format and reads dimensions; it does
 * not decode pixels, and it does not make a file "clean" (a valid PNG can still
 * be an unpleasant picture). Its job is to make sure a file that is stored and
 * served as an image is an image, and cannot be a script wearing an image's
 * name.
 */

export type ImageType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' | 'image/svg+xml'

export type UploadInspection =
  | { ok: true; contentType: ImageType; width: number | null; height: number | null }
  | { ok: false; reason: 'invalid-type' | 'corrupt' | 'dimensions' | 'unsafe-svg' }

/** Largest side, and total pixels — the image optimiser decodes what is stored, so a 5 MB file must not be able to describe a gigapixel canvas. */
export const MAX_IMAGE_SIDE = 16_384
export const MAX_IMAGE_PIXELS = 50_000_000

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length))

const u16be = (b: Uint8Array, o: number) => (b[o]! << 8) | b[o + 1]!
const u32be = (b: Uint8Array, o: number) => ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0
const u16le = (b: Uint8Array, o: number) => b[o]! | (b[o + 1]! << 8)

type Size = { width: number; height: number } | null

function pngSize(b: Uint8Array): Size {
  // signature (8) + IHDR chunk: length (4), "IHDR" (4), width (4), height (4)
  if (b.length < 24 || ascii(b, 12, 4) !== 'IHDR') return null
  return { width: u32be(b, 16), height: u32be(b, 20) }
}

function gifSize(b: Uint8Array): Size {
  if (b.length < 10) return null
  return { width: u16le(b, 6), height: u16le(b, 8) }
}

function jpegSize(b: Uint8Array): Size {
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null
    let marker = b[i + 1]!
    while (marker === 0xff && i + 2 < b.length) {
      i += 1
      marker = b[i + 1]!
    }
    // Standalone markers have no length.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2
      continue
    }
    const length = u16be(b, i + 2)
    if (length < 2) return null
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isFrame) return { height: u16be(b, i + 5), width: u16be(b, i + 7) }
    i += 2 + length
  }
  return null
}

function webpSize(b: Uint8Array): Size {
  if (b.length < 30) return null
  const chunk = ascii(b, 12, 4)
  if (chunk === 'VP8X') {
    const width = 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16))
    const height = 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16))
    return { width, height }
  }
  if (chunk === 'VP8L') {
    if (b[20] !== 0x2f) return null
    const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24)
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) }
  }
  if (chunk === 'VP8 ') {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null
    return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff }
  }
  return null
}

function sniff(b: Uint8Array): ImageType | null {
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === 'PNG' && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return 'image/png'
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 6 && (ascii(b, 0, 6) === 'GIF87a' || ascii(b, 0, 6) === 'GIF89a')) return 'image/gif'
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'image/webp'
  return null
}

// ---------------------------------------------------------------------------
// SVG — the one type that is text, and text can carry script.
// ---------------------------------------------------------------------------

const SVG_START = /^(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!doctype\s+svg[^>[]*>\s*)?<svg[\s>]/i

/** Anything that can run code, load another document, or define entities. A denylist can miss things, which is why SVG is (a) admin-only and (b) only ever shown through <img>, where script never runs. */
const SVG_FORBIDDEN =
  /<\s*(?:script|foreignobject|iframe|embed|object|audio|video|canvas|link|meta|base|handler|listener)\b|<!entity|<!doctype[^>]*\[|\bon[a-z]+\s*=|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|@import|expression\s*\(/i

const HREF = /(?:xlink:)?href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
const SAFE_HREF = /^(?:#|data:image\/(?:png|jpeg|gif|webp);base64,)/i
const URL_FN = /url\(\s*(['"]?)\s*([^)]*)\)/gi

export function inspectSvg(text: string): boolean {
  const body = text.replace(/^\uFEFF/, '').trimStart()
  if (!SVG_START.test(body)) return false
  if (SVG_FORBIDDEN.test(body)) return false
  for (const match of body.matchAll(HREF)) {
    const value = (match[1] ?? match[2] ?? '').trim()
    if (!SAFE_HREF.test(value)) return false
  }
  for (const match of body.matchAll(URL_FN)) {
    if (!(match[2] ?? '').trim().startsWith('#')) return false
  }
  return true
}

// ---------------------------------------------------------------------------

export function inspectUpload(
  bytes: Uint8Array,
  declaredType: string,
  options: { allowSvg: boolean },
): UploadInspection {
  const raster = sniff(bytes)

  if (raster === null) {
    if (declaredType === 'image/svg+xml' && options.allowSvg) {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
      return inspectSvg(text)
        ? { ok: true, contentType: 'image/svg+xml', width: null, height: null }
        : { ok: false, reason: 'unsafe-svg' }
    }
    return { ok: false, reason: 'invalid-type' }
  }

  if (raster !== declaredType) return { ok: false, reason: 'invalid-type' }

  const size =
    raster === 'image/png' ? pngSize(bytes) : raster === 'image/gif' ? gifSize(bytes) : raster === 'image/jpeg' ? jpegSize(bytes) : webpSize(bytes)
  if (!size || size.width < 1 || size.height < 1) return { ok: false, reason: 'corrupt' }
  if (size.width > MAX_IMAGE_SIDE || size.height > MAX_IMAGE_SIDE || size.width * size.height > MAX_IMAGE_PIXELS) {
    return { ok: false, reason: 'dimensions' }
  }
  return { ok: true, contentType: raster, width: size.width, height: size.height }
}
