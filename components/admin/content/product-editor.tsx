'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

import {
  createProductService,
  createSaleOption,
  deleteProductService,
  deleteSaleOption,
  publishProductService,
  publishSaleOption,
  reorderProductServices,
  reorderSaleOptions,
  setProjectIsProduct,
  unpublishProductService,
  unpublishSaleOption,
  updateProductService,
  updateSaleOption,
} from '@/app/actions/products'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { ChildRowControls, moved } from '@/components/admin/content/child-row-controls'
import { LocalizedListField, LocalizedTextareaField, LocalizedTextField, emptyLocalized } from '@/components/admin/content/localized-fields'
import { PRODUCT_EXAMPLES as EX } from '@/components/admin/content/field-examples'
import { SALE_OPTION_KINDS, type BillingPeriod, type LocalizedText, type Money, type SaleOptionKind } from '@/types/content'
import type { AdminProductService, AdminSaleOption, ProductServiceInput, SaleOptionInput } from '@/types/cms'

/**
 * Phase 27.3 — the project editor's Product tab: the one switch that makes a
 * project a product, its ways to get it (sale options) and its after-sales
 * services, each with its own price. Prices per D-21: Afghani for the Dari site,
 * dollars for the English site; leaving both empty shows "price after a short
 * conversation" — nothing is ever invented (D-04).
 */

const PERIODS: BillingPeriod[] = ['once', 'month', 'year']
const MAINTENANCE = ['included', 'optional', 'not-offered'] as const
const CTAS = ['purchase-request', 'demo-request', 'contact'] as const

/** The billing period a kind implies, used when the owner picks a kind. */
function periodFor(kind: SaleOptionKind): BillingPeriod {
  return kind === 'licence-monthly' ? 'month' : kind === 'licence-yearly' ? 'year' : 'once'
}

type ActionResult = { ok: boolean; code?: string }

function useRunner() {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(action: () => Promise<ActionResult>, onDone?: () => void) {
    setPending(true)
    setError(null)
    const result = await action()
    setPending(false)
    if (!result.ok) {
      setError(result.code === 'not-complete' ? t('cmsErrorNotComplete') : result.code === 'invalid' ? t('cmsErrorInvalid') : t('errorForbidden'))
      return
    }
    onDone?.()
    router.refresh()
  }
  return { pending, error, run }
}

function amountValue(value: number | undefined | null): string {
  return value === undefined || value === null ? '' : String(value)
}

function parseAmount(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function MoneyFields({ idPrefix, value, onChange, disabled, allowFrom = true }: { idPrefix: string; value: Money; onChange: (next: Money) => void; disabled?: boolean; allowFrom?: boolean }) {
  const t = useTranslations('Admin')
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-afn`}>{t('cmsFieldPriceAfn')}</FieldLabel>
          <Input id={`${idPrefix}-afn`} dir="ltr" type="number" min={0} step="any" inputMode="decimal" value={amountValue(value.afn)} disabled={disabled} onChange={(event) => onChange({ ...value, afn: parseAmount(event.target.value) })} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-usd`}>{t('cmsFieldPriceUsd')}</FieldLabel>
          <Input id={`${idPrefix}-usd`} dir="ltr" type="number" min={0} step="any" inputMode="decimal" value={amountValue(value.usd)} disabled={disabled} onChange={(event) => onChange({ ...value, usd: parseAmount(event.target.value) })} />
        </Field>
      </div>
      {allowFrom ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(value.from)} disabled={disabled} onChange={(event) => onChange({ ...value, from: event.target.checked })} />
          {t('cmsFieldPriceFrom')}
        </label>
      ) : null}
      <FieldDescription>{t('cmsPriceHint')}</FieldDescription>
    </div>
  )
}

function PeriodSelect({ id, label, value, onChange, disabled, options = PERIODS }: { id: string; label: string; value: BillingPeriod; onChange: (next: BillingPeriod) => void; disabled?: boolean; options?: BillingPeriod[] }) {
  const tPeriod = useTranslations('BillingPeriods')
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as BillingPeriod)}>
        {options.map((period) => (
          <option key={period} value={period}>
            {tPeriod(period)}
          </option>
        ))}
      </NativeSelect>
    </Field>
  )
}

// ---------------------------------------------------------------------------
// sale options

function toOptionInput(option: AdminSaleOption): SaleOptionInput {
  return {
    kind: option.kind,
    title: option.title,
    summary: option.summary ?? null,
    price: option.price,
    billingPeriod: option.billingPeriod,
    maintenance: option.maintenance,
    maintenancePrice: option.maintenancePrice ?? {},
    maintenancePeriod: option.maintenancePeriod ?? null,
    included: option.included,
    highlighted: option.highlighted,
    cta: option.cta,
  }
}

function SaleOptionCard({ projectId, option, index, ids }: { projectId: string; option: AdminSaleOption; index: number; ids: string[] }) {
  const t = useTranslations('Admin')
  const tKind = useTranslations('SaleOptionKinds')
  const tMaint = useTranslations('MaintenanceModes')
  const tCta = useTranslations('SaleOptionCtas')
  const [form, setForm] = useState<SaleOptionInput>(() => toOptionInput(option))
  const { pending, error, run } = useRunner()
  const id = `option-${option.id}`
  const set = (patch: Partial<SaleOptionInput>) => setForm((current) => ({ ...current, ...patch }))

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <ChildRowControls
          label={`${index + 1}. ${tKind(option.kind)}${option.highlighted ? ` · ${t('cmsFieldHighlighted')}` : ''}`}
          published={option.published}
          completeness={option.completeness}
          pending={pending}
          isFirst={index === 0}
          isLast={index === ids.length - 1}
          onMove={(direction) => run(() => reorderSaleOptions(projectId, moved(ids, index, direction)))}
          onTogglePublished={() => run(() => (option.published ? unpublishSaleOption(option.id, projectId) : publishSaleOption(option.id, projectId)))}
          onDelete={() => {
            if (window.confirm(t('cmsConfirmDelete'))) void run(() => deleteSaleOption(option.id, projectId))
          }}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-kind`}>{t('cmsFieldSaleOptionKind')}</FieldLabel>
            <NativeSelect id={`${id}-kind`} value={form.kind} disabled={pending} onChange={(event) => set({ kind: event.target.value as SaleOptionKind, billingPeriod: periodFor(event.target.value as SaleOptionKind) })}>
              {SALE_OPTION_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {tKind(kind)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <PeriodSelect id={`${id}-period`} label={t('cmsFieldBillingPeriod')} value={form.billingPeriod} disabled={pending} onChange={(billingPeriod) => set({ billingPeriod })} />
        </div>
        <LocalizedTextField id={`${id}-title`} label={t('cmsFieldTitle')} value={form.title} disabled={pending} required onChange={(title) => set({ title })} example={EX.optionTitle} hint={t('cmsHintOptionTitle')} />
        <LocalizedTextareaField id={`${id}-summary`} label={t('cmsFieldSaleOptionSummary')} value={form.summary ?? emptyLocalized()} rows={2} disabled={pending} onChange={(summary) => set({ summary: summary.en || summary.fa ? summary : null })} example={EX.optionSummary} />
        <MoneyFields idPrefix={`${id}-price`} value={form.price} disabled={pending} onChange={(price) => set({ price })} />
        <LocalizedListField id={`${id}-included`} label={t('cmsFieldIncluded')} items={form.included} disabled={pending} onChange={(included) => set({ included })} addLabel={t('cmsAddItem')} example={EX.included} hint={t('cmsHintIncluded')} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-maintenance`}>{t('cmsFieldMaintenance')}</FieldLabel>
            <NativeSelect id={`${id}-maintenance`} value={form.maintenance} disabled={pending} onChange={(event) => set({ maintenance: event.target.value as SaleOptionInput['maintenance'] })}>
              {MAINTENANCE.map((mode) => (
                <option key={mode} value={mode}>
                  {tMaint(mode)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-cta`}>{t('cmsFieldCta')}</FieldLabel>
            <NativeSelect id={`${id}-cta`} value={form.cta} disabled={pending} onChange={(event) => set({ cta: event.target.value as SaleOptionInput['cta'] })}>
              {CTAS.map((cta) => (
                <option key={cta} value={cta}>
                  {tCta(cta)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        {form.maintenance === 'optional' ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">{t('cmsFieldMaintenancePrice')}</p>
            <MoneyFields idPrefix={`${id}-maintenance-price`} value={form.maintenancePrice ?? {}} allowFrom={false} disabled={pending} onChange={(maintenancePrice) => set({ maintenancePrice })} />
            <PeriodSelect
              id={`${id}-maintenance-period`}
              label={t('cmsFieldMaintenancePeriod')}
              value={form.maintenancePeriod ?? 'year'}
              options={['month', 'year']}
              disabled={pending}
              onChange={(period) => set({ maintenancePeriod: period === 'once' ? null : period })}
            />
          </div>
        ) : null}

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={form.highlighted} disabled={pending} onChange={(event) => set({ highlighted: event.target.checked })} />
          <span>
            <span className="font-medium">{t('cmsFieldHighlighted')}</span>
            <span className="block text-xs text-muted-foreground">{t('cmsFieldHighlightedHint')}</span>
          </span>
        </label>

        {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
        <Button
          type="button"
          size="sm"
          disabled={pending}
          className="self-start"
          onClick={() => run(() => updateSaleOption(option.id, projectId, form.maintenance === 'optional' ? { ...form, maintenancePeriod: form.maintenancePeriod ?? 'year' } : form))}
        >
          {pending ? t('cmsSaving') : t('cmsSaveChanges')}
        </Button>
      </CardContent>
    </Card>
  )
}

function NewSaleOption({ projectId }: { projectId: string }) {
  const t = useTranslations('Admin')
  const tKind = useTranslations('SaleOptionKinds')
  const [kind, setKind] = useState<SaleOptionKind>('licence-yearly')
  const [title, setTitle] = useState<LocalizedText>(emptyLocalized())
  const { pending, error, run } = useRunner()

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <p className="text-sm font-medium text-foreground">{t('cmsAddSaleOption')}</p>
        <Field>
          <FieldLabel htmlFor="new-option-kind">{t('cmsFieldSaleOptionKind')}</FieldLabel>
          <NativeSelect id="new-option-kind" value={kind} disabled={pending} onChange={(event) => setKind(event.target.value as SaleOptionKind)}>
            {SALE_OPTION_KINDS.map((k) => (
              <option key={k} value={k}>
                {tKind(k)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <LocalizedTextField id="new-option-title" label={t('cmsFieldTitle')} value={title} disabled={pending} required onChange={setTitle} example={EX.optionTitle} />
        {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
        <Button
          type="button"
          size="sm"
          disabled={pending || !(title.en.trim() || title.fa.trim())}
          className="self-start"
          onClick={() =>
            run(
              () =>
                createSaleOption(projectId, {
                  kind,
                  title,
                  summary: null,
                  price: {},
                  billingPeriod: periodFor(kind),
                  maintenance: 'not-offered',
                  maintenancePrice: null,
                  maintenancePeriod: null,
                  included: [],
                  highlighted: false,
                  cta: 'purchase-request',
                }),
              () => setTitle(emptyLocalized()),
            )
          }
        >
          <Plus aria-hidden="true" data-icon="inline-start" />
          {t('cmsAddSaleOption')}
        </Button>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// after-sales services

function ProductServiceCard({ projectId, service, index, ids }: { projectId: string; service: AdminProductService; index: number; ids: string[] }) {
  const t = useTranslations('Admin')
  const [form, setForm] = useState<ProductServiceInput>({ title: service.title, description: service.description ?? null, price: service.price, period: service.period })
  const { pending, error, run } = useRunner()
  const id = `product-service-${service.id}`

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <ChildRowControls
          label={`${index + 1}. ${service.title.en || service.title.fa}`}
          published={service.published}
          completeness={service.completeness}
          pending={pending}
          isFirst={index === 0}
          isLast={index === ids.length - 1}
          onMove={(direction) => run(() => reorderProductServices(projectId, moved(ids, index, direction)))}
          onTogglePublished={() => run(() => (service.published ? unpublishProductService(service.id, projectId) : publishProductService(service.id, projectId)))}
          onDelete={() => {
            if (window.confirm(t('cmsConfirmDelete'))) void run(() => deleteProductService(service.id, projectId))
          }}
        />
        <LocalizedTextField id={`${id}-title`} label={t('cmsFieldTitle')} value={form.title} disabled={pending} required onChange={(title) => setForm({ ...form, title })} example={EX.serviceTitle} />
        <LocalizedTextareaField id={`${id}-description`} label={t('cmsFieldDescription')} value={form.description ?? emptyLocalized()} rows={2} disabled={pending} onChange={(description) => setForm({ ...form, description: description.en || description.fa ? description : null })} example={EX.serviceDescription} />
        <MoneyFields idPrefix={`${id}-price`} value={form.price} disabled={pending} onChange={(price) => setForm({ ...form, price })} />
        <PeriodSelect id={`${id}-period`} label={t('cmsFieldBillingPeriod')} value={form.period} disabled={pending} onChange={(period) => setForm({ ...form, period })} />
        {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
        <Button type="button" size="sm" disabled={pending} className="self-start" onClick={() => run(() => updateProductService(service.id, projectId, form))}>
          {pending ? t('cmsSaving') : t('cmsSaveChanges')}
        </Button>
      </CardContent>
    </Card>
  )
}

function NewProductService({ projectId }: { projectId: string }) {
  const t = useTranslations('Admin')
  const [title, setTitle] = useState<LocalizedText>(emptyLocalized())
  const { pending, error, run } = useRunner()
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <p className="text-sm font-medium text-foreground">{t('cmsAddProductService')}</p>
        <FieldDescription>{t('cmsProductServiceHint')}</FieldDescription>
        <LocalizedTextField id="new-product-service-title" label={t('cmsFieldTitle')} value={title} disabled={pending} required onChange={setTitle} example={EX.serviceTitle} />
        {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
        <Button
          type="button"
          size="sm"
          disabled={pending || !(title.en.trim() || title.fa.trim())}
          className="self-start"
          onClick={() => run(() => createProductService(projectId, { title, description: null, price: {}, period: 'once' }), () => setTitle(emptyLocalized()))}
        >
          <Plus aria-hidden="true" data-icon="inline-start" />
          {t('cmsAddProductService')}
        </Button>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------

export function ProductEditor({
  projectId,
  isProduct,
  saleOptions,
  productServices,
}: {
  projectId: string
  isProduct: boolean
  saleOptions: AdminSaleOption[]
  productServices: AdminProductService[]
}) {
  const t = useTranslations('Admin')
  const { pending, error, run } = useRunner()
  const optionIds = saleOptions.map((option) => option.id)
  const serviceIds = productServices.map((service) => service.id)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div>
            <p className="text-sm font-medium text-foreground">{isProduct ? t('cmsProductOn') : t('cmsProductOff')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('cmsProductSwitchHint')}</p>
          </div>
          <Button type="button" size="sm" variant={isProduct ? 'outline' : 'default'} disabled={pending} onClick={() => run(() => setProjectIsProduct(projectId, !isProduct))}>
            {isProduct ? t('cmsProductTurnOff') : t('cmsProductTurnOn')}
          </Button>
          {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
        </CardContent>
      </Card>

      {isProduct ? (
        <>
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">{t('cmsSaleOptionsTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t('cmsSaleOptionsHint')}</p>
            {saleOptions.map((option, index) => (
              <SaleOptionCard key={`${option.id}-${option.sortOrder}`} projectId={projectId} option={option} index={index} ids={optionIds} />
            ))}
            <NewSaleOption projectId={projectId} />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-foreground">{t('cmsProductServicesTitle')}</h3>
            {productServices.map((service, index) => (
              <ProductServiceCard key={`${service.id}-${service.sortOrder}`} projectId={projectId} service={service} index={index} ids={serviceIds} />
            ))}
            <NewProductService projectId={projectId} />
          </section>
        </>
      ) : null}
    </div>
  )
}
