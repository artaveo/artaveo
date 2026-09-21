import 'server-only'

import type { EmailAttachment, EmailProviderInfo } from '@/types/notifications'
import { log } from '@/lib/observability/logger'

/**
 * § 9.3 / Phase 19 — Notifications: provider abstraction.
 *
 * D-01 (production domain + SPF/DKIM/DMARC) is still open. The owner's
 * explicit call (13 September 2026): build the structure against the interim
 * Vercel URL, but keep real sending switched off — a paid provider is only
 * worth activating once the real domain is bought and DNS-authenticated,
 * otherwise every "sent" mail would come from an unauthenticated address.
 *
 * `getEmailProvider()` defaults to `ConsoleEmailProvider` — it never calls a
 * real API, it logs what would have been sent — so the outbox, retry
 * bookkeeping and delivery log all get exercised honestly today. Flipping to
 * real sending is a pure env-var change: `EMAIL_PROVIDER=resend` plus
 * `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS`.
 *
 * Phase 19 additions, all provider-agnostic in the interface:
 *  - `replyTo` — the client confirmation says "just reply to this e-mail",
 *    which is only true if replies reach the owner; the owner alert replies
 *    straight to the client.
 *  - `idempotencyKey` — a stable key per outbox row. If the provider accepted
 *    a message but the response was lost (a timeout), the retry must not send
 *    a second copy. Resend honours it for 24 hours (its documented window).
 *  - `retryable` on failures — a 429/5xx/timeout is worth another attempt; a
 *    400/401/403/422 (bad address, unverified domain, bad key) is not, and
 *    burning five attempts on it only delays the alert.
 *  - a request timeout, so a hung provider cannot hold a visitor's form
 *    submission open.
 */

export type EmailMessage = {
  to: string
  subject: string
  text: string
  replyTo?: string
  idempotencyKey?: string
  /** Phase 20: the calendar invitation. Plain-text content; a provider encodes it as its API needs. */
  attachments?: EmailAttachment[]
}

export type EmailSendOptions = {
  timeoutMs?: number
}

export type EmailSendResult =
  | { ok: true; providerMessageId?: string }
  | { ok: false; error: string; retryable: boolean }

export interface EmailProvider {
  readonly id: 'console' | 'resend'
  send(message: EmailMessage, options?: EmailSendOptions): Promise<EmailSendResult>
}

export const DEFAULT_SEND_TIMEOUT_MS = 8_000

/**
 * Never sends anything for real. Active until D-01 resolves. Logging (not
 * silence) matters: it is how a developer confirms the outbox → provider
 * wiring ran during this interim period.
 */
export class ConsoleEmailProvider implements EmailProvider {
  readonly id = 'console' as const

  async send(message: EmailMessage): Promise<EmailSendResult> {
    // Nothing about the message is logged — not the address, not the subject (which carries a client's name).
    log.info('notification.console_provider_send', {
      mode: 'log-only',
      reason: 'D-01 domain/DNS not yet resolved: nothing leaves the server',
      attachments: message.attachments?.length ?? 0,
    })
    return { ok: true }
  }
}

/**
 * Whether an HTTP failure from the provider is worth another attempt.
 * 408/425/429 and every 5xx are transient. A 409 is only transient when it
 * is Resend's "another request with this idempotency key is still in
 * flight" — a 409 for a *different payload under the same key* will never
 * succeed. Every other 4xx is a request the provider will keep refusing until
 * something on our side changes (key, sender domain, address), so it is
 * permanent and goes straight to the owner instead of retrying.
 */
export function classifyHttpFailure(status: number, body: string): boolean {
  if (status === 408 || status === 425 || status === 429) return true
  if (status >= 500) return true
  if (status === 409) return /concurrent/i.test(body)
  return false
}

/** Resend's `attachments`: `filename`, base64 `content`, optional `content_type`. */
export function encodeResendAttachments(attachments: EmailAttachment[]): Record<string, string>[] {
  return attachments.map((attachment) => ({
    filename: attachment.filename,
    content: Buffer.from(attachment.content, 'utf8').toString('base64'),
    content_type: attachment.contentType,
  }))
}

export class ResendEmailProvider implements EmailProvider {
  readonly id = 'resend' as const
  private readonly apiKey: string
  private readonly fromAddress: string

  constructor(apiKey: string, fromAddress: string) {
    this.apiKey = apiKey
    this.fromAddress = fromAddress
  }

  async send(message: EmailMessage, options: EmailSendOptions = {}): Promise<EmailSendResult> {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      }
      if (message.idempotencyKey) headers['Idempotency-Key'] = message.idempotencyKey

      const payload: Record<string, unknown> = {
        from: this.fromAddress,
        to: message.to,
        subject: message.subject,
        text: message.text,
      }
      if (message.replyTo) payload.reply_to = message.replyTo
      if (message.attachments && message.attachments.length > 0) payload.attachments = encodeResendAttachments(message.attachments)

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_SEND_TIMEOUT_MS),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        return {
          ok: false,
          error: `resend responded ${res.status}: ${body.slice(0, 500)}`,
          retryable: classifyHttpFailure(res.status, body),
        }
      }

      const data = (await res.json().catch(() => ({}))) as { id?: string }
      return { ok: true, providerMessageId: data.id }
    } catch (err) {
      // A network error or the timeout: the request may or may not have
      // reached the provider. Retryable — and safe, because of the
      // idempotency key above.
      return { ok: false, error: err instanceof Error ? err.message : String(err), retryable: true }
    }
  }
}

/** Only `EMAIL_PROVIDER`, `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` are read. */
type ProviderEnv = Record<string, string | undefined>

/** Pure — takes the environment as an argument so the selection rules can be tested. */
export function resolveEmailProvider(env: ProviderEnv): { provider: EmailProvider; info: EmailProviderInfo } {
  const requested = (env.EMAIL_PROVIDER ?? 'console').trim() || 'console'

  if (requested === 'resend') {
    if (env.RESEND_API_KEY && env.EMAIL_FROM_ADDRESS) {
      return {
        provider: new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS),
        info: { id: 'resend', deliversRealEmail: true, requested, misconfigured: false },
      }
    }
    return {
      provider: new ConsoleEmailProvider(),
      info: { id: 'console', deliversRealEmail: false, requested, misconfigured: true },
    }
  }

  return {
    provider: new ConsoleEmailProvider(),
    info: { id: 'console', deliversRealEmail: false, requested, misconfigured: requested !== 'console' },
  }
}

let cached: { provider: EmailProvider; info: EmailProviderInfo } | undefined

function resolveOnce(): { provider: EmailProvider; info: EmailProviderInfo } {
  if (cached) return cached
  cached = resolveEmailProvider(process.env)
  if (cached.info.misconfigured) {
    log.warn('notification.provider_misconfigured', {
      requested: cached.info.requested,
      consequence: 'RESEND_API_KEY / EMAIL_FROM_ADDRESS incomplete: falling back to the log-only provider, nothing is delivered',
    })
  }
  return cached
}

export function getEmailProvider(): EmailProvider {
  return resolveOnce().provider
}

/** For the admin notifications page: says in words whether anything is really being delivered. */
export function getEmailProviderInfo(): EmailProviderInfo {
  return resolveOnce().info
}

/** Test-only escape hatch — never called from application code. */
export function __resetEmailProviderCacheForTests(): void {
  cached = undefined
}
