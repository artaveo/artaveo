-- Migration: 0017_notifications_outbox_v2
-- Roadmap: Phase 19 "Notifications & Outbox"
--
-- Builds on 0002_notification_outbox (§ 9.3). 0002 made the outbox an
-- inquiry-only queue with a last-error column and no protection against two
-- workers picking up the same row. Phase 19 needs it to be a general outbox
-- (evidence submitted, scheduled publishes, system alerts), a real delivery
-- log, and safe under concurrency. Everything here is ADDITIVE and
-- backward-compatible with the Phase 18 code already deployed: the old
-- insert (no new columns) and the old select/update paths keep working, so
-- this can be applied before the new code is pushed.
--
-- 1. `notification_outbox`, generalised
--    - `inquiry_id` becomes nullable: only inquiry notifications have one.
--      The cascade stays, so deleting an inquiry (a "delete my data"
--      request, see the privacy policy) still deletes its e-mail copies.
--    - `entity_type` / `entity_id`: what the message is about, for every
--      kind (backfilled for existing rows).
--    - `dedupe_key`: a caller-chosen key, UNIQUE. Enqueueing the same event
--      twice (a retried request, an overlapping cron run) inserts one row,
--      not two. Nullable so an old writer that does not know about it still
--      works; NULLs never collide in a unique index. Deliberately NOT a
--      partial index — PostgREST's `on_conflict=dedupe_key` cannot target a
--      partial index.
--    - `reply_to`: rendered at enqueue time like subject/body, so the copy
--      the owner sees in the log is exactly what is sent.
--    - `locked_until` / `last_attempt_at`: the claim lease (see below) and
--      the time of the most recent attempt.
--    - `kind` widened to the closed set of events Phase 19 produces.
--    - `status` gains 'sending' (claimed by a worker, lease not expired).
--
-- 2. `notification_attempts` — the delivery log. One row per send attempt:
--    which provider, ok or not, whether a failure is worth retrying, the
--    error text, the provider's message id, the duration. `attempt_no` is
--    unique per message; `attempts` on the outbox row is never reset (a manual
--    retry raises `max_attempts` instead), so the history stays a true
--    record.
--
-- 3. `claim_notification_outbox(...)` — atomic claim. One statement selects
--    the due rows `FOR UPDATE SKIP LOCKED` and flips them to 'sending' with a
--    lease, so the inline attempt and the cron sweep (or two overlapping
--    sweeps) can never send the same row twice. A row whose lease has expired
--    (a worker that crashed mid-send) becomes claimable again. SECURITY
--    INVOKER with a pinned search_path; execute is revoked from every role
--    except service_role.
--
-- RLS: same rule as 0001/0002 — enabled, zero policies on both tables.
-- Only the server (service-role key) can read or write them.
--
-- ROLLBACK (in this order):
--   drop function if exists public.claim_notification_outbox(uuid[], int, int);
--   drop table if exists public.notification_attempts;
--   -- restore the 0002 constraints (only valid once no row uses a new kind/status):
--   delete from public.notification_outbox where kind not in ('owner-alert', 'client-confirmation');
--   update public.notification_outbox set status = 'pending' where status = 'sending';
--   alter table public.notification_outbox drop constraint if exists notification_outbox_kind_check;
--   alter table public.notification_outbox add constraint notification_outbox_kind_check
--     check (kind in ('owner-alert', 'client-confirmation'));
--   alter table public.notification_outbox drop constraint if exists notification_outbox_status_check;
--   alter table public.notification_outbox add constraint notification_outbox_status_check
--     check (status in ('pending', 'sent', 'failed', 'exhausted'));
--   drop index if exists public.notification_outbox_due_idx;
--   drop index if exists public.notification_outbox_dedupe_idx;
--   drop index if exists public.notification_outbox_status_created_idx;
--   create index if not exists notification_outbox_pending_idx
--     on public.notification_outbox (next_attempt_at) where status in ('pending', 'failed');
--   alter table public.notification_outbox
--     drop column if exists entity_type, drop column if exists entity_id,
--     drop column if exists dedupe_key, drop column if exists reply_to,
--     drop column if exists locked_until, drop column if exists last_attempt_at;
--   alter table public.notification_outbox alter column inquiry_id set not null;  -- only if no NULLs remain

-- ---------------------------------------------------------------------------
-- 1. notification_outbox
-- ---------------------------------------------------------------------------

alter table public.notification_outbox alter column inquiry_id drop not null;

alter table public.notification_outbox
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists dedupe_key text,
  add column if not exists reply_to text,
  add column if not exists locked_until timestamptz,
  add column if not exists last_attempt_at timestamptz;

-- Backfill the rows 0002's code produced: one per (inquiry, kind).
update public.notification_outbox
   set entity_type = 'inquiry',
       entity_id = inquiry_id::text,
       dedupe_key = 'inquiry:' || inquiry_id::text || ':' || kind
 where entity_type is null
   and inquiry_id is not null;

alter table public.notification_outbox drop constraint if exists notification_outbox_kind_check;
alter table public.notification_outbox
  add constraint notification_outbox_kind_check
  check (kind in ('owner-alert', 'client-confirmation', 'evidence-submitted', 'content-published', 'system-alert'));

alter table public.notification_outbox drop constraint if exists notification_outbox_status_check;
alter table public.notification_outbox
  add constraint notification_outbox_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'exhausted'));

-- A message that is not tied to an inquiry must say what it is about.
alter table public.notification_outbox drop constraint if exists notification_outbox_entity_check;
alter table public.notification_outbox
  add constraint notification_outbox_entity_check
  check (inquiry_id is not null or (entity_type is not null and entity_id is not null));

create unique index if not exists notification_outbox_dedupe_idx
  on public.notification_outbox (dedupe_key);

-- Replaces 0002's partial index: a stale 'sending' lease must be findable too.
drop index if exists public.notification_outbox_pending_idx;
create index if not exists notification_outbox_due_idx
  on public.notification_outbox (next_attempt_at)
  where status in ('pending', 'failed', 'sending');

create index if not exists notification_outbox_status_created_idx
  on public.notification_outbox (status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. notification_attempts (the delivery log)
-- ---------------------------------------------------------------------------

create table if not exists public.notification_attempts (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.notification_outbox (id) on delete cascade,
  attempt_no int not null check (attempt_no >= 1),
  at timestamptz not null default now(),

  -- 'console' or 'resend' (lib/notifications/provider.ts). A 'console'
  -- attempt is recorded as ok but nothing left the server — the admin UI
  -- says so in words instead of showing a green "sent".
  provider text not null,
  ok boolean not null,
  -- Only meaningful when ok = false: was the failure worth retrying?
  retryable boolean,
  error text,
  provider_message_id text,
  duration_ms int check (duration_ms is null or duration_ms >= 0)
);

create unique index if not exists notification_attempts_outbox_attempt_idx
  on public.notification_attempts (outbox_id, attempt_no);

alter table public.notification_attempts enable row level security;
-- No policies created — service_role only, same reasoning as 0001/0002.

-- ---------------------------------------------------------------------------
-- 3. claim_notification_outbox
-- ---------------------------------------------------------------------------

create or replace function public.claim_notification_outbox(
  p_ids uuid[] default null,
  p_limit int default 20,
  p_lease_seconds int default 120
)
returns setof public.notification_outbox
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  with due as (
    select o.id
      from public.notification_outbox o
     where (
             (o.status in ('pending', 'failed') and o.next_attempt_at <= now())
             or (o.status = 'sending' and o.locked_until is not null and o.locked_until <= now())
           )
       and (p_ids is null or o.id = any (p_ids))
     order by o.next_attempt_at asc
     limit greatest(p_limit, 1)
       for update skip locked
  )
  update public.notification_outbox n
     set status = 'sending',
         locked_until = now() + make_interval(secs => greatest(p_lease_seconds, 10))
    from due
   where n.id = due.id
  returning n.*;
end;
$$;

revoke all on function public.claim_notification_outbox(uuid[], int, int) from public;
revoke all on function public.claim_notification_outbox(uuid[], int, int) from anon, authenticated;
grant execute on function public.claim_notification_outbox(uuid[], int, int) to service_role;
