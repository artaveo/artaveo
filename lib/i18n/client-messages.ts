/**
 * Phase 34 — which message namespaces reach the browser.
 *
 * Server Components translate on the server and send no dictionary. Only Client
 * Components need messages in the browser, and before Phase 34 the root layout
 * sent all of them to every page: ~113 KB of Dari, ~71 KB of it the admin's.
 * Now the root layout sends only what the shell's Client Components read
 * (header, menus, search, footer, theme and language switches, the offline
 * notice, the error page, the portfolio rows and filter), and a page that holds
 * a form wraps that form in `<ClientMessages scope="…">` to add its own
 * namespace. The admin gets every namespace (`app/[locale]/admin/layout.tsx`).
 *
 * `tests/unit/client-messages.test.mjs` walks the import graph from every page
 * and fails if a Client Component reads a namespace its page does not send.
 */

/** Read by Client Components that can appear on any public page. */
export const SHELL_CLIENT_NAMESPACES = [
  'Availability',
  'Brand',
  'CommandPalette',
  'Common',
  'ErrorPage',
  'Nav',
  'Platforms',
  'Pwa',
  'Work',
] as const

/** Namespaces only one kind of page needs, added under `<ClientMessages scope>`. */
export const CLIENT_MESSAGE_SCOPES = {
  briefBuilder: ['BriefBuilder'],
  consultation: ['ConsultationPage'],
  consultationManage: ['ConsultationPage', 'ConsultationManage'],
  productRequest: ['ProductPage'],
  recommendation: ['RecommendPage'],
} as const

export type ClientMessageScope = keyof typeof CLIENT_MESSAGE_SCOPES

type Messages = Record<string, unknown>

/** The given namespaces of a dictionary, in a new object; unknown names are skipped. */
export function pickMessages(messages: Messages, namespaces: readonly string[]): Messages {
  const picked: Messages = {}
  for (const namespace of namespaces) {
    if (namespace in messages) picked[namespace] = messages[namespace]
  }
  return picked
}

/** The shell's namespaces plus a scope's — a nested provider replaces, never merges, its parent's messages. */
export function scopeNamespaces(scope: ClientMessageScope): string[] {
  return [...SHELL_CLIENT_NAMESPACES, ...CLIENT_MESSAGE_SCOPES[scope]]
}
