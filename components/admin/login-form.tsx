'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'

import { adminSignIn } from '@/app/actions/admin-auth'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'

/**
 * `next` arrives from `proxy.ts`'s redirect (`request.nextUrl.pathname`,
 * which includes the locale — e.g. `/en/admin/leads`), but `router` here
 * is the locale-aware one from `@/i18n/navigation`: it prepends the
 * active locale to whatever href it's given, the same as a plain
 * `<Link href="/admin/security">` elsewhere in this codebase. Passing it
 * an already-locale-prefixed path double-prefixes the result
 * (`/en/en/admin/security`, a real 404) — this strips the locale back
 * off before handing anything to `router.push`.
 */
function resolveNextPath(next: string | null, locale: string): string {
  if (next && next.startsWith(`/${locale}/admin`)) {
    return next.slice(`/${locale}`.length)
  }
  return '/admin'
}

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<'invalid-credentials' | 'not-configured' | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const result = await adminSignIn(new FormData(event.currentTarget))

    if (!result.ok) {
      setError(result.code)
      setPending(false)
      return
    }

    if (result.next === 'dashboard') {
      router.push(resolveNextPath(searchParams.get('next'), locale))
    } else {
      // Same locale-aware `router` — no `/${locale}` prefix needed here either.
      router.push(`/admin/${result.next}`)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <Field>
            <FieldLabel htmlFor="admin-email">{t('emailLabel')}</FieldLabel>
            <Input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={pending}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="admin-password">{t('passwordLabel')}</FieldLabel>
            <Input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={pending}
            />
          </Field>

          {error ? (
            <FormMessage variant="destructive">
              {error === 'not-configured' ? t('errorNotConfigured') : t('errorInvalidCredentials')}
            </FormMessage>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full justify-center">
            {pending ? t('signingIn') : t('signInButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
