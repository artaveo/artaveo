/**
 * Phase 28 — Design System 2.0's measurable rules.
 *
 * The colour values are read from app/globals.css itself, so a token edited
 * there is re-measured here; nothing is copied by hand. Covered:
 * - every text pairing the tokens are meant for reaches WCAG AA (4.5:1);
 * - glass (28.3): text on the glass fill reaches 4.5:1 over the worst
 *   background that can scroll behind it (white), from the fill alone — and
 *   the reduced-transparency / no-backdrop-filter fallbacks exist;
 * - each project's own colour (28.1): projectPalette() keeps every text
 *   pairing readable for any colour the owner can type;
 * - type (28.2): the scale stays inside § 14.1's ranges;
 * - motion (28.4): the whole-page fade is gone and every motion utility is
 *   off under prefers-reduced-motion.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import {
  cardTonesStyle,
  composite,
  contrastRatio,
  luminance,
  PROJECT_GLOW_ALPHA,
  projectCardTones,
  projectPalette,
  tone,
  toHex,
  worstContrast,
} from '../../lib/design/color.ts'
import { pickMockupImages } from '../../lib/design/mockups.ts'
import { cn } from '../../lib/utils.ts'

const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8')

/** `--name: value;` from the :root block (the Design System 2.0 tokens are defined once there). */
function token(name) {
  const root = css.slice(css.indexOf(':root {'), css.indexOf('.dark {'))
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(root)
  assert.ok(match, `--${name} is defined on :root`)
  return match[1].trim()
}

/** `rgb(10 12 17 / 0.74)` → ['#0a0c11', 0.74] */
function rgba(value) {
  const m = /^rgb\((\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\)$/.exec(value)
  assert.ok(m, `${value} is rgb(r g b / a)`)
  return [toHex({ r: +m[1], g: +m[2], b: +m[3] }), Number(m[4])]
}

describe('Design System 2.0 tokens (28.1)', () => {
  const pairs = [
    ['ink-foreground', 'ink'],
    ['ink-foreground', 'ink-elevated'],
    ['ink-muted', 'ink'],
    ['ink-muted', 'ink-raised'],
    ['ink-muted', 'ink-elevated'],
    ['ink-subtle', 'ink'],
    ['gold', 'ink'],
    ['gold', 'ink-elevated'],
    ['cool-text', 'ink'],
    ['paper-foreground', 'paper'],
    ['paper-foreground', 'paper-card'],
    ['paper-muted', 'paper'],
    ['paper-muted', 'paper-card'],
    ['gold-deep', 'paper'],
    ['gold-deep', 'paper-card'],
    ['gold-foreground', 'gold'],
    ['paper-card', 'paper-foreground'],
    ['ink-muted', 'paper-foreground'],
  ]
  for (const [fg, bg] of pairs) {
    it(`${fg} on ${bg} reaches 4.5:1`, () => {
      const ratio = contrastRatio(token(fg), token(bg))
      assert.ok(ratio >= 4.5, `${fg} ${token(fg)} on ${bg} ${token(bg)}: ${ratio.toFixed(2)}`)
    })
  }

  it('gold is a fill on the warm panel, never its text colour (it fails there)', () => {
    assert.ok(contrastRatio(token('gold'), token('paper')) < 3)
  })

  it('the WhatsApp button keeps its white icon at 3:1 or more (non-text contrast)', () => {
    assert.ok(contrastRatio('#ffffff', token('whatsapp')) >= 3)
  })

  it('the ink bands, gold and glass are not redefined for the dark theme', () => {
    const dark = css.slice(css.indexOf('.dark {'), css.search(/^\[data-project-tones\] \{/m))
    for (const name of ['ink', 'gold', 'glass-fill']) assert.doesNotMatch(dark, new RegExp(`--${name}:`))
  })

  // Phase 32.6 (D-22): the warm panels follow the theme — every pairing is measured again on the dark values.
  const darkToken = (name) => {
    const dark = css.slice(css.indexOf('.dark {'), css.search(/^\[data-project-tones\] \{/m))
    const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(dark)
    assert.ok(match, `--${name} is redefined under .dark`)
    return match[1].trim()
  }
  for (const [fg, bg] of [
    ['paper-foreground', 'paper'],
    ['paper-foreground', 'paper-card'],
    ['paper-muted', 'paper'],
    ['paper-muted', 'paper-card'],
    ['gold-deep', 'paper'],
    ['gold-deep', 'paper-card'],
    ['paper-card', 'paper-foreground'],
  ]) {
    it(`dark theme: ${fg} on ${bg} reaches 4.5:1`, () => {
      const ratio = contrastRatio(darkToken(fg), darkToken(bg))
      assert.ok(ratio >= 4.5, `${fg} ${darkToken(fg)} on ${bg} ${darkToken(bg)}: ${ratio.toFixed(2)}`)
    })
  }
  it('both themes: gold and ink text stay readable on the dark tiles of the warm panel (paper-ink)', () => {
    for (const ink of [token('paper-ink'), darkToken('paper-ink')]) {
      assert.ok(contrastRatio(token('gold'), ink) >= 4.5, `gold on ${ink}`)
      assert.ok(contrastRatio(token('ink-foreground'), ink) >= 4.5, `ink-foreground on ${ink}`)
      assert.ok(contrastRatio(token('ink-muted'), ink) >= 4.5, `ink-muted on ${ink}`)
    }
  })
  it('the dark warm panel still stands apart from the ink around it', () => {
    assert.ok(contrastRatio(darkToken('paper'), token('ink')) > 1.05)
    assert.ok(contrastRatio(darkToken('paper-card'), darkToken('paper')) > 1.1)
  })
  it('the /design-system light preview repeats the light values exactly', () => {
    const light = css.slice(css.indexOf('.theme-light {'), css.indexOf('.dark .theme-light'))
    for (const name of ['paper', 'paper-card', 'paper-foreground', 'paper-muted', 'paper-line', 'paper-ink', 'gold-deep']) {
      assert.equal(new RegExp(`--${name}:\\s*([^;]+);`).exec(light)?.[1].trim(), token(name), name)
    }
  })

  it('radii follow § 14.1: pill, 16–24 px cards, 28–40 px panels', () => {
    const rem = (name) => Number(new RegExp(`--radius-${name}:\\s*([\\d.]+)rem`).exec(css)[1]) * 16
    for (const name of ['card', 'card-lg']) assert.ok(rem(name) >= 16 && rem(name) <= 24, name)
    for (const name of ['panel', 'panel-lg']) assert.ok(rem(name) >= 28 && rem(name) <= 40, name)
    assert.match(css, /--radius-pill:\s*9999px/)
  })
})

describe('glass (28.3)', () => {
  const worst = '#ffffff'
  for (const fillName of ['glass-fill', 'glass-fill-strong']) {
    for (const textName of ['glass-foreground', 'glass-muted']) {
      it(`${textName} on ${fillName} reaches 4.5:1 over white, from the fill alone`, () => {
        const [fill, alpha] = rgba(token(fillName))
        const seen = composite(fill, alpha, worst)
        const ratio = contrastRatio(token(textName), seen)
        assert.ok(ratio >= 4.5, `${ratio.toFixed(2)}`)
      })
      it(`${textName} on ${fillName} reaches 4.5:1 over ink too`, () => {
        const [fill, alpha] = rgba(token(fillName))
        assert.ok(contrastRatio(token(textName), composite(fill, alpha, token('ink'))) >= 4.5)
      })
    }
    it(`the solid fallback of ${fillName} keeps the same text readable`, () => {
      for (const textName of ['glass-foreground', 'glass-muted']) assert.ok(contrastRatio(token(textName), token('glass-solid')) >= 4.5)
    })
  }

  it('ink-muted is not readable on glass over a light page — glass uses glass-muted instead', () => {
    const [fill, alpha] = rgba(token('glass-fill'))
    assert.ok(contrastRatio(token('ink-muted'), composite(fill, alpha, worst)) < 4.5)
  })

  it('blur stays in § 14.1’s 14–30 px; menus use the 30 px of WinUI acrylic (Phase 30)', () => {
    for (const name of ['glass-blur', 'glass-blur-strong']) {
      const px = Number(token(name).replace('px', ''))
      assert.ok(px >= 14 && px <= 30, name)
    }
    assert.equal(token('glass-blur-strong'), '30px')
  })

  it('the header draws its glass on a layer behind it, so the menus inside it can blur the page (Phase 30)', () => {
    assert.match(css, /@utility glass-under \{\s*&::before \{[^}]*backdrop-filter: blur\(var\(--glass-blur\)\)/)
    const header = readFileSync(new URL('../../components/brand/glass-header.tsx', import.meta.url), 'utf8')
    assert.match(header, /'@container glass-under /)
    assert.doesNotMatch(header, /'@container glass /, 'a backdrop-filter on the header itself would stop the menus from blurring the page')
  })

  it('reduced transparency and missing backdrop-filter both fall back to a solid surface', () => {
    assert.match(css, /@media \(prefers-reduced-transparency: reduce\)\s*{\s*\.glass,\s*\.glass-strong,\s*\.glass-under::before\s*{[^}]*background-color: var\(--glass-solid\);[^}]*backdrop-filter: none;/)
    assert.match(css, /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)\s*{\s*\.glass,\s*\.glass-strong,\s*\.glass-under::before\s*{\s*background-color: var\(--glass-solid\);/)
  })
})

describe('per-project colour (28.1)', () => {
  const check = (brand, accent) => {
    const p = projectPalette(brand, accent)
    const grounds = [p.surface, p.deep, composite(p.accent, PROJECT_GLOW_ALPHA, p.surface), composite(p.accent, PROJECT_GLOW_ALPHA, p.deep)]
    return {
      p,
      on: worstContrast(p.on, grounds),
      onMuted: worstContrast(p.onMuted, grounds),
      accentText: worstContrast(p.accentText, grounds),
      onAccent: contrastRatio(p.accentForeground, p.accent),
    }
  }

  it('the two real projects keep their colours exactly and read well', () => {
    for (const [brand, accent] of [['#14243D', '#F2A93B'], ['#123B2C', '#7FD8B0']]) {
      const r = check(brand, accent)
      assert.equal(r.p.surface, brand.toLowerCase())
      assert.equal(r.p.accent, accent.toLowerCase())
      assert.ok(r.on >= 7, `main text ${r.on}`)
      assert.ok(r.onMuted >= 4.5 && r.accentText >= 4.5 && r.onAccent >= 4.5)
    }
  })

  it('no colour falls back to ink and gold', () => {
    const p = projectPalette(null, undefined)
    assert.equal(p.surface, '#11141b')
    assert.equal(p.accent, '#e2b65c')
  })

  it('an invalid colour is ignored, not injected into a style', () => {
    const p = projectPalette('red;background:url(x)', '#12')
    assert.equal(p.surface, '#11141b')
    assert.equal(p.accent, '#e2b65c')
  })

  it('every text pairing reaches 4.5:1 for any colour pair (5,000 seeded samples)', () => {
    let seed = 28
    const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31)
    const hex = () => `#${(next() % 0x1000000).toString(16).padStart(6, '0')}`
    for (let i = 0; i < 5000; i++) {
      const brand = hex()
      const accent = hex()
      const r = check(brand, accent)
      assert.ok(r.on >= 4.5 && r.onMuted >= 4.5 && r.accentText >= 4.5 && r.onAccent >= 4.5, `${brand} / ${accent}: ${JSON.stringify(r)}`)
    }
  })

  it('a mid-tone colour that no text reads well on is shaded, keeping its hue', () => {
    // An orange on which neither text colour reaches 4.5:1 once the purple glow is on it.
    const r = check('#d74c10', '#680697')
    assert.notEqual(r.p.surface, '#d74c10')
    assert.ok(r.on >= 4.5)
    const [rr, gg, bb] = [1, 3, 5].map((i) => Number.parseInt(r.p.surface.slice(i, i + 2), 16))
    assert.ok(rr > gg && gg > bb, `still an orange: ${r.p.surface}`)
  })
})

describe('project cards (32.6, D-22)', () => {
  const CARD_TEXTS = ['title', 'text', 'muted']
  const measure = (brand) => {
    const tones = projectCardTones(brand)
    const out = {}
    for (const theme of ['light', 'dark']) {
      const c = tones[theme]
      for (const name of CARD_TEXTS) out[`${theme}.${name}`] = contrastRatio(c[name], c.ground)
      out[`${theme}.link`] = contrastRatio(c.actionText, c.title)
    }
    return { tones, out }
  }

  it('the two real projects: every text reaches 4.5:1 in both themes', () => {
    for (const brand of ['#14243D', '#123B2C', '#34838D']) {
      const { out } = measure(brand)
      for (const [pair, ratio] of Object.entries(out)) assert.ok(ratio >= 4.5, `${brand} ${pair}: ${ratio.toFixed(2)}`)
    }
  })

  it('every text reaches 4.5:1 in both themes for any colour (5,000 seeded samples)', () => {
    let seed = 32
    const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31)
    for (let i = 0; i < 5000; i++) {
      const brand = `#${(next() % 0x1000000).toString(16).padStart(6, '0')}`
      const { out } = measure(brand)
      for (const [pair, ratio] of Object.entries(out)) assert.ok(ratio >= 4.5, `${brand} ${pair}: ${ratio.toFixed(2)}`)
    }
  })

  it('the tones follow the theme: a light tint in the light theme, a deep tone in the dark one', () => {
    const { tones } = measure('#14243D')
    assert.ok(luminance(tones.light.ground) > 0.8 && luminance(tones.dark.ground) < 0.03)
    assert.ok(luminance(tones.light.panel) > luminance(tones.light.panelDeep))
    assert.ok(luminance(tones.light.title) < luminance(tones.light.ground))
    assert.ok(luminance(tones.dark.title) > luminance(tones.dark.ground))
  })

  it("the project's identity hue is kept in both themes (navy stays blue, green stays green)", () => {
    const hue = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16))
      return { r, g, b }
    }
    for (const theme of ['light', 'dark']) {
      const navy = projectCardTones('#14243D')[theme]
      for (const c of [navy.ground, navy.panel, navy.title].map(hue)) assert.ok(c.b > c.r, `${theme} navy keeps blue: ${JSON.stringify(c)}`)
      const green = projectCardTones('#123B2C')[theme]
      for (const c of [green.ground, green.panel, green.title].map(hue)) assert.ok(c.g > c.r && c.g > c.b, `${theme} green stays green: ${JSON.stringify(c)}`)
    }
  })

  it('tone() reaches its luminance target', () => {
    for (const target of [0.02, 0.2, 0.5, 0.86]) assert.ok(Math.abs(luminance(tone('#34838D', target)) - target) < 0.01, `${target}`)
  })

  it('an invalid colour falls back to ink, never into a style', () => {
    const style = cardTonesStyle(projectCardTones('red;background:url(x)'))
    for (const value of Object.values(style)) assert.match(value, /^#[0-9a-f]{6}$/)
    assert.ok('--pc-ground-light' in style && '--pc-action-text-dark' in style)
  })

  it('CSS: [data-project-tones] picks the light values, .dark the dark ones, for every tone', () => {
    const block = (selector) => css.slice(css.indexOf(`${selector} {`), css.indexOf('}', css.indexOf(`${selector} {`)))
    for (const key of ['ground', 'panel', 'panel-deep', 'line', 'chip-line', 'title', 'text', 'muted', 'action-text']) {
      assert.match(block('[data-project-tones]'), new RegExp(`--pc-${key}: var\\(--pc-${key}-light\\)`))
      assert.match(block('.dark [data-project-tones]'), new RegExp(`--pc-${key}: var\\(--pc-${key}-dark\\)`))
    }
  })

  it('the card is compact and coloured over the whole card (owner, 20 October 2026)', () => {
    const row = readFileSync(new URL('../../components/brand/portfolio-row.tsx', import.meta.url), 'utf8')
    assert.match(row, /data-project-tones/)
    assert.match(row, /max-w-\[68\.75rem\]/) // ≈ 1100 px, centred — never a full-width band
    assert.match(row, /mx-auto/)
    assert.match(row, /@3xl:basis-\[45%\]/) // the screenshot panel ≈ 45 %
    assert.match(row, /bg-pc-ground/)
    assert.match(row, /text-pc-title/)
    assert.match(row, /border-pc-chip-line/)
    assert.match(row, /variant="project-card"/)
    assert.doesNotMatch(row, /bg-paper-card|bg-paper\b/) // no plain white text side any more
    assert.match(row, /flex flex-col gap-7/) // 28 px between cards (§ 14.1)
  })
})

describe('mock-up images (28.5)', () => {
  const title = { en: 'Ticket sales', fa: 'فروش تکت' }
  it('the landscape cover goes on the laptop, the first mobile screenshot on the phone', () => {
    const pick = pickMockupImages(
      {
        title,
        coverImage: '/a.png',
        media: [
          { src: '/a.png', alt: { en: 'Home', fa: 'خانه' }, kind: 'desktop', placement: 'hero', width: 1488, height: 811 },
          { src: '/m.png', alt: { en: 'Phone', fa: 'موبایل' }, kind: 'mobile', placement: 'gallery', width: 324, height: 709 },
        ],
      },
      'fa',
    )
    assert.deepEqual(pick.laptop, { src: '/a.png', alt: 'خانه', width: 1488, height: 811 })
    assert.equal(pick.phone?.src, '/m.png')
  })
  it('a portrait cover is not squeezed into a laptop; a landscape screenshot is used', () => {
    const pick = pickMockupImages(
      {
        title,
        coverImage: '/tall.png',
        media: [
          { src: '/tall.png', alt: title, kind: 'desktop', placement: 'hero', width: 565, height: 868 },
          { src: '/wide.png', alt: title, kind: 'desktop', placement: 'gallery', width: 1335, height: 861 },
        ],
      },
      'en',
    )
    assert.equal(pick.laptop?.src, '/wide.png')
    assert.equal(pick.phone, null)
  })
  it('no screenshot, no mock-up — nothing is invented', () => {
    assert.deepEqual(pickMockupImages({ title, media: [] }, 'en'), { laptop: null, phone: null })
  })
})

describe('type scale (28.2)', () => {
  const range = (name) => {
    const m = new RegExp(`--text-${name}:\\s*clamp\\(([\\d.]+)rem,[^,]+,\\s*([\\d.]+)rem\\)`).exec(css)
    assert.ok(m, `--text-${name} is a clamp()`)
    return [Number(m[1]) * 16, Number(m[2]) * 16]
  }
  const expected = { h1: [32, 50], h2: [24, 34], h3: [20, 25], 'card-title': [16, 18], body: [15, 16], small: [12, 13] }
  for (const [name, [min, max]] of Object.entries(expected)) {
    it(`${name}: ${min}–${max} px`, () => assert.deepEqual(range(name), [min, max]))
  }
  it('Persian body text has a 1.8–2.0 line height', () => {
    assert.match(css, /:where\(\[dir='rtl'\]\) body \{[^}]*line-height: 1\.(8|9)\d*;/)
    assert.match(css, /\[dir='rtl'\] \.text-body \{\s*line-height: 1\.(8|9)/)
  })
  it('weight 800 only for h1 and h2', () => {
    assert.match(css, /--text-h1--font-weight: 800/)
    assert.match(css, /--text-h2--font-weight: 800/)
    assert.doesNotMatch(css, /--text-(h3|card-title|body|small)--font-weight: (8|9)00/)
  })
})

describe('motion (28.4)', () => {
  it('the whole-page fade is gone', () => {
    assert.equal(existsSync(new URL('../../components/site/page-transition.tsx', import.meta.url)), false)
    assert.doesNotMatch(readFileSync(new URL('../../components/site/site-shell.tsx', import.meta.url), 'utf8'), /PageTransition/)
  })
  it('hover lift, image zoom and reveal only exist without a reduced-motion preference', () => {
    for (const utility of ['hover-lift', 'media-zoom']) {
      const block = css.slice(css.indexOf(`@utility ${utility}`), css.indexOf('\n}', css.indexOf(`@utility ${utility}`)))
      assert.match(block, /@media \(prefers-reduced-motion: no-preference\)/, utility)
    }
    const reveal = css.slice(css.indexOf("[data-reveal='pending']") - 80)
    assert.match(reveal, /^[\s\S]*?@media \(prefers-reduced-motion: no-preference\)/)
  })
  it('reveals and menus stay at or under 300 ms', () => {
    assert.match(css, /--animate-menu-in: menu-in 150ms/)
    for (const ms of css.slice(css.indexOf("[data-reveal='shown']")).match(/(\d+)ms/g).slice(0, 2)) assert.ok(Number.parseInt(ms) <= 300)
  })
})

describe('class merging knows the type scale', () => {
  it('a type-scale size never removes a text colour, and replaces an older size', () => {
    assert.equal(cn('bg-gold text-gold-foreground', 'text-small'), 'bg-gold text-gold-foreground text-small')
    assert.equal(cn('text-small font-bold', 'text-gold'), 'text-small font-bold text-gold')
    assert.equal(cn('text-sm', 'text-body'), 'text-body')
  })
})
