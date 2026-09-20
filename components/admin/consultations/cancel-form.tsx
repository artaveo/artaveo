'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { cancelConsultationAction } from '@/app/actions/consultation-admin'
import { adminActionMessageKey } from '@/components/admin/consultations/admin-action-message'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Textarea } from '@/components/ui/input'
import { useRouter } from '@/i18n/navigation'
import { MAX_CANCEL_REASON_LENGTH } from '@/lib/consultation/config'
import type { AdminActionCode } from '@/types/consultation'

/** Cancel a live consultation. Two steps on purpose: nothing is sent to the client until the second click. */
export function CancelForm({ consultationId }: { consultationId: string }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [code, setCode] = useState<AdminActionCode | 'network' | null>(null)

  async function cancel() {
    setPending(true)
    setCode(null)
    try {
      const result = await cancelConsultationAction(consultationId, reason)
      if (!result.ok) {
        setCode(result.code)
        if (result.code === 'conflict' || result.code === 'invalid-transition') router.refresh()
        return
      }
      router.refresh()
    } catch {
      setCode('network')
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {t('consultationCancelTitle')}
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t('consultationCancelHint')}</p>
      <Field>
        <FieldLabel htmlFor="owner-cancel-reason">{t('consultationCancelReason')}</FieldLabel>
        <Textarea id="owner-cancel-reason" rows={3} dir="auto" value={reason} maxLength={MAX_CANCEL_REASON_LENGTH} disabled={pending} onChange={(event) => setReason(event.target.value)} />
      </Field>
      {code ? <FormMessage variant="destructive">{code === 'network' ? t('consultationErrorGeneric') : t(adminActionMessageKey(code))}</FormMessage> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="destructive" disabled={pending} onClick={cancel}>
          {t('consultationCancelSubmit')}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => { setOpen(false); setCode(null) }}>
          {t('consultationCancelKeep')}
        </Button>
      </div>
    </div>
  )
}
