'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'

import { createAddon, deleteAddon, updateAddon } from '@/app/actions/content'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { PriceTypeSelect } from '@/components/admin/content/price-type-select'
import { LocalizedTextareaField, LocalizedTextField, emptyLocalized } from '@/components/admin/content/localized-fields'
import type { AddonInput, AdminServiceAddon } from '@/types/cms'

function emptyAddonInput(): AddonInput {
  return { title: emptyLocalized(), description: emptyLocalized(), price: { type: 'quote' }, deliveryImpactDays: null }
}

function AddonCard({ serviceId, addon, onDone }: { serviceId: string; addon: AdminServiceAddon; onDone: () => void }) {
  const t = useTranslations('Admin')
  const [draft, setDraft] = useState<AddonInput>({
    title: addon.title,
    description: addon.description,
    price: addon.price,
    deliveryImpactDays: addon.deliveryImpactDays ?? null,
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleSave() {
    setPending(true)
    setError(false)
    const result = await updateAddon(addon.id, serviceId, draft)
    if (!result.ok) setError(true)
    setPending(false)
    onDone()
  }

  async function handleDelete() {
    if (!window.confirm(t('cmsConfirmDelete'))) return
    setPending(true)
    const result = await deleteAddon(addon.id, serviceId)
    if (!result.ok) setError(true)
    setPending(false)
    onDone()
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <LocalizedTextField id={`addon-${addon.id}-title`} label={t('cmsFieldTitle')} value={draft.title} disabled={pending} onChange={(title) => setDraft({ ...draft, title })} />
        <LocalizedTextareaField id={`addon-${addon.id}-description`} label={t('cmsFieldDescription')} value={draft.description} disabled={pending} rows={2} onChange={(description) => setDraft({ ...draft, description })} />
        <div className="grid gap-4 sm:grid-cols-3">
          <PriceTypeSelect id={`addon-${addon.id}-price-type`} value={draft.price.type} disabled={pending} onChange={(type) => setDraft({ ...draft, price: { ...draft.price, type } })} />
          <Field>
            <FieldLabel htmlFor={`addon-${addon.id}-delivery-impact`}>{t('cmsFieldDeliveryImpactDays')}</FieldLabel>
            <Input
              id={`addon-${addon.id}-delivery-impact`}
              type="number"
              min={0}
              value={draft.deliveryImpactDays ?? ''}
              disabled={pending}
              onChange={(event) => setDraft({ ...draft, deliveryImpactDays: event.target.value === '' ? null : Number(event.target.value) })}
            />
          </Field>
        </div>
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

export function AddonsEditor({ serviceId, addons }: { serviceId: string; addons: AdminServiceAddon[] }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const [draft, setDraft] = useState<AddonInput>(emptyAddonInput())

  async function handleAdd() {
    setPending(true)
    setError(false)
    const result = await createAddon(serviceId, draft)
    if (!result.ok) {
      setError(true)
      setPending(false)
      return
    }
    setDraft(emptyAddonInput())
    setPending(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      {addons.map((addon) => (
        <AddonCard key={addon.id} serviceId={serviceId} addon={addon} onDone={() => router.refresh()} />
      ))}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <p className="text-sm font-medium text-foreground">{t('cmsAddAddon')}</p>
          <LocalizedTextField id="new-addon-title" label={t('cmsFieldTitle')} value={draft.title} disabled={pending} onChange={(title) => setDraft({ ...draft, title })} />
          <LocalizedTextareaField id="new-addon-description" label={t('cmsFieldDescription')} value={draft.description} disabled={pending} rows={2} onChange={(description) => setDraft({ ...draft, description })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <PriceTypeSelect id="new-addon-price-type" value={draft.price.type} disabled={pending} onChange={(type) => setDraft({ ...draft, price: { ...draft.price, type } })} />
            <Field>
              <FieldLabel htmlFor="new-addon-delivery-impact">{t('cmsFieldDeliveryImpactDays')}</FieldLabel>
              <Input
                id="new-addon-delivery-impact"
                type="number"
                min={0}
                value={draft.deliveryImpactDays ?? ''}
                disabled={pending}
                onChange={(event) => setDraft({ ...draft, deliveryImpactDays: event.target.value === '' ? null : Number(event.target.value) })}
              />
            </Field>
          </div>
          <Button type="button" size="sm" disabled={pending} onClick={handleAdd} className="self-start">
            {t('cmsAddAddon')}
          </Button>
        </CardContent>
      </Card>

      {error ? <FormMessage variant="destructive">{t('errorForbidden')}</FormMessage> : null}
    </div>
  )
}
