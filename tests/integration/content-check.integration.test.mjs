/**
 * Phase 32.3 — the public-copy gate reads the database too. Here it runs
 * against the test stack, seeded by the real import script from the real
 * content seeds: what the import writes must pass the same rules (§ 16) the
 * build applies to the files.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import '../support/stack-env.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('content check with --db (§ 16, Phase 32.3)', () => {
  it('passes on the imported content and says the database was read', () => {
    const run = spawnSync(process.execPath, ['--no-warnings', '--import', './scripts/register-ts-resolve.mjs', 'scripts/check-content.mjs', '--db'], {
      cwd: ROOT,
      env: process.env,
      encoding: 'utf8',
    })
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`)
    assert.match(run.stdout, /database checked \(\d+ published projects, \d+ services\)/)
  })
})
