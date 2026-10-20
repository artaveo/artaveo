'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { submitProductRequest } from '@/app/actions/inquiries'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox, Field, FieldDescription, FieldError, FieldItem, FieldLabel, FormMessage, Radio, RadioGroup } from '@/components/ui/form-controls'
import { Input, Label, Textarea } from '@/components/ui/input'
import { SuccessState } from '@/components/ui/states'
import { Link } from '@/i18n/navigation'
import { trackEvent } from '@/lib/analytics'
import { parseRequestHash } from '@/lib/products/request-hash'
import type { Locale } from '@/types/content'
import type { ProductRequestDraft } from '@/types/inquiry'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_MESSAGE = 4000

export type RequestOption = { id: string; title: string; price: string }

type Status = 'idle' | 'submitting' | 'success' | 'error'
type Kind = ProductRequestDraft['kind']

/**
 * Phase 30.3 — the request form at the end of a product page: *see a demo
 * first* or *buy it*, with the way to get it and any after-sales services the
 * visitor wants. It sends `submitProductRequest` (Phase 27.5), which
 * re-validates everything, checks that the product, the option and the
 * services exist and are published, stores the request with a snapshot of
 * their titles and prices, and queues the e-mails. The success screen appears
 * only after the server has confirmed the request is stored (§ 2 principle 15);
 * a honeypot, a minimum fill time and an idempotency key guard it like the
 * Brief Builder.
 *
 * The "ways to get it" cards link here with `#request-purchase-<option>` or
 * `#request-demo` (`lib/products/request-hash.ts`): the form picks that choice
 * and scrolls into view.
 */
export function ProductRequestForm({
  locale,
  productSlug,
  productTitle,
  options,
  services,
}: {
  locale: Locale
  productSlug: string
  productTitle: string
  options: RequestOption[]
  services: RequestOption[]
}) {
  const t = useTranslations('ProductPage')
  const rootRef = useRef<HTMLDivElement>(null)

  const [kind, setKind] = useState<Kind>(options.length > 0 ? 'product-purchase' : 'product-demo')
  const [optionId, setOptionId] = useState<string>('')
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('whatsapp')
  const [consent, setConsent] = useState(false)

  const [honeypot, setHoneypot] = useState('')
  const formRenderedAt = useRef(Date.now())
  const [idempotencyKey] = useState(() => globalThis.crypto.randomUUID())
  const [status, setStatus] = useState<Status>('idle')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  // A "ways to get it" card or the hero's demo action chose for the visitor.
  useEffect(() => {
    function apply() {
      const choice = parseRequestHash(window.location.hash, options.map((option) => option.id))
      if (!choice) return
      setKind(choice.kind)
      if (choice.kind === 'product-purchase') setOptionId(choice.optionId ?? '')
      rootRef.current?.scrollIntoView({ block: 'start' })
      rootRef.current?.querySelector<HTMLElement>('[data-first-field]')?.focus({ preventScroll: true })
    }
    apply()
    window.addEventListener('hashchange', apply)
    return () => window.removeEventListener('hashchange', apply)
  }, [options])

  const purchase = kind === 'product-purchase'
  const errors = {
    name: name.trim() ? null : t('errorRequired'),
    email: !email.trim() ? t('errorRequired') : EMAIL_PATTERN.test(email.trim()) ? null : t('errorEmail'),
    phone: channel === 'whatsapp' && !phone.trim() ? t('errorPhone') : null,
    consent: consent ? null : t('errorConsent'),
  }
  const hasErrors = Object.values(errors).some(Boolean)
  const field = showErrors ? errors : { name: null, email: null, phone: null, consent: null }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (hasErrors) {
      setShowErrors(true)
      return
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setErrorCode('offline')
      setStatus('error')
      return
    }
    setStatus('submitting')
    setErrorCode(null)
    const draft: ProductRequestDraft = {
      kind,
      productSlug,
      ...(purchase && optionId ? { saleOptionId: optionId } : {}),
      productServiceIds: purchase ? serviceIds : [],
      message: message.trim(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      preferredLocale: locale,
      preferredChannel: channel,
      consent,
    }
    try {
      const result = await submitProductRequest(draft, {
        idempotencyKey,
        honeypot,
        formRenderedAt: formRenderedAt.current,
        sourceReferrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
        sourceChannel: 'product-page',
      })
      if (!result.ok) {
        setErrorCode(result.code)
        setStatus('error')
        return
      }
      // Only after the server confirmed the request is stored — never on optimism.
      trackEvent('product_request', { kind: purchase ? 'purchase' : 'demo', product: productSlug, locale })
      setStatus('success')
    } catch {
      setErrorCode('network')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div ref={rootRef} className="scroll-mt-24">
        <Card>
          <CardContent className="pt-6" role="status">
            <SuccessState title={t(purchase ? 'successPurchaseTitle' : 'successDemoTitle')} description={t('successLine', { product: productTitle })} />
          </CardContent>
        </Card>
      </div>
    )
  }

  const submitting = status === 'submitting'
  const submitError = (() => {
    switch (errorCode) {
      case null:
        return null
      case 'rejected':
        return t('errorRejected')
      case 'network':
        return t('errorNetwork')
      case 'offline':
        return t('errorOffline')
      default:
        return t('errorGeneric')
    }
  })()

  return (
    <div ref={rootRef} className="scroll-mt-24">
      <Card>
        <CardContent className="pt-6">
          <form method="post" className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate data-slot="product-request-form">
            {/* Honeypot — the same off-screen pattern as the Brief Builder. A real visitor never sees or fills this. */}
            <div aria-hidden="true" style={{ position: 'absolute', insetInlineStart: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
              <Label htmlFor="product-website">Leave this field blank</Label>
              <input id="product-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
            </div>

            <Field>
              <p id="product-kind-label" className="text-base font-semibold">
                {t('kindLegend')}
              </p>
              <RadioGroup aria-labelledby="product-kind-label" value={kind} onValueChange={(value) => setKind(value as Kind)} className="gap-3 sm:flex-row sm:gap-6" disabled={submitting}>
                <FieldItem className="flex items-center gap-2.5">
                  <Radio value="product-demo" />
                  <FieldLabel className="font-normal">{t('kindDemo')}</FieldLabel>
                </FieldItem>
                <FieldItem className="flex items-center gap-2.5">
                  <Radio value="product-purchase" />
                  <FieldLabel className="font-normal">{t('kindPurchase')}</FieldLabel>
                </FieldItem>
              </RadioGroup>
            </Field>

            {purchase && options.length > 0 ? (
              <Field>
                <p id="product-option-label" className="text-sm font-semibold">
                  {t('optionLegend')}
                </p>
                <RadioGroup aria-labelledby="product-option-label" value={optionId || 'undecided'} onValueChange={(value) => setOptionId(value === 'undecided' ? '' : String(value))} className="gap-2.5" disabled={submitting}>
                  {options.map((option) => (
                    <FieldItem key={option.id} className="flex items-start gap-2.5">
                      <Radio value={option.id} className="mt-1" />
                      <FieldLabel className="flex flex-wrap gap-x-2 font-normal">
                        <span className="font-medium">{option.title}</span>
                        <span className="text-muted-foreground">{option.price}</span>
                      </FieldLabel>
                    </FieldItem>
                  ))}
                  <FieldItem className="flex items-start gap-2.5">
                    <Radio value="undecided" className="mt-1" />
                    <FieldLabel className="font-normal">{t('optionUndecided')}</FieldLabel>
                  </FieldItem>
                </RadioGroup>
              </Field>
            ) : null}

            {purchase && services.length > 0 ? (
              <fieldset className="flex flex-col gap-2.5" disabled={submitting}>
                <legend className="mb-2 text-sm font-semibold">{t('servicesLegend')}</legend>
                {services.map((service) => {
                  const id = `product-service-${service.id}`
                  const checked = serviceIds.includes(service.id)
                  return (
                    <Field key={service.id}>
                      <div className="flex items-start gap-2.5">
                        <Checkbox
                          id={id}
                          className="mt-0.5"
                          checked={checked}
                          onCheckedChange={(value) => setServiceIds((ids) => (value === true ? [...ids, service.id] : ids.filter((other) => other !== service.id)))}
                        />
                        <FieldLabel htmlFor={id} className="flex flex-wrap gap-x-2 font-normal">
                          <span className="font-medium">{service.title}</span>
                          <span className="text-muted-foreground">{service.price}</span>
                        </FieldLabel>
                      </div>
                    </Field>
                  )
                })}
              </fieldset>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field invalid={Boolean(field.name)}>
                <FieldLabel htmlFor="product-name">
                  {t('fieldName')} <span className="text-destructive-text">*</span>
                </FieldLabel>
                <Input id="product-name" data-first-field="" name="name" autoComplete="name" value={name} disabled={submitting} maxLength={200} onChange={(event) => setName(event.target.value)} />
                {field.name ? <FieldError>{field.name}</FieldError> : null}
              </Field>
              <Field invalid={Boolean(field.email)}>
                <FieldLabel htmlFor="product-email">
                  {t('fieldEmail')} <span className="text-destructive-text">*</span>
                </FieldLabel>
                <Input id="product-email" name="email" type="email" dir="ltr" autoComplete="email" value={email} disabled={submitting} maxLength={320} onChange={(event) => setEmail(event.target.value)} />
                {field.email ? <FieldError>{field.email}</FieldError> : null}
              </Field>
            </div>

            <Field>
              <p id="product-channel-label" className="text-sm font-semibold">
                {t('channelLegend')}
              </p>
              <RadioGroup aria-labelledby="product-channel-label" value={channel} onValueChange={(value) => setChannel(value as 'email' | 'whatsapp')} className="gap-3 sm:flex-row sm:gap-6" disabled={submitting}>
                <FieldItem className="flex items-center gap-2.5">
                  <Radio value="whatsapp" />
                  <FieldLabel className="font-normal">{t('channelWhatsapp')}</FieldLabel>
                </FieldItem>
                <FieldItem className="flex items-center gap-2.5">
                  <Radio value="email" />
                  <FieldLabel className="font-normal">{t('channelEmail')}</FieldLabel>
                </FieldItem>
              </RadioGroup>
            </Field>

            <Field invalid={Boolean(field.phone)}>
              <FieldLabel htmlFor="product-phone">
                {t('fieldPhone')}
                {channel === 'whatsapp' ? <span className="text-destructive-text"> *</span> : null}
              </FieldLabel>
              <Input id="product-phone" name="phone" type="tel" dir="ltr" autoComplete="tel" value={phone} disabled={submitting} maxLength={60} onChange={(event) => setPhone(event.target.value)} />
              {field.phone ? <FieldError>{field.phone}</FieldError> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="product-message">{t('fieldMessage')}</FieldLabel>
              <Textarea id="product-message" name="message" rows={3} value={message} disabled={submitting} maxLength={MAX_MESSAGE} onChange={(event) => setMessage(event.target.value)} />
              <FieldDescription>{t('fieldMessageHint')}</FieldDescription>
            </Field>

            <Field invalid={Boolean(field.consent)}>
              <div className="flex items-start gap-2">
                <Checkbox id="product-consent" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} disabled={submitting} />
                <FieldLabel htmlFor="product-consent" className="font-normal">
                  {t.rich('consentLabel', {
                    privacy: (chunks) => (
                      <Link href="/privacy" className="underline underline-offset-4">
                        {chunks}
                      </Link>
                    ),
                  })}
                </FieldLabel>
              </div>
              {field.consent ? <FieldError>{field.consent}</FieldError> : null}
            </Field>

            {status === 'error' && submitError ? <FormMessage variant="destructive">{submitError}</FormMessage> : null}

            <Button type="submit" size="lg" disabled={submitting} className="self-start">
              {submitting ? t('submitting') : t(purchase ? 'submitPurchase' : 'submitDemo')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
