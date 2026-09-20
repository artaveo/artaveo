/**
 * Upload rules shared by the admin library and the public Brief Builder
 * (lib/media-upload.ts). The limits are compared with the values the
 * `media` bucket itself is created with in migration 0012, so the code and
 * the database cannot drift apart.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { ALLOWED_MEDIA_MIME_TYPES, MAX_MEDIA_FILE_SIZE_BYTES, MEDIA_BUCKET, clampFocal, safeStoragePath } from '../../lib/media-upload.ts'

const migration = readFileSync(new URL('../../db/migrations/0012_media_storage_and_inquiry_attachments.sql', import.meta.url), 'utf8')

describe('limits match the bucket (migration 0012)', () => {
  it('file size limit', () => {
    const sqlLimit = Number(/file_size_limit[\s\S]*?values\s*\(\s*'media',\s*'media',\s*true,\s*(\d+)/.exec(migration)?.[1])
    assert.equal(MAX_MEDIA_FILE_SIZE_BYTES, sqlLimit)
  })
  it('allowed MIME types', () => {
    const block = /array\[([^\]]+)\]/.exec(migration.slice(migration.indexOf('insert into storage.buckets')))[1]
    const sqlTypes = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1])
    assert.deepEqual([...ALLOWED_MEDIA_MIME_TYPES].sort(), sqlTypes.sort())
  })
  it('bucket name', () => assert.equal(MEDIA_BUCKET, 'media'))
  it('executable / active formats are not allowed', () => {
    for (const type of ['text/html', 'application/javascript', 'application/pdf', 'application/x-msdownload']) {
      assert.ok(!ALLOWED_MEDIA_MIME_TYPES.includes(type), type)
    }
  })
})

describe('safeStoragePath', () => {
  const SAFE = /^[a-z0-9]+-[a-z0-9]+-[a-z0-9-]+(\.[a-z0-9]+)?$/
  it('keeps a normal name recognisable and lower-cases the extension', () => {
    const out = safeStoragePath('My Screenshot.PNG')
    assert.match(out, SAFE)
    assert.ok(out.endsWith('-my-screenshot.png'), out)
  })
  it('never lets a path separator or traversal through', () => {
    for (const hostile of ['../../etc/passwd', '..\\..\\windows\\system32\\cmd.exe', '/absolute/path.png', 'a/b/c.png', 'x\0y.png']) {
      const out = safeStoragePath(hostile)
      assert.ok(!/[\\/]/.test(out) && !out.includes('..') && !out.includes('\0'), `${hostile} → ${out}`)
      assert.match(out, SAFE, `${hostile} → ${out}`)
    }
  })
  it('strips non-ASCII (no homograph names) and survives a name with nothing usable', () => {
    assert.match(safeStoragePath('نمونه.png'), /-file\.png$/)
    assert.match(safeStoragePath('...'), SAFE)
    assert.match(safeStoragePath(''), /-file$/)
  })
  it('a double extension keeps only the last, as extension', () => {
    const out = safeStoragePath('archive.tar.gz')
    assert.ok(out.endsWith('-archive-tar.gz'), out)
  })
  it('the extension cannot smuggle characters', () => {
    assert.ok(/\.[a-z0-9]+$/.test(safeStoragePath('x.p n/g')) || !safeStoragePath('x.p n/g').includes('.'))
  })
  it('caps a very long name', () => {
    assert.ok(safeStoragePath(`${'a'.repeat(500)}.png`).length < 100)
  })
  it('two uploads of the same file never collide', () => {
    const names = new Set(Array.from({ length: 200 }, () => safeStoragePath('same.png')))
    assert.equal(names.size, 200)
  })
})

describe('clampFocal', () => {
  it('clamps to [0, 1] and defaults NaN to the centre', () => {
    assert.deepEqual([clampFocal(-1), clampFocal(0.25), clampFocal(7)], [0, 0.25, 1])
    assert.equal(clampFocal(Number.NaN), 0.5)
  })
})
