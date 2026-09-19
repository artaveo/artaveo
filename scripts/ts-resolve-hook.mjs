/**
 * Module-resolution hook for the zero-dependency test scripts
 * (`scripts/test-articles.mjs`, `scripts/test-search.mjs`).
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
