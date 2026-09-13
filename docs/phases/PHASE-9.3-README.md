# Phase 9.3 — Start a Project: Notifications

**Status:** ⏳ PARTIAL — structure complete and build-verified; real sending intentionally inactive pending D-01
**Date:** 13 September 2026

## Objective

Owner alert + client confirmation for every persisted inquiry, using an
outbox pattern ("persist first, send after") so a provider outage never
loses an inquiry's notification, with retries on failure (roadmap § 9.3).

## Why this is PARTIAL, not COMPLETE

§ 9.3 itself is written as "requires D-01 domain + DNS authentication."
D-01 is still open: the site currently lives at the interim Vercel URL
(`https://artaveo-seven.vercel.app`), not a registered, DNS-authenticated
domain. Sending real email from an unauthenticated address would likely
be rejected or land in spam — worse than being honest that sending isn't
live.

**Owner's explicit call (13 September 2026):** build the full § 9.3
structure now — outbox table, retry/backoff, provider abstraction — but
keep real sending switched off until the domain is bought and D-01 is
formally resolved. Resend (or another provider) stays uninstalled/inert
by default; flipping it on later is meant to be an env-var change, not a
code change.

This means § 9.3's own exit criteria ("provider outage does not lose
data," "end-to-end submission verified in both locales") are honestly
**not yet fully verifiable** — there is no real provider outage to
survive yet, because there is no real sending yet. What **is** verified:
the pipeline runs end-to-end against the console provider (enqueue →
attempt → sent/failed/retry bookkeeping), and the schema/build are clean.
Full closure of § 9.3 happens in a short follow-up once D-01 resolves:
set three env vars, confirm one real send, done — no new code.

## Implementation summary

**Outbox pattern** (`db/migrations/0002_notification_outbox.sql`):
`notification_outbox` table — one row per notification, written *before*
any send attempt. Columns cover kind (`owner-alert` /
`client-confirmation`), recipient, locale, rendered subject/body, status
(`pending` / `sent` / `failed` / `exhausted`), attempt count, last error,
last provider used, and `next_attempt_at` for backoff scheduling. RLS
enabled, zero policies — service-role only, same rule as `inquiries` /
`inquiry_events`.

**Provider abstraction** (`lib/notifications/provider.ts`): an
`EmailProvider` interface with two implementations —
`ConsoleEmailProvider` (default; logs instead of sending, so the whole
pipeline is exercised honestly without a live provider) and
`ResendEmailProvider` (built, not wired to run unless
`EMAIL_PROVIDER=resend` is explicitly set alongside `RESEND_API_KEY` and
`EMAIL_FROM_ADDRESS`).

**Templates** (`lib/notifications/templates.ts`): owner alert (English)
and client confirmation (in the client's `preferredLocale`), both built
from `buildInquirySummaryText` (§ 9.1/9.2) — no second copy of the
field-by-field brief formatting. The client confirmation reuses D-08's
exact published response-commitment wording (`lib/about-content.ts`,
`lib/home-content.ts`) rather than re-paraphrasing it.

**Outbox processing** (`lib/notifications/outbox.ts`):
`enqueueInquiryNotifications` inserts both rows; `processOutboxBatch`
attempts sends for due rows, with a four-step backoff (1min → 5min →
30min → 2h) before a row is marked `exhausted` at its `max_attempts`
(default 5).

**Wiring** (`app/actions/inquiries.ts`): after the existing `inquiries` /
`inquiry_events` inserts (§ 9.2, unchanged), `submitInquiry` now enqueues
both notifications and makes one best-effort inline send attempt —
covering the common case immediately. Both steps are best-effort: a
failure here never undoes or masks the successful inquiry insert, exactly
like the existing `inquiry_events` handling.

**Daily retry sweep** (`app/api/cron/notifications/route.ts` +
`vercel.json`): a cron route that re-runs `processOutboxBatch` over
everything still due, as a safety net for whatever the inline attempt
missed. Protected by Vercel's auto-provisioned `CRON_SECRET`.

## Known limitation — Vercel Hobby cron cadence

Vercel's Hobby plan caps cron cadence at once per day; any more frequent
schedule fails at deploy time (confirmed against Vercel's current docs,
13 September 2026). `vercel.json` schedules the sweep for `0 6 * * *`
(06:00 UTC, landing anywhere in that hour). This means a failed send
could sit for up to ~24h before an automatic retry. Accepted trade-off:
the inline attempt already covers the normal case, and no inquiry data is
ever at risk either way — only a notification's timeliness is. The route
itself accepts a request at any frequency; only Vercel's own scheduler is
capped. Pointing an external scheduler (e.g. cron-job.org) at the same
route removes the ceiling with no code change, if that's ever wanted
before upgrading to Pro.

## Changed files

- `db/migrations/0002_notification_outbox.sql` — new
- `lib/notifications/provider.ts` — new
- `lib/notifications/templates.ts` — new
- `lib/notifications/outbox.ts` — new
- `app/api/cron/notifications/route.ts` — new
- `vercel.json` — new
- `app/actions/inquiries.ts` — enqueue + best-effort send after insert
- `.env.example` — `EMAIL_PROVIDER` / `RESEND_API_KEY` / `EMAIL_FROM_ADDRESS` / `CRON_SECRET` documented
- `lib/site.ts` — comment corrected (`Phase 9.4` → `§ 9.3`, pre-existing doc drift)

## Database changes

`db/migrations/0002_notification_outbox.sql`, applied directly to the
live `Artaveo` Supabase project (`ukzovqnpqjcrwofycalc`,
`ap-southeast-1`) on 13 September 2026. `Supabase:get_advisors` confirmed
only the expected informational `rls_enabled_no_policy` finding (now
covering three tables: `inquiries`, `inquiry_events`,
`notification_outbox` — no new findings introduced).

Rollback: `drop table if exists public.notification_outbox;`

## Verification

- `tsc --noEmit`: clean.
- `next build` (Turbopack, `next/font/google` stubbed for the sandbox's
  unreachable Google Fonts, restored immediately after — `diff` confirmed
  byte-identical): compiled successfully; `/api/cron/notifications`
  appears correctly as a dynamic route.
- Migration applied to the live project; advisors clean (info-only
  finding, as expected).
- **Not yet verified from this sandbox:** a real inquiry submission
  actually reaching `notification_outbox` and the console provider
  logging it, because that requires `SUPABASE_SERVICE_ROLE_KEY` (only
  present in Zakir's own `.env.local` / Vercel project settings, per §
  9.2's own precedent). Recommended smoke test after deploy: submit a
  test brief at `/start`, then check `notification_outbox` for two new
  rows with `status = 'sent'` and `last_provider = 'console'`, and the
  deployment's function logs for the two `[notifications:console] would
  send email` lines.

## Known issues / new debt

- Full § 9.3 closure (real sending, spam-safe deliverability, the
  "provider outage does not lose data" exit criterion under an actual
  provider) is deferred until D-01 resolves. Tracked as the same D-01
  blocker, not new debt.
- `docs/decisions.md` still doesn't exist despite the roadmap's Decision
  Register referencing it ("Decisions and their dates are recorded in
  `docs/decisions.md`") — pre-existing gap from before this phase, not
  something 9.3 introduced or was scoped to fix. Flagging per § 6.3
  (documentation debt) rather than silently leaving it unmentioned.

## Rollback

Drop `notification_outbox` (see above). Revert `app/actions/inquiries.ts`
to its § 9.2 version (removes the enqueue/send call). Delete
`app/api/cron/notifications/`, `vercel.json`, `lib/notifications/`.

## Final status

**PARTIAL.** Structure complete, build-verified, and live in the
database; real sending stays off by design until D-01 (domain + DNS
authentication) resolves, per the owner's explicit 13 September 2026
decision. No fake success is shown anywhere — the console provider logs
honestly, and the UI's existing `success` state (§ 9.2) already reflects
only the inquiry's own persistence, not notification delivery.
