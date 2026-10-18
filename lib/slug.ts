/**
 * Phase 27 — page addresses (slugs) the owner can type freely. "Windows
 * Application" becomes `windows-application`: lower case, spaces and underscores
 * to dashes, everything else that is not a Latin letter or a digit dropped. Used
 * live while typing (`toSlugWhileTyping` keeps one trailing dash so the next word
 * can follow) and on save (`toSlug`).
 */
export function toSlugWhileTyping(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-/, '')
    .slice(0, 96)
}

export function toSlug(input: string): string {
  return toSlugWhileTyping(input).replace(/-+$/, '')
}
