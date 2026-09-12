export const THEME_STORAGE_KEY = 'artaveo-theme'

/**
 * Reads the stored/system theme preference and applies the `dark`/`light`
 * class to `<html>`. Shared by the blocking inline script in
 * `app/[locale]/layout.tsx` (first paint, no flash) and `ThemeSync` /
 * `ThemeToggle` (re-applied after every client-side navigation — see
 * `components/theme-sync.tsx` for why that's needed).
 */
export function applyStoredTheme(): boolean {
  const root = document.documentElement
  let isDark = root.classList.contains('dark')
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    isDark = stored ? stored === 'dark' : systemDark
  } catch {
    // localStorage unavailable — keep whatever is already on the root element.
  }
  root.classList.toggle('dark', isDark)
  root.classList.toggle('light', !isDark)
  return isDark
}
