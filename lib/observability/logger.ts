import { currentRequestId } from '@/lib/observability/context'
import { EVENT_NAME, redactFields, serializeError } from '@/lib/observability/redact'

/**
 * The structured logger (Phase 24) — the ONLY place in server code that may
 * call `console`. One line of JSON per event, so a log search (Vercel's, or a
 * drain's) can filter on `event` and `requestId` instead of grepping prose:
 *
 *   {"t":"…","level":"error","event":"inquiry.persist_failed","requestId":"…",
 *    "release":"a1b2c3d","err":{"name":"Error","message":"…","code":"23503"}}
 *
 * A log line lives about an hour on Vercel's Hobby plan; anything that has to be
 * found tomorrow is ALSO written to the database (`store.ts`). This file writes
 * lines and nothing else — it never touches the network, so it is safe to call
 * from prerendering, from a build, and from the code that reports a database
 * failure.
 *
 * Event names are `area.what_happened` in lower snake case (`notification.exhausted`).
 * They are the vocabulary alerts and the admin page filter on, so a new one is a
 * small decision, not a free-text message.
 */

export type LogLevel = 'info' | 'warn' | 'error'
export type LogFields = Record<string, unknown> & { err?: unknown; requestId?: string }
export type LogSink = (level: LogLevel, line: string) => void

const MAX_LINE = 6000

function release(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const sha = env.VERCEL_GIT_COMMIT_SHA ?? env.SOURCE_VERSION
  return sha ? sha.slice(0, 7) : undefined
}

/** Builds the JSON line. Pure apart from the clock and the environment, both injectable. */
export function formatLine(
  level: LogLevel,
  event: string,
  fields: LogFields = {},
  now: Date = new Date(),
  env: NodeJS.ProcessEnv = process.env,
): string {
  const valid = EVENT_NAME.test(event)
  const { err, requestId: explicitId, ...rest } = fields
  const requestId = explicitId ?? currentRequestId()

  const record: Record<string, unknown> = {
    t: now.toISOString(),
    level,
    event: valid ? event : 'observability.invalid_event_name',
    ...(valid ? {} : { original: String(event).slice(0, 80) }),
    ...(requestId ? { requestId } : {}),
    ...(release(env) ? { release: release(env) } : {}),
    ...(env.VERCEL_ENV ? { env: env.VERCEL_ENV } : {}),
  }
  if (err !== undefined) record.err = serializeError(err)
  Object.assign(record, redactFields(rest) as Record<string, unknown>)

  let line = JSON.stringify(record)
  if (line.length > MAX_LINE) {
    // Never drop the line: keep the identifying part, say what was cut.
    const { t, level: l, event: e, requestId: r, err: er } = record
    line = JSON.stringify({ t, level: l, event: e, requestId: r, err: er, truncated: true })
  }
  return line
}

// The one place `console` is called; the header says why, and tests/unit/observability-static.test.mjs pins it.
const consoleSink: LogSink = (level, line) => {
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

let sink: LogSink = consoleSink

/** Tests capture lines with this; pass `null` to restore the console. */
export function setLogSink(next: LogSink | null): void {
  sink = next ?? consoleSink
}

function emit(level: LogLevel, event: string, fields?: LogFields): void {
  try {
    sink(level, formatLine(level, event, fields))
  } catch {
    // A logger that throws would turn a diagnostic into an outage.
  }
}

export const log = {
  info: (event: string, fields?: LogFields) => emit('info', event, fields),
  warn: (event: string, fields?: LogFields) => emit('warn', event, fields),
  error: (event: string, fields?: LogFields) => emit('error', event, fields),
}
