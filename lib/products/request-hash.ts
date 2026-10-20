/**
 * Phase 30.3 — the links from a product page's "ways to get it" cards and its
 * hero to the request form at the end of the page. A fragment, not a query
 * string, so the page stays static and nothing reloads:
 *
 *   #request-demo                 → "see a demo first"
 *   #request-purchase             → "buy it", no way chosen yet
 *   #request-purchase-<option id> → "buy it" with that published way to get it
 *
 * An option the page does not show is ignored (the visitor still lands on
 * "buy it"), so a stale or edited link never picks something unpublished.
 */
export const REQUEST_ANCHOR = 'request'

export type RequestChoice = { kind: 'product-demo' } | { kind: 'product-purchase'; optionId?: string }

export function requestHash(choice: RequestChoice): string {
  if (choice.kind === 'product-demo') return `#${REQUEST_ANCHOR}-demo`
  return choice.optionId ? `#${REQUEST_ANCHOR}-purchase-${choice.optionId}` : `#${REQUEST_ANCHOR}-purchase`
}

export function parseRequestHash(hash: string, optionIds: string[]): RequestChoice | null {
  const value = decodeURIComponent(String(hash ?? '')).replace(/^#/, '')
  if (value === `${REQUEST_ANCHOR}-demo`) return { kind: 'product-demo' }
  if (value === `${REQUEST_ANCHOR}-purchase`) return { kind: 'product-purchase' }
  const prefix = `${REQUEST_ANCHOR}-purchase-`
  if (value.startsWith(prefix)) {
    const optionId = value.slice(prefix.length)
    return optionIds.includes(optionId) ? { kind: 'product-purchase', optionId } : { kind: 'product-purchase' }
  }
  return null
}
