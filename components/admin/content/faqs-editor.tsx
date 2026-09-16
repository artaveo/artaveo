'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'

import { createFaq, deleteFaq, updateFaq } from '@/app/actions/content'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormMessage } from '@/components/ui/form-controls'
import { LocalizedTextareaField, LocalizedTextField, emptyLocalized } from '@/components/admin/content/localized-fields'
import type { AdminFaqItem, FaqInput } from '@/types/cms'

function FaqCard({ serviceId, faq, onDone }: { serviceId: string | null; faq: AdminFaqItem; onDone: () => void }) {
  const t = useTranslations('Admin')
  const [draft, setDraft] = useState<FaqInput>({ question: faq.question, answer: faq.answer })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleSave() {
    setPending(true)
    setError(false)
    const result = await updateFaq(faq.id, serviceId, draft)
    if (!result.ok) setError(true)
    setPending(false)
    onDone()
  }

  async function handleDelete() {
    if (!window.confirm(t('cmsConfirmDelete'))) return
    setPending(true)
    const result = await deleteFaq(faq.id, serviceId)
    if (!result.ok) setError(true)
    setPending(false)
    onDone()
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <LocalizedTextField id={`faq-${faq.id}-question`} label={t('cmsFieldFaqQuestion')} value={draft.question} disabled={pending} onChange={(question) => setDraft({ ...draft, question })} />
        <LocalizedTextareaField id={`faq-${faq.id}-answer`} label={t('cmsFieldFaqAnswer')} value={draft.answer} disabled={pending} rows={2} onChange={(answer) => setDraft({ ...draft, answer })} />
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

/** Reused for both service-scoped FAQs (the service edit page) and global FAQs (`/admin/content/faqs`) — `serviceId` is `null` for the global scope. */
export function FaqsEditor({ scope, serviceId, faqs }: { scope: 'service' | 'global'; serviceId: string | null; faqs: AdminFaqItem[] }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const [draft, setDraft] = useState<FaqInput>({ question: emptyLocalized(), answer: emptyLocalized() })

  async function handleAdd() {
    setPending(true)
    setError(false)
    const result = await createFaq(scope, serviceId, draft)
    if (!result.ok) {
      setError(true)
      setPending(false)
      return
    }
    setDraft({ question: emptyLocalized(), answer: emptyLocalized() })
    setPending(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      {faqs.map((faq) => (
        <FaqCard key={faq.id} serviceId={serviceId} faq={faq} onDone={() => router.refresh()} />
      ))}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <p className="text-sm font-medium text-foreground">{t('cmsAddFaq')}</p>
          <LocalizedTextField id="new-faq-question" label={t('cmsFieldFaqQuestion')} value={draft.question} disabled={pending} onChange={(question) => setDraft({ ...draft, question })} />
          <LocalizedTextareaField id="new-faq-answer" label={t('cmsFieldFaqAnswer')} value={draft.answer} disabled={pending} rows={2} onChange={(answer) => setDraft({ ...draft, answer })} />
          <Button type="button" size="sm" disabled={pending} onClick={handleAdd} className="self-start">
            {t('cmsAddFaq')}
          </Button>
        </CardContent>
      </Card>

      {error ? <FormMessage variant="destructive">{t('errorForbidden')}</FormMessage> : null}
    </div>
  )
}
