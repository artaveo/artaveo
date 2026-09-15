-- Migration: 0008_admin_and_audit
-- Roadmap: § 12 "Data Model & Migrations" — core entities table, rows 18–19
--
-- Schema note (documented, not silent — § 20 "never silently skip a
-- failed step"): the roadmap's § 12 table lists `admin_users` and `roles`
-- as two entities. Phase 13 fixes the role set at exactly two values
-- ("roles: owner, editor (content only, no leads)") with no indication
-- either phase intends a growing, admin-editable role list. A separate
-- `roles` table would need seeding, a foreign key, and admin CRUD for a
-- set of two values that isn't expected to change — so this migration
-- uses a `check` constraint enum on `admin_users.role` instead, the same
-- "ship the honest mechanism, not unused structure" call D-13 already made
-- for the deposit/warranty figures. If Phase 13 or a later phase needs
-- more than two roles with their own metadata, promoting this to a real
-- `roles` table is a contained follow-up, not a blocker now.
--
-- `admin_users` references `auth.users` because Phase 13 uses Supabase
-- Auth for the admin panel — a user only becomes an admin by having a
-- matching row here, created by the project owner directly (never through
-- public sign-up, since there is no admin sign-up flow).
--
-- `audit_log` mirrors § 12's table exactly: actor, action, entity,
-- entityId, before, after, correlationId, at. It exists now so every
-- admin mutation Phase 13 onward writes has somewhere to land from the
-- start, rather than being bolted on after Phase 15's CMS already ships
-- mutations with no audit trail.
--
-- RLS: neither table has any public read use — no public policies,
-- service-role only, same default as 0001.
--
-- ROLLBACK:
--   drop table if exists public.audit_log;
--   drop table if exists public.admin_users;

create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  role text not null check (role in ('owner', 'editor'))
);

alter table public.admin_users enable row level security;
-- No policies created — service_role only. Phase 13 adds the
-- authorization checks that read this table server-side.

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),

  actor text not null,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  correlation_id uuid
);

create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id);
create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_correlation_id_idx on public.audit_log (correlation_id);

alter table public.audit_log enable row level security;
-- No policies created — service_role only, same reasoning as 0001.
