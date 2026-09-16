'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormMessage } from '@/components/ui/form-controls'
import { CompletenessBadges } from '@/components/admin/content/completeness-badge'
import { useRouter } from '@/i18n/navigation'
import type { LocaleCompleteness } from '@/types/cms'

type PublishResult = { ok: true } | { ok: false; code: string }

/**
 * Shared draft → publish → unpublish control (roadmap § 15) for any
 * entity with a single sitewide `published` boolean (services,
 * engagement models). "Publishing… requires its required fields" is
 * enforced server-side (`app/actions/content.ts#publishService` returns
 * `not-complete`) — this also disables the button client-side from the
 * same `completeness` the list/detail view already computed, so the
 * blocked state is visible before the click, not just after.
 */
export function PublishControl({
  published,
  completeness,
  previewHref,
  onPublish,
  onUnpublish,
}: {
  published: boolean
  completeness: LocaleCompleteness
  previewHref: string
  onPublish: () => Promise<PublishResult>
  onUnpublish: () => Promise<PublishResult>
}) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canPublish = completeness.en && completeness.fa

  async function handleClick() {
    setPending(true)
    setError(null)
    const result = published ? await onUnpublish() : await onPublish()
    if (!result.ok) {
      setError(result.code === 'not-complete' ? t('cmsErrorNotComplete') : t('errorForbidden'))
      setPending(false)
      return
    }
    setPending(false)
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {published ? t('cmsStatusPublished') : t('cmsStatusDraft')}
            </span>
            <CompletenessBadges completeness={completeness} />
          </div>
          {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" render={<a href={previewHref} target="_blank" rel="noreferrer" />}>
            {t('cmsPreview')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={published ? 'outline' : 'default'}
            disabled={pending || (!published && !canPublish)}
            onClick={handleClick}
          >
            {published ? t('cmsUnpublish') : t('cmsPublish')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
