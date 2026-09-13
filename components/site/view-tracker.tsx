'use client'

import { useEffect } from 'react'

import { trackEvent, type AnalyticsEvent, type AnalyticsProperties } from '@/lib/analytics'

/**
 * Fires one analytics event on mount and renders nothing. Used to track a
 * page view of a specific entity (`project_view`, `service_view`) from
 * inside an otherwise-Server Component (`CaseStudy`, `ServiceDetail`)
 * without converting the whole component to a Client Component just for
 * this one side effect.
 */
export function ViewTracker({
  event,
  properties,
}: {
  event: AnalyticsEvent
  properties?: AnalyticsProperties
}) {
  useEffect(() => {
    trackEvent(event, properties)
    // Fire once per mount only — a real navigation to this route (not a
    // prop change) is what should count as another view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
