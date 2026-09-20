'use server'

import { createConsultationRequest, cancelConsultationAsClient, requestConsultationReschedule } from '@/lib/consultation/service'
import { looksLikeToken } from '@/lib/consultation/windows'
import { getClientIp, hashIp } from '@/lib/request-ip'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { Locale } from '@/types/content'
import type {
  ClientActionResult,
  ConsultationRequestInput,
  ConsultationRequestMeta,
  ConsultationRequestResult,
  WindowInput,
} from '@/types/consultation'

/**
 * Phase 20 — the public half of Consultation: a visitor asks for an intro
 * call, and (through the private link in their e-mail) cancels or asks for a
 * different time. The thin edge over `lib/consultation/service.ts`: it picks up
 * the caller's address, checks the shape of what arrived, and returns only
 * codes — never a database message.
 *
 * Every argument is untrusted. The service re-validates the request and every
 * proposed window; the token is checked for shape before it touches a query.
 */

const isLocale = (value: unknown): value is Locale => value === 'en' || value === 'fa'

export async function submitConsultationRequest(
  locale: Locale,
  input: ConsultationRequestInput,
  meta: ConsultationRequestMeta,
): Promise<ConsultationRequestResult> {
  if (!isLocale(locale) || !input || !meta || typeof input.name !== 'string' || typeof input.email !== 'string') {
    return { ok: false, code: 'invalid' }
  }
  const supabase = getSupabaseServerClient()
  if (!supabase) return { ok: false, code: 'not-configured' }

  const ipHash = hashIp(await getClientIp())
  return createConsultationRequest(
    { supabase },
    {
      name: String(input.name),
      email: String(input.email),
      phone: String(input.phone ?? ''),
      goal: String(input.goal ?? ''),
      timezone: String(input.timezone ?? ''),
      windows: Array.isArray(input.windows) ? input.windows : [],
      consent: input.consent === true,
    },
    {
      honeypot: String(meta.honeypot ?? ''),
      formRenderedAt: Number(meta.formRenderedAt),
      idempotencyKey: String(meta.idempotencyKey ?? ''),
      sourceReferrer: typeof meta.sourceReferrer === 'string' ? meta.sourceReferrer.slice(0, 500) : null,
    },
    { locale, ipHash },
  )
}

export async function cancelMyConsultation(token: string, reason: string): Promise<ClientActionResult> {
  if (typeof token !== 'string' || !looksLikeToken(token)) return { ok: false, code: 'not-found' }
  const supabase = getSupabaseServerClient()
  if (!supabase) return { ok: false, code: 'not-configured' }
  return cancelConsultationAsClient({ supabase }, token, typeof reason === 'string' ? reason : '')
}

export async function rescheduleMyConsultation(
  token: string,
  timezone: string,
  windows: WindowInput[],
): Promise<ClientActionResult> {
  if (typeof token !== 'string' || !looksLikeToken(token)) return { ok: false, code: 'not-found' }
  const supabase = getSupabaseServerClient()
  if (!supabase) return { ok: false, code: 'not-configured' }
  return requestConsultationReschedule(
    { supabase },
    token,
    typeof timezone === 'string' ? timezone : '',
    Array.isArray(windows) ? windows : [],
  )
}
