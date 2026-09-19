'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, Ban } from 'lucide-react'

import { createRecommendationRequest, revokeRecommendationRequest } from '@/app/actions/content'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RecommendationRequestStatusBadge } from '@/components/admin/content/recommendation-status-badge'
import { DeliveryLabel, NotificationStatusBadge } from '@/components/admin/notifications/notification-badges'
import { t as tLocalized, type Locale } from '@/types/content'
import type { AdminRecommendationRequest } from '@/types/cms'

/** § 16: "the owner generates a single-use request link" — the owner picks which real project/service (if any) the link is for; the recommender never chooses this themselves (see 0015's migration note on why). */
export function RecommendationRequestPanel({
  requests,
  projects,
  services,
  locale,
}: {
  requests: AdminRecommendationRequest[]
  projects: { id: string; title: import('@/types/content').LocalizedText }[]
  services: { id: string; title: import('@/types/content').LocalizedText }[]
  locale: Locale
}) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [note, setNote] = useState('')
  const [projectId, setProjectId] = useState<string>('')
  const [serviceId, setServiceId] = useState<string>('')
  const [expiresInDays, setExpiresInDays] = useState('30')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientLocale, setRecipientLocale] = useState<'en' | 'fa'>('en')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<'generic' | 'invalid-email' | null>(null)
  const [emailResult, setEmailResult] = useState<'queued' | 'queue-failed' | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  function linkFor(token: string): string {
    return `${origin}/${locale}/recommend/${token}`
  }

  async function handleCopy(request: AdminRecommendationRequest) {
    try {
      await navigator.clipboard.writeText(linkFor(request.token))
      setCopiedId(request.id)
      setTimeout(() => setCopiedId((current) => (current === request.id ? null : current)), 2000)
    } catch {
      // Clipboard access can be denied by the browser — the link text is still selectable from the field itself.
    }
  }

  async function handleCreate() {
    setPending(true)
    setError(null)
    setEmailResult(null)
    const days = Number(expiresInDays)
    const email = recipientEmail.trim()
    const result = await createRecommendationRequest({
      note,
      suggestedRelatedProjectId: projectId || null,
      suggestedRelatedServiceId: serviceId || null,
      expiresInDays: Number.isFinite(days) && days > 0 ? days : null,
      recipientEmail: email || null,
      recipientLocale: email ? recipientLocale : null,
    })
    if (!result.ok) {
      setError(result.code === 'invalid-email' ? 'invalid-email' : 'generic')
      setPending(false)
      return
    }
    setNote('')
    setProjectId('')
    setServiceId('')
    setRecipientEmail('')
    if (result.email !== 'none') setEmailResult(result.email)
    setPending(false)
    router.refresh()
  }

  async function handleRevoke(id: string) {
    setPending(true)
    await revokeRecommendationRequest(id)
    setPending(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <p className="text-sm font-medium text-foreground">{t('cmsRecCreateRequestTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('cmsRecCreateRequestNote')}</p>

          <Field>
            <FieldLabel htmlFor="rec-request-note">{t('cmsRecRequestLabelField')}</FieldLabel>
            <Input id="rec-request-note" value={note} disabled={pending} placeholder={t('cmsRecRequestLabelPlaceholder')} onChange={(event) => setNote(event.target.value)} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="rec-request-project">{t('cmsRecRequestForProject')}</FieldLabel>
              <Select value={projectId || 'none'} onValueChange={(next) => setProjectId(next === 'none' ? '' : (next ?? ''))} disabled={pending}>
                <SelectTrigger id="rec-request-project">
                  <SelectValue placeholder={t('cmsRecRequestNoProject')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">{t('cmsRecRequestNoProject')}</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {tLocalized(project.title, locale)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="rec-request-service">{t('cmsRecRequestForService')}</FieldLabel>
              <Select value={serviceId || 'none'} onValueChange={(next) => setServiceId(next === 'none' ? '' : (next ?? ''))} disabled={pending}>
                <SelectTrigger id="rec-request-service">
                  <SelectValue placeholder={t('cmsRecRequestNoService')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">{t('cmsRecRequestNoService')}</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {tLocalized(service.title, locale)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="rec-request-expires">{t('cmsRecRequestExpiresInDays')}</FieldLabel>
            <Input
              id="rec-request-expires"
              type="number"
              min={0}
              value={expiresInDays}
              disabled={pending}
              className="max-w-32"
              onChange={(event) => setExpiresInDays(event.target.value)}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="rec-request-email">{t('cmsRecRequestEmail')}</FieldLabel>
              <Input
                id="rec-request-email"
                type="email"
                dir="ltr"
                autoComplete="off"
                value={recipientEmail}
                disabled={pending}
                placeholder={t('cmsRecRequestEmailPlaceholder')}
                onChange={(event) => setRecipientEmail(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="rec-request-email-locale">{t('cmsRecRequestEmailLocale')}</FieldLabel>
              <Select value={recipientLocale} onValueChange={(next) => setRecipientLocale(next === 'fa' ? 'fa' : 'en')} disabled={pending || !recipientEmail.trim()}>
                <SelectTrigger id="rec-request-email-locale">
                  <SelectValue>{recipientLocale === 'fa' ? t('cmsRecRequestEmailLocaleFa') : t('cmsRecRequestEmailLocaleEn')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="en">{t('cmsRecRequestEmailLocaleEn')}</SelectItem>
                    <SelectItem value="fa">{t('cmsRecRequestEmailLocaleFa')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">{t('cmsRecRequestEmailNote')}</p>

          <Button type="button" size="sm" disabled={pending} onClick={handleCreate} className="self-start">
            {t('cmsRecGenerateLink')}
          </Button>
          {error ? (
            <FormMessage variant="destructive">{error === 'invalid-email' ? t('cmsRecEmailInvalid') : t('errorForbidden')}</FormMessage>
          ) : null}
          {emailResult === 'queued' ? <FormMessage variant="success">{t('cmsRecEmailQueued')}</FormMessage> : null}
          {emailResult === 'queue-failed' ? <FormMessage variant="warning">{t('cmsRecEmailQueueFailed')}</FormMessage> : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {requests.length === 0 ? <p className="text-sm text-muted-foreground">{t('cmsRecNoRequestsYet')}</p> : null}
        {requests.map((request) => {
          const canRevoke = request.status === 'awaiting'
          const forLabel =
            request.suggestedRelatedProjectTitle
              ? tLocalized(request.suggestedRelatedProjectTitle, locale)
              : request.suggestedRelatedServiceTitle
                ? tLocalized(request.suggestedRelatedServiceTitle, locale)
                : null

          return (
            <Card key={request.id}>
              <CardContent className="flex flex-col gap-2 pt-6 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RecommendationRequestStatusBadge status={request.status} />
                    {request.note ? <span className="font-medium text-foreground">{request.note}</span> : null}
                    {forLabel ? <span className="text-xs text-muted-foreground">{t('cmsRecRequestForLabel', { name: forLabel })}</span> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => handleCopy(request)}>
                      {copiedId === request.id ? <Check aria-hidden="true" data-icon="inline-start" /> : <Copy aria-hidden="true" data-icon="inline-start" />}
                      {copiedId === request.id ? t('cmsRecLinkCopied') : t('cmsRecCopyLink')}
                    </Button>
                    {canRevoke ? (
                      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => handleRevoke(request.id)} className="text-destructive-text">
                        <Ban aria-hidden="true" data-icon="inline-start" />
                        {t('cmsRecRevokeLink')}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <code dir="ltr" className="truncate text-xs text-muted-foreground">
                  {linkFor(request.token)}
                </code>
                {request.recipientEmail ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{t('cmsRecEmailTo')}</span>
                    <bdi dir="auto">{request.recipientEmail}</bdi>
                    {request.lastEmail ? (
                      <>
                        <NotificationStatusBadge status={request.lastEmail.status} />
                        <DeliveryLabel status={request.lastEmail.status} provider={request.lastEmail.provider} />
                      </>
                    ) : (
                      <span className="text-warning-text">{t('cmsRecEmailNotQueued')}</span>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
