'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { setErrorGroupStatus } from '@/app/actions/observability'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import type { ErrorGroupStatus } from '@/lib/admin/observability'

/**
 * What the owner decides about one error group. `resolved` reopens by itself if the
 * error comes back; `ignored` keeps counting but never alarms.
 */
export function GroupStatusButtons({ fingerprint, status }: { fingerprint: string; status: ErrorGroupStatus }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function change(next: ErrorGroupStatus) {
    setPending(true)
    setFailed(false)
    const result = await setErrorGroupStatus(fingerprint, next)
    setPending(false)
    if (!result.ok) {
      setFailed(true)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-2">
        {status !== 'open' ? (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => change('open')}>
            {t('obsGroupReopen')}
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => change('resolved')}>
              {t('obsGroupResolve')}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => change('ignored')}>
              {t('obsGroupIgnore')}
            </Button>
          </>
        )}
      </div>
      {failed ? (
        <p role="alert" className="text-xs text-destructive">
          {t('obsGroupError')}
        </p>
      ) : null}
    </div>
  )
}
