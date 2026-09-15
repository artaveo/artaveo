import { getTranslations } from 'next-intl/server'

import { formatDate } from '@/lib/format'
import { EmptyState } from '@/components/ui/states'
import type { InquiryEvent, InquiryEventType } from '@/types/pipeline'
import type { Locale } from '@/types/content'

const EVENT_MESSAGE_KEY: Record<InquiryEventType, string> = {
  created: 'eventTypeCreated',
  'stage-changed': 'eventTypeStageChanged',
  'note-added': 'eventTypeNoteAdded',
  'priority-changed': 'eventTypePriorityChanged',
  'follow-up-set': 'eventTypeFollowUpSet',
  'tags-changed': 'eventTypeTagsChanged',
}

export async function EventsTimeline({ events, locale }: { events: InquiryEvent[]; locale: Locale }) {
  const t = await getTranslations('Admin')

  if (events.length === 0) {
    return <EmptyState size="inline" title={t('eventTimelineEmpty')} />
  }

  return (
    <ol className="flex flex-col gap-4">
      {[...events].reverse().map((event) => (
        <li key={event.id} className="flex flex-col gap-1 border-s-2 border-border ps-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-foreground">{t(EVENT_MESSAGE_KEY[event.type])}</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(event.createdAt, locale, { hour: 'numeric', minute: 'numeric' })}
            </span>
          </div>
          {event.note ? <p className="text-sm text-muted-foreground text-pretty">{event.note}</p> : null}
        </li>
      ))}
    </ol>
  )
}
