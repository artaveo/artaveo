# ADR-001 — Bilingual storage strategy for the Phase 12 database

**Status:** Accepted
**Date:** 15 September 2026
**Phase:** 12 — Data Model & Migrations

## Context

Every translatable field in the current typed content layer (`types/content.ts`)
is a `LocalizedText = { en: string; fa: string }` — a Persian and an English
value that are always written, read and rendered together as a single unit
(principle 9, "typed content mirrors the future database"). Phase 12 moves
this content into PostgreSQL. Before the first migration, this ADR decides
how that shape is represented as columns.

Three options were considered:

1. **Per-locale columns** — `title_en text, title_fa text` on the same row.
2. **`*_translations` join tables** — a parent row plus one child row per
   locale (`project_translations(project_id, locale, title, …)`).
3. **`jsonb` localized-value columns** — one column, e.g. `title jsonb`,
   holding `{"en": "...", "fa": "..."}` directly.

## Decision

**Option 3 — `jsonb` localized-value columns**, with a `check` constraint
requiring both the `en` and `fa` keys to be present on every non-null value:

```sql
title jsonb not null check (title ? 'en' and title ? 'fa')
```

Array-shaped translatable fields (`highlights: LocalizedText[]`,
`constraints: LocalizedText[]`, etc.) are stored as a single `jsonb` array of
`{en, fa}` objects, e.g. `highlights jsonb not null default '[]'`, with a
`jsonb_typeof(highlights) = 'array'` check. This keeps each pair's `en` and
`fa` values physically bound together in one array element — the failure
mode option 1 has for array fields (two parallel `text[]` columns can drift
out of index alignment) is structurally impossible here.

## Reasoning

- **Exact mirror of the TypeScript shape.** `LocalizedText` is already
  `{ en, fa }`. A `jsonb` column round-trips to and from that exact shape
  with no reconstruction logic in the selector layer — `row.title` *is*
  `LocalizedText`. Per-locale columns would need `{ en: row.title_en, fa:
  row.title_fa }` reassembly on every read, and translations tables would
  need a join plus a pivot on every read.
- **One representation for both singular and array fields.** Options 1 and 2
  need a different pattern for `LocalizedText` vs `LocalizedText[]` (twin
  columns don't extend to arrays without an extra join table per array
  field; translations tables need a separate child table per array field
  too). `jsonb` handles both with the same column type.
- **No premature normalization.** A `*_translations` table earns its cost
  when locales are drafted, reviewed or published independently of each
  other. Nothing in Phase 3–11's content model does that today — `en` and
  `fa` are always written and published together by the one owner. If
  Phase 15 (CMS) later needs true per-locale draft/publish workflows, that
  is a real, separate migration at that time, not a cost paid now for a
  workflow that doesn't exist yet.
- **Rejected: per-locale columns.** Doubles the column count on every
  translatable table, cannot represent array fields cleanly, and the
  parallel-array drift risk above is a real correctness hazard for fields
  like `highlights` and `constraints` where item order carries meaning.
- **Rejected: `*_translations` tables.** Correct for content with
  independent per-locale lifecycles or many locales; here it adds a join to
  every single read of every page, for two locales that are always
  maintained together. Revisit if Phase 15 introduces per-locale
  draft/publish.

## Consequences

- Every translatable column in the Phase 12 migrations (`db/migrations/0003`
  onward) uses this pattern: `field jsonb [not null] check (field ? 'en' and
  field ? 'fa')` for singular values, `field jsonb not null default '[]'
  check (jsonb_typeof(field) = 'array')` for lists.
- Proper nouns and non-translatable fields (`technologies.name`, URLs,
  slugs, enums, numbers, dates) stay as native Postgres types — this
  decision only applies to fields typed `LocalizedText` / `LocalizedText[]`
  in `types/content.ts`.
- The Phase 12.2 selector layer (deferred — see `ROAD-MAP-ARTAVEO.md` § 12)
  reads a `jsonb` column and gets a `LocalizedText`-shaped object back with
  no transformation step, keeping `t(field, locale)` from `types/content.ts`
  usable unchanged against database rows.
- If a future need for independent per-locale publishing emerges, migrating
  from `jsonb` to a `*_translations` table is a contained, mechanical change
  (one migration per affected table) — it does not touch every table at
  once, since only the tables that actually need it would move.
