import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NotFoundState } from '@/components/ui/states'
import { StageTransitionControl } from '@/components/admin/pipeline/stage-transition-control'
import { PrioritySelect } from '@/components/admin/pipeline/priority-select'
import { FollowUpField } from '@/components/admin/pipeline/follow-up-field'
import { TagsEditor } from '@/components/admin/pipeline/tags-editor'
import { NoteForm } from '@/components/admin/pipeline/note-form'
import { EventsTimeline } from '@/components/admin/pipeline/events-timeline'
import { SlaIndicator } from '@/components/admin/pipeline/sla-indicator'
import { canAccessLeads, getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { computeSla, getInquiry, getInquiryEvents, getResponseCommitment } from '@/lib/admin/pipeline'
import { ConsultationStatusBadge, CONSULTATION_STATUS_SUFFIX } from '@/components/consultation/consultation-status'
import { listConsultationsForInquiry } from '@/lib/consultation/queries'
import { describeUtcRange } from '@/lib/consultation/time'
import { formatDate } from '@/lib/format'
import type { Locale } from '@/types/content'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return {
    title: t('leadDetailEyebrow'),
    robots: { index: false, follow: false },
  }
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const session = await getAdminSession()
  if (!session) redirect(`/${locale}/admin/login`)
  if (!mfaSatisfied(session)) redirect(`/${locale}/admin/${mfaDestination(session)}`)
  if (!canAccessLeads(session)) redirect(`/${locale}/admin`)

  const t = await getTranslations('Admin')

  const [inquiry, events, commitment, consultations] = await Promise.all([
    getInquiry(id),
    getInquiryEvents(id),
    getResponseCommitment(),
    listConsultationsForInquiry(id),
  ])

  if (!inquiry) {
    return <NotFoundState title={t('leadNotFoundTitle')} action={{ label: t('backToLeads'), href: `/${locale}/admin/leads` }} />
  }

  const sla = computeSla(inquiry.createdAt, events, commitment?.timezone ?? 'UTC')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin/leads" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          &larr; {t('backToLeads')}
        </Link>
        <p className="mt-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('leadDetailEyebrow')}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{inquiry.name}</h1>
        <p className="text-sm text-muted-foreground">{formatDate(inquiry.createdAt, locale as Locale)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('pipelineSectionTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase">{t('stageLabel')}</span>
              <StageTransitionControl inquiryId={inquiry.id} stage={inquiry.stage} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase">{t('priorityLabel')}</span>
              <PrioritySelect inquiryId={inquiry.id} priority={inquiry.priority} />
            </div>
          </div>
          <FollowUpField inquiryId={inquiry.id} followUpAt={inquiry.followUpAt} />
          <TagsEditor inquiryId={inquiry.id} tags={inquiry.tags} />
        </CardContent>
      </Card>

      {consultations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('leadConsultationTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {consultations.map((consultation) => {
              const first = consultation.confirmedStart
                ? { start: consultation.confirmedStart, end: consultation.confirmedEnd ?? consultation.confirmedStart }
                : consultation.windows[0]
              return (
                <div key={consultation.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col items-start gap-1">
                    <ConsultationStatusBadge
                      status={consultation.status}
                      label={t(`consultationStatus${CONSULTATION_STATUS_SUFFIX[consultation.status]}`)}
                    />
                    {first ? (
                      <bdi dir="ltr" className="text-xs text-muted-foreground">
                        {describeUtcRange(first)}
                      </bdi>
                    ) : null}
                  </div>
                  <Link
                    href={`/admin/consultations/${consultation.id}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {t('leadConsultationOpen')}
                  </Link>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('slaTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <SlaIndicator sla={sla} responseCommitment={commitment?.text ?? null} locale={locale as Locale} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('contactSectionTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label={t('fieldName')} value={inquiry.name} />
          <Field label={t('fieldEmail')} value={inquiry.email} />
          <Field label={t('fieldPhone')} value={inquiry.phone || '—'} />
          <Field label={t('fieldPreferredChannel')} value={inquiry.preferredChannel} />
          <Field label={t('fieldPreferredLocale')} value={inquiry.preferredLocale} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('briefSectionTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Field label={t('fieldGoal')} value={inquiry.goal} block />
          {inquiry.serviceSlug ? <Field label={t('fieldService')} value={inquiry.serviceSlug} /> : null}
          {inquiry.packageId ? <Field label={t('fieldPackage')} value={inquiry.packageId} /> : null}
          {inquiry.engagementModelId ? (
            <Field label={t('fieldEngagementModel')} value={inquiry.engagementModelId} />
          ) : null}
          {inquiry.projectType ? <Field label={t('fieldProjectType')} value={inquiry.projectType} /> : null}
          {inquiry.timeline ? <Field label={t('fieldTimeline')} value={inquiry.timeline} /> : null}
          {inquiry.budgetBand ? <Field label={t('fieldBudget')} value={inquiry.budgetBand} /> : null}
          {inquiry.featureTags.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase">{t('fieldFeatureTags')}</span>
              <div className="flex flex-wrap gap-1.5">
                {inquiry.featureTags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {inquiry.featureOtherNote ? <Field label={t('fieldFeatureOther')} value={inquiry.featureOtherNote} block /> : null}
          {inquiry.links.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase">{t('fieldLinks')}</span>
              <ul className="flex flex-col gap-1">
                {inquiry.links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {link.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('sourceSectionTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label={t('fieldSourceChannel')} value={inquiry.sourceChannel ?? '—'} />
          <Field label={t('fieldSourceReferrer')} value={inquiry.sourceReferrer ?? '—'} />
          <Field label="UTM source" value={inquiry.sourceUtmSource ?? '—'} />
          <Field label="UTM medium" value={inquiry.sourceUtmMedium ?? '—'} />
          <Field label="UTM campaign" value={inquiry.sourceUtmCampaign ?? '—'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('eventTimelineTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <NoteForm inquiryId={inquiry.id} />
          <EventsTimeline events={events} locale={locale as Locale} />
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, value, block }: { label: string; value: string; block?: boolean }) {
  if (block) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
        <p className="text-foreground text-pretty">{value}</p>
      </div>
    )
  }
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
