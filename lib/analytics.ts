import { track } from '@vercel/analytics'

/**
 * Roadmap § 11.1 — analytics events.
 *
 * `page_view` is deliberately NOT tracked manually here: `<Analytics />`
 * (`@vercel/analytics/next`, already mounted in `app/[locale]/layout.tsx`
 * since before this phase) records a page view automatically on every
 * route change. Re-emitting it by hand would double-count.
 *
 * Every event below carries only non-personal, low-cardinality
 * properties — a slug, a package id, a step name, a locale code. Never
 * pass form contents (name, email, project description, budget, links…)
 * or anything else a visitor typed — the roadmap's own rule ("no form
 * contents, no personal data in events").
 *
 * `consultation_request` and `search_used` are declared here so every
 * call site elsewhere in the app can already import a stable name, but
 * neither is wired to a real trigger yet: Phase 20 (Consultation) and
 * Phase 18 (Search & Command Palette) don't exist yet. Firing them now
 * against a placeholder interaction would be inventing an event for a
 * feature that doesn't exist — wire each one when its phase ships.
 */
export type AnalyticsEvent =
  | 'project_view'
  | 'article_view'
  | 'service_view'
  | 'package_compare'
  | 'cta_click'
  | 'brief_start'
  | 'brief_step'
  | 'brief_submit'
  | 'consultation_request'
  | 'external_profile_click'
  | 'language_switch'
  | 'search_used'

export type AnalyticsProperties = Record<string, string | number | boolean>

export function trackEvent(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  // `track` is a no-op outside of a deployed Vercel environment (and
  // during SSR) — safe to call unconditionally from client components.
  track(event, properties)
}
