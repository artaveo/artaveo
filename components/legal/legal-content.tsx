import { useLocale } from 'next-intl'

import { Prose } from '@/components/ui/prose'
import { PageHeader } from '@/components/ui/patterns'
import { formatDate } from '@/lib/format'
import { t, type LegalDocument, type Locale } from '@/types/content'

/**
 * Shared renderer for `/privacy` and `/terms` (roadmap § 11.2). Both
 * pages are the same shape — an eyebrow/title/description header, a
 * "last updated" date, then a list of `LegalSection`s — so this is the
 * one place that shape is rendered, not duplicated per page.
 */
export function LegalContent({
  document,
  eyebrow,
  title,
  description,
  lastUpdatedLabel,
}: {
  document: LegalDocument
  eyebrow: string
  title: string
  description: string
  lastUpdatedLabel: string
}) {
  const locale = useLocale() as Locale

  return (
    <div className="container-page py-16 md:py-24">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <p className="mt-2 text-sm text-muted-foreground">
        {lastUpdatedLabel} {formatDate(document.lastUpdated, locale)}
      </p>
      <Prose className="mt-10">
        {document.sections.map((section) => (
          <div key={section.id}>
            <h2>{t(section.title, locale)}</h2>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index}>{t(paragraph, locale)}</p>
            ))}
            {section.list && section.list.length > 0 ? (
              <ul>
                {section.list.map((item, index) => (
                  <li key={index}>{t(item, locale)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </Prose>
    </div>
  )
}
