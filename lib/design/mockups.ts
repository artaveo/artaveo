import { t, type Locale, type Project } from '@/types/content'

export type MockupPick = {
  laptop: { src: string; alt: string; width?: number; height?: number } | null
  phone: { src: string; alt: string; width?: number; height?: number } | null
}

/**
 * Phase 28.5 — which real screenshots of a project go into its laptop and
 * phone frames: the cover (or the first desktop screenshot) on the laptop,
 * the first mobile screenshot on the phone. Only landscape images go on the laptop. Nothing is invented: a project
 * with no screenshots gets no mock-up, and its block shows its colour alone.
 */
export function pickMockupImages(project: Pick<Project, 'title' | 'coverImage' | 'media'>, locale: Locale): MockupPick {
  const media = project.media ?? []
  const title = t(project.title, locale)
  // A laptop screen is landscape: a portrait screenshot would be cut in half.
  const landscape = (w?: number, h?: number) => !w || !h || w >= h
  const desktop = media.find((m) => m.kind === 'desktop' && landscape(m.width, m.height))
  const mobile = media.find((m) => m.kind === 'mobile')
  const coverItem = project.coverImage ? media.find((m) => m.src === project.coverImage) : undefined

  const coverFits = project.coverImage && landscape(coverItem?.width, coverItem?.height)
  const laptop = coverFits && project.coverImage
    ? { src: project.coverImage, alt: coverItem ? t(coverItem.alt, locale) : title, width: coverItem?.width, height: coverItem?.height }
    : desktop
      ? { src: desktop.src, alt: t(desktop.alt, locale), width: desktop.width, height: desktop.height }
      : null
  const phone = mobile ? { src: mobile.src, alt: t(mobile.alt, locale), width: mobile.width, height: mobile.height } : null
  return { laptop, phone }
}
