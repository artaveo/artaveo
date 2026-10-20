import type * as React from 'react'

/**
 * Phase 28.1 / 28.3 — colour arithmetic for Design System 2.0.
 *
 * Each project and product has its own colour (`projects.brand_color`,
 * `accent_color`, set in the admin). The owner can type any colour, so the
 * text on a project's block cannot be a fixed white: `projectPalette()`
 * derives every colour the block uses from the two inputs and guarantees the
 * WCAG contrast of each text pairing against the worst point of the block's
 * background (both gradient stops, and the accent glow on top of them).
 *
 * Pure functions with no DOM, so tests/unit/design-system.test.mjs measures
 * the real rule — the same one the glass contrast test uses.
 */

export type Rgb = { r: number; g: number; b: number }

const HEX = /^#?([0-9a-f]{6})$/i

export function parseHex(value: string | null | undefined): Rgb | null {
  const match = typeof value === 'string' ? HEX.exec(value.trim()) : null
  if (!match) return null
  const n = Number.parseInt(match[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

function rgbOf(color: string | Rgb): Rgb {
  if (typeof color !== 'string') return color
  const rgb = parseHex(color)
  if (!rgb) throw new Error(`Not a #RRGGBB colour: ${color}`)
  return rgb
}

/** WCAG 2.x relative luminance. */
export function luminance(color: string | Rgb): number {
  const { r, g, b } = rgbOf(color)
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG 2.x contrast ratio, 1–21. */
export function contrastRatio(a: string | Rgb, b: string | Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The lowest contrast of `color` against any of `backgrounds`. */
export function worstContrast(color: string | Rgb, backgrounds: (string | Rgb)[]): number {
  return Math.min(...backgrounds.map((bg) => contrastRatio(color, bg)))
}

/** A translucent colour painted over an opaque one (what the eye sees through glass or a glow). */
export function composite(top: string | Rgb, alpha: number, bottom: string | Rgb): Rgb {
  const t = rgbOf(top)
  const u = rgbOf(bottom)
  return { r: t.r * alpha + u.r * (1 - alpha), g: t.g * alpha + u.g * (1 - alpha), b: t.b * alpha + u.b * (1 - alpha) }
}

/** `a` moved toward `b` by `amount` (0–1). */
export function mix(a: string | Rgb, b: string | Rgb, amount: number): string {
  return toHex(composite(b, amount, a))
}

export const LIGHT_TEXT = '#f3f1ec'
export const DARK_TEXT = '#16181d'

type Pole = '#ffffff' | '#000000'

/** The site's light or dark text colour, whichever reads better on `background`. */
export function readableOn(background: string | Rgb): string {
  return contrastRatio(LIGHT_TEXT, background) >= contrastRatio(DARK_TEXT, background) ? LIGHT_TEXT : DARK_TEXT
}

/**
 * `color` itself when it already reaches `min` against every background;
 * otherwise `color` pushed, in small steps, toward `pole` (white or black) —
 * so a project's accent keeps its hue as far as contrast allows.
 */
export function ensureContrast(color: string, backgrounds: (string | Rgb)[], min: number, pole: Pole): string {
  if (worstContrast(color, backgrounds) >= min) return toHex(rgbOf(color))
  for (let step = 1; step <= 20; step += 1) {
    const candidate = mix(color, pole, step / 20)
    if (worstContrast(candidate, backgrounds) >= min) return candidate
  }
  return pole
}

export type ProjectPalette = {
  /** The block's ground (its gradient's first stop). */
  surface: string
  /** The gradient's second stop. */
  deep: string
  /** Main text on the block. */
  on: string
  /** Secondary text on the block. */
  onMuted: string
  /** Fill of the block's main button and chips. */
  accent: string
  /** Text on an accent fill. */
  accentForeground: string
  /** The accent as a text or icon colour on the block. */
  accentText: string
}

/** The ink-and-gold pair used when a project has no colour of its own. */
export const DEFAULT_PROJECT_COLORS = { brand: '#11141b', accent: '#e2b65c' } as const

/** How strong the accent's glow is where it is brightest (components/brand/product-block.tsx). */
export const PROJECT_GLOW_ALPHA = 0.2

/**
 * Every colour a project's block uses, from its two admin colours. Invalid or
 * missing values fall back to ink and gold. Main and secondary text, and the
 * accent used as text, reach 4.5:1 against every point of the block's
 * background; text on the accent fill reaches 4.5:1 too.
 *
 * A mid-tone colour (some greys, reds, greens) can be too light for light
 * text and too dark for dark text. Then the ground is shaded — darker under
 * light text, lighter under dark text — by the smallest step that makes the
 * text readable, so the block keeps the owner's hue.
 */
export function projectPalette(brandColor?: string | null, accentColor?: string | null): ProjectPalette {
  const brand = toHex(parseHex(brandColor) ?? rgbOf(DEFAULT_PROJECT_COLORS.brand))
  const accent = toHex(parseHex(accentColor) ?? rgbOf(DEFAULT_PROJECT_COLORS.accent))

  type Option = { pole: Pole; surface: string; deep: string; grounds: Rgb[]; on: string; score: number; shade: number }
  const build = (side: 'light' | 'dark', shade: number): Option => {
    const pole: Pole = side === 'light' ? '#ffffff' : '#000000'
    const away = side === 'light' ? '#000000' : '#ffffff'
    const surface = mix(brand, away, shade)
    // The second stop moves away from the text too, so it never lowers the contrast below the first stop's.
    const deep = mix(surface, away, 0.4)
    const grounds = [rgbOf(surface), rgbOf(deep), composite(accent, PROJECT_GLOW_ALPHA, surface), composite(accent, PROJECT_GLOW_ALPHA, deep)]
    const on = ensureContrast(side === 'light' ? LIGHT_TEXT : DARK_TEXT, grounds, 7, pole)
    return { pole, surface, deep, grounds, on, score: worstContrast(on, grounds), shade }
  }

  let best: Option | null = null
  for (let step = 0; step <= 12 && !best; step += 1) {
    const readable = (['light', 'dark'] as const).map((side) => build(side, step * 0.05)).filter((o) => o.score >= 4.5)
    if (readable.length > 0) best = readable.reduce((x, y) => (y.score > x.score ? y : x))
  }
  best ??= build('light', 0.6)

  // Pure white or pure black always reaches 4.58:1 on any colour; pick the side by them, not by the softer text pair.
  const accentPole: Pole = contrastRatio('#ffffff', accent) >= contrastRatio('#000000', accent) ? '#ffffff' : '#000000'
  return {
    surface: best.surface,
    deep: best.deep,
    on: best.on,
    onMuted: ensureContrast(mix(best.on, best.surface, 0.25), best.grounds, 4.5, best.pole),
    accent,
    accentForeground: ensureContrast(accentPole === '#ffffff' ? LIGHT_TEXT : DARK_TEXT, [accent], 4.5, accentPole),
    accentText: ensureContrast(accent, best.grounds, 4.5, best.pole),
  }
}

/**
 * `color` made lighter (toward white) or darker (toward black) until its
 * luminance is `target` — a tonal step of the same hue, as Material 3's tonal
 * palettes are, so every project colour the owner types gets the same calm
 * steps whatever its own lightness.
 */
export function tone(color: string | Rgb, target: number): string {
  // Only the lightness moves; hue and saturation stay, so a navy's light tone is still blue, not grey.
  const { h, s } = toHsl(rgbOf(color))
  let lo = 0
  let hi = 1
  for (let i = 0; i < 28; i += 1) {
    const mid = (lo + hi) / 2
    if (luminance(fromHsl(h, s, mid)) < target) lo = mid
    else hi = mid
  }
  return toHex(fromHsl(h, s, (lo + hi) / 2))
}

function toHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255]
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4
  return { h: h / 6, s, l }
}

function fromHsl(h: number, s: number, l: number): Rgb {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t
    if (u < 1 / 6) return p + (q - p) * 6 * u
    if (u < 1 / 2) return q
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6
    return p
  }
  return { r: channel(h + 1 / 3) * 255, g: channel(h) * 255, b: channel(h - 1 / 3) * 255 }
}

/** One theme's colours of a project card (§ 6.8, D-22). */
export type CardTones = {
  /** The text side — a very light tint (light theme) or a deep tone (dark theme) of the hue. */
  ground: string
  /** The screenshot panel — a soft tone of the hue, and its second gradient stop. */
  panel: string
  panelDeep: string
  /** Hairline border of the card. */
  line: string
  /** Outline of the chips and the platform tiles. */
  chipLine: string
  /** The title, the link and the button fill — the project's colour as text. */
  title: string
  /** Body text and the text on the button. */
  text: string
  muted: string
  actionText: string
}

/** Luminance targets of the card's tonal steps, per theme (light ≈ tone 94/80/70, dark ≈ tone 12/20/30). */
const CARD_TONE_TARGETS = {
  light: { ground: 0.86, panel: 0.6, panelDeep: 0.48, line: 0.66, chipLine: 0.42, title: 0.06 },
  dark: { ground: 0.018, panel: 0.05, panelDeep: 0.032, line: 0.08, chipLine: 0.14, title: 0.42 },
} as const

/**
 * Phase 32.6 (owner, 20 October 2026 — § 6.8, D-22): the colours of a project
 * card in the light and the dark theme, from the project's own colour. One hue
 * in tonal steps over the whole card; the identity hue is the same in both
 * themes, only its tones follow the theme (a container colour is light in the
 * light scheme and dark in the dark scheme). The title, the body text, the
 * secondary text and the button text reach 4.5:1 or more on their grounds.
 */
export function projectCardTones(brandColor?: string | null): { light: CardTones; dark: CardTones } {
  const brand = toHex(parseHex(brandColor) ?? rgbOf(DEFAULT_PROJECT_COLORS.brand))
  const build = (theme: 'light' | 'dark'): CardTones => {
    const target = CARD_TONE_TARGETS[theme]
    const pole: Pole = theme === 'light' ? '#000000' : '#ffffff'
    const opposite: Pole = theme === 'light' ? '#ffffff' : '#000000'
    const ground = tone(brand, target.ground)
    const title = ensureContrast(tone(brand, target.title), [ground], 4.5, pole)
    const text = ensureContrast(mix(theme === 'light' ? DARK_TEXT : LIGHT_TEXT, brand, 0.12), [ground], 7, pole)
    return {
      ground,
      panel: tone(brand, target.panel),
      panelDeep: tone(brand, target.panelDeep),
      line: tone(brand, target.line),
      chipLine: tone(brand, target.chipLine),
      title,
      text,
      muted: ensureContrast(mix(text, ground, 0.3), [ground], 4.5, pole),
      actionText: ensureContrast(ground, [title], 4.5, opposite),
    }
  }
  return { light: build('light'), dark: build('dark') }
}

/** The card tones as the custom properties `[data-project-tones]` switches between (app/globals.css). */
export function cardTonesStyle(tones: { light: CardTones; dark: CardTones }): React.CSSProperties {
  const style: Record<string, string> = {}
  for (const theme of ['light', 'dark'] as const) {
    for (const [key, value] of Object.entries(tones[theme])) {
      style[`--pc-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}-${theme}`] = value
    }
  }
  return style as React.CSSProperties
}

/** The palette as the custom properties `--color-project-*` read (app/globals.css). */
export function projectStyle(palette: ProjectPalette): React.CSSProperties {
  return {
    '--project': palette.surface,
    '--project-deep': palette.deep,
    '--project-on': palette.on,
    '--project-on-muted': palette.onMuted,
    '--project-accent': palette.accent,
    '--project-accent-foreground': palette.accentForeground,
    '--project-accent-text': palette.accentText,
  } as React.CSSProperties
}

/** A colour with an alpha, for glows (`rgb(r g b / a)`). */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = rgbOf(hex)
  return `rgb(${r} ${g} ${b} / ${alpha})`
}
