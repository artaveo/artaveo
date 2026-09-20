import { THEME_STORAGE_KEY } from '@/lib/theme'

/*
 * Phase 23: this string lives in its own module because two places need the SAME
 * bytes — the root layout renders it inline, and the admin's Content Security
 * Policy allows exactly it by hash (`lib/security/csp.ts`), since a nonce cannot
 * be put on a script inside a statically rendered layout. Change the text and
 * both follow; nothing may build it from anything request-specific.
 */
/**
 * Theme only. Locale/direction no longer belong here (§ 5.1) — `lang` and
 * `dir` are now set server-side below from the `[locale]` segment, with no
 * client-side flip and no flash. `artaveo-lang` in `localStorage` is dead;
 * the source of truth is the `artaveo-locale` cookie set by the middleware.
 *
 * This blocking script only prevents a flash on the very first paint of a
 * hard page load. Client-side navigations (e.g. the language switcher) are
 * handled separately by `<ThemeSync>` below — see its doc comment for why
 * that's needed on top of this script.
 */
export const themeScript = `
(function () {
  try {
    var root = document.documentElement;
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored ? stored === 'dark' : systemDark;
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
  } catch (e) {}
})();
`
