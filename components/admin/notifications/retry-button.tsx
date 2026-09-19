'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw } from 'lucide-react'

import { retryNotification } from '@/app/actions/notifications'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-controls'

type Feedback = { variant: 'success' | 'warning' | 'destructive'; key: string } | null

/**
 * Sends the message again right now and reports what really happened — the
 * status it ended up in, not "queued". A message the console provider
 * "sent" is reported as such by the log below; this button never claims a
 * delivery.
 */
export function RetryNotificationButton({ id, size = 'sm' }: { id: string; size?: 'sm' | 'default' }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function handleClick() {
    setPending(true)
    setFeedback(null)
    const result = await retryNotification(id)
    setPending(false)

    if (!result.ok) {
      setFeedback({
        variant: 'destructive',
        key:
          result.code === 'not-retryable'
            ? 'notifErrorNotRetryable'
            : result.code === 'not-found'
              ? 'notifErrorNotFound'
              : result.code === 'forbidden'
                ? 'errorForbidden'
                : 'notifErrorGeneric',
      })
      return
    }

    if (result.finalStatus === 'sent') setFeedback({ variant: 'success', key: 'notifRetryResultSent' })
    else if (result.finalStatus === 'exhausted') setFeedback({ variant: 'destructive', key: 'notifRetryResultExhausted' })
    else setFeedback({ variant: 'warning', key: 'notifRetryResultFailed' })
    router.refresh()
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" size={size} onClick={handleClick} disabled={pending}>
        <RefreshCw aria-hidden="true" className={pending ? 'animate-spin' : undefined} />
        {pending ? t('notifRetrying') : t('notifRetryButton')}
      </Button>
      {feedback ? (
        <FormMessage variant={feedback.variant} className="text-xs">
          {t(feedback.key)}
        </FormMessage>
      ) : null}
    </div>
  )
}
