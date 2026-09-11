import { Callout } from '@/components/ui/content'

/**
 * Usage notes (roadmap § 4.7: "usage notes and do / don't examples" for
 * every token, primitive, pattern and state). Built on the existing
 * `Callout` (`tip`/`danger` variants, § 4.3) rather than a new component —
 * "do" and "don't" are just two tones of the same aside.
 */
export function UsageNotes({ dos, donts }: { dos: string[]; donts: string[] }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Callout variant="tip" title="Do">
        <ul className="m-0 list-disc space-y-1 ps-4">
          {dos.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Callout>
      <Callout variant="danger" title="Don't">
        <ul className="m-0 list-disc space-y-1 ps-4">
          {donts.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Callout>
    </div>
  )
}
