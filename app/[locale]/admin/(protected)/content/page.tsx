import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return { title: t('cmsHubTitle'), robots: { index: false, follow: false } }
}

/**
 * § 15 content hub — links to the parts of the CMS built so far: the
 * services cluster (15.1 — services + their nested packages/add-ons/
 * FAQs/process, global FAQs, engagement models) and projects/articles
 * (15.2 — project case studies, articles). Media, navigation and
 * settings are real, named § 15 scope not yet built — see
 * `docs/phases/PHASE-15-README.md` — so this hub only links to what
 * actually exists, same "no fake dashboards" rule the Lead Pipeline's
 * CSV export already follows, rather than padding the list with
 * not-yet-real links.
 */
export default async function ContentHubPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getAdminSession()
  if (!session) redirect(`/${locale}/admin/login`)
  if (!mfaSatisfied(session)) redirect(`/${locale}/admin/${mfaDestination(session)}`)

  const t = await getTranslations('Admin')

  // Phase 27 (owner's review): grouped by what each part is for, the retired ones last and marked as such.
  const groups = [
    {
      title: t('cmsHubGroupSite'),
      note: t('cmsHubGroupSiteNote'),
      links: [
        { href: '/admin/content/projects', label: t('cmsProjectsNavLink'), description: t('cmsProjectsNavDescription') },
        { href: '/admin/content/services', label: t('cmsServicesNavLink'), description: t('cmsServicesNavDescription') },
        { href: '/admin/content/recommendations', label: t('cmsRecommendationsNavLink'), description: t('cmsRecommendationsNavDescription') },
        { href: '/admin/content/faqs', label: t('cmsGlobalFaqsNavLink'), description: t('cmsGlobalFaqsNavDescription') },
        { href: '/admin/content/articles', label: t('cmsArticlesNavLink'), description: t('cmsArticlesNavDescription') },
      ],
    },
    {
      title: t('cmsHubGroupImages'),
      note: t('cmsHubGroupImagesNote'),
      links: [{ href: '/admin/content/media', label: t('cmsMediaNavLink'), description: t('cmsMediaNavDescription') }],
    },
    {
      title: t('cmsHubGroupSettings'),
      note: t('cmsHubGroupSettingsNote'),
      links: [
        { href: '/admin/content/settings', label: t('cmsSettingsNavLink'), description: t('cmsSettingsNavDescription') },
        { href: '/admin/content/navigation', label: t('cmsNavigationNavLink'), description: t('cmsNavigationNavDescription') },
      ],
    },
    {
      title: t('cmsHubGroupArchive'),
      note: t('cmsHubGroupArchiveNote'),
      links: [{ href: '/admin/content/engagement-models', label: t('cmsEngagementModelsNavLink'), description: t('cmsEngagementModelsNavDescription') }],
    },
  ]

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('cmsHubEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t('cmsHubTitle')}</h1>
      </div>

      {groups.map((group) => (
        <section key={group.title} className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{group.title}</h2>
            <p className="text-xs text-muted-foreground">{group.note}</p>
          </div>
          {group.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 outline-none transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span>
                <span className="block text-sm font-medium text-foreground">{link.label}</span>
                <span className="block text-xs text-muted-foreground">{link.description}</span>
              </span>
              <span className="shrink-0 text-sm text-primary group-hover:underline">{t('cmsOpen')}</span>
            </Link>
          ))}
        </section>
      ))}
    </div>
  )
}
