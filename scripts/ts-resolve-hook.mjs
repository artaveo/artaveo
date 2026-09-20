/**
 * Module-resolution hook for the zero-dependency test scripts
 * (`scripts/test-articles.mjs`, `scripts/test-search.mjs`,
 * `scripts/test-notifications.mjs`).
 *
 * The app's source uses the bundler conventions `tsconfig.json` is set up
 * for — extensionless relative imports (`from './markdown'`) and the `@/`
 * path alias — while Node's native TypeScript stripping wants a real path
 * ending in `.ts`. This hook maps both onto real files so the tests can
 * import the actual source unchanged.
 */
const ROOT = new URL('../', import.meta.url)
const hasExtension = (specifier) => /\.[cm]?[jt]s$/.test(specifier)

export async function resolve(specifier, context, nextResolve) {
  // Phase 19: `server-only` deliberately throws when imported outside a React
  // Server Components build. The notification code is server-only in the app
  // but must be importable by the Node test runner, so here (and only here)
  // the guard resolves to an empty module.
  if (specifier === 'server-only') {
    return { url: 'data:text/javascript,', shortCircuit: true }
  }

  // Phase 21: the Next.js runtime modules the server actions import cannot load
  // under plain Node. Route them to stand-ins so the real actions run against a
  // real database in the integration suite (tests/support/stubs/next-runtime.mjs).
  if (specifier === 'next/headers' || specifier === 'next/cache' || specifier === 'next/navigation') {
    return { url: new URL('../tests/support/stubs/next-runtime.mjs', import.meta.url).href, shortCircuit: true }
  }

  // `@/lib/search/scoring` → <repo>/lib/search/scoring.ts  (Phase 18)
  if (specifier.startsWith('@/')) {
    const target = new URL(specifier.slice(2), ROOT).href
    return nextResolve(hasExtension(target) ? target : `${target}.ts`, context)
  }

  if (/^\.\.?\//.test(specifier) && !hasExtension(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context)
    } catch {
      // fall through to the default resolution
    }
  }
  return nextResolve(specifier, context)
}
