'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { completeConsultationAction } from '@/app/actions/consultation-admin'
import { adminActionMessageKey } from '@/components/admin/consultations/admin-action-message'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-controls'
import { useRouter } from '@/i18n/navigation'
import type { AdminActionCode } from '@/types/consultation'

/** Mark a confirmed call as having happened. The server refuses it before the call's time has come. */
export function CompleteButton({ consultationId, disabled }: { consultationId: string; disabled: boolean }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [code, setCode] = useState<AdminActionCode | 'network' | null>(null)

  async function complete() {
    setPending(true)
    setCode(null)
    try {
      const result = await completeConsultationAction(consultationId)
      if (!result.ok) {
        setCode(result.code)
        return
      }
      router.refresh()
    } catch {
      setCode('network')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" className="self-start" disabled={disabled || pending} onClick={complete}>
        {t('consultationCompleteSubmit')}
      </Button>
      {disabled ? <p className="text-xs text-muted-foreground">{t('consultationCompleteHint')}</p> : null}
      {code ? <FormMessage variant="destructive">{code === 'network' ? t('consultationErrorGeneric') : t(adminActionMessageKey(code))}</FormMessage> : null}
    </div>
  )
}
