import { Section, Subhead } from '@/components/showcase/section'

const spacing = [
  { token: '1', px: '4px' },
  { token: '2', px: '8px' },
  { token: '3', px: '12px' },
  { token: '4', px: '16px' },
  { token: '6', px: '24px' },
  { token: '8', px: '32px' },
  { token: '12', px: '48px' },
  { token: '16', px: '64px' },
]

const radii = [
  { name: 'sm', className: 'rounded-sm' },
  { name: 'md', className: 'rounded-md' },
  { name: 'lg', className: 'rounded-lg' },
  { name: 'xl', className: 'rounded-xl' },
  { name: '2xl', className: 'rounded-2xl' },
  { name: 'full', className: 'rounded-full' },
]

const shadows = [
  { name: 'xs', className: 'shadow-xs' },
  { name: 'sm', className: 'shadow-sm' },
  { name: 'md', className: 'shadow-md' },
  { name: 'lg', className: 'shadow-lg' },
]

export function SpacingSection() {
  return (
    <Section
      id="spacing"
      index="04 — Spacing &amp; Radius"
      title="Spacing, radius &amp; elevation"
      description="A 4px base spacing scale keeps rhythm consistent across the system. Radii stay restrained for a technical, editorial feel, and shadows are used sparingly rather than as decoration."
      className="flex flex-col gap-10"
    >
      <div>
        <Subhead>Spacing scale — 4px base</Subhead>
        <div className="flex flex-col gap-3">
          {spacing.map((s) => (
            <div key={s.token} className="flex items-center gap-4">
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                {s.token}
              </span>
              <div
                className="h-3 rounded-sm bg-brand"
                style={{ width: s.px }}
              />
              <span className="font-mono text-xs text-muted-foreground">
                {s.px}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-10 sm:grid-cols-2">
        <div>
          <Subhead>Radius</Subhead>
          <div className="grid grid-cols-3 gap-4">
            {radii.map((r) => (
              <div key={r.name} className="flex flex-col items-center gap-2">
                <div
                  className={`size-16 border border-border bg-muted ${r.className}`}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  {r.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Subhead>Elevation</Subhead>
          <div className="grid grid-cols-2 gap-4">
            {shadows.map((sh) => (
              <div key={sh.name} className="flex flex-col items-center gap-2">
                <div
                  className={`flex size-16 items-center justify-center rounded-lg border border-border bg-card ${sh.className}`}
                />
                <span className="font-mono text-xs text-muted-foreground">
                  shadow-{sh.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
