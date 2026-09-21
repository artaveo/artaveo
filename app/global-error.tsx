'use client'

import { useEffect } from 'react'

import { reportClientError } from '@/components/site/error-reporter'

/**
 * Last resort (Phase 24): an error in the root layout itself — the one place
 * `app/[locale]/error.tsx` cannot catch, because that boundary sits below the layout.
 * With the layout gone there is no translation context and no stylesheet, so this
 * is deliberately plain, shows both languages, and uses inline styles only.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (!error.digest) reportClientError({ error, kind: 'boundary' })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 16,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#fcfcfd',
          color: '#333940',
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Something went wrong</p>
        <p dir="rtl" style={{ fontSize: 16, margin: 0 }}>
          مشکلی پیش آمد
        </p>
        <button
          type="button"
          onClick={reset}
          style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid rgba(51,57,64,.3)', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
        >
          Try again · تلاش دوباره
        </button>
        {error.digest ? (
          <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>
            Reference · کد پیگیری: <bdi dir="ltr">{error.digest}</bdi>
          </p>
        ) : null}
      </body>
    </html>
  )
}
