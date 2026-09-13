'use client'

import { Download, RefreshCw, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Chrome/Edge/Android fire `beforeinstallprompt` instead of showing their
 * own UI when the page calls `preventDefault()` on it — that's the hook
 * this whole install affordance depends on. Firefox and Safari never fire
 * it at all (iOS Safari's install path is the OS Share sheet, which this
 * component correctly has no way to trigger or improve — nothing to do
 * there per § 10.1's "follows platform conventions" rule).
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Registers the § 10.1 service worker (lifecycle only — see
 * `scripts/generate-sw.mjs`) and surfaces exactly two, mutually-independent
 * pieces of UI, both dismissible and both absent by default:
 *
 * 1. **Update available** — a new deploy's worker finished installing
 *    while this tab had an older one active. Never appears on a visitor's
 *    very first visit (there's nothing to update from yet).
 * 2. **Install** — the browser is willing to install the site as an app.
 *    Deliberately plain: no delay-then-pounce timer, no repeat-visit
 *    counting, no re-showing after a dismissal within the same session.
 *    That's the "never a custom nagging banner" rule from § 10.1 — the
 *    browser already decided the moment is right by firing the event at
 *    all; piling on more heuristics on top of that would be the nagging
 *    part, not the presence of the affordance itself.
 *
 * Renders nothing in development — a service worker controlling `next dev`
 * would fight its own hot-reloading over which bundle is "current".
 */
export function PwaManager() {
  const t = useTranslations('Pwa')
  const [updateReady, setUpdateReady] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installDismissed, setInstallDismissed] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // A worker was already waiting before this page even registered —
      // e.g. a previous tab installed it and this is a fresh navigation.
      if (registration.waiting && navigator.serviceWorker.controller) {
        setUpdateReady(true)
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          // `controller` only exists once a worker has already taken this
          // page before — that's what distinguishes "first install, ready
          // to work offline" (no prompt needed) from "a real update just
          // finished installing" (prompt the reload).
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateReady(true)
          }
        })
      })
    }).catch(() => {
      // Best-effort — a registration failure should never block the page.
    })
  }, [])

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setInstallEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function handleReload() {
    navigator.serviceWorker.getRegistration().then((registration) => {
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    })
  }

  async function handleInstall() {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }

  const showInstall = installEvent && !installDismissed && !updateReady

  if (!updateReady && !showInstall) return null

  return (
    <div
      className={cn(
        'fixed inset-x-4 bottom-4 z-toast flex justify-center sm:inset-x-auto sm:end-4',
      )}
    >
      {updateReady ? (
        <div className="flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg">
          <RefreshCw aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <p className="font-medium">{t('updateTitle')}</p>
              <p className="text-muted-foreground">{t('updateDescription')}</p>
            </div>
            <Button size="sm" onClick={handleReload} className="self-start">
              {t('reload')}
            </Button>
          </div>
        </div>
      ) : showInstall ? (
        <div className="flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg">
          <Download aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <p className="font-medium">{t('installTitle')}</p>
              <p className="text-muted-foreground">{t('installDescription')}</p>
            </div>
            <Button size="sm" onClick={handleInstall} className="self-start">
              {t('install')}
            </Button>
          </div>
          <button
            type="button"
            aria-label={t('dismiss')}
            onClick={() => setInstallDismissed(true)}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded outline-none transition-colors hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
