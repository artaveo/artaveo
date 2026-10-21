import type { Page } from '@playwright/test'

import { auditGlass, blurringLayers } from './glass-audit'
import { expect, msg, ROUTES, test } from './support'

/**
 * Phase 34 — certification checks on the finished pages (not the showcase):
 *
 * - glass contrast against the worst background behind every glass surface,
 *   with the page at rest, with a mega menu open and with the mobile menu
 *   open; at most three glass layers in the viewport (§ 14.1);
 * - with `prefers-reduced-transparency`, nothing on the page blurs;
 * - with `prefers-reduced-motion`, no transition or animation lasts longer
 *   than a frame, even on hover, and nothing waits to be revealed.
 *
 * How the glass audit reasons about "the worst background" is in glass-audit.ts.
 */
const setTheme = (page: Page, theme: 'light' | 'dark') =>
  page.evaluate((t) => {
    localStorage.setItem('artaveo-theme', t)
    document.documentElement.classList.toggle('dark', t === 'dark')
    document.documentElement.classList.toggle('light', t === 'light')
  }, theme)

async function expectGlassReadable(page: Page, label: string) {
  const audit = await auditGlass(page)
  expect(audit.failures, `text on glass below 4.5:1 against its worst background — ${label}`).toEqual([])
  expect(audit.layersInViewport, `glass layers in the viewport — ${label}`).toBeLessThanOrEqual(3)
  return audit
}

const DARK_TOO = ['home', 'product page', 'service detail', 'case study']

test.describe('glass: readable over the worst background, at most three layers', () => {
  for (const locale of ['en', 'fa'] as const) {
    for (const [label, route] of ROUTES) {
      const themes = DARK_TOO.includes(label) ? (['light', 'dark'] as const) : (['light'] as const)
      for (const theme of themes) {
        test(`${label} (${locale}, ${theme})`, async ({ page }) => {
          await page.goto(`/${locale}${route}`)
          if (theme === 'dark') await setTheme(page, 'dark')
          const atRest = await expectGlassReadable(page, `${label} ${locale} ${theme}`)
          expect(atRest.checked, 'the header’s text was found on glass').toBeGreaterThan(0)
          await page.mouse.wheel(0, 1600)
          await expectGlassReadable(page, `${label} ${locale} ${theme}, scrolled`)
        })
      }
    }
  }

  test('with a mega menu open (en, fa)', async ({ page }) => {
    for (const locale of ['en', 'fa'] as const) {
      await page.goto(`/${locale}`)
      const menus = page.locator('[data-slot="glass-header"] nav button[aria-expanded]')
      const count = await menus.count()
      for (let i = 0; i < count; i++) {
        await menus.nth(i).click()
        await expect(menus.nth(i)).toHaveAttribute('aria-expanded', 'true')
        await expectGlassReadable(page, `${locale} menu ${i + 1}`)
        await page.keyboard.press('Escape')
      }
    }
  })

  test('with the mobile menu open (en, fa) @mobile', async ({ page }) => {
    for (const locale of ['en', 'fa'] as const) {
      await page.goto(`/${locale}`)
      await page.getByRole('button', { name: msg(locale, 'Brand.openMenu') }).click()
      await expect(page.getByRole('navigation', { name: msg(locale, 'Brand.mobileNav') })).toBeVisible()
      await expectGlassReadable(page, `${locale} mobile menu`)
    }
  })
})

test.describe('reduced transparency: nothing blurs', () => {
  for (const [label, route] of ROUTES.filter(([l]) => ['home', 'product page', 'service detail', 'case study', 'work index'].includes(l))) {
    test(`${label} (en, fa)`, async ({ page }) => {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
      for (const locale of ['en', 'fa']) {
        await page.goto(`/${locale}${route}`)
        expect(await blurringLayers(page), `${label} ${locale}`).toEqual([])
      }
    })
  }

  test('with a menu open', async ({ page }) => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })
    await page.goto('/en')
    const menu = page.locator('[data-slot="glass-header"] nav button[aria-expanded]').first()
    if ((await menu.count()) > 0) await menu.click()
    expect(await blurringLayers(page)).toEqual([])
  })
})

test.describe('reduced motion: nothing moves', () => {
  // The suite's default context asks for reduced motion (playwright.config.ts).
  for (const [label, route] of ROUTES.filter(([l]) => ['home', 'work index', 'product page', 'services index', 'service detail'].includes(l))) {
    test(`${label}`, async ({ page }) => {
      await page.goto(`/en${route}`)
      const longer = () =>
        page.evaluate(() =>
          document
            .getAnimations()
            .filter((a) => Number(a.effect?.getTiming().duration ?? 0) > 1)
            .map((a) => `${(a as CSSTransition).transitionProperty ?? (a as CSSAnimation).animationName} on ${(a.effect as KeyframeEffect | null)?.target?.tagName}`),
        )
      const card = page.locator('main a[href]').first()
      await card.hover()
      expect(await longer(), 'transitions longer than a frame').toEqual([])
      await page.mouse.wheel(0, 20000)
      expect(await longer(), 'after scrolling').toEqual([])
      expect(await page.locator('[data-reveal="pending"]').count()).toBe(0)
    })
  }
})

test.describe('keyboard: an open menu comes next in the tab order', () => {
  for (const locale of ['en', 'fa'] as const) {
    test(`Enter, Tab into the panel, Shift+Tab back (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}`)
      const trigger = page.locator('[data-slot="glass-header"] nav button[aria-expanded]').first()
      await trigger.focus()
      await page.keyboard.press('Enter')
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      const panelId = await trigger.getAttribute('aria-controls')
      await page.keyboard.press('Tab')
      expect(await page.evaluate((id) => Boolean(id && document.getElementById(id)?.contains(document.activeElement)), panelId)).toBe(true)
      await page.keyboard.press('Shift+Tab')
      await expect(trigger).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })
  }
})
