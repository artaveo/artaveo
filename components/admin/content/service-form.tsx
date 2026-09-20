'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { createService, updateService } from '@/app/actions/content'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LocalizedListField, LocalizedTextField, LocalizedTextareaField, StringListField } from '@/components/admin/content/localized-fields'
import type { Service, ServiceType } from '@/types/content'
import type { ServiceCoreInput } from '@/types/cms'

const SERVICE_TYPES: ServiceType[] = ['productized', 'custom', 'productized-custom', 'monthly']

function toInput(service?: Service): ServiceCoreInput {
  return {
    slug: service?.slug ?? '',
    icon: service?.icon ?? '',
    title: service?.title ?? { en: '', fa: '' },
    description: service?.description ?? { en: '', fa: '' },
    deliverables: service?.deliverables ?? [],
    type: service?.type,
    tagline: service?.tagline ?? null,
    forWhom: service?.forWhom ?? [],
    notForWhom: service?.notForWhom ?? [],
    problem: service?.problem ?? null,
    whatIDo: service?.whatIDo ?? [],
    included: service?.included ?? [],
    notIncluded: service?.notIncluded ?? [],
    timeline: service?.timeline ?? null,
    requirements: service?.requirements ?? [],
    relatedProjectSlugs: service?.relatedProjectSlugs ?? [],
    whatDrivesCost: service?.whatDrivesCost ?? [],
    paymentScheduleNote: service?.paymentScheduleNote ?? null,
  }
}

/**
 * Core-fields editor for a `services` row (roadmap § 15.1). The three
 * nested collections (process steps, packages, add-ons) and FAQs are
 * edited by their own small components below this form on the service
 * detail page — each is its own table with its own db-row ids, not part
 * of this single-row submission.
 */
export function ServiceForm({ mode, service }: { mode: 'create' | 'edit'; service?: Service }) {
  const t = useTranslations('Admin')
  const tType = useTranslations('ServiceType')
  const router = useRouter()
  const [form, setForm] = useState<ServiceCoreInput>(() => toInput(service))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField<K extends keyof ServiceCoreInput>(key: K, value: ServiceCoreInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result =
      mode === 'create' ? await createService(form) : await updateService(service!.id, form)

    if (!result.ok) {
      setError(result.code === 'duplicate-slug' ? t('cmsErrorDuplicateSlug') : t('errorForbidden'))
      setPending(false)
      return
    }

    setPending(false)
    if (mode === 'create' && 'id' in result) {
      router.push(`/admin/content/services/${result.id}`)
    } else {
      router.refresh()
    }
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="service-slug">
                {t('cmsFieldSlug')} <span className="text-destructive-text">*</span>
              </FieldLabel>
              <Input
                id="service-slug"
                dir="ltr"
                value={form.slug}
                disabled={pending}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                placeholder="brand-identity"
                onChange={(event) => setField('slug', event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="service-icon">
                {t('cmsFieldIcon')} <span className="text-destructive-text">*</span>
              </FieldLabel>
              <Input
                id="service-icon"
                dir="ltr"
                value={form.icon}
                disabled={pending}
                required
                placeholder="Palette"
                onChange={(event) => setField('icon', event.target.value)}
              />
            </Field>
          </div>

          <LocalizedTextField id="service-title" label={t('cmsFieldTitle')} value={form.title} onChange={(v) => setField('title', v)} required disabled={pending} />
          <LocalizedTextareaField id="service-description" label={t('cmsFieldDescription')} value={form.description} onChange={(v) => setField('description', v)} required disabled={pending} rows={2} />

          <Field>
            <FieldLabel htmlFor="service-type">{t('cmsFieldServiceType')}</FieldLabel>
            <Select
              value={form.type ?? '__none'}
              onValueChange={(value) => setField('type', value === '__none' ? undefined : (value as ServiceType))}
              disabled={pending}
            >
              <SelectTrigger id="service-type" className="max-w-64">
                <SelectValue>{form.type ? tType(form.type) : t('cmsFieldServiceTypeNone')}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__none">{t('cmsFieldServiceTypeNone')}</SelectItem>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {tType(type)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <LocalizedTextField id="service-tagline" label={t('cmsFieldTagline')} value={form.tagline ?? { en: '', fa: '' }} onChange={(v) => setField('tagline', v)} disabled={pending} />
          <LocalizedTextareaField id="service-problem" label={t('cmsFieldProblem')} value={form.problem ?? { en: '', fa: '' }} onChange={(v) => setField('problem', v)} disabled={pending} rows={2} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm font-medium text-foreground">{t('cmsSectionBlueprint')}</p>
          <LocalizedListField id="service-deliverables" label={t('cmsFieldDeliverables')} items={form.deliverables} onChange={(v) => setField('deliverables', v)} disabled={pending} addLabel={t('cmsAddItem')} />
          <LocalizedListField id="service-for-whom" label={t('cmsFieldForWhom')} items={form.forWhom} onChange={(v) => setField('forWhom', v)} disabled={pending} addLabel={t('cmsAddItem')} />
          <LocalizedListField id="service-not-for-whom" label={t('cmsFieldNotForWhom')} items={form.notForWhom} onChange={(v) => setField('notForWhom', v)} disabled={pending} addLabel={t('cmsAddItem')} />
          <LocalizedListField id="service-what-i-do" label={t('cmsFieldWhatIDo')} items={form.whatIDo} onChange={(v) => setField('whatIDo', v)} disabled={pending} addLabel={t('cmsAddItem')} />
          <LocalizedListField id="service-included" label={t('cmsFieldIncluded')} items={form.included} onChange={(v) => setField('included', v)} disabled={pending} addLabel={t('cmsAddItem')} />
          <LocalizedListField id="service-not-included" label={t('cmsFieldNotIncluded')} items={form.notIncluded} onChange={(v) => setField('notIncluded', v)} disabled={pending} addLabel={t('cmsAddItem')} />
          <LocalizedTextField id="service-timeline" label={t('cmsFieldTimeline')} value={form.timeline ?? { en: '', fa: '' }} onChange={(v) => setField('timeline', v)} disabled={pending} />
          <LocalizedListField id="service-requirements" label={t('cmsFieldRequirements')} items={form.requirements} onChange={(v) => setField('requirements', v)} disabled={pending} addLabel={t('cmsAddItem')} />
          <StringListField id="service-related-projects" label={t('cmsFieldRelatedProjects')} items={form.relatedProjectSlugs} onChange={(v) => setField('relatedProjectSlugs', v)} disabled={pending} addLabel={t('cmsAddItem')} placeholder="project-slug" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm font-medium text-foreground">{t('cmsSectionPricingSignals')}</p>
          <LocalizedListField id="service-what-drives-cost" label={t('cmsFieldWhatDrivesCost')} items={form.whatDrivesCost} onChange={(v) => setField('whatDrivesCost', v)} disabled={pending} addLabel={t('cmsAddItem')} />
          <LocalizedTextareaField id="service-payment-note" label={t('cmsFieldPaymentScheduleNote')} value={form.paymentScheduleNote ?? { en: '', fa: '' }} onChange={(v) => setField('paymentScheduleNote', v)} disabled={pending} rows={2} />
        </CardContent>
      </Card>

      {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t('cmsSaving') : mode === 'create' ? t('cmsCreateService') : t('cmsSaveChanges')}
        </Button>
      </div>
    </form>
  )
}
