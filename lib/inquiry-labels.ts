import {
  budgetBandOptions,
  featureTagOptions,
  preferredChannelOptions,
  timelineOptions,
  type OptionDef,
} from '@/lib/inquiry-content'
import { t, type Locale, type LocalizedText } from '@/types/content'

/**
 * Phase 27 (owner's review) — a request's stored codes ("1-3-months",
 * "whatsapp", "user-accounts") as the words the customer chose, in the admin's
 * language. An unknown code (an option retired since) is shown as it is, so
 * nothing is hidden.
 */
function label<Id extends string>(options: OptionDef<Id>[], value: string | null | undefined, locale: Locale): string | null {
  if (!value) return null
  const option = options.find((o) => o.id === value)
  return option ? t(option.label, locale) : value
}

export const timelineLabel = (value: string | null | undefined, locale: Locale) => label(timelineOptions, value, locale)
export const budgetLabel = (value: string | null | undefined, locale: Locale) => label(budgetBandOptions, value, locale)
export const channelLabel = (value: string | null | undefined, locale: Locale) => label(preferredChannelOptions, value, locale)
export const featureLabel = (value: string, locale: Locale) => label(featureTagOptions, value, locale) ?? value

const LANGUAGES: Record<string, LocalizedText> = {
  en: { en: 'English', fa: 'انگلیسی' },
  fa: { en: 'Dari', fa: 'دری' },
}

export function languageLabel(value: string | null | undefined, locale: Locale): string | null {
  if (!value) return null
  return LANGUAGES[value] ? t(LANGUAGES[value], locale) : value
}
