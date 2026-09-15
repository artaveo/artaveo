'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Download } from 'lucide-react'

import { exportInquiriesCsv } from '@/app/actions/pipeline'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-controls'
import type { InquiryPriority, InquiryStage } from '@/types/pipeline'

export function CsvExportButton({
  filters,
}: {
  filters: { stage?: InquiryStage; priority?: InquiryPriority; tag?: string; q?: string }
}) {
  const t = useTranslations('Admin')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleClick() {
    setPending(true)
    setError(false)

    const result = await exportInquiriesCsv(filters)

    if (!result.ok) {
      setError(true)
      setPending(false)
      return
    }

    // Client-side-only download — no server route needed for a file this
    // small, and it keeps the export scoped to exactly the filtered rows
    // the Server Action already fetched with `owner` authorization.
    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `artaveo-leads-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setPending(false)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
        <Download aria-hidden="true" />
        {pending ? t('exportingCsv') : t('exportCsvButton')}
      </Button>
      {error ? (
        <FormMessage variant="destructive" className="text-xs">
          {t('exportFailed')}
        </FormMessage>
      ) : null}
    </div>
  )
}
