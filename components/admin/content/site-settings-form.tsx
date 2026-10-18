'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'

import { updateSiteSettings } from '@/app/actions/settings'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel, FormMessage } from '@/components/ui/form-controls'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LocalizedTextField, emptyLocalized } from '@/components/admin/content/localized-fields'
import type { AdminSiteSettings, SiteSettingsInput } from '@/types/cms'
import type { AvailabilityState } from '@/types/content'

const STATES: AvailabilityState[] = ['available', 'limited', 'unavailable']

/**
 * § 15's settings/availability editor — writes the `site_settings` singleton
 * row. Since Phase 27.6 the contact channels and external profiles here are what
 * the public header, menu, footer and contact page show; the availability card
 * still reads `lib/home-content.ts`.
 */
export function SiteSettingsForm({ settings }: { settings: AdminSiteSettings }) {
  const t = useTranslations('Admin')
  const tAvail = useTranslations('Availability')
  const router = useRouter()
  const [form, setForm] = useState<SiteSettingsInput>({
    availabilityState: settings.availabilityState,
    nextOpening: settings.nextOpening,
    responseCommitment: settings.responseCommitment,
    timezone: settings.timezone,
    languages: settings.languages,
    externalProfiles: settings.externalProfiles,
    contactEmail: settings.contactEmail,
    whatsappNumber: settings.whatsappNumber,
    phoneNumber: settings.phoneNumber,
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    setSaved(false)
    const result = await updateSiteSettings(form)
    if (!result.ok) {
      setError(result.code === 'invalid' ? t('cmsErrorInvalid') : t('errorForbidden'))
      setPending(false)
      return
    }
    setPending(false)
    setSaved(true)
    router.refresh()
  }

  function updateLanguage(index: number, next: SiteSettingsInput['languages'][number]) {
    setForm({ ...form, languages: form.languages.map((l, i) => (i === index ? next : l)) })
  }
  function removeLanguage(index: number) {
    setForm({ ...form, languages: form.languages.filter((_, i) => i !== index) })
  }

  function updateProfile(index: number, next: SiteSettingsInput['externalProfiles'][number]) {
    setForm({ ...form, externalProfiles: form.externalProfiles.map((p, i) => (i === index ? next : p)) })
  }
  function removeProfile(index: number) {
    setForm({ ...form, externalProfiles: form.externalProfiles.filter((_, i) => i !== index) })
  }

  return (
    <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="settings-availability">{t('cmsFieldAvailabilityState')}</FieldLabel>
              <Select value={form.availabilityState} onValueChange={(v) => v && setForm({ ...form, availabilityState: v as AvailabilityState })} disabled={pending}>
                <SelectTrigger id="settings-availability">
                  <SelectValue>{tAvail(form.availabilityState)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {tAvail(state)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-next-opening">{t('cmsFieldNextOpening')}</FieldLabel>
              <Input id="settings-next-opening" type="date" dir="ltr" value={form.nextOpening ?? ''} disabled={pending} onChange={(e) => setForm({ ...form, nextOpening: e.target.value || null })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-timezone">{t('cmsFieldTimezone')}</FieldLabel>
              <Input id="settings-timezone" dir="ltr" value={form.timezone} disabled={pending} required onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </Field>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{t('cmsHintAvailability')}</p>
          <LocalizedTextField id="settings-response-commitment" label={t('cmsFieldResponseCommitment')} value={form.responseCommitment} onChange={(v) => setForm({ ...form, responseCommitment: v })} required disabled={pending} hint={t('cmsHintResponseCommitment')} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div>
            <p className="text-sm font-medium text-foreground">{t('cmsContactChannelsTitle')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('cmsContactChannelsHint')}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="settings-email">{t('cmsFieldContactEmail')}</FieldLabel>
              <Input id="settings-email" type="email" dir="ltr" value={form.contactEmail ?? ''} disabled={pending} onChange={(e) => setForm({ ...form, contactEmail: e.target.value || null })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-whatsapp">{t('cmsFieldWhatsappNumber')}</FieldLabel>
              <Input id="settings-whatsapp" type="tel" dir="ltr" value={form.whatsappNumber ?? ''} placeholder="+93…" disabled={pending} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value || null })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-phone">{t('cmsFieldPhoneNumber')}</FieldLabel>
              <Input id="settings-phone" type="tel" dir="ltr" value={form.phoneNumber ?? ''} placeholder="+93…" disabled={pending} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value || null })} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm font-medium text-foreground">{t('cmsFieldLanguages')}</p>
          {form.languages.map((lang, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <LocalizedTextField id={`lang-${index}-name`} label={t('cmsFieldLanguageName')} value={lang.name} disabled={pending} onChange={(name) => updateLanguage(index, { ...lang, name })} />
              <LocalizedTextField id={`lang-${index}-note`} label={t('cmsFieldLanguageNote')} value={lang.note} disabled={pending} onChange={(note) => updateLanguage(index, { ...lang, note })} />
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => removeLanguage(index)} className="self-start text-destructive-text">
                <Trash2 aria-hidden="true" data-icon="inline-start" />
                {t('cmsDelete')}
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setForm({ ...form, languages: [...form.languages, { name: emptyLocalized(), note: emptyLocalized() }] })} className="self-start">
            <Plus aria-hidden="true" data-icon="inline-start" />
            {t('cmsAddLanguage')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm font-medium text-foreground">{t('cmsFieldExternalProfiles')}</p>
          {form.externalProfiles.map((profile, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input dir="ltr" value={profile.label} disabled={pending} placeholder={t('cmsFieldProfileLabel')} onChange={(e) => updateProfile(index, { ...profile, label: e.target.value })} className="max-w-40" />
              <Input dir="ltr" type="url" value={profile.href} disabled={pending} placeholder="https://" onChange={(e) => updateProfile(index, { ...profile, href: e.target.value })} className="flex-1" />
              <Button type="button" variant="ghost" size="icon-sm" disabled={pending} onClick={() => removeProfile(index)} aria-label={t('cmsDelete')}>
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setForm({ ...form, externalProfiles: [...form.externalProfiles, { href: '', label: '' }] })} className="self-start">
            <Plus aria-hidden="true" data-icon="inline-start" />
            {t('cmsAddProfile')}
          </Button>
        </CardContent>
      </Card>

      {error ? <FormMessage variant="destructive">{error}</FormMessage> : null}
      {saved && !error ? <FormMessage variant="success">{t('cmsSettingsSaved')}</FormMessage> : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t('cmsSaving') : t('cmsSaveChanges')}
      </Button>
    </form>
  )
}
