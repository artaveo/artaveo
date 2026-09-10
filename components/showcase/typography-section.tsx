import { Section, Subhead } from '@/components/showcase/section'

const scale = [
  { label: 'Display', className: 'text-5xl font-semibold tracking-tight', size: '48 / 3rem' },
  { label: 'H1', className: 'text-4xl font-semibold tracking-tight', size: '36 / 2.25rem' },
  { label: 'H2', className: 'text-3xl font-semibold tracking-tight', size: '30 / 1.875rem' },
  { label: 'H3', className: 'text-2xl font-semibold tracking-tight', size: '24 / 1.5rem' },
  { label: 'H4', className: 'text-xl font-medium', size: '20 / 1.25rem' },
  { label: 'Lead', className: 'text-lg text-muted-foreground', size: '18 / 1.125rem' },
  { label: 'Body', className: 'text-base leading-relaxed', size: '16 / 1rem' },
  { label: 'Small', className: 'text-sm text-muted-foreground', size: '14 / 0.875rem' },
  { label: 'Caption', className: 'text-xs text-muted-foreground', size: '12 / 0.75rem' },
]

const weights = [
  { label: 'Regular', className: 'font-normal' },
  { label: 'Medium', className: 'font-medium' },
  { label: 'Semibold', className: 'font-semibold' },
  { label: 'Bold', className: 'font-bold' },
]

export function TypographySection() {
  return (
    <Section
      id="typography"
      index="03 — Typography"
      title="Typography"
      description="Geist for Latin interface and headings, Geist Mono for technical labels and code, and Vazirmatn for Persian / RTL text. Body copy holds a 1.6 line height for comfortable reading."
      className="flex flex-col gap-10"
    >
      <div>
        <Subhead>Type scale — font-sans</Subhead>
        <div className="flex flex-col divide-y divide-border">
          {scale.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-1 py-4 md:flex-row md:items-baseline md:justify-between md:gap-6"
            >
              <span className={`${s.className} text-pretty`}>
                Building modern digital products
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {s.label} · {s.size}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <Subhead>Weights</Subhead>
          <div className="flex flex-col gap-2">
            {weights.map((w) => (
              <div key={w.label} className="flex items-baseline justify-between">
                <span className={`text-xl ${w.className}`}>Artaveo Studio</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {w.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Subhead>Mono &amp; Persian</Subhead>
          <div className="flex flex-col gap-4">
            <p className="font-mono text-sm">
              <span className="text-muted-foreground">const</span> stack ={' '}
              <span className="text-brand">&apos;full-stack&apos;</span>
            </p>
            <p dir="rtl" className="font-persian text-xl">
              ساخت محصولات دیجیتال مدرن
            </p>
            <p dir="rtl" className="font-persian leading-relaxed text-muted-foreground">
              آرتاویو یک استودیوی مستقل توسعه‌ی وب و نرم‌افزار فول‌استک است.
            </p>
          </div>
        </div>
      </div>
    </Section>
  )
}
