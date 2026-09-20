import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

import { CancelForm } from '@/components/admin/consultations/cancel-form'
import { CompleteButton } from '@/components/admin/consultations/complete-button'
import { ConfirmForm } from '@/components/admin/consultations/confirm-form'
import { EventsTimeline } from '@/components/admin/pipeline/events-timeline'
import { ConsultationStatusBadge, CONSULTATION_STATUS_SUFFIX } from '@/components/consultation/consultation-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormMessage } from '@/components/ui/form-controls'
import { NotFoundState } from '@/components/ui/states'
import { Link } from '@/i18n/navigation'
import { canAccessLeads, getAdminSession, mfaDestination, mfaSatisfied } from '@/lib/admin/auth'
import { getInquiryEvents } from '@/lib/admin/pipeline'
import { getAdminConsultation, isConsultationId } from '@/lib/consultation/queries'
import { describeInstant, describeUtcRange, timeInZone, zoneLabel } from '@/lib/consultation/time'
import { allWindowsPassed, canMarkCompleted, canOwnerConfirm, isTerminal } from '@/lib/consultation/windows'
import { formatDate } from '@/lib/format'
import { absoluteUrl } from '@/lib/site-url'
import type { Locale } from '@/types/content'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Admin' })
  return { title: t('consultationDetailEyebrow'), robots: { index: false, follow: false } }
}

export default async function ConsultationDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const session = await getAdminSession()
  if (!session) redirect(`/${locale}/admin/login`)
  if (!mfaSatisfied(session)) redirect(`/${locale}/admin/${mfaDestination(session)}`)
  if (!canAccessLeads(session)) redirect(`/${locale}/admin`)

  const t = await getTranslations('Admin')
  const notFound = (
    <NotFoundState
      title={t('consultationNotFoundTitle')}
      action={{ label: t('consultationBack'), href: `/${locale}/admin/consultations` }}
    />
  )
  if (!isConsultationId(id)) return notFound

  const consultation = await getAdminConsultation(id)
  if (!consultation) return notFound

  const events = (await getInquiryEvents(consultation.inquiryId)).filter((event) => event.type.startsWith('consultation-'))
  const now = new Date()
  const call =
    consultation.confirmedStart && consultation.confirmedEnd
      ? { start: consultation.confirmedStart, end: consultation.confirmedEnd }
      : null
  const awaitingOwner = consultation.status === 'requested' || consultation.status === 'rescheduled'
  const terminal = isTerminal(consultation.status)
  const zone = consultation.timezone
  const managePath = `/${consultation.locale}/consultation/${consultation.token}`

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin/consultations" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          &larr; {t('consultationBack')}
        </Link>
        <p className="mt-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('consultationDetailEyebrow')}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{consultation.inquiry.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <ConsultationStatusBadge
            status={consultation.status}
            label={t(`consultationStatus${CONSULTATION_STATUS_SUFFIX[consultation.status]}`)}
          />
          <span className="text-sm text-muted-foreground">{formatDate(consultation.createdAt, locale as Locale)}</span>
        </div>
      </div>

      {awaitingOwner && allWindowsPassed(consultation.windows, now) ? (
        <FormMessage variant="warning">{t('consultationWindowsPassed')}</FormMessage>
      ) : null}

      {call ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('consultationCallSection')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row label={t('consultationFieldDate')}>{describeInstant(call.start, zone, locale as Locale).date}</Row>
            <Row label={t('consultationFieldTime')}>
              <bdi dir="ltr">
                {timeInZone(call.start, zone)}–{timeInZone(call.end, zone)} · {zoneLabel(zone, new Date(call.start))}
              </bdi>
            </Row>
            <Row label={t('consultationFieldUtc')}>
              <bdi dir="ltr">{describeUtcRange(call)}</bdi>
            </Row>
            {consultation.meetingDetails ? (
              <Row label={t('consultationFieldHow')}>
                <span className="whitespace-pre-wrap break-words">{consultation.meetingDetails}</span>
              </Row>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {!terminal ? (
        <Card>
          <CardHeader>
            <CardTitle>{consultation.status === 'confirmed' ? t('consultationMoveTitle') : t('consultationConfirmTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {canOwnerConfirm(consultation.status) ? (
              <ConfirmForm
                consultationId={consultation.id}
                status={consultation.status as 'requested' | 'confirmed' | 'rescheduled'}
                timezone={zone}
                durationMinutes={consultation.durationMinutes}
                windows={consultation.windows}
                meetingDetails={consultation.meetingDetails}
                locale={locale as Locale}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {consultation.status === 'confirmed' ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('consultationCompleteTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CompleteButton consultationId={consultation.id} disabled={!canMarkCompleted(consultation, now)} />
          </CardContent>
        </Card>
      ) : null}

      {!terminal ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('consultationCancelTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CancelForm consultationId={consultation.id} />
          </CardContent>
        </Card>
      ) : null}

      {consultation.status === 'cancelled' ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 text-sm">
            <Row label={t('consultationFieldCancelledBy')}>
              {consultation.cancelledBy === 'client' ? t('consultationCancelledClient') : t('consultationCancelledOwner')}
            </Row>
            {consultation.cancelReason ? <Row label={t('consultationFieldReason')}>{consultation.cancelReason}</Row> : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('consultationOfferedSection')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {consultation.windows.length === 0 ? (
            <p className="text-muted-foreground">{t('consultationNoWindows')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {consultation.windows.map((window) => (
                <li key={window.start} className="flex flex-col gap-0.5">
                  <span>
                    {describeInstant(window.start, zone, locale as Locale).date} —{' '}
                    <bdi dir="ltr">
                      {timeInZone(window.start, zone)}–{timeInZone(window.end, zone)}
                    </bdi>
                  </span>
                  <bdi dir="ltr" className="text-xs text-muted-foreground">
                    {describeUtcRange(window)}
                  </bdi>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            <bdi dir="ltr">
              {t('consultationFieldZone')}: {zoneLabel(zone, new Date(consultation.windows[0]?.start ?? Date.now()))}
            </bdi>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('consultationClientSection')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Row label={t('fieldEmail')}>{consultation.inquiry.email}</Row>
          <Row label={t('fieldPhone')}>{consultation.inquiry.phone || '—'}</Row>
          <Row label={t('fieldPreferredLocale')}>{consultation.locale}</Row>
          <Row label={t('consultationFieldChanges')}>{consultation.rescheduleRequests}</Row>
          <Row label={t('consultationFieldDuration')}>{t('consultationMinutes', { minutes: consultation.durationMinutes })}</Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('consultationTopicSection')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="text-pretty whitespace-pre-wrap">{consultation.inquiry.goal}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('consultationLinksSection')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <Link href={`/admin/leads/${consultation.inquiryId}`} className="w-fit text-primary underline-offset-4 hover:underline">
            {t('consultationOpenLead')}
          </Link>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase">{t('consultationFieldClientLink')}</span>
            <bdi dir="ltr" className="break-all text-xs">
              {absoluteUrl(managePath)}
            </bdi>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('consultationTimelineSection')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EventsTimeline events={events} locale={locale as Locale} />
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
      <div className="text-foreground text-pretty">{children}</div>
    </div>
  )
}
