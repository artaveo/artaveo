-- Migration: 0021_observability
-- Roadmap: Phase 24 — Observability.
--
-- Vercel's Hobby plan keeps runtime logs for about an hour, and the site has one
-- owner who is not watching a log viewer. Anything worth knowing tomorrow has to
-- be in the database. This migration adds the small amount of storage that
-- makes that true, and nothing else:
--
--  1. `request_id` (uuid) on the three tables a request writes into
--     (`inquiries`, `inquiry_events`, `notification_outbox`) so one id links the
--     request's log lines, the lead, its timeline and the e-mails it queued.
--     (`audit_log.correlation_id` has been there since 0008 and was never set;
--     the application now sets it.) Nullable: every existing row keeps its shape.
--
--  2. `ops_events` — an append-only record of the few events an operator acts on
--     or counts: an inquiry arrived, a message failed for good, the daily run
--     finished, the rate limiter stopped answering. NOT an access log (Vercel has
--     one) and not a copy of `audit_log` (who did what in the admin stays there).
--     Written by `record_ops_event`, which de-duplicates a burst and refuses to
--     let informational rows flood the table.
--
--  3. `error_groups` — error tracking without a third-party service: one row per
--     distinct failure (a fingerprint of where it happened and what it said, with
--     ids, numbers and addresses removed), with a first/last-seen time, a total
--     count and a one-hour window count that alerting reads. Written by
--     `record_error_event`, one atomic statement, so racing requests count
--     correctly. The number of distinct groups is capped; beyond the cap new
--     failures are counted into one shared `overflow` group instead of growing
--     the table without limit.
--
--  4. `purge_ops_data` — the daily run's housekeeping (90 days by default).
--
-- Every new table has RLS enabled and NO policy (same rule as every table since
-- 0001: the browser never reaches the database). Every new function is executable
-- by `service_role` only and has a pinned search_path.
--
-- ROLLBACK (nothing else depends on these objects):
--   drop function if exists public.purge_ops_data(int, int);
--   drop function if exists public.record_error_event(text, text, text, text, text, text, text, text, uuid, jsonb);
--   drop function if exists public.record_ops_event(text, text, uuid, text, text, jsonb, int);
--   drop table if exists public.error_groups;
--   drop table if exists public.ops_events;
--   alter table public.notification_outbox drop column if exists request_id;
--   alter table public.inquiry_events drop column if exists request_id;
--   alter table public.inquiries drop column if exists request_id;

-- ---------------------------------------------------------------------------
-- 1. Correlation ids on the tables a request writes
-- ---------------------------------------------------------------------------

alter table public.inquiries           add column if not exists request_id uuid;
alter table public.inquiry_events      add column if not exists request_id uuid;
alter table public.notification_outbox add column if not exists request_id uuid;

create index if not exists inquiries_request_id_idx           on public.inquiries (request_id)           where request_id is not null;
create index if not exists inquiry_events_request_id_idx      on public.inquiry_events (request_id)      where request_id is not null;
create index if not exists notification_outbox_request_id_idx on public.notification_outbox (request_id) where request_id is not null;

-- ---------------------------------------------------------------------------
-- 2. ops_events
-- ---------------------------------------------------------------------------

create table if not exists public.ops_events (
  id          uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  level       text not null check (level in ('info', 'warn', 'error')),
  -- dotted, lower-case, e.g. `inquiry.submitted`, `notification.exhausted`
  name        text not null check (name ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$' and char_length(name) <= 80),
  request_id  uuid,
  subject_type text check (subject_type is null or char_length(subject_type) <= 40),
  subject_id   text check (subject_id is null or char_length(subject_id) <= 100),
  -- Small, already-redacted context. Never a message body, an address or a token.
  data        jsonb not null default '{}'::jsonb
              check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 8192)
);

create index if not exists ops_events_occurred_idx      on public.ops_events (occurred_at desc);
create index if not exists ops_events_name_occurred_idx on public.ops_events (name, occurred_at desc);
create index if not exists ops_events_request_id_idx    on public.ops_events (request_id) where request_id is not null;

alter table public.ops_events enable row level security;
-- No policies: service_role only.

-- Returns true when a row was written. `p_dedupe_seconds > 0` skips the write when a row with
-- the same name and subject already exists inside that window — so "the limiter is down" is one
-- row a minute, not one row per request. Informational rows stop when the table has taken more
-- than 5,000 rows in the last hour (a runaway, not a busy site); warn and error rows never stop.
create or replace function public.record_ops_event(
  p_level          text,
  p_name           text,
  p_request_id     uuid,
  p_subject_type   text,
  p_subject_id     text,
  p_data           jsonb,
  p_dedupe_seconds int default 0
)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  if p_level is null or p_level not in ('info', 'warn', 'error') then
    raise exception 'invalid ops event level' using errcode = '22023';
  end if;

  if p_dedupe_seconds is not null and p_dedupe_seconds > 0 then
    if exists (
      select 1 from public.ops_events e
      where e.name = p_name
        and e.subject_id is not distinct from p_subject_id
        and e.occurred_at > now() - make_interval(secs => least(p_dedupe_seconds, 86400))
    ) then
      return false;
    end if;
  end if;

  if p_level = 'info' and (
    select count(*) from public.ops_events e where e.occurred_at > now() - interval '1 hour'
  ) > 5000 then
    return false;
  end if;

  insert into public.ops_events (level, name, request_id, subject_type, subject_id, data)
  values (
    p_level,
    p_name,
    p_request_id,
    left(p_subject_type, 40),
    left(p_subject_id, 100),
    coalesce(p_data, '{}'::jsonb)
  );
  return true;
end;
$$;

revoke all on function public.record_ops_event(text, text, uuid, text, text, jsonb, int) from public;
revoke all on function public.record_ops_event(text, text, uuid, text, text, jsonb, int) from anon, authenticated;
grant execute on function public.record_ops_event(text, text, uuid, text, text, jsonb, int) to service_role;

-- ---------------------------------------------------------------------------
-- 3. error_groups
-- ---------------------------------------------------------------------------

create table if not exists public.error_groups (
  -- 32 hex characters of a SHA-256 over (event, error name, normalised message, route) —
  -- or the literal 'overflow' for everything past the cap.
  fingerprint     text primary key check (fingerprint ~ '^[0-9a-f]{32}$' or fingerprint = 'overflow'),
  source          text not null check (source in ('server', 'action', 'route', 'cron', 'render', 'client', 'csp', 'notification', 'database', 'other')),
  event           text not null check (event ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$' and char_length(event) <= 80),
  name            text not null default 'Error' check (char_length(name) <= 100),
  message         text not null check (char_length(message) <= 500),
  stack           text check (stack is null or char_length(stack) <= 4000),
  -- A route PATTERN (`/[locale]/work/[slug]`), never a concrete path: a path can carry a private token.
  route           text check (route is null or char_length(route) <= 200),
  -- Next.js's own digest for a server render error — the number the visitor's error page shows.
  digest          text check (digest is null or char_length(digest) <= 100),
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  event_count     bigint not null default 1 check (event_count >= 1),
  -- Occurrences inside the current one-hour window; alerting reads this ("10 in an hour").
  window_started_at timestamptz not null default now(),
  window_count    integer not null default 1 check (window_count >= 0),
  last_request_id uuid,
  status          text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  resolved_at     timestamptz,
  data            jsonb not null default '{}'::jsonb
                  check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 4096)
);

create index if not exists error_groups_last_seen_idx on public.error_groups (last_seen_at desc);
create index if not exists error_groups_status_seen_idx on public.error_groups (status, last_seen_at desc);
create index if not exists error_groups_digest_idx on public.error_groups (digest) where digest is not null;
create index if not exists error_groups_last_request_idx on public.error_groups (last_request_id) where last_request_id is not null;

alter table public.error_groups enable row level security;
-- No policies: service_role only.

create or replace function public.record_error_event(
  p_fingerprint text,
  p_source      text,
  p_event       text,
  p_name        text,
  p_message     text,
  p_stack       text,
  p_route       text,
  p_digest      text,
  p_request_id  uuid,
  p_data        jsonb
)
returns table (is_new boolean, is_reopened boolean, window_hits int, total_hits bigint)
language plpgsql
set search_path = ''
as $$
declare
  v_fp         text := p_fingerprint;
  v_old_status text;
  v_groups     bigint;
  v_window     int;
  v_total      bigint;
begin
  if v_fp is null or not (v_fp ~ '^[0-9a-f]{32}$') then
    raise exception 'invalid fingerprint' using errcode = '22023';
  end if;

  select g.status into v_old_status from public.error_groups g where g.fingerprint = v_fp for update;

  -- A new group past the cap goes into the shared overflow group instead of a new row.
  if v_old_status is null then
    select count(*) into v_groups from public.error_groups;
    if v_groups >= 500 then
      v_fp := 'overflow';
      select g.status into v_old_status from public.error_groups g where g.fingerprint = v_fp for update;
    end if;
  end if;

  insert into public.error_groups as g (
    fingerprint, source, event, name, message, stack, route, digest, last_request_id, data
  )
  values (
    v_fp,
    p_source,
    p_event,
    left(coalesce(p_name, 'Error'), 100),
    left(coalesce(p_message, ''), 500),
    left(p_stack, 4000),
    left(p_route, 200),
    left(p_digest, 100),
    p_request_id,
    coalesce(p_data, '{}'::jsonb)
  )
  on conflict (fingerprint) do update
    set last_seen_at      = now(),
        event_count       = g.event_count + 1,
        window_started_at = case when g.window_started_at <= now() - interval '1 hour' then now() else g.window_started_at end,
        window_count      = case when g.window_started_at <= now() - interval '1 hour' then 1 else g.window_count + 1 end,
        last_request_id   = coalesce(excluded.last_request_id, g.last_request_id),
        digest            = coalesce(excluded.digest, g.digest),
        -- A resolved failure that comes back is a regression: reopen it. An ignored one stays ignored.
        status            = case when g.status = 'resolved' then 'open' else g.status end,
        resolved_at       = case when g.status = 'resolved' then null else g.resolved_at end
  returning g.window_count, g.event_count into v_window, v_total;

  return query select (v_old_status is null), coalesce(v_old_status = 'resolved', false), v_window, v_total;
end;
$$;

revoke all on function public.record_error_event(text, text, text, text, text, text, text, text, uuid, jsonb) from public;
revoke all on function public.record_error_event(text, text, text, text, text, text, text, text, uuid, jsonb) from anon, authenticated;
grant execute on function public.record_error_event(text, text, text, text, text, text, text, text, uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Housekeeping
-- ---------------------------------------------------------------------------

create or replace function public.purge_ops_data(p_events_days int default 90, p_groups_days int default 90)
returns table (events_deleted bigint, groups_deleted bigint)
language plpgsql
set search_path = ''
as $$
declare
  v_events bigint;
  v_groups bigint;
begin
  if p_events_days is null or p_events_days < 1 or p_groups_days is null or p_groups_days < 1 then
    raise exception 'invalid retention' using errcode = '22023';
  end if;

  delete from public.ops_events where occurred_at < now() - make_interval(days => p_events_days);
  get diagnostics v_events = row_count;

  -- The shared overflow group is never purged by age: it is the record that the cap was hit.
  delete from public.error_groups
   where last_seen_at < now() - make_interval(days => p_groups_days) and fingerprint <> 'overflow';
  get diagnostics v_groups = row_count;

  return query select v_events, v_groups;
end;
$$;

revoke all on function public.purge_ops_data(int, int) from public;
revoke all on function public.purge_ops_data(int, int) from anon, authenticated;
grant execute on function public.purge_ops_data(int, int) to service_role;
