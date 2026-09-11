import { Section, Subhead } from '@/components/showcase/section'
import { UsageNotes } from '@/components/showcase/usage-notes'

const breakpoints = [
  { name: 'sm', min: '640px', use: 'Large phones' },
  { name: 'md', min: '768px', use: 'Tablets' },
  { name: 'lg', min: '1024px', use: 'Laptops' },
  { name: 'xl', min: '1280px', use: 'Desktops' },
  { name: '2xl', min: '1536px', use: 'Large desktops' },
  { name: '3xl', min: '1920px', use: 'TV / very large' },
]

export function LayoutSection() {
  return (
    <Section
      id="layout"
      index="13 — Layout"
      title="Breakpoints, container &amp; grid"
      description="A mobile-first breakpoint set drives responsive behavior. The page container caps at 80rem with fluid gutters, and a 12-column grid governs composition on larger screens."
      className="flex flex-col gap-10"
    >
      <div>
        <Subhead>Breakpoints</Subhead>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-start">
                <th className="px-4 py-2.5 font-medium">Token</th>
                <th className="px-4 py-2.5 font-medium">Min width</th>
                <th className="px-4 py-2.5 font-medium">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {breakpoints.map((b) => (
                <tr key={b.name}>
                  <td className="px-4 py-2.5 font-mono text-brand-text">{b.name}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">
                    {b.min}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{b.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <Subhead>Container — .container-page (max 80rem)</Subhead>
        <div className="rounded-xl border border-dashed border-border p-2">
          <div className="rounded-lg bg-brand-muted/40 px-4 py-6 text-center">
            <span className="font-mono text-xs text-muted-foreground">
              width 100% · centered · fluid gutters
            </span>
          </div>
        </div>
      </div>

      <div>
        <Subhead>12-column grid</Subhead>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex h-12 items-center justify-center rounded-md border border-border bg-muted font-mono text-xs text-muted-foreground"
            >
              {i + 1}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          4 columns on mobile, 6 on tablet, 12 on desktop.
        </p>
      </div>
      <UsageNotes
        dos={[
          'Use container-page for every top-level section wrapper so max-width and side padding stay identical site-wide.',
          "Reach for the 12-column grid's logical spans (col-span-*) rather than fixed pixel widths for responsive layout.",
        ]}
        donts={[
          "Don't hard-code a max-width on a section — container-page already encodes the responsive matrix from § 4.2.",
          "Don't mix a 12-col grid with manually-computed percentage widths in the same layout — pick one system per section.",
        ]}
      />
    </Section>
  )
}
