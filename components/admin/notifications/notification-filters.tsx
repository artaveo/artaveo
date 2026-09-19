'use client'

import { useTranslations } from 'next-intl'

import { usePathname, useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/form-controls'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { kindLabelKey, statusLabelKey } from '@/components/admin/notifications/notification-badges'
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_STATUSES,
  type NotificationKind,
  type NotificationStatus,
} from '@/types/notifications'

const NONE = '__none__'

export function NotificationFiltersBar({ status, kind }: { status?: NotificationStatus; kind?: NotificationKind }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const pathname = usePathname()

  function push(next: { status?: string; kind?: string }) {
    const merged = { status, kind, ...next }
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value)
    }
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field className="w-44">
        <FieldLabel htmlFor="filter-notif-status">{t('notifFilterStatusLabel')}</FieldLabel>
        <Select
          value={status ?? NONE}
          onValueChange={(value) => push({ status: !value || value === NONE ? undefined : value })}
        >
          <SelectTrigger id="filter-notif-status" size="sm">
            <SelectValue>{status ? t(statusLabelKey(status)) : t('notifFilterAll')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={NONE}>{t('notifFilterAll')}</SelectItem>
              {NOTIFICATION_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(statusLabelKey(value))}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field className="w-56">
        <FieldLabel htmlFor="filter-notif-kind">{t('notifFilterKindLabel')}</FieldLabel>
        <Select
          value={kind ?? NONE}
          onValueChange={(value) => push({ kind: !value || value === NONE ? undefined : value })}
        >
          <SelectTrigger id="filter-notif-kind" size="sm">
            <SelectValue>{kind ? t(kindLabelKey(kind)) : t('notifFilterAll')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={NONE}>{t('notifFilterAll')}</SelectItem>
              {NOTIFICATION_KINDS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(kindLabelKey(value))}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      {status || kind ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => router.push(pathname)}>
          {t('clearFiltersButton')}
        </Button>
      ) : null}
    </div>
  )
}
