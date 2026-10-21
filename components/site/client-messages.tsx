import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

import { pickMessages, scopeNamespaces, type ClientMessageScope } from '@/lib/i18n/client-messages'

/**
 * Phase 34 — sends one form's dictionary to the browser, only on the page that
 * shows the form (`lib/i18n/client-messages.ts`). It repeats the shell's
 * namespaces because a nested provider replaces its parent's messages.
 */
export async function ClientMessages({ scope, children }: { scope: ClientMessageScope; children: React.ReactNode }) {
  const messages = await getMessages()
  return <NextIntlClientProvider messages={pickMessages(messages, scopeNamespaces(scope))}>{children}</NextIntlClientProvider>
}
