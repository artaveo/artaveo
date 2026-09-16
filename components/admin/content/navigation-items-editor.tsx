'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { updateNavigationItem } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import type { AdminNavigationItem, NavigationItemInput } from '@/types/cms'

const ALL_SURFACES = ['header', 'footer', 'mobile', 'command-palette'] as const

function NavItemCard({ item }: { item: AdminNavigationItem }) {
  const t = useTranslations('Admin')
  const tNav = useTranslations('Nav')
  const [form, setForm] = useState<NavigationItemInput>({
    href: item.href,
    surfaces: item.surfaces,
    hasDescription: item.hasDescription,
    hasContent: item.hasContent,
    sortOrder: item.sortOrder,
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggleSurface(surface: string) {
    setSaved(false)
    setForm((f) => ({
      ...f,
      surfaces: f.surfaces.includes(surface) ? f.surfaces.filter((s) => s !== surface) : [...f.surfaces, surface],
    }))
  }

  async function handleSave() {
    setPending(true)
    setError(false)
    setSaved(false)
    const result = await updateNavigationItem(item.id, form)
    if (!result.ok) {
      setError(true)
      setPending(false)
      return
    }
    setPending(false)
    setSaved(true)
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <p className="text-sm font-medium text-foreground">{tNav(item.key)}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`nav-${item.id}-href`}>{t('cmsFieldHref')}</FieldLabel>
            <Input id={`nav-${item.id}-href`} dir="ltr" value={form.href} disabled={pending} onChange={(e) => { setForm({ ...form, href: e.target.value }); setSaved(false) }} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`nav-${item.id}-sort`}>{t('cmsFieldSortOrder')}</FieldLabel>
            <Input id={`nav-${item.id}-sort`} type="number" dir="ltr" value={form.sortOrder} disabled={pending} onChange={(e) => { setForm({ ...form, sortOrder: Number(e.target.value) || 0 }); setSaved(false) }} />
          </Field>
        </div>
        <Field>
          <FieldLabel>{t('cmsFieldSurfaces')}</FieldLabel>
          <div className="flex flex-wrap gap-3">
            {ALL_SURFACES.map((surface) => (
              <label key={surface} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={form.surfaces.includes(surface)} disabled={pending} onChange={() => toggleSurface(surface)} />
                {t(`cmsSurface${surface.replace('-', ' ').split(' ').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`)}
              </label>
            ))}
          </div>
        </Field>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={form.hasDescription} disabled={pending} onChange={(e) => { setForm({ ...form, hasDescription: e.target.checked }); setSaved(false) }} />
            {t('cmsFieldHasDescription')}
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={form.hasContent} disabled={pending} onChange={(e) => { setForm({ ...form, hasContent: e.target.checked }); setSaved(false) }} />
            {t('cmsFieldHasContent')}
          </label>
        </div>
        {error ? <FormMessage variant="destructive">{t('errorForbidden')}</FormMessage> : null}
        {saved && !error ? <FormMessage variant="success">{t('cmsSettingsSaved')}</FormMessage> : null}
        <Button type="button" size="sm" disabled={pending} onClick={handleSave} className="self-start">
          {t('cmsSaveChanges')}
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * § 15's navigation editor. `key` (the fixed, closed set the DB `check`
 * constraint enforces) and the item's translated label are never
 * editable here — only the structural fields (href, which surfaces show
 * it, sort order, the two content-presence flags) are, per
 * `types/cms.ts#AdminNavigationItem`'s own doc comment.
 */
export function NavigationItemsEditor({ items }: { items: AdminNavigationItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <NavItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
