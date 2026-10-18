import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { publishProject, unpublishProject } from '@/app/actions/content'
import { ProductEditor } from '@/components/admin/content/product-editor'
import { ProjectBlocksEditor } from '@/components/admin/content/project-blocks-editor'
import { ProjectEditorTabs } from '@/components/admin/content/project-editor-tabs'
import { ProjectForm } from '@/components/admin/content/project-form'
import { ProjectMediaEditor } from '@/components/admin/content/project-media-editor'
import { PublishControl } from '@/components/admin/content/publish-control'
import { NotFoundState } from '@/components/ui/states'
import { getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import {
  getProjectAdmin,
  getProjectTechnologyIds,
  listProductServicesAdmin,
  listProjectBlocksAdmin,
  listSaleOptionsAdmin,
  listTechnologiesAdmin,
  projectCompleteness,
} from '@/lib/admin/content'
import { listMediaAssets, listMediaProjects, listProjectMedia } from '@/lib/admin/media'

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

/**
 * The project editor (§ 15.2, reworked in Phase 27): three tabs —
 * Project (core fields, colour, cover, switches), Page (the blocks the public page
 * is built from, plus the screenshots the case study shows) and Product (its ways
 * to get it and after-sales services, Phase 27.3).
 */
export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { locale, id } = await params
  const { tab } = await searchParams
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

  const [projectMedia, mediaLibrary, mediaProjects, blocks, saleOptions, productServices] = await Promise.all([
    listProjectMedia(id),
    listMediaAssets(),
    listMediaProjects(),
    listProjectBlocksAdmin(id),
    listSaleOptionsAdmin(id),
    listProductServicesAdmin(id),
  ])

  const completeness = projectCompleteness(project)
  const publishProjectForId = publishProject.bind(null, id)
  const unpublishProjectForId = unpublishProject.bind(null, id)
  const activeTab = tab === 'page' || tab === 'product' ? tab : 'project'

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

      <ProjectEditorTabs active={activeTab} projectId={id} isProduct={project.isProduct} />

      {activeTab === 'project' ? (
        <section className="flex flex-col gap-4" aria-labelledby="tab-project">
          <ProjectForm mode="edit" project={project} technologies={technologies ?? []} initialTechnologyIds={technologyIds} media={mediaLibrary ?? []} projects={mediaProjects} />
        </section>
      ) : null}

      {activeTab === 'page' ? (
        <>
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{t('cmsSectionBlocks')}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t('cmsSectionBlocksHint')}</p>
            </div>
            <ProjectBlocksEditor projectId={id} blocks={blocks ?? []} media={mediaLibrary ?? []} projects={mediaProjects} />
          </section>
          <section className="flex flex-col gap-4">
            <div>
  <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{t('cmsSectionMedia')}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t('cmsSectionMediaHint')}</p>
            </div>
            <ProjectMediaEditor projectId={id} projectSlug={project.slug} items={projectMedia ?? []} library={mediaLibrary ?? []} projects={mediaProjects} />
          </section>
        </>
      ) : null}

      {activeTab === 'product' ? (
        <section className="flex flex-col gap-4">
          <ProductEditor projectId={id} isProduct={project.isProduct} saleOptions={saleOptions ?? []} productServices={productServices ?? []} />
        </section>
      ) : null}
    </div>
  )
}
