-- Migration: 0006_lead_pipeline_and_consultations
-- Roadmap: § 12 "Data Model & Migrations" — core entities table, rows 13–14
--
-- `inquiries`/`inquiry_events` already exist (0001_inquiries.sql), built as
-- the "minimal slice of the Phase 12 schema" § 9.2 explicitly scoped itself
-- to. That migration's own header said Phase 12/14 would `ALTER TABLE` to
-- add pipeline-management columns when that work actually lands — this is
-- that step for the columns Phase 12's own core-entities table names
-- ("stage, priority, source, followUpAt / stage history, actor, note").
-- `stage` (0001), `source_*` (0001) and `actor`/`note` (`inquiry_events`,
-- already per-event) exist; `priority` and `follow_up_at` do not yet.
--
-- The full pipeline state machine itself (§ 14: NEW -> REVIEWED ->
-- QUALIFIED -> CONTACTED -> DISCOVERY -> PROPOSAL -> WON|LOST -> ARCHIVED,
-- enforced transitions, SLA indicator) is Phase 14's own scope, not this
-- one — this migration only adds the two missing columns Phase 14 will
-- need to already exist, per principle 9.
--
-- `consultations` is new (Phase 20 will build the request/confirm flow on
-- top of it); always linked to an inquiry per § 20.
--
-- RLS: same pattern as 0001 — no public policies on either table. Both are
-- lead/business data, written and read only by server code through the
-- service-role key, same reasoning 0001_inquiries.sql already recorded.
--
-- ROLLBACK:
--   drop table if exists public.consultations;
--   alter table public.inquiries drop column if exists priority;
--   alter table public.inquiries drop column if exists follow_up_at;

alter table public.inquiries
  add column if not exists priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  add column if not exists follow_up_at timestamptz;

create index if not exists inquiries_stage_idx on public.inquiries (stage);
create index if not exists inquiries_follow_up_at_idx on public.inquiries (follow_up_at);

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  -- Client-proposed windows in their own timezone (§ 20 v1: "client
  -- proposes time windows"); jsonb array of {start, end} ISO timestamps —
  -- kept flexible since the exact shape is Phase 20's to finalize, not
  -- this migration's.
  requested_windows jsonb not null default '[]' check (jsonb_typeof(requested_windows) = 'array'),
  timezone text not null,
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'rescheduled', 'cancelled', 'completed')),
  confirmed_at timestamptz
);

create index if not exists consultations_inquiry_id_idx on public.consultations (inquiry_id);
create index if not exists consultations_status_idx on public.consultations (status);

alter table public.consultations enable row level security;
-- No policies created — service_role only, same reasoning as 0001.
