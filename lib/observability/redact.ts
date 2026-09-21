import crypto from 'node:crypto'

/**
 * What may leave a request as a log line, and what may be stored (Phase 24).
 * Everything here is pure: text in, text out, so it can be tested with hostile
 * input without a server.
 *
 * The rule is the one the rest of the site follows: a record about a failure must
 * not become a second copy of the visitor's data. Log lines and stored errors
 * therefore never carry an e-mail address, a phone number, a private link token,
 * a credential, or free text a visitor typed. Two layers, both applied:
 *
 *  1. FIELD NAMES — a value under a key that names something private (`email`,
 *     `token`, `goal`, `body` …) is replaced whole.
 *  2. VALUE SHAPES — whatever is left is scrubbed for things that LOOK private
 *     (an address in an error message, a JWT, a long random-looking token), because
 *     the dangerous string is usually inside a message somebody else wrote: a
 *     database error that says `Key (email)=(a@b.c) already exists`.
 *
 * It is deliberately over-eager. Losing a digit sequence from a log line costs a
 * little debugging time; keeping a phone number costs a visitor's privacy.
 */

export const EVENT_NAME = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/

const UUID_SPLIT = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi
const UUID_ONLY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const EMAIL = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\b/g
const AUTH_HEADER = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi
const KEY_VALUE_SECRET = /\b(password|passwd|pwd|secret|token|api[_-]?key|apikey|authorization|access_token|refresh_token)\b(\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s,;&]+)/gi
/** A run of 24+ token characters containing both a letter and a digit: base64url link tokens, API keys, hashes. */
const TOKEN_LIKE = /(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{24,}/g
/** Long digit runs, optionally with phone-number punctuation. */
const NUMBER_RUN = /\+?\d[\d ()-]{7,}\d/g

/** Field names whose values are never logged or stored. Matched anywhere in the key, case-insensitively. */
const SENSITIVE_KEY =
  /pass(word|wd)?|secret|token|authorization|cookie|credential|api[_-]?key|jwt|session|e-?mail|phone|whatsapp|address|ip[_-]?hash|\bip\b|(^|_)(goal|note|notes|message|body|text|subject|statement|links?|name|full_?name|company)$/i

/** Removes what looks private from one string, then caps its length. */
export function scrubText(input: string, max = 500): string {
  const parts = input.split(UUID_SPLIT)
  const scrubbed = parts
    .map((part) => {
      if (UUID_ONLY.test(part)) return part // an id, useful and not private
      return part
        .replace(JWT, '[jwt]')
        .replace(AUTH_HEADER, '$1 [token]')
        .replace(KEY_VALUE_SECRET, '$1$2[redacted]')
        .replace(EMAIL, '[email]')
        .replace(TOKEN_LIKE, '[token]')
        .replace(NUMBER_RUN, '[number]')
    })
    .join('')
  return scrubbed.length > max ? `${scrubbed.slice(0, max - 1)}…` : scrubbed
}

/**
 * A URL path with everything that identifies a person or grants access removed:
 * the query string and fragment, and any segment that is an id or a token. The
 * private-link pages carry their token IN the path (`/consultation/<token>`), so a
 * raw path in a log line would be a working key to somebody's page.
 */
export function redactPath(input: string, max = 200): string {
  const path = input.split(/[?#]/)[0] ?? ''
  const out = path
    .split('/')
    .map((segment) => {
      if (!segment) return segment
      let decoded = segment
      try {
        decoded = decodeURIComponent(segment)
      } catch {
        // keep the raw segment
      }
      if (UUID_ONLY.test(decoded)) return '[id]'
      if (/^[A-Za-z0-9_-]{20,}$/.test(decoded) && /\d/.test(decoded) && /[A-Za-z]/.test(decoded)) return '[token]'
      if (/^\d{6,}$/.test(decoded)) return '[id]'
      return scrubText(decoded, 60).replace(/\//g, '')
    })
    .join('/')
  return out.length > max ? `${out.slice(0, max - 1)}…` : out
}

type Serialized = { name: string; message: string; code?: string; stack?: string; cause?: { name: string; message: string } }

const STACK_LINE_LIMIT = 12
const STACK_CHAR_LIMIT = 2000

/** Removes absolute file-system prefixes and query strings from a stack, keeps the first lines. */
function scrubStack(stack: string): string {
  const lines = stack
    .split('\n')
    .slice(0, STACK_LINE_LIMIT)
    .map((line) =>
      scrubText(
        line
          .replace(/\(?(?:file:\/\/)?\/[^\s():]*?\/(?=(?:app|lib|components|node_modules|\.next|proxy|instrumentation)\b)/g, '(')
          .replace(/\?[^\s):]*/g, ''),
        300,
      ),
    )
  const joined = lines.join('\n')
  return joined.length > STACK_CHAR_LIMIT ? `${joined.slice(0, STACK_CHAR_LIMIT - 1)}…` : joined
}

function messageOf(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'message' in value && typeof (value as { message: unknown }).message === 'string') {
    return (value as { message: string }).message
  }
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

/**
 * Turns anything that was thrown or returned as an error into the small, scrubbed
 * shape that is logged and stored. Handles `Error`, the plain `{ message, code }`
 * objects Supabase returns, strings, and things that are not errors at all.
 * Deliberately drops `details` and `hint`: for a database error they hold the row
 * values.
 */
export function serializeError(err: unknown, opts: { stack?: boolean } = {}): Serialized {
  const includeStack = opts.stack !== false
  if (err instanceof Error) {
    const out: Serialized = {
      name: scrubText(err.name || 'Error', 100),
      message: scrubText(err.message, 500),
    }
    const code = (err as { code?: unknown }).code
    if (typeof code === 'string' || typeof code === 'number') out.code = scrubText(String(code), 40)
    if (includeStack && err.stack) out.stack = scrubStack(err.stack)
    const cause = (err as { cause?: unknown }).cause
    if (cause !== undefined && cause !== null) {
      out.cause = {
        name: cause instanceof Error ? scrubText(cause.name, 100) : 'Error',
        message: scrubText(messageOf(cause), 300),
      }
    }
    return out
  }
  if (err && typeof err === 'object') {
    const record = err as { name?: unknown; code?: unknown }
    const out: Serialized = {
      name: typeof record.name === 'string' && record.name ? scrubText(record.name, 100) : 'Error',
      message: scrubText(messageOf(err), 500),
    }
    if (typeof record.code === 'string' || typeof record.code === 'number') out.code = scrubText(String(record.code), 40)
    return out
  }
  return { name: 'Error', message: scrubText(messageOf(err), 500) }
}

const MAX_DEPTH = 4
const MAX_KEYS = 30
const MAX_ARRAY = 20

/** Copies a value into something safe to serialise: private keys replaced, strings scrubbed, size bounded, cycles cut. */
export function redactFields(value: unknown, depth = 0, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return scrubText(value, 300)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function' || typeof value === 'symbol') return undefined
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (value instanceof Error) return serializeError(value, { stack: false })
  if (typeof value !== 'object') return undefined
  if (depth >= MAX_DEPTH) return '[truncated]'
  if (seen.has(value)) return '[circular]'
  seen.add(value)

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY).map((item) => redactFields(item, depth + 1, seen))
    return value.length > MAX_ARRAY ? [...items, `[+${value.length - MAX_ARRAY} more]`] : items
  }

  const out: Record<string, unknown> = {}
  let count = 0
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    if (count >= MAX_KEYS) {
      out['…'] = '[truncated]'
      break
    }
    if (inner === undefined) continue
    count += 1
    out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redactFields(inner, depth + 1, seen)
  }
  return out
}

/**
 * The message with the parts that change between two occurrences of the same
 * failure removed: ids, numbers, hex runs, quoted values. Two requests that fail
 * for the same reason must produce the same text, or every occurrence would be
 * its own group and grouping would be worthless.
 */
export function normalizeMessage(message: string): string {
  return scrubText(message, 400)
    .split(UUID_SPLIT)
    .map((part) => (UUID_ONLY.test(part) ? '<uuid>' : part))
    .join('')
    .replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '<str>')
    .replace(/\b[0-9a-f]{8,}\b/gi, '<hex>')
    .replace(/\d+/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

/** 32 hex characters identifying one distinct failure. Deliberately excludes the stack: its frames change with every build. */
export function fingerprintOf(input: { event: string; name: string; message: string; route?: string | null }): string {
  const material = [input.event, input.name, normalizeMessage(input.message), input.route ?? ''].join('\u0001')
  return crypto.createHash('sha256').update(material).digest('hex').slice(0, 32)
}
