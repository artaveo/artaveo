'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'

import { deletePackage, upsertPackage } from '@/app/actions/content'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { PriceTypeSelect } from '@/components/admin/content/price-type-select'
import { LocalizedListField, LocalizedTextField, emptyLocalized } from '@/components/admin/content/localized-fields'
import type { AdminServicePackage, PackageInput } from '@/types/cms'

const TIERS: PackageInput['tier'][] = ['starter', 'standard', 'custom']

function emptyPackageInput(tier: PackageInput['tier']): PackageInput {
  return {
    tier,
    name: emptyLocalized(),
    summary: emptyLocalized(),
    forWhom: emptyLocalized(),
    included: [],
    notIncluded: [],
    deliverables: [],
    deliveryDays: null,
    revisions: null,
    supportDays: null,
    requirements: [],
    // Convention (types/content.ts#ServicePackage doc comment): 'custom' is always scoped-after-discovery, so its price is always 'quote'.
    price: { type: tier === 'custom' ? 'quote' : 'quote' },
  }
}

function TierEditor({ serviceId, tier, existing, onDone }: { serviceId: string; tier: PackageInput['tier']; existing?: AdminServicePackage; onDone: () => void }) {
  const t = useTranslations('Admin')
  const [draft, setDraft] = useState<PackageInput>(
    existing
      ? {
          tier,
          name: existing.name,
          summary: existing.summary,
          forWhom: existing.forWhom,
          included: existing.included,
          notIncluded: existing.notIncluded,
          deliverables: existing.deliverables,
          deliveryDays: existing.deliveryDays ?? null,
          revisions: existing.revisions ?? null,
          supportDays: existing.supportDays ?? null,
          requirements: existing.requirements ?? [],
          price: existing.price,
        }
      : emptyPackageInput(tier),
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const isCustomTier = tier === 'custom'

  async function handleSave() {
    setPending(true)
    setError(false)
    const result = await upsertPackage(serviceId, draft)
    if (!result.ok) setError(true)
    setPending(false)
    onDone()
  }

  async function handleDelete() {
    if (!existing) return
    if (!window.confirm(t('cmsConfirmDelete'))) return
    setPending(true)
    const result = await deletePackage(existing.rowId, serviceId)
    if (!result.ok) setError(true)
    setPending(false)
    onDone()
  }

  return (
    <div className="flex flex-col gap-4">
      <LocalizedTextField id={`pkg-${tier}-name`} label={t('cmsFieldPackageName')} value={draft.name} disabled={pending} onChange={(name) => setDraft({ ...draft, name })} />
      <LocalizedTextField id={`pkg-${tier}-summary`} label={t('cmsFieldPackageSummary')} value={draft.summary} disabled={pending} onChange={(summary) => setDraft({ ...draft, summary })} />
      <LocalizedTextField id={`pkg-${tier}-for-whom`} label={t('cmsFieldForWhomSingular')} value={draft.forWhom} disabled={pending} onChange={(forWhom) => setDraft({ ...draft, forWhom })} />
      <LocalizedListField id={`pkg-${tier}-included`} label={t('cmsFieldIncluded')} items={draft.included} onChange={(included) => setDraft({ ...draft, included })} disabled={pending} addLabel={t('cmsAddItem')} />
      <LocalizedListField id={`pkg-${tier}-not-included`} label={t('cmsFieldNotIncluded')} items={draft.notIncluded} onChange={(notIncluded) => setDraft({ ...draft, notIncluded })} disabled={pending} addLabel={t('cmsAddItem')} />
      <LocalizedListField id={`pkg-${tier}-deliverables`} label={t('cmsFieldDeliverables')} items={draft.deliverables} onChange={(deliverables) => setDraft({ ...draft, deliverables })} disabled={pending} addLabel={t('cmsAddItem')} />
      <LocalizedListField id={`pkg-${tier}-requirements`} label={t('cmsFieldRequirements')} items={draft.requirements} onChange={(requirements) => setDraft({ ...draft, requirements })} disabled={pending} addLabel={t('cmsAddItem')} />

      {!isCustomTier ? (
        <div className="grid gap-4 sm:grid-cols-4">
          <Field>
            <FieldLabel htmlFor={`pkg-${tier}-delivery-min`}>{t('cmsFieldDeliveryDaysMin')}</FieldLabel>
            <Input
              id={`pkg-${tier}-delivery-min`}
              type="number"
              min={0}
              value={draft.deliveryDays?.min ?? ''}
              disabled={pending}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  deliveryDays: { min: Number(event.target.value) || 0, max: draft.deliveryDays?.max ?? 0 },
                })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`pkg-${tier}-delivery-max`}>{t('cmsFieldDeliveryDaysMax')}</FieldLabel>
            <Input
              id={`pkg-${tier}-delivery-max`}
              type="number"
              min={0}
              value={draft.deliveryDays?.max ?? ''}
              disabled={pending}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  deliveryDays: { min: draft.deliveryDays?.min ?? 0, max: Number(event.target.value) || 0 },
                })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`pkg-${tier}-revisions`}>{t('cmsFieldRevisions')}</FieldLabel>
            <Input
              id={`pkg-${tier}-revisions`}
              type="number"
              min={0}
              value={draft.revisions ?? ''}
              disabled={pending}
              onChange={(event) => setDraft({ ...draft, revisions: event.target.value === '' ? null : Number(event.target.value) })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`pkg-${tier}-support-days`}>{t('cmsFieldSupportDays')}</FieldLabel>
            <Input
              id={`pkg-${tier}-support-days`}
              type="number"
              min={0}
              value={draft.supportDays ?? ''}
              disabled={pending}
              onChange={(event) => setDraft({ ...draft, supportDays: event.target.value === '' ? null : Number(event.target.value) })}
            />
          </Field>
        </div>
      ) : (
        <FormMessage variant="info">{t('cmsCustomTierNote')}</FormMessage>
      )}

      {!isCustomTier ? (
        <PriceTypeSelect id={`pkg-${tier}-price-type`} value={draft.price.type} disabled={pending} onChange={(type) => setDraft({ ...draft, price: { ...draft.price, type } })} />
      ) : null}

      {error ? <FormMessage variant="destructive">{t('errorForbidden')}</FormMessage> : null}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={handleSave}>
          {existing ? t('cmsSaveChanges') : t('cmsCreatePackage')}
        </Button>
        {existing ? (
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={handleDelete} className="text-destructive-text">
            <Trash2 aria-hidden="true" data-icon="inline-start" />
            {t('cmsDelete')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function PackagesEditor({ serviceId, packages }: { serviceId: string; packages: AdminServicePackage[] }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const packageByTier = new Map(packages.map((pkg) => [pkg.id, pkg]))

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="starter">
          <TabsList>
            <TabsIndicator />
            {TIERS.map((tier) => (
              <TabsTab key={tier} value={tier}>
                {t(`cmsTier${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}
                {packageByTier.has(tier) ? '' : ` (${t('cmsTierEmpty')})`}
              </TabsTab>
            ))}
          </TabsList>
          {TIERS.map((tier) => (
            <TabsPanel key={tier} value={tier} className="pt-4">
              <TierEditor serviceId={serviceId} tier={tier} existing={packageByTier.get(tier)} onDone={() => router.refresh()} />
            </TabsPanel>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
