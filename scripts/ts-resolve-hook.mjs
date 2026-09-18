/**
 * Module-resolution hook for `scripts/test-articles.mjs`: the app's source
 * uses extensionless relative imports (`from './markdown'`, the bundler
 * convention `tsconfig.json` is set up for); Node's native TypeScript
 * stripping wants the `.ts` suffix. This retries an extensionless relative
 * import with `.ts` so the tests can import the real source files unchanged.
 */
export async function resolve(specifier, context, nextResolve) {
  if (/^\.\.?\//.test(specifier) && !/\.[cm]?[jt]s$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context)
    } catch {
      // fall through to the default resolution
    }
  }
  return nextResolve(specifier, context)
}
