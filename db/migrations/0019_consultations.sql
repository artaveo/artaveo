-- Migration: 0019_consultations
-- Roadmap: Phase 20 "Consultation" (v1, request-based) + the two consultation
-- events Phase 19 deliberately left for this phase.
--
-- `consultations` exists since 0006 (inquiry_id, requested_windows, timezone,
-- status, confirmed_at) and has never been written to. Phase 20 builds the
-- request → confirm → reschedule/cancel flow on it. Everything here is
-- ADDITIVE and backward-compatible with the Phase 19 code already deployed
-- (nothing reads or writes the new columns yet), so it can be applied before
-- the new code is pushed.
--
-- 1. `consultations`, extended
--    - `token`: the client's private link (`/consultation/<token>`) — same
--      trust model as `recommendation_requests.token` (0015): 24 random
--      bytes, no public RLS policy, the token is the access control.
--      Backfilled for any pre-existing row, then NOT NULL + UNIQUE.
--    - `locale`: the language the client's e-mails are written in.
--    - `duration_minutes`: length of the call once confirmed (default 30 — the
--      upper end of D-09's "20–30 min intro call").
--    - `confirmed_start` / `confirmed_end` / `meeting_details`: the time the
--      owner confirmed and how the call will happen (typed by the owner — a
--      link, or "WhatsApp voice call"; never invented by the site). They are
--      kept while a reschedule is pending (`status = 'rescheduled'`) so the
--      client still sees the time that stands until a new one is confirmed.
--    - `sequence`: the SEQUENCE the NEXT calendar message must carry. An
--      invitation, an update and a cancellation for the same event must have
--      increasing sequence numbers or mail clients ignore them.
--    - `reschedule_requests`: how many times the client changed their mind
--      (bounded, so a token holder cannot flood the owner with e-mail).
--    - `cancelled_by`, `cancel_reason`, `closed_at`: who ended it, why (both
--      optional text), and when it reached a terminal state — `closed_at` is
--      also what ends the client's link (it stays readable for a few days).
--    - `updated_at` with the existing `set_updated_at()` trigger (0011).
--    - CHECK constraints make the impossible states unrepresentable: a
--      confirmed consultation has a time, an end after its start and meeting
--      details; a terminal one has `closed_at`; a cancelled one says by whom.
--    - One ACTIVE consultation per inquiry (partial unique index) — a double
--      click or a replayed request cannot create two.
--
-- 2. Status transitions enforced in the database, like the lead pipeline
--    (0010; § 2 principle 13, "sensitive state changes are state machines"):
--      requested   -> confirmed | cancelled
--      confirmed   -> rescheduled | cancelled | completed
--      rescheduled -> confirmed | cancelled
--    `completed` and `cancelled` are terminal. A row whose status does not
--    change (re-confirming a new time, replacing requested windows) is always
--    allowed here; the application decides when those are valid.
--
-- 3. `inquiry_events.type` (0010) gains the five consultation events, so the
--    lead's timeline shows the whole story in one place.
--
-- 4. `notification_outbox` (0017/0018)
--    - `kind` gains the five consultation messages (request alert to the
--      owner, acknowledgement / confirmation / cancellation to the client, and
--      the owner's notice that the client changed something).
--    - `attachments` (jsonb array of {filename, contentType, content}): a
--      confirmation carries a calendar invitation (.ics). Stored with the
--      message like subject and body, so the copy in the log is exactly what
--      is sent. Plain text only (ICS is text); the provider encodes it.
--    `claim_notification_outbox()` returns `notification_outbox.*`, so the new
--    column reaches the worker with no change to the function.
--
-- RLS: nothing changes — `consultations` already has RLS enabled and no
-- policies (0006): service-role server code only.
--
-- ROLLBACK (in this order; only valid once no row uses a new value):
--   delete from public.notification_outbox where kind in (
--     'consultation-requested', 'consultation-received', 'consultation-confirmed',
--     'consultation-cancelled', 'consultation-client-update');
--   alter table public.notification_outbox drop constraint if exists notification_outbox_attachments_check;
--   alter table public.notification_outbox drop column if exists attachments;
--   alter table public.notification_outbox drop constraint if exists notification_outbox_kind_check;
--   alter table public.notification_outbox add constraint notification_outbox_kind_check
--     check (kind in ('owner-alert', 'client-confirmation', 'evidence-submitted', 'content-published',
--       'system-alert', 'recommendation-request', 'recommendation-changes'));
--   delete from public.inquiry_events where type like 'consultation-%';
--   alter table public.inquiry_events drop constraint if exists inquiry_events_type_check;
--   alter table public.inquiry_events add constraint inquiry_events_type_check
--     check (type in ('created', 'stage-changed', 'note-added', 'priority-changed', 'follow-up-set', 'tags-changed'));
--   drop trigger if exists consultations_status_transition_guard on public.consultations;
--   drop function if exists public.enforce_consultation_status_transition();
--   drop trigger if exists set_consultations_updated_at on public.consultations;
--   drop index if exists public.consultations_one_active_per_inquiry_idx;
--   drop index if exists public.consultations_token_idx;
--   drop index if exists public.consultations_confirmed_start_idx;
--   drop index if exists public.consultations_created_at_idx;
--   alter table public.consultations
--     drop constraint if exists consultations_locale_check,
--     drop constraint if exists consultations_duration_check,
--     drop constraint if exists consultations_windows_count_check,
--     drop constraint if exists consultations_timezone_length_check,
--     drop constraint if exists consultations_reschedule_requests_check,
--     drop constraint if exists consultations_cancelled_by_check,
--     drop constraint if exists consultations_text_length_check,
--     drop constraint if exists consultations_confirmed_time_check,
--     drop constraint if exists consultations_confirmed_state_check,
--     drop constraint if exists consultations_closed_state_check,
--     drop constraint if exists consultations_cancelled_state_check,
--     drop column if exists token, drop column if exists locale, drop column if exists duration_minutes,
--     drop column if exists confirmed_start, drop column if exists confirmed_end,
--     drop column if exists meeting_details, drop column if exists sequence,
--     drop column if exists reschedule_requests, drop column if exists cancelled_by,
--     drop column if exists cancel_reason, drop column if exists closed_at,
--     drop column if exists updated_at;

-- ---------------------------------------------------------------------------
-- 1. consultations
-- ---------------------------------------------------------------------------

alter table public.consultations
  add column if not exists token text,
  add column if not exists locale text not null default 'en',
  add column if not exists duration_minutes int not null default 30,
  add column if not exists confirmed_start timestamptz,
  add column if not exists confirmed_end timestamptz,
  add column if not exists meeting_details text,
  add column if not exists sequence int not null default 0,
  add column if not exists reschedule_requests int not null default 0,
  add column if not exists cancelled_by text,
  add column if not exists cancel_reason text,
  add column if not exists closed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- No row exists in production (nothing has ever written here), but a token
-- must never be missing: give any existing row an unguessable one.
update public.consultations
   set token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
 where token is null;

alter table public.consultations alter column token set not null;

create unique index if not exists consultations_token_idx on public.consultations (token);

create index if not exists consultations_created_at_idx on public.consultations (created_at desc);
create index if not exists consultations_confirmed_start_idx
  on public.consultations (confirmed_start) where status = 'confirmed';

-- At most one live consultation per inquiry.
create unique index if not exists consultations_one_active_per_inquiry_idx
  on public.consultations (inquiry_id)
  where status in ('requested', 'confirmed', 'rescheduled');

alter table public.consultations drop constraint if exists consultations_locale_check;
alter table public.consultations
  add constraint consultations_locale_check check (locale in ('en', 'fa'));

alter table public.consultations drop constraint if exists consultations_duration_check;
alter table public.consultations
  add constraint consultations_duration_check check (duration_minutes between 15 and 120);

alter table public.consultations drop constraint if exists consultations_windows_count_check;
alter table public.consultations
  add constraint consultations_windows_count_check check (jsonb_array_length(requested_windows) <= 3);

alter table public.consultations drop constraint if exists consultations_timezone_length_check;
alter table public.consultations
  add constraint consultations_timezone_length_check check (char_length(timezone) between 1 and 64);

alter table public.consultations drop constraint if exists consultations_reschedule_requests_check;
alter table public.consultations
  add constraint consultations_reschedule_requests_check check (reschedule_requests between 0 and 5);

alter table public.consultations drop constraint if exists consultations_cancelled_by_check;
alter table public.consultations
  add constraint consultations_cancelled_by_check check (cancelled_by is null or cancelled_by in ('client', 'owner'));

alter table public.consultations drop constraint if exists consultations_text_length_check;
alter table public.consultations
  add constraint consultations_text_length_check check (
    (meeting_details is null or char_length(meeting_details) <= 2000)
    and (cancel_reason is null or char_length(cancel_reason) <= 1000)
  );

alter table public.consultations drop constraint if exists consultations_confirmed_time_check;
alter table public.consultations
  add constraint consultations_confirmed_time_check check (
    (confirmed_start is null) = (confirmed_end is null)
    and (confirmed_start is null or confirmed_end > confirmed_start)
  );

alter table public.consultations drop constraint if exists consultations_confirmed_state_check;
alter table public.consultations
  add constraint consultations_confirmed_state_check check (
    status <> 'confirmed'
    or (confirmed_start is not null and confirmed_at is not null and meeting_details is not null)
  );

-- `closed_at` is set exactly when the consultation is over.
alter table public.consultations drop constraint if exists consultations_closed_state_check;
alter table public.consultations
  add constraint consultations_closed_state_check check (
    (status in ('cancelled', 'completed')) = (closed_at is not null)
  );

alter table public.consultations drop constraint if exists consultations_cancelled_state_check;
alter table public.consultations
  add constraint consultations_cancelled_state_check check (status <> 'cancelled' or cancelled_by is not null);

drop trigger if exists set_consultations_updated_at on public.consultations;
create trigger set_consultations_updated_at
  before update on public.consultations
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. status transitions
-- ---------------------------------------------------------------------------

create or replace function public.enforce_consultation_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Not a status change (a new confirmed time, replaced windows, a counter) —
  -- always allowed here.
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'requested' and new.status in ('confirmed', 'cancelled'))
    or (old.status = 'confirmed' and new.status in ('rescheduled', 'cancelled', 'completed'))
    or (old.status = 'rescheduled' and new.status in ('confirmed', 'cancelled'))
  ) then
    raise exception 'invalid consultation status transition: % -> %', old.status, new.status
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists consultations_status_transition_guard on public.consultations;
create trigger consultations_status_transition_guard
  before update of status on public.consultations
  for each row
  execute function public.enforce_consultation_status_transition();

-- ---------------------------------------------------------------------------
-- 3. inquiry_events.type
-- ---------------------------------------------------------------------------

alter table public.inquiry_events drop constraint if exists inquiry_events_type_check;
alter table public.inquiry_events
  add constraint inquiry_events_type_check
  check (type in (
    'created', 'stage-changed', 'note-added', 'priority-changed', 'follow-up-set', 'tags-changed',
    'consultation-requested', 'consultation-confirmed', 'consultation-reschedule-requested',
    'consultation-cancelled', 'consultation-completed'
  ));

-- ---------------------------------------------------------------------------
-- 4. notification_outbox
-- ---------------------------------------------------------------------------

alter table public.notification_outbox
  add column if not exists attachments jsonb;

alter table public.notification_outbox drop constraint if exists notification_outbox_attachments_check;
alter table public.notification_outbox
  add constraint notification_outbox_attachments_check
  check (attachments is null or jsonb_typeof(attachments) = 'array');

alter table public.notification_outbox drop constraint if exists notification_outbox_kind_check;
alter table public.notification_outbox
  add constraint notification_outbox_kind_check
  check (kind in (
    'owner-alert', 'client-confirmation', 'evidence-submitted', 'content-published', 'system-alert',
    'recommendation-request', 'recommendation-changes',
    'consultation-requested', 'consultation-received', 'consultation-confirmed',
    'consultation-cancelled', 'consultation-client-update'
  ));
