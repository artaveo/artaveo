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
 * `search_used` (Phase 18) fires from the command palette in exactly two
 * situations — a result was opened (`outcome: 'selected'`, with the result's
 * `kind` and its `position` in the list) or a working search ended on "no
 * results" (`outcome: 'no-results'`) — plus the `locale`. The query text is
 * never sent: it is something the visitor typed.
 *
 * `consultation_request` is declared here so every call site elsewhere in
 * the app can already import a stable name, but it is not wired to a real
 * trigger yet: Phase 20 (Consultation) doesn't exist yet. Firing it now
 * against a placeholder interaction would be inventing an event for a
 * feature that doesn't exist — wire it when its phase ships.
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
