/**
 * Test helper: the notification kinds `db/migrations/0019_consultations.sql`
 * allows, read out of the migration file itself, so the TypeScript list and the
 * SQL `check` constraint cannot drift apart unnoticed.
 */
import { readFileSync } from 'node:fs'

const sql = readFileSync(new URL('../db/migrations/0019_consultations.sql', import.meta.url), 'utf8')
const start = sql.lastIndexOf('notification_outbox_kind_check')
const block = sql.slice(start)
const kinds = [...block.matchAll(/'([a-z-]+)'/g)].map((match) => match[1])

export const KIND_LABEL_FOR_TESTS = { migrationKinds: [...new Set(kinds)] }
