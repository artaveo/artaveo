-- Migration: 0002_notification_outbox
-- Roadmap: § 9.3 "Notifications (requires D-01 domain + DNS authentication)"
--
-- D-01 (production domain + SPF/DKIM/DMARC) is still open as of this
-- migration — see the Decision Register. Per the owner's explicit call
-- (13 September 2026), § 9.3's *structure* ships now against the interim
-- Vercel URL (https://artaveo-seven.vercel.app), with real sending kept
-- inactive (lib/notifications/provider.ts's console provider) until the
-- domain is bought and D-01 is resolved. This migration is not blocked by
-- that — the outbox table, retry bookkeeping and audit trail are useful
-- and testable today regardless of which provider eventually sends.
--
-- Outbox pattern (§ 9.3: "persist first, send after"): every notification
-- this phase produces is written here BEFORE any send attempt, so a
-- crash, a provider outage, or the provider being a no-op console stub
-- never loses the fact that an inquiry needed an owner alert and a client
-- confirmation. `app/actions/inquiries.ts` enqueues rows here in the same
-- request that inserts the inquiry (best-effort, same pattern already
-- used for `inquiry_events` — a failure here must never undo the inquiry
-- insert). `lib/notifications/outbox.ts#processOutboxBatch` is what
-- actually attempts sends, called both inline (best-effort, right after
-- enqueueing) and from the daily retry sweep (app/api/cron/notifications).
--
-- RLS: same rule as 0001_inquiries.sql — enabled, zero policies. Only the
-- service-role key (server-only) can read or write this table.
--
-- ROLLBACK:
--   drop table if exists public.notification_outbox;

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  inquiry_id uuid not null references public.inquiries (id) on delete cascade,

  -- Closed vocabulary (§ 16.5, "never invent a value"): the only two
  -- notifications § 9.3 itself produces. Phase 19 ("Notifications &
  -- Outbox") may extend this set when it generalises the pattern beyond
  -- inquiries.
  kind text not null check (kind in ('owner-alert', 'client-confirmation')),

  recipient_email text not null,
  -- Which locale the body was rendered in. Always 'en' for owner-alert;
  -- the client's own `preferred_locale` for client-confirmation.
  locale text not null,

  subject text not null,
  body_text text not null,

  -- 'pending'    — not sent yet, eligible once `next_attempt_at` passes
  -- 'sent'       — provider accepted it; terminal
  -- 'failed'     — most recent attempt failed, will retry until max_attempts
  -- 'exhausted'  — hit max_attempts without success; terminal, needs a human
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'exhausted')),

  attempts int not null default 0,
  max_attempts int not null default 5,
  last_error text,
  -- Which EmailProvider implementation last attempted this row (e.g.
  -- 'console', 'resend') — audit trail for when D-01 resolves and sending
  -- actually starts working through a real provider.
  last_provider text,

  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notification_outbox_pending_idx
  on public.notification_outbox (next_attempt_at)
  where status in ('pending', 'failed');

create index if not exists notification_outbox_inquiry_id_idx
  on public.notification_outbox (inquiry_id);

alter table public.notification_outbox enable row level security;
-- No policies created — service_role only, same reasoning as 0001.
