-- Migration: 0011_content_workflow_touch
-- Roadmap: § 15 "CMS & Media" — editors now mutate `services` and
-- `engagement_models` directly (previously only ever inserted once, by
-- `scripts/import-content-to-db.ts`). Both need a real "last edited"
-- timestamp for the admin list views; neither had an update-time trigger
-- because neither was ever updated in place before this phase.
--
-- `services.updated_at` already exists (0004) but nothing touched it on
-- `update` — same gap `set_updated_at()` now closes. `engagement_models`
-- never had an `updated_at` column at all (0004) since it was seed-only;
-- added here alongside its own trigger, same pattern.
--
-- This migration is schema-only — no new draft/publish state. § 15's
-- "draft → preview → publish → unpublish" reuses the `published` boolean
-- every § 12 entity already has (draft = false, publish/unpublish = flip
-- it); "preview" is an admin-only read that ignores the RLS-enforced
-- `published = true` filter (service-role client), not a new state.
-- "Per-locale completeness" is computed at read time from the existing
-- `{en, fa}` jsonb fields, not stored. See `docs/phases/PHASE-15.1-README.md`
-- for why a genuine per-locale *publish* flag (independently publishing
-- English while Persian stays draft) is intentionally deferred rather than
-- bundled into this migration.
--
-- ROLLBACK:
--   drop trigger if exists set_engagement_models_updated_at on public.engagement_models;
--   drop trigger if exists set_services_updated_at on public.services;
--   drop function if exists public.set_updated_at();
--   alter table public.engagement_models drop column if exists updated_at;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_services_updated_at
  before update on public.services
  for each row
  execute function public.set_updated_at();

alter table public.engagement_models
  add column if not exists updated_at timestamptz not null default now();

create trigger set_engagement_models_updated_at
  before update on public.engagement_models
  for each row
  execute function public.set_updated_at();
