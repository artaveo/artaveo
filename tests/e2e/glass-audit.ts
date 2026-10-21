import type { Page } from '@playwright/test'

/**
 * Phase 34 — the glass contrast audit on rendered pages (§ 14.1: text on glass
 * ≥ 4.5:1 against the worst background behind it; at most three glass layers
 * in a viewport).
 *
 * A glass layer is any element, or its `::before`, with a `backdrop-filter`.
 * For every visible piece of text whose nearest solid surface is a glass
 * layer, the colours between the text and the page behind the glass (the
 * text's own pill, a hover tint, the glass fill) are composited over pure
 * white and over pure black. Blur and saturation only mix colours that are
 * already there, so whatever the page shows behind the glass lands between
 * those two results; the worst contrast is at one of them — or 1:1 if the
 * text's own luminance falls between them, which fails.
 *
 * Runs in the page; returns plain data for the spec to assert on.
 */
export type GlassAudit = {
  layers: number
  layersInViewport: number
  checked: number
  failures: { text: string; ratio: number; color: string; where: string }[]
}

export function auditGlass(page: Page, minRatio = 4.5): Promise<GlassAudit> {
  return page.evaluate((min) => {
    type RGBA = [number, number, number, number]
    const parse = (value: string): RGBA | null => {
      const m = value.match(/rgba?\(([^)]+)\)/)
      if (!m) return null
      const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
      return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1]
    }
    const over = (top: RGBA, bottom: RGBA): RGBA => {
      const a = top[3]
      return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1]
    }
    const lum = ([r, g, b]: RGBA) => {
      const c = [r, g, b].map((v) => {
        const s = v / 255
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    }
    const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    const hasBackdrop = (style: CSSStyleDeclaration) => {
      const filter = style.backdropFilter || (style as unknown as Record<string, string>).webkitBackdropFilter
      return Boolean(filter) && filter !== 'none'
    }
    const describe = (el: Element) => {
      const slot = el.closest('[data-slot]')?.getAttribute('data-slot')
      return `${el.tagName.toLowerCase()}${slot ? ` in [data-slot=${slot}]` : ''}`
    }

    const all = [...document.querySelectorAll('body *')]
    const glassLayers = all.filter((el) => hasBackdrop(getComputedStyle(el)) || hasBackdrop(getComputedStyle(el, '::before')))
    const visibleLayers = glassLayers.filter((el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
    const inViewport = visibleLayers.filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
    })

    const failures: GlassAudit['failures'] = []
    let checked = 0
    for (const el of all) {
      const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
      if (!ownText) continue
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      if (el.closest('.sr-only, [aria-hidden="true"]')) continue

      // From the text up to the first surface that hides what is behind it.
      const stack: RGBA[] = []
      let onGlass = false
      for (let node: Element | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node)
        const before = getComputedStyle(node, '::before')
        if (style.backgroundImage !== 'none') break // a gradient or picture: not a glass surface
        const bg = parse(style.backgroundColor)
        if (bg && bg[3] > 0) stack.push(bg)
        if (hasBackdrop(style)) {
          onGlass = true
          break
        }
        if (hasBackdrop(before) && before.content !== 'none') {
          const fill = parse(before.backgroundColor)
          if (fill && fill[3] > 0) stack.push(fill)
          onGlass = true
          break
        }
        if (bg && bg[3] >= 1) break // opaque before any glass
      }
      if (!onGlass) continue
      checked++

      const composite = (backdrop: RGBA) => stack.reduceRight((acc, layer) => over(layer, acc), backdrop)
      const light = composite([255, 255, 255, 1])
      const dark = composite([0, 0, 0, 1])
      const text = parse(getComputedStyle(el).color) ?? [0, 0, 0, 1]
      const lText = lum(text[3] < 1 ? over(text, dark) : text)
      const lLight = lum(light)
      const lDark = lum(dark)
      const worst = lText >= Math.min(lLight, lDark) && lText <= Math.max(lLight, lDark) ? 1 : Math.min(ratio(lText, lLight), ratio(lText, lDark))
      if (worst < min) {
        failures.push({ text: (el.textContent ?? '').trim().slice(0, 40), ratio: Math.round(worst * 100) / 100, color: getComputedStyle(el).color, where: describe(el) })
      }
    }
    return { layers: glassLayers.length, layersInViewport: inViewport.length, checked, failures }
  }, minRatio)
}

/** Every element (or its `::before`) that still blurs what is behind it. */
export function blurringLayers(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((el) => {
        for (const style of [getComputedStyle(el), getComputedStyle(el, '::before')]) {
          const filter = style.backdropFilter || (style as unknown as Record<string, string>).webkitBackdropFilter
          if (filter && filter !== 'none') return true
        }
        return false
      })
      .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join('.')}`),
  )
}
