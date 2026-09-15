import { useTranslations } from 'next-intl'

import { PageHeader } from '@/components/ui/patterns'
import { BriefBuilder } from '@/components/start/brief-builder'
import type { EngagementModel, Service } from '@/types/content'

/**
 * StartContent — the `/start` page (roadmap § 9.1, page map § 15: "Brief
 * Builder (primary CTA target)"). Every "Start a project" CTA site-wide
 * now points here with `?service=`/`?package=` prefill instead of
 * `/contact`, which stays the secondary "Direct contact + hire channels"
 * destination (§ 8.3) for visitors who'd rather email or message directly.
 *
 * `services`/`engagementModels` are fetched once by the Server Component
 * page (`app/[locale]/start/page.tsx`) and threaded down through here —
 * Phase 12.2 (roadmap § 12) made those Supabase-backed and async, and
 * `BriefBuilder`/its steps are Client Components that can't await during
 * render, so the data has to arrive as a prop instead.
 */
export function StartContent({
  services,
  engagementModels,
  initialServiceSlug,
  initialPackageId,
}: {
  services: Service[]
  engagementModels: EngagementModel[]
  initialServiceSlug?: string
  initialPackageId?: string
}) {
  const t18n = useTranslations('StartPage')

  return (
    <div className="container-page max-w-3xl py-16 md:py-24">
      <PageHeader eyebrow={t18n('eyebrow')} title={t18n('title')} description={t18n('description')} />
      <BriefBuilder
        services={services}
        engagementModels={engagementModels}
        initialServiceSlug={initialServiceSlug}
        initialPackageId={initialPackageId}
      />
    </div>
  )
}
