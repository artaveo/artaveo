# Phase 19 — Notifications & Outbox

**Status:** ✅ COMPLETE (code) — real sending stays off by design until D-01.
**Date:** 19 September 2026
**Migrations:** `0017_notifications_outbox_v2.sql` and `0018_recommender_email.sql` — **both already applied to the live Supabase project** (`ukzovqnpqjcrwofycalc`).

> Two things were added on the same day, after the owner answered the two questions this README first listed as "not built": **e-mail to a recommender (D-14 — the owner said yes)** and **notices for manual publishes**. Both are in the sections below; the first version of this phase did not have them.

## Objective

Roadmap § Phase 19: *reliable e-mail sending — an outage never loses a lead.*

- provider abstraction (e-mail first; others later) with bilingual templates
- events: new inquiry, inquiry confirmation, consultation request/confirmation,
  evidence submitted, publish events, system error
- retries with backoff, delivery log, alert when a message keeps failing

Phase 9.3 already shipped the seed of this (an outbox table for two inquiry
e-mails, a console/Resend provider, a daily sweep). Phase 19 makes it a general,
observable, concurrency-safe system and adds the owner-facing pieces.

## Scope

**Built**

- One outbox for every notification, with an idempotent enqueue (a dedupe key).
- Seven events: `owner-alert`, `client-confirmation` (both from § 9.3, now
  idempotent and reply-able), `evidence-submitted`, `content-published` (a
  scheduled article *or* a manual publish), `system-alert`, and — D-14 —
  `recommendation-request` and `recommendation-changes` (e-mail to a recommender).
- A delivery log: one row per send attempt (provider, result, retryable or not,
  error, provider message id, duration).
- An atomic claim (`claim_notification_outbox`) so no message is ever sent twice
  by two workers, with lease recovery for a crashed worker.
- Failure classification (transient vs permanent), backoff, a retry ceiling, and
  an alert to the owner when a message fails for good.
- Provider request timeout and a per-message idempotency key.
- `/admin/notifications` (log, filters, status counts, provider/cron health,
  per-message detail with the delivery log, "Retry now", "Send due messages
  now"), a nav link, and a dashboard card + banner. Owner-only.
- The daily cron route now fails closed (see *Security fix*).

**Deliberately not built (disclosed)**

- **Consultation request / confirmation e-mails.** The roadmap lists them under
  Phase 19, but they are about data Phase 20 creates (time windows, ICS,
  reschedule links). Adding them is one entry in `NOTIFICATION_KINDS`, one
  template, one migration widening the check constraint and one function in
  `lib/notifications/events.ts`. Phase 20 owns it.
- **HTML e-mail, attachments, unsubscribe headers.** Plain text only; every
  message is transactional (a reply to an action the recipient took, or an
  owner alert).
- **A retention schedule** for outbox rows (still the policy's stated gap).
- **Webhooks** for delivery/bounce status from the provider.
- **A resend button** for a recommender's link e-mail. If it fails, the retry policy handles it, and the link can always be copied by hand.

## Dependencies

Phase 9.3 (outbox, provider), Phase 12 (Supabase), Phase 13 (admin auth, audit
log), Phase 14 (leads; the owner-only rule), Phase 16 (recommendations), Phase 17
(scheduled publishing, the shared cron route). D-01 (domain) gates *real* sending
only, not this phase.

## Before you push

1. `0017` and `0018` are already live — nothing to apply.
2. **Add `CRON_SECRET` in Vercel** (random, 16+ characters) and redeploy, or the
   daily run answers 401 (see below). Details: `docs/runbooks/notifications.md`.
3. Push, then run the smoke test in the runbook.

## Implementation summary

### The pipeline

```
event ──► enqueueNotifications() ──► notification_outbox   (status pending)
          (dedupe key, ON CONFLICT DO NOTHING)                    │
                                                                  ▼
 inline (after each submission) ─┐                     claim_notification_outbox()
 daily cron ─────────────────────┼──► processOutboxBatch ─►  pending/failed & due → sending (lease 120 s)
 admin "Retry now"/"Send due" ───┘                                │
                                                                  ▼
                                                    EmailProvider.send(idempotency key, timeout)
                                                                  │
                          ┌───────────── ok ──────────────────────┼──────── failure ───────────┐
                          ▼                                                                     ▼
                     status sent                                       retryable and attempts < max  → failed + backoff
                                                                       permanent, or ceiling reached → exhausted
                                                                                                        │
                                       every attempt is appended to notification_attempts               ▼
                                                                          audit_log + system-alert e-mail (once) + admin banners
```

### Database (`0017`)

- `notification_outbox.inquiry_id` is nullable; new `entity_type`/`entity_id`
  (backfilled), `dedupe_key` (UNIQUE, non-partial so PostgREST's
  `on_conflict=dedupe_key` can target it), `reply_to`, `locked_until`,
  `last_attempt_at`. `kind` widened to the first five events (0018 adds the recommender pair); `status` gains
  `sending`; a check keeps a non-inquiry row from being entity-less.
- `notification_attempts` — the delivery log. RLS on, no policies.
- `claim_notification_outbox(p_ids, p_limit, p_lease_seconds)` — `SECURITY
  INVOKER`, `search_path = ''`, `FOR UPDATE SKIP LOCKED`; execute revoked from
  `public`, `anon`, `authenticated`, granted to `service_role` only.
- Additive and backward-compatible with the Phase 18 code (old insert shape,
  old reads still work), which is why it could go live before the code.

### Worker (`lib/notifications/outbox.ts`)

- **Claim → send → record.** The row's state is updated first, guarded by the
  lease this worker holds (`status = 'sending' AND locked_until = <mine>`), so a
  worker that lost its lease can never overwrite the new owner; then the attempt
  is appended (best-effort — state is authoritative, the log is not).
- **Chunks of five**, so a deadline never strands claimed rows in `sending`.
  Rows in a chunk are sent together, so a visitor's form does not wait for two
  sends in sequence.
- **Failure policy** (`backoff.ts`, pure): a permanent failure or reaching
  `max_attempts` (5) → `exhausted`; otherwise `failed` with a delay of 1 min →
  5 min → 30 min → 2 h → 2 h.
- **Alert on exhaustion** — console error, `audit_log` row
  (`notification.exhausted`), and a `system-alert` e-mail to the owner sent
  straight away. The alert never raises an alert of its own (no loop); its dedupe
  key includes the attempt count, so a message the owner retried and that failed
  again raises a fresh alert, and the same exhaustion can never raise two. The
  alert e-mail contains no recipient address. Because the failing channel may be
  e-mail itself, the same fact is shown in `/admin` and `/admin/notifications`
  without depending on e-mail.
- **Manual retry** (`requeueNotification`) only accepts `failed`/`exhausted`,
  never rewrites `attempts` (the log stays a true history) and raises
  `max_attempts` by at least three instead. A `sent` message is never re-sent.
- `processAfterEnqueue` — after a new event, send it now, then give up to three
  older due messages a chance (4 s send timeout, 6 s / 3 s budgets). This is what
  makes retries real between cron runs; see *Known issues*.

### Provider (`lib/notifications/provider.ts`)

- Interface gains `replyTo`, `idempotencyKey`, a timeout option, and a
  `retryable` flag on failures.
- Resend: `Idempotency-Key: outbox-<id>` (Resend keeps keys 24 h), `reply_to`, an
  8 s timeout (`AbortSignal.timeout`). 408/425/429/5xx and network errors are
  retryable; a 409 only when it is the "concurrent request" variant; every other
  4xx is permanent (retrying a 401/403/422 five times only delays the alert).
- `resolveEmailProvider(env)` is pure. A key alone never activates sending; a
  half-configured `resend` falls back to console **and is reported**
  (`misconfigured`), as is an unknown `EMAIL_PROVIDER`. The admin page shows it.
- The console provider still records a message as `sent` (so the pipeline runs
  end to end) — the admin UI labels that "Logged only — not delivered" in the
  list, the detail page and the delivery log, never a green "delivered".

### Events and templates (`events.ts`, `templates.ts`)

| Kind | To | Language | Trigger | Dedupe key |
| --- | --- | --- | --- | --- |
| `owner-alert` | owner | en | inquiry saved | `inquiry:<id>:owner-alert` |
| `client-confirmation` | client | the client's chosen language (en/fa) | inquiry saved | `inquiry:<id>:client-confirmation` |
| `evidence-submitted` | owner | en | recommender submits / re-submits | `evidence:<rec id>:<submission time>` |
| `content-published` | owner | en | the daily run publishes a scheduled article, **or** somebody presses Publish on an article, case study or service page | `content-published:<entity>:<id>:<scheduled\|manual>:<moment>` |
| `system-alert` | owner | en | any message exhausted | `system-alert:<message id>:<attempts>` |
| `recommendation-request` | the recommender | the language the owner picked for that request (en/fa) | the owner creates a request link **with an e-mail address** | `recommendation-request:<request id>` |
| `recommendation-changes` | the recommender | same | the owner requests a change while moderating, and the request has an address | `recommendation-changes:<request id>:<moderation time>` |

- Templates are pure functions (URLs and values passed in). Only the client
  confirmation is bilingual — it is the only message a visitor receives; owner
  messages stay English, as § 9.3 decided. D-08's exact response-commitment
  wording is reused, not re-paraphrased.
- The client confirmation says "just reply to this email"; it now carries
  `Reply-To: <owner>` so that is true. The owner alert carries `Reply-To: <client>`
  (only when it is a well-formed address — an unusable one is dropped, never sent,
  because the provider would reject the whole message).
- Every subject line goes through `singleLine()` (whitespace and newlines
  collapsed, length capped) so a visitor's stray line break can never make a
  provider reject an owner alert.
- The `evidence-submitted` e-mail carries who/relationship/company/language and a
  link to the moderation queue — **not** the statement text; nothing becomes
  public without moderation.
- **Idempotent submit.** `submitInquiry` previously enqueued only on first
  insert. It now also calls the (deduped) enqueue on both idempotent-replay
  paths, so a visitor whose first attempt saved the inquiry but failed to enqueue
  gets the e-mails they were owed, never a second pair.

### Recommender e-mail (D-14, owner: yes)

- **Create a link** (`/admin/content/recommendations`): two new optional fields —
  the recommender's e-mail and the language to write to them in (English /
  Persian). With an address the site queues the link e-mail and tries to send it
  at once; the panel then shows the message's real state next to the link ("Sent",
  "Will retry", "Failed for good", and "Logged only — not delivered" while real
  sending is off). If the e-mail cannot be queued the panel says so and the link
  is still created — copy it, as before. Without an address nothing changes.
- **Request a change** (moderation): if the request has an address, the owner's
  note is e-mailed to the recommender, in their language, with the same link
  (the link reopens for a rewrite, as in Phase 16). The note is sent verbatim.
- **What the e-mails say** (`templates.ts`): first person, in the owner's voice;
  the link is theirs; the form asks for explicit consent to publish and the owner
  reviews before anything goes on the site (both true of the flow). No name is
  addressed (only an address is held) and no Persian spelling of the owner's name
  is invented — the Latin name stays at a pause point. `Reply-To` is the owner.
- **Privacy — the address lives only as long as the request** (`lib/recommendation-privacy.ts`,
  `0018`): it is cleared, and the stored copies of those e-mails are redacted
  (address and text overwritten with `[removed]`; status and history kept),
  when the link is revoked, when its recommendation is approved or rejected, when
  the link expired unused, or when the recommendation it produced was deleted.
  The actions do it at the moment; the daily run is the catch-all. E-mails that
  never went out are *deleted* (a dead link must not be sent). A redacted message
  can never be retried. The address is never written to the audit log (only "an
  address was given"). The privacy policy says all of this in both languages,
  including the one gap: a link with **no expiry** that is **never used or
  revoked** keeps its address until the owner revokes it.
- **Database (`0018`)**: `recipient_email` and `recipient_locale` on
  `recommendation_requests`, with checks (an address needs a locale; en|fa only;
  ≤ 320 characters); `kind` widened by the two events.
- **A latent Phase 16 bug found on the way.** The admin request list selected
  `recommendations(status)`. `recommendations` and `recommendation_requests`
  reference each other (`recommendations.request_id` from 0005,
  `recommendation_requests.recommendation_id` from 0015), so PostgREST answers
  `PGRST201 — more than one relationship` and the code, which logs and returns
  `[]` on error, would have shown an empty list of links against the live
  database (both constraints exist there; verified). It only did not bite because
  the live database has no requests yet. Found by running the real PostgREST;
  fixed by naming the relationship
  (`recommendations!recommendation_requests_recommendation_id_fkey(status)`) in
  the admin loader and in the new clean-up sweep.

### Manual publish notices

`publishArticle`, `publishProject` and `publishService` now queue a
`content-published` message to the owner naming who pressed Publish
(`lib/notifications/publish-notice.ts`), best-effort after the publish and its
audit row. The owner asked for it knowing they are often the one pressing the
button; it is most useful when an editor publishes. Unpublish does not notify.

### Security fix — the cron route now fails closed

Phase 9.3's comment claimed Vercel auto-provisions `CRON_SECRET`. It does not
(Vercel sends the header only when *you* define the variable — "Securing cron
jobs" in Vercel's docs). The old check ("if a secret is set, require it") ran
**open** whenever the variable was missing. The route now returns 401 without
it, compares in constant time, sets `maxDuration = 60`, keeps its sweeps
independent, and enqueues + immediately sends the owner's publish notices for
whatever the publish sweep just made public. The 9.3 README's claim is corrected
here, not rewritten (history is not edited).

### Admin (`/admin/notifications`, owner-only)

- Gate: `canAccessNotifications(session)` (owner) on every page and both server
  actions, plus MFA-satisfied — the log holds full lead e-mails, so it follows
  the leads rule (§ 13: editor = content only).
- List: status counts; banners for *failed for good*, *real sending is off* /
  *provider misconfigured*, *CRON_SECRET missing*, *recent inquiries with no
  notification record*; overdue count with the oldest due time; filters by
  status and type; pagination; per-row Retry.
- Detail: state, next attempt, last error, the delivery log (per attempt: number,
  time, provider, duration, provider message id, error, transient/permanent), the
  full message, link to the inquiry.
- Actions: `retryNotification`, `sendDueNotifications` — each re-checks its own
  session, writes an audit row (`notification.retried`,
  `notification.sweep_manual`), and reports what *actually happened* (the status
  the message ended in), never "queued".

### Privacy

The privacy policy's "where it's stored" section now says that a copy of every
generated e-mail and a log of each attempt is stored in the same database. Date
unchanged (19 Sep 2026, already bumped by Phase 18). Deleting an inquiry cascades
to its e-mail copies and their delivery log.

### i18n

84 new `Admin` keys in both locales (two existing strings reworded because "no automated e-mail yet" is no longer true); parity 926/926.

## Decisions

1. **Owner-only, not editor-accessible** — the log contains lead e-mails.
2. **Alerts must not depend on the channel that failed** — hence the dashboard
   and page banners in addition to the e-mail.
3. **Permanent failures exhaust immediately.** A 401/403/422 will not fix itself;
   five retries only delay the alert. The owner can retry after fixing the cause.
4. **Console "sent" is kept but never presented as delivery.**
5. **No new dependency.** Node's `crypto`, `fetch`, and the existing Supabase
   client; the tests use Node's built-in runner.
6. **Claim in SQL, not in application code.** Only the database can make "select
   and lock" atomic across serverless invocations.
7. **`dedupe_key` non-partial unique.** Partial indexes cannot be targeted by
   PostgREST's `on_conflict`.
8. **Fail closed on the cron secret**, accepting that the daily run does nothing
   until the variable is set — a loud, visible failure over a silent open door.

## Changed files

New

- `db/migrations/0017_notifications_outbox_v2.sql`, `db/migrations/0018_recommender_email.sql`
- `types/notifications.ts`
- `lib/site-url.ts` (`SITE_URL`/`absoluteUrl` split out of `lib/seo.ts`, re-exported)
- `lib/notifications/backoff.ts`, `lib/notifications/events.ts`,
  `lib/notifications/publish-notice.ts`, `lib/recommendation-privacy.ts`
- `lib/admin/notifications.ts`
- `app/actions/notifications.ts`
- `app/[locale]/admin/(protected)/notifications/page.tsx`, `…/[id]/page.tsx`
- `components/admin/notifications/` — `notification-badges.tsx`,
  `notification-filters.tsx`, `retry-button.tsx`, `send-due-button.tsx`
- `scripts/test-notifications.mjs`
- `docs/runbooks/notifications.md`, `docs/phases/PHASE-19-README.md`

Modified

- `lib/notifications/outbox.ts` (rewritten), `provider.ts` (rewritten),
  `templates.ts` (extended)
- `app/api/cron/notifications/route.ts`
- `app/actions/inquiries.ts`, `app/actions/recommendations.ts`,
  `app/actions/content.ts` (recommender e-mail, clearing, manual publish notices)
- `components/admin/content/recommendation-request-panel.tsx`, `lib/admin/content.ts`
  (e-mail fields and state; the PGRST201 fix), `types/cms.ts`
- `lib/insights-scheduler.ts` (returns the published items)
- `lib/admin/auth.ts` (`canAccessNotifications`), `components/admin/admin-chrome.tsx`,
  `app/[locale]/admin/(protected)/page.tsx`
- `lib/seo.ts` (re-exports), `lib/legal-content.ts`
- `messages/en.json`, `messages/fa.json`
- `scripts/ts-resolve-hook.mjs` (`server-only` resolves to an empty module for the
  test runner only), `package.json` (`test:notifications`), `.env.example`
- `ROAD-MAP-ARTAVEO.md`

## Database changes / migrations

`0017_notifications_outbox_v2.sql`, applied to the live project on
19 September 2026 via the Supabase tool, after checking the table (2 rows, 2
inquiries). Verified live: both existing rows backfilled (`entity_type`,
`dedupe_key` set); the three check constraints, the new indexes and RLS on
`notification_attempts` are in place; execute on the function is `false` for
`anon`/`authenticated`, `true` for `service_role`; a claim inside a rolled-back
`DO` block returned 1 row, then 0 on the second call, status `sending` (no row
left behind — 2 rows before and after). `get_advisors` (security): the new tables
appear only in the expected informational `rls_enabled_no_policy` finding; the
function raises nothing. (Pre-existing, unrelated: `function_search_path_mutable`
on `enforce_inquiry_stage_transition` from 0010, and "leaked password
protection" disabled in Auth.)

Rollback: see the header of the migration file.

`0018_recommender_email.sql`, applied the same day after checking the table (0 requests). Verified live inside a rolled-back block: an address without a locale is rejected; locale `de` is rejected; an address with `fa` is accepted; the new outbox kind is accepted; nothing left behind. Both new columns are present.

## Tests

`npm run test:notifications` — **40/40**:

- retry policy (schedule, clamp, outcome, manual-retry ceiling)
- provider: HTTP classification, selection from the environment, request shape
  (`reply_to`, `Idempotency-Key`), 429/5xx/403/network mapped correctly
- templates in both locales; subject-injection; no address in an alert
- enqueue: dedupe, reply-to hygiene, the three key rules
- worker (against an in-memory Supabase that mirrors the claim function):
  success; transient failure with backoff; permanent failure with exactly one
  delivered alert; the ceiling; an alert never alerting; a throwing provider; lease
  loss; two sweeps racing (each message once); expired-lease recovery; limit,
  deadline and ids; a missing migration; requeue and continued attempt numbering

Added with D-14: both recommender templates (en/fa, expiry line, note verbatim); the two enqueue functions (locale, reply-to, dedupe, one message per change ask); manual vs scheduled publish notices and their keys; the clearing rule for every state a request can be in (11 cases); deletion of unsent and redaction of sent e-mails while leaving other requests, other kinds and in-flight rows alone; the daily sweep including a late-finishing message and idempotence; a redacted message refusing retry.

A mutation check (removing the lease guard) makes the lease-loss test fail.
`test:articles` and `test:search` were not affected.

**Against the real stack** (not committed — it needs local services): PostgreSQL 16
with `0001`, `0002`, `0017` applied, PostgREST 12.2.3 in front of it, the real
`@supabase/supabase-js` client, and the real worker/events/admin-query code —
**16/16** (10 for the pipeline, then 6 for D-14): dedupe via `upsert(ignoreDuplicates)`; the claim `rpc`; the lease-guarded
update using the timestamptz equality filter (the riskiest line, since a fake
cannot prove it); a transient → permanent → alert flow; three sweeps racing over
15 rows (each sent once); expired-lease reclaim; lease loss detected; `processAfterEnqueue`
never throwing; the admin list/filter/detail/summary queries. The D-14 six: the two DB constraints; the link e-mail enqueued, deduped and sent with the right reply-to and link; the admin request list against real PostgREST (the test that exposed the PGRST201 bug) with the e-mail state; the revoke path (unsent deleted, sent redacted, address null); the sweep against the real join for approved, rejected, changes-requested, pending, live, expired and orphaned requests, idempotent on a second run; the manual publish notice. On raw PostgreSQL
the claim was also tested with two concurrent sessions (one got 10 rows, the other
0) and for privilege denial to `anon`/`authenticated`.

## Manual verification

Verified in this sandbox:

- `tsc --noEmit`: 0 errors.
- i18n parity: 926/926.
- `next build` completes (exit 0) against a mock backend; the two new admin
  routes and `/api/cron/notifications` are dynamic. `next/font/google` stubbed
  for the sandbox and restored (byte-identical, `diff`); `tsconfig.tsbuildinfo`
  reverted; `public/sw.js` regenerated by the build script.
- On the built server: the cron route returns 401 with no header, 401 with a wrong
  one, 200 with the right one, and 401 with `cron-secret-not-configured` when the
  variable is unset. The admin pages redirect to login when signed out.
- With a fake owner session against a mock backend: the list, the filtered list,
  the dashboard and the detail page for a logged-only, a retrying, an exhausted
  and a missing message, in **en (LTR) and fa (RTL)** — no missing message keys,
  no raw sentinel values in the filters, counts and banners correct.
- The recommendations page rendered in `en` and `fa` with a mock backend: the new e-mail and language fields, the reworded notes, and a link with an address showing "E-mail to … · Sent · Logged only — not delivered" beside a link without one showing nothing.
- Grep of every new/changed UI file for physical CSS properties (RTL): none.
- `node scripts/check-content-placeholders.mjs`: passes (no new static content
  file; templates carry no placeholders and are covered by the tests).

**Not verified (needs the live deployment or a real browser):**

- A real send through Resend, and the idempotency behaviour of a lost response
  (no key, no domain — D-01).
- Vercel's own scheduler calling the route with the secret; the function-duration
  behaviour.
- The admin pages in a real browser: layout, dark mode, focus order, screen
  reader. Only server-rendered HTML was inspected (no headless browser was
  available). The two buttons' click paths were not exercised end to end — the
  functions behind them were (unit and real-stack), and the session gate was.
- The create-link and request-change **server actions themselves** (the code that calls the tested pieces) were type-checked and read, but not invoked through Next with a real session; what they call was tested.
- A real Supabase Auth session (a mock stood in for it).
- Safari/Firefox.

## Known issues

- **Retry timing is bounded by how often something sweeps.** The delays are
  minimums. On the free plan the scheduler runs once a day; retries also happen
  after each new submission and on demand. With no traffic and no external
  scheduler, a message that failed once can wait up to a day, and reaching
  *failed for good* through repeated transient failures can take days. An external
  scheduler removes this (runbook § 6). A *permanent* failure is caught on the
  first attempt regardless.
- **Until `CRON_SECRET` is set**, the daily run — including scheduled article
  publishing — refuses to run. Visible on `/admin/notifications` and in Vercel's
  cron logs.
- **Code deployed without `0017`** would send nothing (the claim function is
  missing; it logs the error) but lose nothing — messages stay queued. `0017` is
  already live.
- **A message can be sent twice only if** the provider accepted it, the response
  was lost, *and* the retry comes more than 24 hours later (Resend's key window).
- **Replay uses the replayer's draft.** When an idempotent replay re-queues
  missing e-mails, it renders them from the draft in that request, not the stored
  inquiry. Only the holder of the (random, client-side) idempotency key can
  trigger it.
- **An inquiry whose enqueue failed and who is never replayed** has no e-mails;
  the admin warns about it (last 7 days) and the inquiry is always in `/admin/leads`.
- **The recommender's address is visible to whoever can open the recommendations
  page — including an editor** (recommendations are content, not leads, § 13).
  It is the owner's own contact, and it disappears when the request finishes;
  say so if editors should not see it.
- **A mistyped address** gets the link e-mail and nothing tells the owner (a
  bounce is invisible without provider webhooks). The link can still be copied.
- **The change-request e-mail goes to whatever address the request holds**, even
  if the recommender has since moved on; it is sent once per ask.
- **Manual publish notices can feel redundant** when the owner is the publisher.
  They are unconditional by the owner's request.
- **No bounce/complaint handling** — needs provider webhooks.
- The privacy policy still says no e-mail provider is used; correct today,
  **must be updated when sending is switched on** (runbook § 5).

## New debt

- A repeatable test that runs every embedded select in `lib/` against a real
  PostgREST — the PGRST201 class of bug is invisible to type-checking and to
  mocks (Phase 21 CI).

- Retention schedule for `notification_outbox` / `notification_attempts` (PII
  copies; same gap the policy already states for inquiries).
- Provider webhooks (bounces, complaints, delivered status).
- A committed, repeatable real-stack integration test (Phase 21 CI could run
  PostgreSQL + PostgREST).
- Pre-existing, noticed: the `enforce_inquiry_stage_transition` function has a
  mutable `search_path` (advisor warning from 0010).
- Consultation e-mails (Phase 20).

## Decisions needed

None blocking. **D-14 is resolved** (the owner said yes, 19 September 2026; the
Decision Register entry now records what was built). D-01 still gates real
sending only; D-09 (consultation format) will shape Phase 20's e-mails.

## Rollback

`db/migrations/0018…sql` then `0017…sql` headers (0018 first: delete the two new
kinds' rows, restore the kind constraint, drop the two `recommendation_requests`
columns; then 0017 as before). Revert the code first. The cron
change reverts to the open-route behaviour — do not, unless you have set no
secret and must.

## Final status

**COMPLETE (code).** Real delivery and the § 9.3 outage rehearsal remain
deferred to D-01, exactly as Phase 9.3 recorded; the runbook (§ 5) is the checklist.
Next in sequence: Phase 20 — Consultation.
