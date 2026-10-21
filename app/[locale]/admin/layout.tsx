import { NextIntlClientProvider } from 'next-intl'

/**
 * Every admin page is rendered per request (Phase 23). Most already were — they
 * read the session cookie — but the sign-in and verification pages might not
 * have been, and the admin's Content Security Policy depends on it: its nonce is
 * generated per request (`proxy.ts`), so a page that was prerendered at build
 * time would carry no nonce and its scripts would be blocked. Stated once here so
 * a page cannot become static by accident.
 */
export const dynamic = 'force-dynamic'

/**
 * Phase 34: the public pages send only the shell's messages to the browser
 * (lib/i18n/client-messages.ts); the admin's Client Components read every
 * namespace, so this provider — without a `messages` prop — sends them all.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <NextIntlClientProvider>{children}</NextIntlClientProvider>
}
