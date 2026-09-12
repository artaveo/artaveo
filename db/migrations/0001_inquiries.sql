-- Migration: 0001_inquiries
-- Roadmap: § 9.2 "Server handling & persistence (minimal slice of the Phase 12 schema)"
--
-- Creates the two tables § 9.2 names explicitly: `inquiries` and
-- `inquiry_events`. Field set is the minimal slice this phase actually
-- needs (the Brief Builder's own fields + submission/spam metadata), not
-- the full Phase 12 shape from § 10's table (`stage, priority, source,
-- followUpAt / stage history, actor, note`) — Phase 12 and Phase 14 (Lead
-- Pipeline) will ALTER TABLE to add the pipeline-management columns
-- (priority, followUpAt, assignee, etc.) when that work actually lands,
-- per principle 9 ("typed content mirrors the future database", applied
-- here in reverse: ship the slice this phase owns, extend later, never
-- invent unused columns now).
--
-- RLS: intentionally NO policies are created for either table. § 9.2 says
-- "no public select; inserts only through the server" — the server talks
-- to Supabase using the service-role key (see lib/supabase/server.ts),
-- which bypasses RLS entirely. Adding a public INSERT policy for the
-- anon/authenticated roles was considered and rejected: it would let
-- anyone insert directly from the browser, bypassing every server-side
-- check this phase adds (honeypot, timing, rate limit, re-validation).
-- With RLS enabled and zero policies, every role except service_role is
-- denied by default for every operation — exactly what "no public
-- select" (and no public anything else) requires.
--
-- ROLLBACK:
--   drop table if exists public.inquiry_events;
--   drop table if exists public.inquiries;

create extension if not exists pgcrypto;

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Idempotency (§ 9.2: "idempotency key per submission to prevent
  -- duplicates on double click or retry"). The unique constraint is the
  -- real guard; the server checks this before inserting too, but the
  -- constraint is what makes a race between two near-simultaneous
  -- requests safe.
  idempotency_key uuid not null unique,

  -- Brief content — field names mirror types/inquiry.ts#InquiryDraft
  -- exactly (principle 9: only the destination changes, not the shape).
  service_slug text,
  package_id text,
  engagement_model_id text,
  project_type text,
  goal text not null,
  feature_tags text[] not null default '{}',
  feature_other_note text not null default '',
  timeline text,
  budget_band text,
  links jsonb not null default '[]',

  -- Contact
  name text not null,
  email text not null,
  phone text not null default '',
  preferred_locale text not null,
  preferred_channel text not null,
  consent boolean not null default false,

  -- Source attribution (§ 9.2: "stored without extra personal data") —
  -- referrer/UTM/channel only, nothing about the visitor themselves.
  source_referrer text,
  source_utm_source text,
  source_utm_medium text,
  source_utm_campaign text,
  source_channel text,

  -- Spam/rate-limit auditing. The IP itself is never stored — only a
  -- salted hash (lib/supabase/server.ts / app/actions/inquiries.ts),
  -- which is enough to rate-limit by IP without keeping a raw address
  -- around indefinitely.
  submitter_ip_hash text,

  -- Minimal pipeline placeholder so Phase 14 (Lead Pipeline) has
  -- something to filter on immediately when it lands; not itself part of
  -- § 9.2's scope beyond this one default value.
  stage text not null default 'new'
);

create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);
create index if not exists inquiries_email_idx on public.inquiries (email);
create index if not exists inquiries_submitter_ip_hash_idx on public.inquiries (submitter_ip_hash);

alter table public.inquiries enable row level security;
-- No policies created — see note above. service_role bypasses RLS; every
-- other role is denied every operation by default.

create table if not exists public.inquiry_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  -- Closed vocabulary, extend deliberately (§ 16.5, "never invent a
  -- value"): 'created' is the only type § 9.2 itself produces. Phase 14
  -- will add 'stage-changed', 'note-added', etc. when the pipeline exists.
  type text not null default 'created',
  actor text not null default 'system',
  note text,
  meta jsonb not null default '{}'
);

create index if not exists inquiry_events_inquiry_id_idx on public.inquiry_events (inquiry_id);

alter table public.inquiry_events enable row level security;
-- Same rule as inquiries: no policies at all; service_role only.
