'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { verifyMfaChallenge } from '@/app/actions/admin-auth'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'

export function MfaChallengeForm({ locale }: { locale: string }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<'invalid-code' | 'no-factor' | 'not-configured' | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = await verifyMfaChallenge(new FormData(event.currentTarget))

    if (!result.ok) {
      setError(result.code)
      setPending(false)
      return
    }

    // `router` is the locale-aware one (`@/i18n/navigation`) — it prepends
    // the active locale itself, so no `/${locale}` prefix here (that was
    // producing `/en/en/admin`, a real 404 users were hitting).
    router.push('/admin')
  }

  const errorCopy = {
    'invalid-code': t('errorInvalidCode'),
    'no-factor': t('errorNoFactor'),
    'not-configured': t('errorNotConfigured'),
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <Field>
            <FieldLabel htmlFor="admin-mfa-code">{t('codeLabel')}</FieldLabel>
            <Input
              id="admin-mfa-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              disabled={pending}
              className="tracking-[0.3em] text-center font-mono"
            />
          </Field>

          {error ? <FormMessage variant="destructive">{errorCopy[error]}</FormMessage> : null}

          <Button type="submit" disabled={pending} className="w-full justify-center">
            {pending ? t('verifying') : t('verifyButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
