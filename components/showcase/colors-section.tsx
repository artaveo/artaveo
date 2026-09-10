import { Section, Subhead } from '@/components/showcase/section'

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
      description="Every color is a semantic token defined in oklch for both light and dark modes. The palette is a cool graphite neutral scale with a single confident brand blue used sparingly for emphasis, focus, and links."
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
        <Subhead>Text</Subhead>
        <SwatchGrid items={text} />
      </div>
    </Section>
  )
}
