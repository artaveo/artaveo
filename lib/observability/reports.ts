import { redactPath, scrubText } from '@/lib/observability/redact'

/**
 * Parsing for the two things a BROWSER sends us about a failure it saw:
 *
 *  - a Content Security Policy violation report (the policy has never been seen
 *    against real production content — Phase 23 said so and left the endpoint for
 *    this phase), in either wire format, and
 *  - an uncaught error in the page's own JavaScript.
 *
 * Both endpoints are open to the internet, so everything in here assumes hostile
 * input: the body is size-capped by the route before it gets here, every field
 * is type-checked and length-capped, URLs are reduced to an origin or a token-free
 * path, and anything that does not parse is dropped, not repaired. Pure functions
 * (no network, no globals) so the hostile cases are unit tests.
 */

const MAX_REPORTS_PER_REQUEST = 5

/** Reports about things the visitor's own browser added — not ours to fix, and endless noise. */
const IGNORED_SCHEMES = /^(?:(?:chrome-extension|moz-extension|safari-extension|safari-web-extension|webkit-masked-url|about|chrome|edge|resource|view-source):|about$)/i

export type CspReport = {
  directive: string
  /** A CSP keyword (`inline`, `eval`, `data`), or the ORIGIN of what was blocked. Never a full URL. */
  blocked: string
  /** The page's path, private tokens removed. */
  page: string
  disposition: 'enforce' | 'report'
}

const DIRECTIVE = /^[a-z][a-z-]{1,40}$/

function asString(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, max) : null
}

function directiveOf(value: unknown): string {
  const first = asString(value, 200)?.trim().split(/\s+/)[0]?.toLowerCase()
  return first && DIRECTIVE.test(first) ? first : 'unknown'
}

function blockedOf(value: unknown): string | null {
  const raw = asString(value, 2000)?.trim()
  if (raw === undefined || raw === null) return ''
  if (raw === '') return ''
  if (['inline', 'eval', 'data', 'blob', 'self', 'wasm-eval', 'trusted-types-policy', 'trusted-types-sink'].includes(raw)) return raw
  if (IGNORED_SCHEMES.test(raw)) return null
  try {
    const url = new URL(raw)
    if (url.protocol === 'data:' || url.protocol === 'blob:') return url.protocol.slice(0, -1)
    return scrubText(url.origin === 'null' ? url.protocol : url.origin, 100)
  } catch {
    return scrubText(raw, 40)
  }
}

function pageOf(value: unknown): string {
  const raw = asString(value, 2000)
  if (!raw) return '/'
  try {
    return redactPath(new URL(raw).pathname)
  } catch {
    return redactPath(raw)
  }
}

function fromRecord(record: Record<string, unknown>): CspReport | null {
  const blocked = blockedOf(record['blocked-uri'] ?? record.blockedURL ?? record.blockedUri)
  if (blocked === null) return null
  const disposition = record.disposition === 'report' ? 'report' : 'enforce'
  return {
    directive: directiveOf(record['effective-directive'] ?? record.effectiveDirective ?? record['violated-directive'] ?? record.violatedDirective),
    blocked,
    page: pageOf(record['document-uri'] ?? record.documentURL ?? record.documentUri),
    disposition,
  }
}

/** Accepts `{ "csp-report": {...} }` (report-uri) and `[{ type: "csp-violation", body: {...} }]` (Reporting API). */
export function parseCspReports(body: unknown): CspReport[] {
  const out: CspReport[] = []
  const push = (record: unknown) => {
    if (out.length >= MAX_REPORTS_PER_REQUEST || !record || typeof record !== 'object' || Array.isArray(record)) return
    const parsed = fromRecord(record as Record<string, unknown>)
    if (parsed) out.push(parsed)
  }

  if (Array.isArray(body)) {
    for (const item of body.slice(0, MAX_REPORTS_PER_REQUEST * 2)) {
      if (item && typeof item === 'object' && (item as { type?: unknown }).type === 'csp-violation') push((item as { body?: unknown }).body)
    }
  } else if (body && typeof body === 'object') {
    push((body as Record<string, unknown>)['csp-report'])
  }
  return out
}

/** The text the error group is filed under. Stable per (directive, blocked origin, page) so a repeat is one group. */
export function cspMessage(report: CspReport): string {
  return `${report.directive} blocked ${report.blocked || 'a resource'} on ${report.page}${report.disposition === 'report' ? ' (report-only)' : ''}`
}

export type ClientErrorReport = {
  message: string
  name: string
  stack: string | null
  path: string
  digest: string | null
  kind: 'boundary' | 'window' | 'rejection'
}

const NAME = /^[A-Za-z][A-Za-z0-9_$.]{0,59}$/
const DIGEST = /^[A-Za-z0-9_-]{1,40}$/

export function parseClientErrorReport(body: unknown): ClientErrorReport | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const r = body as Record<string, unknown>
  const message = asString(r.message, 300)
  if (!message) return null
  const kind = r.kind === 'boundary' || r.kind === 'rejection' ? r.kind : 'window'
  const name = typeof r.name === 'string' && NAME.test(r.name) ? r.name : 'Error'
  return {
    message,
    name,
    stack: asString(r.stack, 2000),
    path: redactPath(asString(r.path, 500) ?? '/'),
    digest: typeof r.digest === 'string' && DIGEST.test(r.digest) ? r.digest : null,
    kind,
  }
}
