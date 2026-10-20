import { getTranslations } from 'next-intl/server'

import type { LocalizedText } from '@/types/content'

export type WayOfWorkingStep = { title: LocalizedText; line: LocalizedText }

/**
 * Artaveo's way of working in four steps (§ 14.0 Process Steps) — shown on
 * Home and in the process part of /services (Phase 31.2, which replaced the
 * old /process page). The copy lives in `messages/*.json` (`WayOfWorking`);
 * both languages are read so `ProcessSteps` can take ordinary localized text.
 */
export async function getWayOfWorkingSteps(): Promise<WayOfWorkingStep[]> {
  const [en, fa] = await Promise.all([
    getTranslations({ locale: 'en', namespace: 'WayOfWorking' }),
    getTranslations({ locale: 'fa', namespace: 'WayOfWorking' }),
  ])
  return ([1, 2, 3, 4] as const).map((n) => ({
    title: { en: en(`step${n}Title`), fa: fa(`step${n}Title`) },
    line: { en: en(`step${n}Line`), fa: fa(`step${n}Line`) },
  }))
}
