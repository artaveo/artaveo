import 'server-only'

/**
 * § 9.3 — Notifications: provider abstraction.
 *
 * D-01 (production domain + SPF/DKIM/DMARC) is still open. The owner's
 * explicit call (13 September 2026): build this phase's structure now,
 * against the interim Vercel URL, but keep real sending switched off —
 * a paid provider (Resend) is only worth activating once the real domain
 * is bought and DNS-authenticated, otherwise every "sent" email would
 * come from an unauthenticated address and likely land in spam or get
 * rejected outright, which is worse than being honest that sending isn't
 * live yet.
 *
 * `getEmailProvider()` defaults to `ConsoleEmailProvider` — it never
 * calls a real API, just logs what would have been sent — so the outbox,
 * retry bookkeeping and audit trail (`lib/notifications/outbox.ts`) all
 * get exercised honestly today. Flipping to real sending later is meant
 * to be a pure env-var change, not a code change: set `EMAIL_PROVIDER=resend`
 * plus `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` (an address on the real,
 * DNS-authenticated domain) once D-01 resolves.
 */

export type EmailMessage = {
  to: string
  subject: string
  text: string
}

export type EmailSendResult = { ok: true; providerMessageId?: string } | { ok: false; error: string }

export interface EmailProvider {
  readonly id: string
  send(message: EmailMessage): Promise<EmailSendResult>
}

/**
 * Never sends anything for real. This is the active provider until D-01
 * resolves — see module docstring. Logging (not silence) matters here:
 * it's how a developer confirms the outbox → provider wiring actually
 * ran during this interim period.
 */
class ConsoleEmailProvider implements EmailProvider {
  readonly id = 'console'

  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.log('[notifications:console] would send email (D-01 domain/DNS not yet resolved)', {
      to: message.to,
      subject: message.subject,
    })
    return { ok: true }
  }
}

/**
 * Built now, reused again by Phase 19 ("Notifications & Outbox"), but not
 * wired to actually run until an owner explicitly sets
 * `EMAIL_PROVIDER=resend` — see `getEmailProvider()`. Installing
 * `RESEND_API_KEY` alone does not activate it; both the flag and the key
 * (and a from-address on the authenticated domain) are required.
 */
class ResendEmailProvider implements EmailProvider {
  readonly id = 'resend'

  constructor(
    private readonly apiKey: string,
    private readonly fromAddress: string,
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: message.to,
          subject: message.subject,
          text: message.text,
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        return { ok: false, error: `resend responded ${res.status}: ${body.slice(0, 500)}` }
      }

      const data = (await res.json().catch(() => ({}))) as { id?: string }
      return { ok: true, providerMessageId: data.id }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}

let cachedProvider: EmailProvider | undefined

export function getEmailProvider(): EmailProvider {
  if (cachedProvider) {
    return cachedProvider
  }

  const selected = process.env.EMAIL_PROVIDER ?? 'console'

  if (selected === 'resend') {
    const apiKey = process.env.RESEND_API_KEY
    const fromAddress = process.env.EMAIL_FROM_ADDRESS
    if (apiKey && fromAddress) {
      cachedProvider = new ResendEmailProvider(apiKey, fromAddress)
      return cachedProvider
    }
    console.warn(
      '[notifications] EMAIL_PROVIDER=resend but RESEND_API_KEY / EMAIL_FROM_ADDRESS is missing — falling back to the console provider.',
    )
  }

  cachedProvider = new ConsoleEmailProvider()
  return cachedProvider
}

/** Test-only escape hatch — never called from application code. */
export function __resetEmailProviderCacheForTests(): void {
  cachedProvider = undefined
}
