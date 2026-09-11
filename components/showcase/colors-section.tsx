import { Section, Subhead } from '@/components/showcase/section'
import { UsageNotes } from '@/components/showcase/usage-notes'

type Swatch = {
  name: string
  className: string
  border?: boolean
}

function SwatchGrid({ items }: { items: Swatch[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((s) => (
        <div key={s.name} className="flex flex-col gap-2">
          <div
            className={`h-16 rounded-lg ${s.className} ${
              s.border ? 'border border-border' : ''
            }`}
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{s.name}</span>
            <span className="font-mono text-xs text-muted-foreground">
              --{s.name}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

const surfaces: Swatch[] = [
  { name: 'background', className: 'bg-background', border: true },
  { name: 'card', className: 'bg-card', border: true },
  { name: 'elevated', className: 'bg-elevated', border: true },
  { name: 'muted', className: 'bg-muted' },
  { name: 'secondary', className: 'bg-secondary' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'border', className: 'bg-border' },
  { name: 'input', className: 'bg-input' },
]

const brand: Swatch[] = [
  { name: 'primary', className: 'bg-primary' },
  { name: 'brand', className: 'bg-brand' },
  { name: 'brand-muted', className: 'bg-brand-muted' },
  { name: 'ring', className: 'bg-ring' },
]

const status: Swatch[] = [
  { name: 'success', className: 'bg-success' },
  { name: 'warning', className: 'bg-warning' },
  { name: 'info', className: 'bg-info' },
  { name: 'destructive', className: 'bg-destructive' },
]

const statusText: Swatch[] = [
  { name: 'brand-text', className: 'bg-brand-text' },
  { name: 'success-text', className: 'bg-success-text' },
  { name: 'warning-text', className: 'bg-warning-text' },
  { name: 'info-text', className: 'bg-info-text' },
  { name: 'destructive-text', className: 'bg-destructive-text' },
]

const text: Swatch[] = [
  { name: 'foreground', className: 'bg-foreground' },
  { name: 'muted-foreground', className: 'bg-muted-foreground' },
]

export function ColorsSection() {
  return (
    <Section
      id="color"
      index="02 — Color"
      title="Color tokens"
      description="Every color is a semantic token defined in oklch for both light and dark modes. The palette is a cool graphite neutral scale with a single confident brand gold used sparingly for chips and links; focus rings stay on a separate neutral-blue token since gold fails the 3:1 minimum on light surfaces."
      className="flex flex-col gap-10"
    >
      <div>
        <Subhead>Surfaces &amp; lines</Subhead>
        <SwatchGrid items={surfaces} />
      </div>
      <div>
        <Subhead>Brand &amp; interaction</Subhead>
        <SwatchGrid items={brand} />
      </div>
      <div>
        <Subhead>Status</Subhead>
        <SwatchGrid items={status} />
      </div>
      <div>
        <Subhead>-text variants (AA-safe for small text/icons, §4.2)</Subhead>
        <SwatchGrid items={statusText} />
      </div>
      <div>
        <Subhead>Text</Subhead>
        <SwatchGrid items={text} />
      </div>
      <UsageNotes
        dos={[
          'Use a semantic token (bg-card, text-muted-foreground, border-border…) for every color decision.',
          'Reach for a -text variant (success-text, warning-text…) whenever the color sits behind small text or an icon — they are the AA-safe pair.',
          "Use brand/brand-text sparingly, as an accent — borders, icons, small highlights — never as a large fill or body text color.",
        ]}
        donts={[
          "Don't hard-code a hex or oklch value in a component — if the palette needs a new shade, add a token first.",
          "Don't reuse --brand for a focus ring — it fails 3:1 contrast on light surfaces; --ring is a separate, decoupled token for exactly this reason.",
          'Don\u2019t assume a raw status color (bg-success) is readable as text — pair it with its -text variant instead.',
        ]}
      />
    </Section>
  )
}
