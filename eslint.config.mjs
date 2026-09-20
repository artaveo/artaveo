import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/**
 * Lint policy (Phase 22).
 *
 * ERRORS (block a merge): everything in `eslint-config-next` that is a real defect —
 * rules of hooks, missing `key`, unsafe links, unused expressions, accessibility rules
 * of `jsx-a11y`, `no-html-link-for-pages`, … .
 *
 * WARNINGS (allowed, but may not GROW): the count is capped by `--max-warnings` in the
 * `lint` script of package.json. Lower that number whenever you fix some; it may never
 * go up without a reason in the pull request. What is a warning, and why:
 *   - `@typescript-eslint/no-explicit-any` — the Supabase row mappers in `lib/admin/content.ts`
 *     and `lib/supabase/content-queries.ts` deliberately read untyped JSON rows. Generating
 *     database types (Phase 24/25 debt) removes most of them.
 *   - the React-Compiler-era rules of `eslint-plugin-react-hooks` (`set-state-in-effect`,
 *     `purity`, `static-components`, `immutability`): the project does not use the React
 *     Compiler, and the flagged patterns are common and work (a `mounted` flag set in an
 *     effect; `Date.now()` captured once for the bot-timing check). Worth cleaning up before
 *     the compiler is adopted, not worth blocking a release for.
 *   - unused variables (a leading `_` is allowed).
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  {
    // The root not-found page renders outside any locale, so it cannot use the locale-aware
    // <Link>; its plain <a href="/en"> is deliberate (see the comment in the file).
    files: ['app/not-found.tsx'],
    rules: { '@next/next/no-html-link-for-pages': 'off' },
  },
  {
    // next-intl's documented way to type message keys: an empty interface that extends the messages type.
    files: ['global.d.ts'],
    rules: { '@typescript-eslint/no-empty-object-type': 'off' },
  },
  {
    // Playwright's fixture callback is called `use`; that is not a React hook.
    files: ['tests/e2e/**'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  globalIgnores(['.next/**', 'node_modules/**', 'public/sw.js', 'test-results/**', 'playwright-report/**', '.test-stack/**', 'next-env.d.ts']),
])
