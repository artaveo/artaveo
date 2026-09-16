'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { enrollMfaStart, enrollMfaVerify, unenrollMfaFactor } from '@/app/actions/admin-auth'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'

type EnrollState =
  | { phase: 'enrolled' }
  | { phase: 'not-enrolled' }
  | { phase: 'enrolling'; factorId: string; qrCodeSvg: string; secret: string }

export function MfaEnrollmentPanel({
  locale,
  hasVerifiedFactor,
  existingFactorId,
}: {
  locale: string
  hasVerifiedFactor: boolean
  existingFactorId?: string
}) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [state, setState] = useState<EnrollState>(
    hasVerifiedFactor ? { phase: 'enrolled' } : { phase: 'not-enrolled' },
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setPending(true)
    setError(null)
    const result = await enrollMfaStart()
    setPending(false)
    if (!result.ok) {
      setError(result.code === 'not-configured' ? t('errorNotConfigured') : t('errorForbidden'))
      return
    }
    setState({ phase: 'enrolling', factorId: result.factorId, qrCodeSvg: result.qrCodeSvg, secret: result.secret })
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state.phase !== 'enrolling') return
    setPending(true)
    setError(null)
    const result = await enrollMfaVerify(new FormData(event.currentTarget))
    setPending(false)
    if (!result.ok) {
      setError(result.code === 'not-configured' ? t('errorNotConfigured') : t('errorInvalidCode'))
      return
    }
    // Locale-aware `router` — no `/${locale}` prefix (see login-form.tsx's
    // `resolveNextPath` comment for why the doubled prefix was a real 404).
    router.push('/admin')
    router.refresh()
  }

  async function handleCancel() {
    if (state.phase !== 'enrolling') return
    setPending(true)
    await unenrollMfaFactor(state.factorId)
    setPending(false)
    setError(null)
    setState({ phase: 'not-enrolled' })
  }

  async function handleStartOver() {
    if (!existingFactorId) return
    setPending(true)
    await unenrollMfaFactor(existingFactorId)
    setPending(false)
    setState({ phase: 'not-enrolled' })
  }

  if (state.phase === 'enrolled') {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <FormMessage variant="success">{t('mfaEnrolledNotice')}</FormMessage>
          <Button type="button" variant="outline" onClick={handleStartOver} disabled={pending}>
            {t('startEnrollButton')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (state.phase === 'not-enrolled') {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
          <Button type="button" onClick={handleStart} disabled={pending}>
            {t('startEnrollButton')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        <p className="text-sm text-muted-foreground">{t('scanInstruction')}</p>
        {/* Trusted markup — this SVG string comes from our own enrollMfaStart
            Server Action, which returns Supabase's own generated QR code, not
            anything user-supplied. */}
        <div
          className="mx-auto h-48 w-48 [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: state.qrCodeSvg }}
        />
        <Field>
          <FieldLabel>{t('secretLabel')}</FieldLabel>
          <Input readOnly value={state.secret} className="font-mono text-xs" dir="ltr" />
        </Field>
        <form onSubmit={handleConfirm} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="factorId" value={state.factorId} />
          <Field>
            <FieldLabel htmlFor="admin-enroll-code">{t('confirmCodeLabel')}</FieldLabel>
            <Input
              id="admin-enroll-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              disabled={pending}
              dir="ltr"
              className="text-center font-mono tracking-[0.3em]"
            />
          </Field>
          {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
          <div className="flex gap-3">
            <Button type="submit" disabled={pending} className="flex-1 justify-center">
              {pending ? t('confirming') : t('confirmButton')}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={pending}>
              {t('cancelButton')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
