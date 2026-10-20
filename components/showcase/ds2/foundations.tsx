import { ChartColumn, Ticket } from 'lucide-react'

import { FloatingChip } from '@/components/brand/floating-chip'
import { Reveal } from '@/components/brand/reveal'
import { Section, Subhead } from '@/components/showcase/section'
import { composite, contrastRatio, projectPalette, toHex } from '@/lib/design/color'
import type { Project } from '@/types/content'

/**
 * Phase 28.1–28.4 on /design-system: the tokens, the type scale, glass and
 * motion — each with the numbers that make it pass (contrast ratios are
 * computed here with the same functions the unit test uses, not typed in).
 */

const INK = [
  { name: 'ink', value: '#0a0c11', className: 'bg-ink' },
  { name: 'ink-raised', value: '#11141b', className: 'bg-ink-raised' },
  { name: 'ink-elevated', value: '#16181d', className: 'bg-ink-elevated' },
]
const PAPER = [
  { name: 'paper', value: '#f4f2ed', className: 'bg-paper' },
  { name: 'paper-card', value: '#ffffff', className: 'bg-paper-card' },
  { name: 'paper-line', value: '#e8e4da', className: 'bg-paper-line' },
]
const ACCENTS = [
  { name: 'gold', value: '#e2b65c', className: 'bg-gold' },
  { name: 'gold-deep', value: '#7d5f17', className: 'bg-gold-deep' },
  { name: 'cool', value: '#4078ff', className: 'bg-cool' },
  { name: 'whatsapp', value: '#15803d', className: 'bg-whatsapp' },
]
const TEXT_PAIRS: [string, string, string, string][] = [
  ['ink-foreground on ink', '#f3f1ec', '#0a0c11', 'text-ink-foreground bg-ink'],
  ['ink-muted on ink-elevated', '#a9aeb8', '#16181d', 'text-ink-muted bg-ink-elevated'],
  ['gold on ink', '#e2b65c', '#0a0c11', 'text-gold bg-ink'],
  ['paper-foreground on paper', '#16181d', '#f4f2ed', 'text-paper-foreground bg-paper'],
  ['paper-muted on paper', '#555a65', '#f4f2ed', 'text-paper-muted bg-paper'],
  ['gold-deep on paper', '#7d5f17', '#f4f2ed', 'text-gold-deep bg-paper'],
  ['gold-foreground on gold', '#17130a', '#e2b65c', 'text-gold-foreground bg-gold'],
]

const ratio = (a: string, b: string) => contrastRatio(a, b).toFixed(1)

function Swatch({ name, value, className }: { name: string; value: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-16 rounded-xl border border-border ${className}`} />
      <div className="font-mono text-xs">
        <div className="font-medium">{name}</div>
        <div className="text-muted-foreground">{value}</div>
      </div>
    </div>
  )
}

export function Ds2TokensSection({ projects }: { projects: Project[] }) {
  return (
    <Section
      id="ds2-tokens"
      index="2.0 — Tokens"
      title="Ink, warm panels, gold — and each project's own colour"
      description="Dark bands for impact, warm light panels for reading (§ 14.1). Both grounds look the same in the light and the dark theme. Gold is a text colour on ink only; on the warm panel, text uses gold-deep."
      className="flex flex-col gap-10"
    >
      <div className="grid gap-8 md:grid-cols-3">
        {[
          ['Ink bands', INK],
          ['Warm panels', PAPER],
          ['Accents', ACCENTS],
        ].map(([title, swatches]) => (
          <div key={title as string}>
            <Subhead>{title as string}</Subhead>
            <div className="grid grid-cols-3 gap-3">
              {(swatches as typeof INK).map((s) => (
                <Swatch key={s.name} {...s} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <Subhead>Text pairings (WCAG contrast, measured)</Subhead>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TEXT_PAIRS.map(([label, fg, bg, className]) => (
            <li key={label} className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${className}`}>
              <span>{label}</span>
              <span className="font-mono text-xs">{ratio(fg, bg)} : 1</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Subhead>Per-project colour — from the admin, made readable by projectPalette()</Subhead>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No published project to show.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => {
              const p = projectPalette(project.brandColor, project.accentColor)
              return (
                <li
                  key={project.id}
                  className="flex flex-col gap-3 rounded-panel p-6"
                  style={{ backgroundImage: `linear-gradient(160deg, ${p.surface}, ${p.deep})`, color: p.on }}
                >
                  <span className="text-card-title">{project.title.en}</span>
                  <span style={{ color: p.onMuted }} className="text-sm">
                    brand {project.brandColor ?? '—'} · accent {project.accentColor ?? '—'}
                  </span>
                  <span className="flex flex-wrap gap-2 font-mono text-xs">
                    <span className="rounded-pill px-3 py-1" style={{ background: p.accent, color: p.accentForeground }}>
                      accent fill {ratio(p.accentForeground, p.accent)}:1
                    </span>
                    <span className="rounded-pill bg-black/20 px-3 py-1">text {ratio(p.on, p.surface)}:1</span>
                    <span className="rounded-pill bg-black/20 px-3 py-1" style={{ color: p.accentText }}>
                      accent text {ratio(p.accentText, p.surface)}:1
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <Subhead>Radii</Subhead>
          <div className="flex flex-wrap items-end gap-4">
            {[
              ['pill', 'rounded-pill h-11 w-28'],
              ['card · 20', 'rounded-card size-20'],
              ['card-lg · 24', 'rounded-card-lg size-20'],
              ['panel · 32', 'rounded-panel size-24'],
              ['panel-lg · 40', 'rounded-panel-lg size-28'],
            ].map(([label, className]) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className={`border border-border bg-muted ${className}`} />
                <span className="font-mono text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Subhead>Shadows</Subhead>
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-paper p-6 text-paper-foreground">
            <div className="rounded-card bg-paper-card p-4 text-sm shadow-card">shadow-card</div>
            <div className="rounded-card bg-paper-card p-4 text-sm shadow-card-hover">shadow-card-hover</div>
            <div className="rounded-card bg-ink p-4 text-sm text-ink-foreground shadow-float">shadow-float</div>
            <div className="rounded-card bg-gold p-4 text-sm text-gold-foreground shadow-gold">shadow-gold</div>
          </div>
        </div>
      </div>
    </Section>
  )
}

const TYPE = [
  ['text-h1', 'h1 · 32–50 px · 800', 'نرم‌افزاری که کسب‌وکار شما را پیش می‌برد', 'Software that moves your business forward'],
  ['text-h2', 'h2 · 24–34 px · 800', 'سیستم‌های آماده‌ی آرتاویو', "Artaveo's ready-made systems"],
  ['text-h3', 'h3 · 20–25 px · 700', 'سیستم فروش تکت و مدیریت ترانسپورت', 'Ticket sales and transport management'],
  ['text-card-title', 'card title · 16–18 px · 700', 'انتخاب چوکی', 'Seat selection'],
  ['text-body', 'body · 15–16 px', 'مسافر تکتش را آنلاین می‌گیرد و چوکی‌اش را خودش انتخاب می‌کند.', 'Passengers buy their ticket online and pick their own seat.'],
  ['text-small', 'small · 12–13 px', 'جواب در همان روز', 'A reply the same day'],
]

export function Ds2TypeSection() {
  return (
    <Section
      id="ds2-type"
      index="2.0 — Type"
      title="One scale for Dari and English — not oversized"
      description="Vazirmatn for Dari, Geist for English, the same sizes for both (§ 14.1). Sizes follow the width a component is given; Dari lines are taller (body 1.9, headings 1.5–1.6). Weight 800 only for h1 and h2."
    >
      <div className="@container flex flex-col divide-y divide-border rounded-2xl border border-border">
        {TYPE.map(([className, label, fa, en]) => (
          <div key={className} className="grid gap-3 p-5 md:grid-cols-[12rem_1fr_1fr] md:items-baseline">
            <span className="font-mono text-xs text-muted-foreground">
              {className}
              <br />
              {label}
            </span>
            <p dir="rtl" lang="fa" className={`font-persian ${className}`}>
              {fa}
            </p>
            <p dir="ltr" lang="en" className={`font-sans ${className}`}>
              {en}
            </p>
          </div>
        ))}
      </div>
    </Section>
  )
}

export function Ds2GlassSection({ screenshot }: { screenshot?: string }) {
  const worst = '#ffffff'
  const fill = toHex(composite('#0a0c11', 0.74, worst))
  const fillStrong = toHex(composite('#11141c', 0.96, worst))
  return (
    <Section
      id="ds2-glass"
      index="2.0 — Glass"
      title="Glass — five places only"
      description="The header, mega menus, the mobile menu, chips floating over mock-ups and cards on ink bands. Blur 18 px (header, chips) and 30 px (menus, WinUI's acrylic blur) over a translucent ink fill; menus cover 96 % so text behind them is never readable. The fill alone keeps text readable over the worst background that can pass behind it (white); with “reduce transparency” turned on, or without backdrop-filter, glass becomes a solid surface. At most three glass layers in a viewport."
      className="flex flex-col gap-6"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border">
        {/* Half white, half a real screenshot: the glass is tested over the worst case. */}
        <div className="grid min-h-64 grid-cols-2">
          <div className="bg-white" />
          <div className="bg-ink bg-cover bg-top" style={screenshot ? { backgroundImage: `url(${screenshot})` } : undefined} />
        </div>
        <div className="absolute inset-x-6 top-6 flex flex-col gap-4">
          <div data-testid="glass-sample" className="glass flex items-center justify-between rounded-card border border-glass-line px-5 py-3 text-glass-foreground">
            <span className="font-bold">glass · header &amp; chips</span>
            <span className="text-sm text-glass-muted">secondary text</span>
          </div>
          <div className="glass-strong flex items-center justify-between rounded-card border border-glass-line px-5 py-3 text-glass-foreground">
            <span className="font-bold">glass-strong · menus</span>
            <span className="text-sm text-glass-muted">secondary text</span>
          </div>
        </div>
        <div className="relative h-24">
          <FloatingChip icon={Ticket} title="تکت آنلاین" line="از موبایل و کمپیوتر" className="start-6 bottom-4" />
          <FloatingChip icon={ChartColumn} tone="cool" title="Sales report" line="Every day, at a glance" className="end-6 bottom-4" />
        </div>
      </div>
      <ul className="grid gap-2 font-mono text-xs sm:grid-cols-2">
        <li className="rounded-xl border border-border p-3">glass over white → {fill}: foreground {ratio('#f3f1ec', fill)}:1 · muted {ratio('#d0d4db', fill)}:1</li>
        <li className="rounded-xl border border-border p-3">glass-strong over white → {fillStrong}: foreground {ratio('#f3f1ec', fillStrong)}:1 · muted {ratio('#d0d4db', fillStrong)}:1</li>
      </ul>
    </Section>
  )
}

export function Ds2MotionSection() {
  return (
    <Section
      id="ds2-motion"
      index="2.0 — Motion"
      title="Motion — small, and optional"
      description="No whole-page fade. Cards lift 4 px on hover, the screen inside a mock-up zooms slowly, menus fade in over 150 ms, elements below the fold appear in 280 ms. With “reduce motion” turned on, none of it happens — and nothing depends on it."
    >
      <div className="grid gap-4 rounded-2xl bg-paper p-6 text-paper-foreground md:grid-cols-3">
        <div className="hover-lift rounded-card-lg border border-paper-line bg-paper-card p-6 hover:shadow-card-hover" data-testid="lift-sample">
          <p className="text-card-title">hover-lift</p>
          <p className="mt-1 text-sm text-paper-muted">Point at this card.</p>
        </div>
        <div className="media-zoom rounded-card-lg bg-ink p-0">
          <div className="grid h-full min-h-28 place-items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- a decorative swatch, not content */}
            <img src="/brand/artaveo-mark-flat-dark.svg" alt="" className="size-14" />
          </div>
        </div>
        <Reveal className="rounded-card-lg border border-paper-line bg-paper-card p-6">
          <p className="text-card-title">Reveal</p>
          <p className="mt-1 text-sm text-paper-muted">Appears when scrolled into view — never hidden on load, without JavaScript or with reduced motion.</p>
        </Reveal>
      </div>
    </Section>
  )
}
