import { Section, Subhead } from '@/components/showcase/section'
import { UsageNotes } from '@/components/showcase/usage-notes'
import { BrowserFrame, DeviceFrame, DiagramContainer } from '@/components/ui/frames'

export function FramesSection() {
  return (
    <Section
      id="frames"
      index="16 — Frames"
      title="Browser frame, device frame & diagrams"
      description="Product screenshots only ever appear inside a frame with demo data — never bare, per § 4.1.3's imagery rules."
      className="grid gap-10 lg:grid-cols-2"
    >
      <div>
        <Subhead>Browser frame</Subhead>
        <BrowserFrame url="artaveo.dev/work">
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Screenshot / live preview
          </div>
        </BrowserFrame>
      </div>

      <div>
        <Subhead>Device frame</Subhead>
        <DeviceFrame>
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Mobile preview
          </div>
        </DeviceFrame>
      </div>

      <div className="lg:col-span-2">
        <Subhead>Diagram container — with text alternative</Subhead>
        <DiagramContainer
          id="ds-diagram-example"
          caption="Booking request flow: client, server, database."
          textAlternative="Three boxes connected left to right: Client sends a booking request to the Server; the Server validates the seat hold and writes to the Database; the Database confirms back to the Server, which returns a confirmation to the Client."
        >
          <svg viewBox="0 0 360 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {[
              { x: 8, label: 'Client' },
              { x: 140, label: 'Server' },
              { x: 272, label: 'Database' },
            ].map((box) => (
              <g key={box.label}>
                <rect
                  x={box.x}
                  y={20}
                  width={80}
                  height={40}
                  rx={8}
                  className="fill-elevated stroke-border"
                  strokeWidth={1}
                />
                <text
                  x={box.x + 40}
                  y={44}
                  textAnchor="middle"
                  className="fill-foreground text-[11px]"
                >
                  {box.label}
                </text>
              </g>
            ))}
            <line x1={88} y1={40} x2={140} y2={40} className="stroke-border" strokeWidth={1.5} />
            <line x1={220} y1={40} x2={272} y2={40} className="stroke-border" strokeWidth={1.5} />
          </svg>
        </DiagramContainer>
      </div>
      <UsageNotes
        dos={[
          'Always put a real product screenshot inside BrowserFrame/DeviceFrame with demo data — never bare.',
          'Give DiagramContainer both a visible caption and a longer sr-only textAlternative when the diagram carries real information.',
        ]}
        donts={[
          "Don't use a stock photo of a person or a fictional product inside a frame — § 4.1.3's imagery rule rules both out.",
          "Don't rely on the diagram image alone to convey information — a screen reader needs the text alternative, not just alt text on a picture.",
        ]}
      />
    </Section>
  )
}
