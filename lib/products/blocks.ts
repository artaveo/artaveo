import type {
  BlockImage,
  FaqItem,
  LocalizedText,
  ProjectBlock,
  ProjectBlockType,
} from '@/types/content'
import { PROJECT_BLOCK_TYPES } from '@/types/content'

/**
 * Phase 27.2 — content blocks: what each block type stores, how an owner's input
 * is checked before it is stored, when a block is complete in a language, and how
 * a stored row becomes the public `ProjectBlock`.
 *
 * Stored `body` per type (`project_blocks.body`, a JSON object):
 *   intro | challenge | result   { text }
 *   features                     { text? }          — the list is the project's `features`
 *   gallery                      { images: [{ mediaId, caption? }] }
 *   features-by-role             { groups: [{ role, items[] }] }
 *   audience                     { text?, items[] }
 *   faq                          { items: [{ question, answer }] }
 *   video                        { provider: 'youtube' | 'vimeo', videoId, caption? }
 *
 * Every text is `{ en, fa }`. Pure functions — no database, no React — so the
 * admin action, the selectors and the unit tests share one definition.
 */

export type StoredBlockBody = Record<string, unknown>

export type BlockCompleteness = { en: boolean; fa: boolean }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_TEXT = 4000
const MAX_ITEMS = 40

export function isBlockType(value: unknown): value is ProjectBlockType {
  return typeof value === 'string' && (PROJECT_BLOCK_TYPES as string[]).includes(value)
}

// ---------------------------------------------------------------------------
// localized text helpers

function isLocalized(value: unknown): value is LocalizedText {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as LocalizedText).en === 'string' &&
    typeof (value as LocalizedText).fa === 'string'
  )
}

/** `{ en, fa }` trimmed and capped, or `null` when both are empty or the value is not text. */
export function cleanText(value: unknown): LocalizedText | null {
  if (!isLocalized(value)) return null
  const en = value.en.trim().slice(0, MAX_TEXT)
  const fa = value.fa.trim().slice(0, MAX_TEXT)
  return en || fa ? { en, fa } : null
}

export function cleanTextList(value: unknown): LocalizedText[] {
  if (!Array.isArray(value)) return []
  return value.map(cleanText).filter((item): item is LocalizedText => item !== null).slice(0, MAX_ITEMS)
}

function complete(value: LocalizedText | null | undefined): BlockCompleteness {
  return { en: Boolean(value?.en.trim()), fa: Boolean(value?.fa.trim()) }
}

function merge(items: BlockCompleteness[]): BlockCompleteness {
  return { en: items.every((i) => i.en), fa: items.every((i) => i.fa) }
}

// ---------------------------------------------------------------------------
// video

export type VideoRef = { provider: 'youtube' | 'vimeo'; videoId: string }

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const VIMEO_ID = /^\d{6,12}$/

/**
 * A YouTube or Vimeo address → provider and id. Anything else is refused: the page
 * only ever embeds the privacy-friendly player of these two (`videoEmbedUrl`), and
 * the Content Security Policy allows exactly those two frame origins.
 */
export function parseVideoUrl(input: string): VideoRef | null {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.replace(/^www\.|^m\./, '')
  const parts = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be') {
    const id = parts[0] ?? ''
    return YOUTUBE_ID.test(id) ? { provider: 'youtube', videoId: id } : null
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = parts[0] === 'watch' ? (url.searchParams.get('v') ?? '') : ['embed', 'shorts', 'live'].includes(parts[0] ?? '') ? (parts[1] ?? '') : ''
    return YOUTUBE_ID.test(id) ? { provider: 'youtube', videoId: id } : null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parts[0] === 'video' ? (parts[1] ?? '') : (parts[0] ?? '')
    return VIMEO_ID.test(id) ? { provider: 'vimeo', videoId: id } : null
  }
  return null
}

export function videoEmbedUrl(ref: VideoRef): string {
  return ref.provider === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${ref.videoId}`
    : `https://player.vimeo.com/video/${ref.videoId}?dnt=1`
}

export function videoWatchUrl(ref: VideoRef): string {
  return ref.provider === 'youtube' ? `https://www.youtube.com/watch?v=${ref.videoId}` : `https://vimeo.com/${ref.videoId}`
}

/** The frame origins the public CSP allows — exactly the two players above. */
export const VIDEO_FRAME_ORIGINS = ['https://www.youtube-nocookie.com', 'https://player.vimeo.com']

// ---------------------------------------------------------------------------
// input → stored body

/**
 * Checks and cleans what the admin sent for one block. Returns the body to store,
 * or `null` when it does not fit the type (a wrong shape, a gallery image that is
 * not a library id, a video address that is not YouTube or Vimeo). Empty list
 * entries are dropped; an empty block is allowed as a draft — completeness decides
 * whether it can be published.
 *
 * The admin sends a video as `{ url, caption }`; it is stored as provider + id.
 */
export function normalizeBlockBody(type: ProjectBlockType, input: unknown): StoredBlockBody | null {
  const body = typeof input === 'object' && input !== null && !Array.isArray(input) ? (input as Record<string, unknown>) : null
  if (!body) return null

  switch (type) {
    case 'intro':
    case 'challenge':
    case 'result':
      return { text: cleanText(body.text) ?? { en: '', fa: '' } }

    case 'features': {
      const text = cleanText(body.text)
      return text ? { text } : {}
    }

    case 'gallery': {
      if (!Array.isArray(body.images)) return { images: [] }
      const images: { mediaId: string; caption?: LocalizedText }[] = []
      for (const raw of body.images.slice(0, MAX_ITEMS)) {
        const mediaId = typeof raw === 'object' && raw !== null ? (raw as { mediaId?: unknown }).mediaId : null
        if (typeof mediaId !== 'string' || !UUID.test(mediaId)) return null
        if (images.some((image) => image.mediaId === mediaId)) continue
        const caption = cleanText((raw as { caption?: unknown }).caption)
        images.push(caption ? { mediaId, caption } : { mediaId })
      }
      return { images }
    }

    case 'features-by-role': {
      if (!Array.isArray(body.groups)) return { groups: [] }
      const groups = body.groups
        .slice(0, MAX_ITEMS)
        .map((raw) => {
          const group = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
          return { role: cleanText(group.role) ?? { en: '', fa: '' }, items: cleanTextList(group.items) }
        })
        .filter((group) => group.role.en || group.role.fa || group.items.length > 0)
      return { groups }
    }

    case 'audience': {
      const text = cleanText(body.text)
      return { ...(text ? { text } : {}), items: cleanTextList(body.items) }
    }

    case 'faq': {
      if (!Array.isArray(body.items)) return { items: [] }
      const items = body.items
        .slice(0, MAX_ITEMS)
        .map((raw) => {
          const item = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
          return { question: cleanText(item.question) ?? { en: '', fa: '' }, answer: cleanText(item.answer) ?? { en: '', fa: '' } }
        })
        .filter((item) => item.question.en || item.question.fa || item.answer.en || item.answer.fa)
      return { items }
    }

    case 'video': {
      const ref =
        typeof body.url === 'string'
          ? parseVideoUrl(body.url)
          : (body.provider === 'youtube' && typeof body.videoId === 'string' && YOUTUBE_ID.test(body.videoId)) ||
              (body.provider === 'vimeo' && typeof body.videoId === 'string' && VIMEO_ID.test(body.videoId))
            ? { provider: body.provider as VideoRef['provider'], videoId: body.videoId as string }
            : null
      if (!ref) return null
      const caption = cleanText(body.caption)
      return { ...ref, ...(caption ? { caption } : {}) }
    }
  }
}

// ---------------------------------------------------------------------------
// completeness

/**
 * Whether a stored block is complete in each language — the same rule as every
 * other entity (§ 15): its required content is there, and everything the owner
 * did write exists in both languages. A block is published only when complete in
 * both; an empty list block (a gallery without images, an FAQ without questions)
 * is never complete, so it can never show up empty.
 */
export function blockCompleteness(type: ProjectBlockType, title: LocalizedText | null | undefined, body: StoredBlockBody): BlockCompleteness {
  const checks: BlockCompleteness[] = []
  if (title) checks.push(complete(title))
  const never = { en: false, fa: false }

  switch (type) {
    case 'intro':
    case 'challenge':
    case 'result':
      checks.push(complete(body.text as LocalizedText | undefined))
      break
    case 'features':
      if (body.text) checks.push(complete(body.text as LocalizedText))
      break
    case 'gallery': {
      const images = (body.images as { caption?: LocalizedText }[] | undefined) ?? []
      if (images.length === 0) checks.push(never)
      for (const image of images) if (image.caption) checks.push(complete(image.caption))
      break
    }
    case 'features-by-role': {
      const groups = (body.groups as { role: LocalizedText; items: LocalizedText[] }[] | undefined) ?? []
      if (groups.length === 0) checks.push(never)
      for (const group of groups) {
        checks.push(complete(group.role))
        if (group.items.length === 0) checks.push(never)
        for (const item of group.items) checks.push(complete(item))
      }
      break
    }
    case 'audience': {
      const items = (body.items as LocalizedText[] | undefined) ?? []
      if (body.text) checks.push(complete(body.text as LocalizedText))
      if (!body.text && items.length === 0) checks.push(never)
      for (const item of items) checks.push(complete(item))
      break
    }
    case 'faq': {
      const items = (body.items as FaqItem[] | undefined) ?? []
      if (items.length === 0) checks.push(never)
      for (const item of items) checks.push(complete(item.question), complete(item.answer))
      break
    }
    case 'video':
      if (typeof body.videoId !== 'string') checks.push(never)
      if (body.caption) checks.push(complete(body.caption as LocalizedText))
      break
  }
  return merge(checks)
}

// ---------------------------------------------------------------------------
// stored row → public block

export type BlockMediaAsset = { id: string; url: string; alt: LocalizedText | null; width: number | null; height: number | null }

/** Library ids a stored gallery body points at — so a selector can fetch them in one query. */
export function galleryMediaIds(type: string, body: StoredBlockBody): string[] {
  if (type !== 'gallery' || !Array.isArray(body.images)) return []
  return (body.images as { mediaId?: unknown }[]).map((image) => image.mediaId).filter((id): id is string => typeof id === 'string')
}

/**
 * The public shape of one stored block, or `null` when nothing of it can be shown
 * (an unknown type, a gallery whose images were all deleted from the library).
 * Images without alt text are skipped, never rendered without one.
 */
export function toPublicBlock(
  row: { id: string; type: string; title: LocalizedText | null; body: StoredBlockBody },
  mediaById: Map<string, BlockMediaAsset>,
): ProjectBlock | null {
  if (!isBlockType(row.type)) return null
  const base = { id: row.id, ...(row.title ? { title: row.title } : {}) }
  const body = row.body ?? {}

  switch (row.type) {
    case 'intro':
    case 'challenge':
    case 'result':
      return isLocalized(body.text) ? { ...base, type: row.type, text: body.text } : null
    case 'features':
      return { ...base, type: 'features', ...(isLocalized(body.text) ? { text: body.text } : {}) }
    case 'gallery': {
      const images: BlockImage[] = []
      for (const image of (body.images as { mediaId: string; caption?: LocalizedText }[] | undefined) ?? []) {
        const asset = mediaById.get(image.mediaId)
        if (!asset || !asset.alt) continue
        images.push({
          mediaId: asset.id,
          src: asset.url,
          alt: asset.alt,
          ...(image.caption ? { caption: image.caption } : {}),
          ...(asset.width ? { width: asset.width } : {}),
          ...(asset.height ? { height: asset.height } : {}),
        })
      }
      return images.length > 0 ? { ...base, type: 'gallery', images } : null
    }
    case 'features-by-role': {
      const groups = (body.groups as { role: LocalizedText; items: LocalizedText[] }[] | undefined) ?? []
      return groups.length > 0 ? { ...base, type: 'features-by-role', groups } : null
    }
    case 'audience':
      return {
        ...base,
        type: 'audience',
        ...(isLocalized(body.text) ? { text: body.text } : {}),
        items: (body.items as LocalizedText[] | undefined) ?? [],
      }
    case 'faq': {
      const items = (body.items as FaqItem[] | undefined) ?? []
      return items.length > 0 ? { ...base, type: 'faq', items } : null
    }
    case 'video':
      return (body.provider === 'youtube' || body.provider === 'vimeo') && typeof body.videoId === 'string'
        ? {
            ...base,
            type: 'video',
            provider: body.provider,
            videoId: body.videoId,
            ...(isLocalized(body.caption) ? { caption: body.caption } : {}),
          }
        : null
  }
}
