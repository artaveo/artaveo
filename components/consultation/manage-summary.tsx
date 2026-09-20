import { CalendarPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { ConsultationStatusBadge, CONSULTATION_STATUS_SUFFIX } from '@/components/consultation/consultation-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { describeInstant, describeRange, describeUtcRange, timeInZone, zoneLabel } from '@/lib/consultation/time'
import type { PublicConsultation } from '@/lib/consultation/queries'
import type { Locale } from '@/types/content'

/**
 * What a client sees about their consultation. Server-rendered from
 * `PublicConsultation` — the read model that already withholds everything that
 * is not theirs (see `lib/consultation/queries.ts#toPublicConsultation`).
 *
 * Time is always shown with its zone and, on its own line, in UTC: "Thursday
 * 14:00" means nothing without saying whose Thursday.
 */
export function ManageSummary({
  consultation,
  token,
  locale,
}: {
  consultation: PublicConsultation
  token: string
  locale: Locale
}) {
  const t = useTranslations('ConsultationManage')
  const { status } = consultation

  const description =
    status === 'requested'
      ? t('descRequested')
      : status === 'confirmed'
        ? t('descConfirmed')
        : status === 'rescheduled'
          ? t('descRescheduled')
          : status === 'completed'
            ? t('descCompleted')
            : consultation.cancelledBy === 'client'
              ? t('descCancelledByClient')
              : t('descCancelledByOwner')

  const call =
    consultation.confirmedStart && consultation.confirmedEnd
      ? { start: consultation.confirmedStart, end: consultation.confirmedEnd }
      : null
  const showCall = call !== null && (status === 'confirmed' || status === 'rescheduled')
  const showOffered = status === 'requested' || status === 'rescheduled'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <ConsultationStatusBadge
          status={status}
          label={t(`status${CONSULTATION_STATUS_SUFFIX[status]}` as 'statusRequested')}
        />
        <p className="max-w-prose text-pretty text-muted-foreground">{description}</p>
      </div>

      {showCall && call ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('confirmedTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <dl className="flex flex-col gap-3">
              <Row label={t('fieldDate')}>{describeInstant(call.start, consultation.timezone, locale).date}</Row>
              <Row label={t('fieldTime')}>
                <bdi dir="ltr">
                  {timeInZone(call.start, consultation.timezone)}–{timeInZone(call.end, consultation.timezone)}
                </bdi>
              </Row>
              <Row label={t('fieldZone')}>
                <bdi dir="ltr">
                  {zoneLabel(consultation.timezone, new Date(call.start))}
                </bdi>
              </Row>
              <Row label={t('fieldUtc')}>
                <bdi dir="ltr">{describeUtcRange(call)}</bdi>
              </Row>
              {consultation.meetingDetails ? (
                <Row label={t('fieldHow')}>
                  <bdi dir="auto" className="whitespace-pre-wrap break-words">
                    {consultation.meetingDetails}
                  </bdi>
                </Row>
              ) : null}
            </dl>
            {/* A plain link: it downloads a file, and works with no client JavaScript. */}
            <a
              href={`/api/consultation/${token}/calendar`}
              className="inline-flex w-fit items-center gap-2 text-primary underline-offset-4 hover:underline"
            >
              <CalendarPlus aria-hidden="true" className="size-4" />
              {t('addToCalendar')}
            </a>
          </CardContent>
        </Card>
      ) : null}

      {showOffered && consultation.windows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('offeredTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {consultation.windows.map((window) => {
                const range = describeRange(window, consultation.timezone, locale)
                return (
                  <li key={window.start}>
                    {range.date} — <bdi dir="ltr">{range.times}</bdi>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              <bdi dir="ltr">
                {zoneLabel(consultation.timezone, new Date(consultation.windows[0].start))}
              </bdi>
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground sm:text-end">{children}</dd>
    </div>
  )
}
