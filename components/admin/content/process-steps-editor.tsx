'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'

import { createProcessStep, deleteProcessStep, updateProcessStep } from '@/app/actions/content'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormMessage } from '@/components/ui/form-controls'
import { LocalizedTextareaField, LocalizedTextField, emptyLocalized } from '@/components/admin/content/localized-fields'
import type { AdminProcessStep, ProcessStepInput } from '@/types/cms'

/**
 * § 7.1's per-service process breakdown — a service-scoped list of
 * `{title, description}` steps, distinct from the sitewide `/process`
 * phases. Each row holds its own draft state so editing a field doesn't
 * round-trip the server on every keystroke — a card only saves when its
 * own "Save" button is pressed, same reasoning as `ServiceForm`.
 */
function StepCard({ serviceId, step, onDone }: { serviceId: string; step: AdminProcessStep; onDone: () => void }) {
  const t = useTranslations('Admin')
  const [draft, setDraft] = useState<ProcessStepInput>({ title: step.title, description: step.description })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleSave() {
    setPending(true)
    setError(false)
    const result = await updateProcessStep(step.id, serviceId, draft)
    if (!result.ok) setError(true)
    setPending(false)
    onDone()
  }

  async function handleDelete() {
    if (!window.confirm(t('cmsConfirmDelete'))) return
    setPending(true)
    const result = await deleteProcessStep(step.id, serviceId)
    if (!result.ok) setError(true)
    setPending(false)
    onDone()
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <LocalizedTextField id={`step-${step.id}-title`} label={t('cmsFieldStepTitle')} value={draft.title} disabled={pending} onChange={(title) => setDraft({ ...draft, title })} />
        <LocalizedTextareaField id={`step-${step.id}-description`} label={t('cmsFieldStepDescription')} value={draft.description} disabled={pending} rows={2} onChange={(description) => setDraft({ ...draft, description })} />
        {error ? <FormMessage variant="destructive">{t('errorForbidden')}</FormMessage> : null}
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={handleSave}>
            {t('cmsSaveChanges')}
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={handleDelete} className="text-destructive-text">
            <Trash2 aria-hidden="true" data-icon="inline-start" />
            {t('cmsDelete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProcessStepsEditor({ serviceId, steps }: { serviceId: string; steps: AdminProcessStep[] }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const [draft, setDraft] = useState<ProcessStepInput>({ title: emptyLocalized(), description: emptyLocalized() })

  async function handleAdd() {
    setPending(true)
    setError(false)
    const result = await createProcessStep(serviceId, draft)
    if (!result.ok) {
      setError(true)
      setPending(false)
      return
    }
    setDraft({ title: emptyLocalized(), description: emptyLocalized() })
    setPending(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      {steps.map((step) => (
        <StepCard key={step.id} serviceId={serviceId} step={step} onDone={() => router.refresh()} />
      ))}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <p className="text-sm font-medium text-foreground">{t('cmsAddStep')}</p>
          <LocalizedTextField id="new-step-title" label={t('cmsFieldStepTitle')} value={draft.title} disabled={pending} onChange={(title) => setDraft({ ...draft, title })} />
          <LocalizedTextareaField id="new-step-description" label={t('cmsFieldStepDescription')} value={draft.description} disabled={pending} rows={2} onChange={(description) => setDraft({ ...draft, description })} />
          <Button type="button" size="sm" disabled={pending} onClick={handleAdd} className="self-start">
            {t('cmsAddStep')}
          </Button>
        </CardContent>
      </Card>

      {error ? <FormMessage variant="destructive">{t('errorForbidden')}</FormMessage> : null}
    </div>
  )
}
