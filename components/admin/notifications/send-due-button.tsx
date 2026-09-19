'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Send } from 'lucide-react'

import { sendDueNotifications } from '@/app/actions/notifications'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-controls'

export function SendDueButton({ disabled = false }: { disabled?: boolean }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ variant: 'success' | 'destructive'; text: string } | null>(null)

  async function handleClick() {
    setPending(true)
    setMessage(null)
    const result = await sendDueNotifications()
    setPending(false)

    if (!result.ok) {
      setMessage({ variant: 'destructive', text: t(result.code === 'forbidden' ? 'errorForbidden' : 'notifErrorGeneric') })
      return
    }
    setMessage({
      variant: 'success',
      text: t('notifSendDueResult', { attempted: result.attempted, sent: result.sent, failed: result.failed }),
    })
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending || disabled}>
        <Send aria-hidden="true" />
        {pending ? t('notifSendDueRunning') : t('notifSendDueButton')}
      </Button>
      {message ? (
        <FormMessage variant={message.variant} className="text-xs">
          {message.text}
        </FormMessage>
      ) : null}
    </div>
  )
}
