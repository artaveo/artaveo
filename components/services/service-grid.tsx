import { ServiceCard } from '@/components/services/service-card'
import type { Service } from '@/types/content'

/**
 * ServiceGrid — the `/services` index (roadmap § 7.1). Seven curated
 * services need no category filters the way `/work` eventually will
 * (§ `WORK_FILTER_THRESHOLD`) — a plain responsive grid is the honest fit
 * for a catalogue this size.
 */
export function ServiceGrid({ services }: { services: Service[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  )
}
