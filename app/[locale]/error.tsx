'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { ArtaveoMark } from '@/components/site/artaveo-mark'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/states'

/**
 * § 5.2: "error … per locale, designed (not default)". Next.js requires
 * `error.tsx` to be a Client Component.
 *
 * Deliberately does NOT render `SiteShell` (header/nav/footer): if the
 * error originated inside the shared shell itself, reusing it here would
 * risk throwing again in the same render. This stays a minimal, standalone
 * screen — brand mark, the message, a retry action, and a plain link home —
 * which is what error boundaries are for.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('ErrorPage')

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 text-center">
      <ArtaveoMark className="size-8 text-foreground" />
      <ErrorState
        title={t('title')}
        description={t('description')}
        size="page"
        action={{ label: t('retry'), onClick: reset }}
      />
      <Button variant="outline" size="sm" render={<Link href="/" />}>
        {t('backHome')}
      </Button>
    </div>
  )
}
