# Phase 12.1 — Data Model & Migrations: ADR + core schema

**Status:** ✅ COMPLETE
**Date:** 15 September 2026

## Objective

Phase 12's own scope (roadmap § 12) is four action items: an ADR for
bilingual storage before the first migration, versioned SQL migrations for
the core entities table, a one-way import script from the current
file-based content into the database, and RLS on every table. Given the
size of that (~20 entities, plus an import script and a selector-layer
rewrite touching nearly every page component in the app), it is split the
same way Phases 9 and 11 were: **12.1** (this session) covers the ADR and
the full schema, live and verified in Supabase. **12.2** (next session)
covers the import script and switching the selector layer over — deferred
deliberately, not silently dropped (see "Deferred to 12.2" below).

## Scope

- `docs/adr/ADR-001-bilingual-storage.md` — decided before writing any DDL, per § 12's own ordering
- `db/migrations/0003`–`0009` — every entity in § 12's core-entities table, applied to the live Supabase project (`ukzovqnpqjcrwofycalc`)
- RLS enabled on all 24 tables; public `select` policies for published/public content, service-role-only (no policies) for lead/admin/business data

## Implementation summary

### ADR-001 — bilingual storage

Considered per-locale columns (`title_en`/`title_fa`), `*_translations`
child tables, and `jsonb` localized-value columns. Chose `jsonb`: it is an
exact, lossless mirror of `types/content.ts#LocalizedText = { en, fa }`
with no reassembly step on read, it handles both singular fields and
`LocalizedText[]` array fields with the same pattern (a `jsonb` array of
`{en, fa}` objects, which — unlike two parallel `text[]` columns — makes
index-misalignment between the two languages structurally impossible), and
it avoids paying a join-per-read cost for two locales that are always
authored and published together today. Full reasoning and the rejected
alternatives are in the ADR itself.

### Schema — six migrations, one per entity group

| Migration | Tables |
|---|---|
| `0003_projects_and_technologies` | `technologies`, `projects`, `project_sections`, `project_media`, `project_technologies` |
| `0004_services_and_packages` | `services`, `service_process_steps`, `service_packages`, `service_addons`, `service_technologies`, `engagement_models`, `faqs` |
| `0005_recommendations_and_articles` | `recommendations`, `articles` |
| `0006_lead_pipeline_and_consultations` | `inquiries` (+`priority`, `+follow_up_at` columns), `consultations` |
| `0007_media_settings_and_navigation` | `media_assets`, `site_settings` (seeded), `navigation_items` (seeded), `redirects` |
| `0008_admin_and_audit` | `admin_users`, `audit_log` |
| `0009_schema_lint_fixes` | fixes only — see "Advisor pass" below |

### Schema notes — deliberate departures from § 12's literal table, recorded not silent

- **`project_sections` normalization.** § 12's own table already specifies
  this design ("project_sections \| projectId, type (context, problem,
  architecture, decision, highlight…), body\*, sortOrder") rather than flat
  columns on `projects` — implemented exactly that way. `project_sections.type`
  is a closed vocabulary covering all nine singular case-study prose fields
  from `types/content.ts#Project` plus `constraint` (one row per
  `constraints[]` item) and `key-decision` (one row per `keyDecisions[]`
  item, `body` = `{context, decision, tradeoff}` each `{en, fa}`).
- **Column names follow the live code, not § 12's prose where they
  differ.** § 12 calls a `projects` field "excerpt" and a `services` field
  "promise"; the current `Project`/`Service` types (`types/content.ts`) call
  the equivalent fields `summary` and `tagline`. Columns are named
  `summary` and `tagline` — principle 9 is "typed content mirrors the
  future database," and the live TypeScript type is the source of truth
  the Phase 12.2 selector layer has to match.
- **`service_process_steps` added.** Not in § 12's summary table, but
  `Service.process: ServiceProcessStep[]` exists in the live type and
  needed a home — a real field in code is not something Phase 12 can
  leave out just because the roadmap's own entity summary predates it.
- **`admin_users`/`roles` — one table, not two.** Phase 13 fixes the role
  set at exactly `owner`/`editor` with no sign of either phase intending a
  growing, admin-editable list. Used a `check` constraint enum on
  `admin_users.role` instead of a second `roles` table — same "ship the
  honest mechanism, not unused structure" reasoning D-13 already applied
  to the deposit/warranty figures. Promoting this to a real table later is
  a contained, one-table migration if a real need for role metadata shows up.
- **No new `outbox_messages` table.** `notification_outbox` (0002,
  Phase 9.3) already implements the outbox pattern for the one domain that
  uses it today (inquiry notifications). § 12's `outbox_messages` entity
  and Phase 19's own description — "generalises the pattern beyond
  inquiries" — describe exactly this widening as Phase 19's job, not
  Phase 12's. Creating a second, currently-unused generic table now would
  be inventing structure ahead of the phase that actually needs it.

### Seed data — real values, not placeholders

`site_settings` (singleton row) and `navigation_items` (11 rows) are
seeded directly in `0007`, because both hold data that is already public
and rendered on the live site today — the Availability Card (D-08) and the
site's nav structure (`lib/site.ts`). The seed values are copied from
`lib/home-content.ts#getDeveloperProfile().availability`,
`lib/about-content.ts#getWorkingLanguages()`, `lib/site.ts#socialLinks` and
`lib/site.ts#mainNav`/`utilityNav`/`legalNav` — today's real, owner-confirmed
content, not invented seed data (§ 16.5).

### RLS — applied per § 12's own rule

"public reads only for published = true rows; writes only through server
code," applied table by table:

- **Public `select` policy, gated on a publish/status column:** `projects`
  (`published`), `services` (`published`), `engagement_models`
  (`published`), `recommendations` (`status = 'approved'`), `articles`
  (`status = 'published'`), and every child table of `projects`/`services`
  (`project_sections`, `project_media`, `project_technologies`,
  `service_process_steps`, `service_packages`, `service_addons`,
  `service_technologies`, `faqs`) gated through an `exists (...)` check
  against its parent's publish state.
- **Public `select` policy, unconditional:** `technologies`, `site_settings`,
  `navigation_items` — none of these three have a draft/publish concept;
  they are structural or always-public data today (same reasoning
  `lib/home-content.ts#getTechStack()` already has no publish gate).
- **No public policy (service-role only):** `admin_users`, `audit_log`,
  `consultations`, `inquiries`, `inquiry_events`, `media_assets`,
  `notification_outbox`, `redirects` — lead, admin and business data with
  no public-read use case, same pattern `0001_inquiries.sql` already
  established. This produces eight expected `rls_enabled_no_policy`
  advisor findings (see below) — not a regression.

### Advisor pass (§ 17 "verified" applies to advisor findings, not only `next build`)

Ran `get_advisors` (security + performance) after `0003`–`0008`, found two
real issues, fixed both in `0009`, then re-ran to confirm clean:

- **4 unindexed foreign keys** (`project_media.media_id`,
  `project_technologies.technology_id`,
  `recommendations.related_project_id`,
  `service_technologies.technology_id`) — each join table's composite
  primary key already covered the *other* column in the pair, not this
  one. Added a covering index for each.
- **`faqs` had two permissive `select` policies** evaluated on every query
  (one for `scope = 'global'`, one for `scope = 'service'`). Merged into
  one policy expressing the same rule with `OR`.

Post-fix advisor state: security shows exactly the 8 expected
`rls_enabled_no_policy` findings and nothing else; performance shows only
`unused_index` (expected — every content table is empty except the two
seeded ones, so no query has touched these indexes yet; they exist for
when Phase 12.2's selectors start querying by `published`/`status`/foreign
key).

## Verification

- All 7 migrations (`0003`–`0009`) applied successfully via
  `Supabase:apply_migration`, confirmed in `Supabase:list_migrations`.
- `Supabase:list_tables` — 24 tables in `public`, `rls_enabled: true` on
  every one; `site_settings` shows 1 row, `navigation_items` shows 11 rows,
  everything else 0 (correctly empty — no import has run yet).
- `Supabase:get_advisors` (security, performance) — run twice (before and
  after `0009`); only the expected/inert findings remain (see above).
- Bilingual check constraints verified live, not just read back:
  `insert into projects (title, ...) values ('{"en":"Test"}', ...)` (missing
  the `fa` key) was correctly rejected with
  `violates check constraint "projects_title_check"`; the whole
  multi-statement test batch (including a `technologies` insert in the same
  call) rolled back with it — confirmed by re-querying both tables for the
  test rows afterward (0 rows in each). No test data was left in the
  database.
- `site_settings` seed round-tripped correctly on read: `availability_state:
  'available'`, `response_commitment` both locales present, `timezone: 'UTC'`,
  2 languages, 4 external profiles.
- `faqs` confirmed down to exactly one `select` policy after `0009`
  (`pg_policies` query).
- No application code was touched this session (selectors, pages and
  components are all unchanged) — there is nothing to `next build` or
  `tsc --noEmit` against yet; that verification becomes relevant starting
  12.2, once the selector layer actually reads from these tables.
- **English/Persian, LTR/RTL, light/dark, responsive, accessibility:** not
  applicable — no UI changed this session.

## Files changed

- `docs/adr/ADR-001-bilingual-storage.md` (new)
- `db/migrations/0003_projects_and_technologies.sql` (new)
- `db/migrations/0004_services_and_packages.sql` (new)
- `db/migrations/0005_recommendations_and_articles.sql` (new)
- `db/migrations/0006_lead_pipeline_and_consultations.sql` (new)
- `db/migrations/0007_media_settings_and_navigation.sql` (new)
- `db/migrations/0008_admin_and_audit.sql` (new)
- `db/migrations/0009_schema_lint_fixes.sql` (new)
- `docs/phases/PHASE-12.1-README.md` (new, this file)
- `ROAD-MAP-ARTAVEO.md` (status updated)

## Database changes / migrations

24 new/altered tables total (23 new, `inquiries` altered) — see the table
above and each migration file's own header comment for the full column
list, rollback note and reasoning per table. All 7 migrations are live on
the Artaveo Supabase project (`ukzovqnpqjcrwofycalc`) as of 15 September
2026.

## Known issues

- Every content table except the two seeded ones (`site_settings`,
  `navigation_items`) is empty — the import script (12.2) hasn't run yet.
  Nothing reads from these tables today; the live site is unaffected and
  keeps running on `lib/*-content.ts` exactly as before this session.
- `unused_index` advisor findings on the new tables are expected until
  12.2's selectors start querying them — not a defect, not re-checked here.

## New debt

- **12.2 is the rest of Phase 12** (not new debt introduced by 12.1, but
  recorded here per § 18.2): the one-way import script from
  `lib/*-content.ts` into these tables, and switching the selector layer
  (`getFeaturedProjects()`, `getPublishedServices()`, etc.) to read from
  Supabase behind the same function signatures. This is a large, separate
  change — nearly every server component that currently calls a sync
  selector becomes `async`/`await`s it — and belongs in its own session,
  not folded into 12.1's schema work.
- `docs/decisions.md` (referenced by roadmap § 19 as where Decision
  Register outcomes are recorded with dates) does not exist in the repo —
  pre-existing debt from before this session, not introduced by it, out of
  Phase 12's scope to fix. Flagged here since it was noticed while reading
  § 19 before starting.

## Rollback

Each migration file's own header comment has its rollback SQL (drop
tables / columns / constraints in reverse dependency order). To roll back
the whole of 12.1, run `0009`'s rollback, then `0008`'s, … down to `0003`'s,
in that order (reverse of application order, since later tables reference
earlier ones via foreign keys).

## Final status

**PHASE: 12.1**
**STATUS: COMPLETE**

Next recommended phase: **12.2** — import script + selector switch, new chat (large, cross-cutting change; re-clone and re-read the roadmap fresh per the session workflow before starting).
