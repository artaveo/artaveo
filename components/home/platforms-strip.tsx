import { useTranslations } from 'next-intl'

import { BandInner, InkBand } from '@/components/brand/bands'
import { ServiceKindIcon } from '@/components/brand/brand-icons'
import type { ServiceKind } from '@/types/content'

/**
 * Phase 29.2 — the platforms strip (§ 14.0): the kinds of software Artaveo
 * builds, each with the same icon the mega menu and the service cards use.
 * Kinds of software, never technology names. The list is what Artaveo builds
 * (D-18: capabilities are not read off the existing projects), so it is the
 * site's own content, not a count of what is published.
 */
export const BUILT_KINDS: ServiceKind[] = ['website', 'web-system', 'mobile-app', 'desktop-software', 'offline-system']

export function PlatformsStrip() {
  const tk = useTranslations('ServiceKinds')
  const th = useTranslations('Home')
  return (
    <InkBand aria-labelledby="home-platforms-title" className="pb-12" data-slot="platforms-strip">
      <BandInner>
        <div className="rounded-panel border border-ink-line bg-ink-raised px-5 py-6 @3xl:px-8">
          <h2 id="home-platforms-title" className="text-small font-bold text-ink-muted">
            {th('platformsLabel')}
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 @md:grid-cols-2 @4xl:grid-cols-5">
            {BUILT_KINDS.map((kind) => (
              <li key={kind} className="flex min-w-0 items-center gap-3 text-sm font-semibold">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/12 text-gold">
                  <ServiceKindIcon kind={kind} className="size-[1.15rem]" />
                </span>
                <span className="min-w-0">{tk(kind)}</span>
              </li>
            ))}
          </ul>
        </div>
      </BandInner>
    </InkBand>
  )
}
