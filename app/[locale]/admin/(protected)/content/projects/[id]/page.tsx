import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { publishProject, unpublishProject } from '@/app/actions/content'
import { ProjectForm } from '@/components/admin/content/project-form'
import { ProjectMediaEditor } from '@/components/admin/content/project-media-editor'
import { ProjectSectionsForm } from '@/components/admin/content/project-sections-form'
import { PublishControl } from '@/components/admin/content/publish-control'
import { NotFoundState } from '@/components/ui/states'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { getProjectAdmin, getProjectTechnologyIds, listTechnologiesAdmin, projectCompleteness } from '@/lib/admin/content'
import { listMediaAssets, listProjectMedia } from '@/lib/admin/media'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale, id } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  const project = await getProjectAdmin(id)
  return { title: project ? project.title.en || project.slug : t('cmsProjectsTitle'), robots: { index: false, follow: false } }
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const session = await getAdminSession()
  if (!session) redirect(`/${locale}/admin/login`)
  if (!mfaSatisfied(session)) redirect(`/${locale}/admin/${mfaDestination(session)}`)

  const t = await getTranslations('Admin')
  const [project, technologies, technologyIds] = await Promise.all([
    getProjectAdmin(id),
    listTechnologiesAdmin(),
    getProjectTechnologyIds(id),
  ])

  if (!project) {
    return <NotFoundState size="page" title={t('cmsProjectNotFoundTitle')} />
  }

  const [projectMedia, mediaLibrary] = await Promise.all([listProjectMedia(id), listMediaAssets()])

  const completeness = projectCompleteness(project)
  const publishProjectForId = publishProject.bind(null, id)
  const unpublishProjectForId = unpublishProject.bind(null, id)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('cmsProjectsEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{project.title.en || project.slug}</h1>
      </div>

      <PublishControl
        published={project.published}
        completeness={completeness}
        previewHref={`/${locale}/admin/content/projects/${id}/preview`}
        onPublish={publishProjectForId}
        onUnpublish={unpublishProjectForId}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{t('cmsSectionCoreFields')}</h2>
        <ProjectForm mode="edit" project={project} technologies={technologies ?? []} initialTechnologyIds={technologyIds} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{t('cmsSectionCaseStudy')}</h2>
        <ProjectSectionsForm projectId={id} project={project} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{t('cmsSectionMedia')}</h2>
        <ProjectMediaEditor projectId={id} projectSlug={project.slug} items={projectMedia ?? []} library={mediaLibrary ?? []} />
      </section>
    </div>
  )
}
