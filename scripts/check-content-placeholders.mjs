#!/usr/bin/env node
/**
 * Build guard: fails the build if published content still contains an
 * unresolved placeholder such as `[CLIENT_NAME]`.
 *
 * See ROAD-MAP-ARTAVEO.md § 3.1 (content truth pass) and § 16.3
 * (placeholders). Draft placeholders such as `[CLIENT_NAME]`,
 * `[PROJECT_YEAR]`, `[PROJECT_URL]` or `[RECOMMENDATION]` are fine while
 * writing, but must never reach a build that ships.
 *
 * The pattern only matches bracketed UPPER_SNAKE_CASE tokens (e.g.
 * `[CLIENT_NAME]`), so it never fires on Tailwind arbitrary values like
 * `[38%]` or `[5px]`, which are lowercase/numeric.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PLACEHOLDER_PATTERN = /\[[A-Z][A-Z0-9_]*\]/g

/** Files that hold published, user-facing content. Extend as `content/` grows. */
const CONTENT_FILES = ['lib/home-content.ts', 'lib/site.ts', 'lib/services-content.ts']

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let hasPlaceholder = false

for (const relPath of CONTENT_FILES) {
  const filePath = path.join(root, relPath)
  let source
  try {
    source = readFileSync(filePath, 'utf8')
  } catch {
    continue // file may not exist yet in earlier phases
  }

  const matches = source.match(PLACEHOLDER_PATTERN)
  if (matches && matches.length > 0) {
    hasPlaceholder = true
    console.error(`\n✖ Unresolved placeholder(s) in ${relPath}:`)
    for (const match of new Set(matches)) {
      console.error(`  - ${match}`)
    }
  }
}

if (hasPlaceholder) {
  console.error(
    '\nBuild stopped: published content still contains a placeholder.\n' +
      'Replace it with real content, or remove/unpublish the item, before building.\n' +
      'See ROAD-MAP-ARTAVEO.md § 3.1 and § 16.3.\n',
  )
  process.exit(1)
}

console.log(`✓ Content placeholder check passed (${CONTENT_FILES.join(', ')})`)
