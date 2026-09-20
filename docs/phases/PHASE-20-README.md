# Phase 20 — Consultation

**Status:** ✅ COMPLETE (code) — real e-mail delivery stays off by design until D-01.
**Date:** 20 September 2026
**Migration:** `0019_consultations.sql` — **already applied to the live Supabase project** (`ukzovqnpqjcrwofycalc`) and checked there (see *Database changes*).

## Objective

Roadmap § Phase 20, v1 (request-based):

- the client proposes time windows in their own time zone
- the owner confirms one
- a calendar invitation (ICS) is sent
- reschedule and cancel links
- a consultation is always linked to an inquiry

v2 (a calendar provider behind the same interface, availability slots, buffer
times) is **not** built; the request/confirm model below is the interface a
provider would later sit behind.

## Scope

**Built**

- `/[locale]/consultation` — the request form: name, e-mail, optional WhatsApp
  number, what to talk about, up to three time ranges (date, from, to) in a time
  zone the visitor can see and change, consent. Same anti-spam as the Brief
  Builder (honeypot, minimum fill time, idempotency key, per-IP and per-e-mail
  limits).
- `/[locale]/consultation/[token]` — the client's **private page**: current
  status, the confirmed time (date, time, zone, and a UTC line), how the call
  will happen, an "add to calendar" download, "ask for a different time" and
  "cancel". `noindex`, token-gated, not in the page map — the same model as
  `/recommend/[token]`.
- `GET /api/consultation/[token]/calendar` — the calendar download for a
  currently confirmed call.
- Owner side (owner-only, like Leads): `/admin/consultations` (list, status
  filter, paging, "all offered times have passed" warning), `/admin/consultations/[id]`
  (confirm or move a call, cancel, mark completed, the client, the topic, the
  history), a nav link, a dashboard card and banner ("N call requests are waiting
  for a time"), and a consultation card on the lead's own page.
- Five e-mails through the Phase 19 outbox, with the calendar invitation as an
  attachment on two of them (see below).
- The state machine, enforced **in the database** like the lead pipeline.

**Deliberately not built, disclosed**

- A calendar provider, availability slots and buffers (roadmap v2).
- Paid consultations (D-09's other option), and automatic reminders before a call.
- Automatic recognition of the *owner's* availability — the owner chooses a time by hand.
- Provider webhooks and an outbox retention schedule (unchanged from Phase 19).

## Dependencies

Phase 9.2 (`inquiries`), Phase 12 (the `consultations` table from `0006`), Phase 13
(admin auth, audit log), Phase 14 (leads, the owner-only rule, the SLA), Phase 19
(outbox, provider, dedupe, retries). D-01 gates *real* sending only.

## Before you push

1. `0019` is already live — nothing to apply.
2. Push. No new environment variable, no new dependency.
3. Read the **privacy policy paragraph** this phase added (`lib/legal-content.ts`, the
   "What is collected" section) — it is a statement about your data practices, and
   you should agree with every sentence.
4. Decide D-09 (below). The build assumes its default.
5. Smoke test (five minutes, after the first deploy): submit a request on
   `/en/consultation`, open the private page from the success screen, sign in to
   `/admin/consultations`, confirm a time, refresh the private page (the time and
   the "add to calendar" link appear), download the `.ics` and open it in a calendar
   app, then cancel from the private page. With sending off, the e-mails appear in
   `/admin/notifications` as "Logged only — not delivered", with the `.ics` file name listed.

## Implementation summary

### The flow

```
client                                  owner
  │ /consultation (form)                  │
  │ ─────────── request ────────────────► │  new inquiry (source_channel = consultation)
  │                                       │  + consultation (requested) + private token
  │ ◄── acknowledgement + private link ── │  alert to the owner
  │                                       │
  │                      confirm a time ◄─│  (a slot inside an offered window, or their own)
  │ ◄─ confirmation + invitation (.ics) ──│  status = confirmed, SEQUENCE 0
  │                                       │
  │ "different time" ───────────────────► │  status = rescheduled; the confirmed time still stands
  │                      move the call ◄──│  new invitation, same UID, SEQUENCE + 1
  │ cancel ─────────────────────────────► │  calendar cancellation, SEQUENCE + 1
```

### State machine (`0019`, mirrored in `types/consultation.ts`)

```
requested   → confirmed | cancelled
confirmed   → rescheduled | cancelled | completed
rescheduled → confirmed | cancelled
completed, cancelled: terminal
```

A trigger (`enforce_consultation_status_transition`) refuses anything else with
`23514`. CHECK constraints make the impossible rows unrepresentable: a confirmed
call has a start, an end after it, and meeting details; a terminal one has
`closed_at`; a cancelled one says by whom. A partial unique index allows **one live
consultation per inquiry**.

### Time

`lib/consultation/time.ts` converts wall-clock time in an IANA zone to an instant
without a dependency. It is deterministic on a daylight-saving gap (a time that does
not exist is refused, with its own error) and takes the first occurrence of a repeated
hour; it handles half- and 45-minute zones (Kabul, Kolkata, Kathmandu, Lord Howe).
The client only ever holds strings (`date`, `from`, `to`); the server converts and
stores UTC instants plus the zone name. Every time shown to a person carries its zone
(named, with the current UTC offset) **and** a UTC line — "Thursday 14:00" means
nothing without saying whose Thursday. D-03 holds: Persian digits and Gregorian dates
in prose (including the counts inside Persian messages, written `{left, number}` so they
print as Persian digits), Latin digits for clock times. The UTC line is the one deliberate
exception: it is a fixed English technical string (`Wed, Sep 23, 2026, 09:30–10:00 UTC`) in
both languages and in every e-mail, so it can be pasted into any converter and never reads
two ways.

### Calendar invitations (`lib/consultation/ics.ts`)

Hand-written RFC 5545 / iTIP, no dependency: CRLF line endings, folding at 75 octets
that never splits a multi-byte character (Persian text), TEXT escaping, and
parameter/attendee sanitising so a hostile name or subject cannot inject a property.

- `METHOD:REQUEST` — confirmation or a moved call (attendee, RSVP requested).
- `METHOD:CANCEL` — a cancelled call that had a confirmed time.
- `METHOD:PUBLISH` — the passive "add to calendar" download (no attendee).

One **UID** per consultation forever (`<id>@consultations.artaveo`); `SEQUENCE` rises
on every confirmation and cancellation, which is what makes a calendar client
*update* the entry instead of adding a second one. `consultations.sequence` holds the
number the *next* message must carry.

### Concurrency

Every change is one conditional `update … where status = <read> [and sequence = <read>]`.
If two actions race — the owner confirming twice, the owner confirming while the
client cancels — one update matches no row and gets `conflict` / `not-allowed`; the
trigger is the second guard. Two submissions racing with one idempotency key end with
**one** consultation and the same private link for both (see *Tests*, the bug the real
stack found).

### E-mails (`lib/notifications/consultation-templates.ts`, `events.ts`)

| Kind | To | Language | When |
|---|---|---|---|
| `consultation-requested` | owner | en | new request; `Reply-To` is the client |
| `consultation-received` | client | their site language | acknowledgement + private link |
| `consultation-confirmed` | client | their site language | confirm or move; carries the `.ics` |
| `consultation-cancelled` | client | their site language | owner cancels, or client cancels a *confirmed* call; carries the cancellation `.ics` when a time was confirmed |
| `consultation-client-update` | owner | en | client cancelled or asked for new times |

Client messages are in the owner's first-person voice (formal "شما" in Persian, like
the other client-facing e-mails); the response commitment is D-08's wording, unchanged.
Dedupe keys: `requested`/`received` once per consultation, `confirmed` per `SEQUENCE`,
`cancelled` once, `client-update` per change. Outbox rows carry an `attachments`
jsonb array; the Resend provider base64-encodes it, the console provider logs only
file names.

### SLA

`lib/admin/pipeline.ts` now counts an `inquiry_events` row as the owner responding
only when its actor is neither `system` nor `client` (`isOwnerAction`). Without this,
a consultation request's own automatic events and the client's own cancel/reschedule
would have started and stopped the "first reply" clock. The batched SQL filter does
the same. Existing leads are unaffected (their events are all admin-authored).

### Shared IP hashing

`hashIp` / `getClientIp` moved from `app/actions/inquiries.ts` to `lib/request-ip.ts`
(body byte-for-byte the same). A consultation request *is* an inquiry, and the per-IP
limit only means something if both flows hash an address to the same value.

### Site integration

- `IdentityCta` "Book a consultation" (About page and the design-system showcase)
  now defaults to `/consultation`; it pointed at `/contact` until this flow existed.
- `/consultation` is a command-palette **action** (like `/start` and `/contact`, so
  not part of the search index) and is in the sitemap. It is deliberately **not** in the
  main nav — *Start a project* stays the one primary action (the roadmap's "one primary action everywhere" principle).
- The Contact page links to it beside the Brief Builder link.
- `consultation_request` (typed since Phase 11.1) is now wired: fired once, after the
  server confirms the request is saved. Properties: `locale`, number of windows.
- Privacy policy: the collected data, the private link, the 14-day page closing, the
  stored calendar copies. `PRIVACY_LAST_UPDATED` → 2026-09-20.

### i18n

Both locales: `ConsultationPage` (54 keys), `ConsultationManage` (49), `Nav.consultation`,
`ContactPage` (2), and 90 `Admin` keys (list, detail, forms, errors, statuses, event
types, notification kinds). Parity 1122 / 1122. Persian numbers passed as message
parameters follow the site's existing convention (`صفحه {page} از {totalPages}`).

## Decisions

Each needs the owner's eventual confirmation (Decision Register convention).

1. **D-09 default applied, not confirmed:** free intro call, **30 minutes** (the upper
   end of "20–30 min"), request-based. The length is one constant
   (`CONSULTATION_DURATION_MINUTES`) and one column default.
2. **Every request creates a new inquiry** (`source_channel = consultation`), so
   "always linked to an inquiry" is a database fact, not a convention, and the request
   shows up in the lead pipeline with its SLA.
3. **Engineering limits, not published policy:** at least 12 h from now, at most 45 days
   out, 1–3 windows, each 30 min–8 h on a 30-minute step, at most 3 "different time"
   requests per consultation (the table allows 5), the private page stays readable 14 days
   after the call ends, and the Brief Builder's 5 requests/hour/IP and 3/day/e-mail. All in
   `lib/consultation/config.ts`. None is stated on the public site except the ones the
   form itself explains.
4. **The client's actions are recorded as actor `client`**, the owner's with their user id —
   the basis of the SLA change above.
5. **Client cancelling a never-confirmed call sends the client nothing** (no calendar
   entry exists; the page already showed it). The owner always gets a notice.
6. **The private page is the source of truth, e-mail is a courtesy.** With sending off,
   status, time, meeting details and the calendar download all work from the page.
7. **Native `<select>`** for zones, dates and times (a zone list has ~400 entries; the
   platform picker is the best control on a phone and in right-to-left).
8. **Owner-only.** Consultations hold the client's details and what they want to
   discuss, so they follow the leads rule (§ 13: an editor never sees lead data).
9. **The client can change their time zone** when asking for new times; the times are
   re-shown in the new zone from then on.
10. **No new dependency.**

## Changed files

New

- `db/migrations/0019_consultations.sql`
- `types/consultation.ts`
- `lib/consultation/` — `config.ts`, `time.ts`, `windows.ts`, `ics.ts`, `token.ts`,
  `queries.ts`, `service.ts`
- `lib/notifications/consultation-templates.ts`, `lib/request-ip.ts`
- `app/actions/consultations.ts`, `app/actions/consultation-admin.ts`
- `app/[locale]/consultation/page.tsx`, `app/[locale]/consultation/[token]/page.tsx`,
  `app/api/consultation/[token]/calendar/route.ts`
- `app/[locale]/admin/(protected)/consultations/page.tsx`, `…/[id]/page.tsx`
- `components/consultation/` — `consultation-content`, `consultation-form`,
  `windows-editor`, `manage-summary`, `manage-actions`, `consultation-status`
- `components/admin/consultations/` — `confirm-form`, `cancel-form`, `complete-button`,
  `admin-action-message`
- `components/ui/native-select.tsx`
- `scripts/test-consultations.mjs`, `scripts/helpers-consultations.mjs`,
  `scripts/verify-consultations-stack.mjs`

Modified

- `types/notifications.ts`, `types/pipeline.ts`
- `lib/notifications/events.ts`, `provider.ts`, `outbox.ts`, `templates.ts`
- `lib/admin/notifications.ts`, `lib/admin/pipeline.ts`
- `lib/site.ts`, `lib/analytics.ts`, `lib/legal-content.ts`, `lib/search/build-index.ts` (comment)
- `app/actions/inquiries.ts` (uses `lib/request-ip.ts`), `app/sitemap.ts`
- `app/[locale]/admin/(protected)/page.tsx`, `…/leads/[id]/page.tsx`, `…/notifications/[id]/page.tsx`
- `components/admin/admin-chrome.tsx`, `notifications/notification-badges.tsx`,
  `pipeline/events-timeline.tsx`; `components/contact/contact-content.tsx`; `components/ui/identity.tsx`
- `messages/en.json`, `messages/fa.json`
- `scripts/test-notifications.mjs` (the audience test now expects three more client kinds), `package.json` (`test:consultations`)
- `docs/runbooks/notifications.md` (§ 3c, § 7, § 8)

## Database changes / migrations

`0019_consultations.sql`, additive and backward-compatible with the Phase 19 code (nothing
old reads or writes the new columns):

- `consultations`: `token` (unique, NOT NULL), `locale`, `duration_minutes`,
  `confirmed_start`/`confirmed_end`, `meeting_details`, `sequence`, `reschedule_requests`,
  `cancelled_by`, `cancel_reason`, `closed_at`, `updated_at` (+ the existing `set_updated_at`
  trigger); 11 CHECK constraints; three indexes (token, created, confirmed start) and the one-live-per-inquiry partial unique index;
  the status-transition trigger and its function (`search_path` pinned).
- `inquiry_events.type` + five consultation values; `notification_outbox.kind` + five values;
  `notification_outbox.attachments` jsonb.
- RLS unchanged: enabled, no policy — server code with the service-role key only.

**Applied live on 20 September 2026** after confirming the live state matched the
assumptions (migrations `0001`–`0018` present; `consultations` empty with its original
seven columns; the two constraints named as expected). Checked afterwards: columns,
indexes, both triggers, RLS on with zero policies, the new kind constraint, `attachments`
as `jsonb`, existing outbox/inquiry rows untouched; **and, in a transaction that
rolled back on purpose (nothing left behind — confirmed by counting):** `requested → completed`
refused (`23514`), `confirmed` without a time refused (`23514`), `requested → confirmed`
allowed, a second live consultation for one inquiry refused, an event and an outbox row
with an attachment accepted, `cancelled → confirmed` refused, and deleting the inquiry
removed the consultation. Security advisors: **no new finding** (the only mention of the
new table is the same expected `rls_enabled_no_policy` INFO every lead table has). The
two WARNs that remain — `enforce_inquiry_stage_transition` without a pinned `search_path`
(Phase 14) and leaked-password protection off (a dashboard toggle) — predate this phase.

## Tests

`npm run test:consultations` — **33/33**, no dependency: time-zone conversion (whole-hour,
half-hour and 45-minute zones; DST forward and back; a non-existent time refused; a repeated
time; malformed input), the window rules (each error code; exactly 12 h allowed, 11.5 h not;
touching windows allowed, overlapping not; the zone decides the instant), the state graph,
owner and client rules, link expiry, the ICS builder (CRLF, folding at 75 octets never inside
a Persian letter, escaping, header/attendee injection, REQUEST/CANCEL/PUBLISH, UID stable and
SEQUENCE rising), all five templates in both languages, the enqueue functions (dedupe keys,
reply-to, "no file → the stored row keeps its old shape", cancel-of-unconfirmed sends nothing),
and the provider (base64 attachment to Resend, console logs names only). The TypeScript kind
list is tested against the kinds **the migration file itself allows**, so the two cannot drift.

`test:notifications` 40/40 (one assertion updated — three more client audiences),
`test:articles` 16/16, `test:search` 24/24.

**Against the real stack** — `scripts/verify-consultations-stack.mjs`, committed but *not*
part of `npm test` (it needs services): PostgreSQL 16 with `0001`–`0019` over minimal
Supabase shims, PostgREST 12.2.3, the real `supabase-js`, the real service, enqueue and
worker code — **22/22, run five times in a row**: request + replay + racing submits;
refusals write nothing; rate limits; reschedule (limit of 3); confirm (state, `SEQUENCE`,
event, audit row, invitation content); the client page's exact key set; move; **two owners
confirming at once — exactly one wins, the other gets `conflict`**; cancel with and without
a confirmed time; terminal lock-out; completion only after the call's time; the 14-day link
window; the SLA rule; admin reads; the database refusing what the code never would; deleting
an inquiry removing the consultation and its e-mail copies; the outbox sweep with attachments
queued. **It found a real bug the 33 unit tests could not:** when two submissions with one
key raced, the loser found the winner's inquiry but not yet its consultation and answered
"error". Fixed in `createConsultationRequest` (the loser finishes the job; the unique index
makes the second insert fall back to the first row).

**Against the built app:** `next build` (against the local stack, seeded with the site content,
with the usual `next/font/google` stub applied and restored byte-identical) succeeds;
`/en|fa/consultation` are prerendered, the private page and the calendar route are dynamic.
On `next start`: the private page shows a confirmed call in Persian with zone, UTC line and
details, and **nothing** about the client (no name, e-mail or topic); `noindex`; a bad token gives
the "not valid" state; the calendar route answers 200 with a valid file for a confirmed call and
404 for a pending call and for a malformed token; the real Server Actions, called through Next's
action protocol, gave the expected answers (`ok`, `replay`, `rejected`, `invalid-timezone`,
`window-order`, `not-allowed`, `not-found`), and the three owner actions redirected an
unauthenticated caller (307).

**Owner pages, with a mock signed-in owner** (added at the end of the phase): the built app was
started against the local stack with a stand-in for Supabase Auth (a mock `/auth/v1/user`, an
`admin_users` row and a session cookie), and consultations were seeded in every state
(requested, confirmed, moved-pending, cancelled by the owner, cancelled by the client).
Rendered in **en and fa**: the dashboard (banner and link), the list (unfiltered, each status
filter, an out-of-range page, a bogus filter and page value) and the detail page for every
state plus a missing id and a non-UUID id — all 200, no raw message keys, no `NaN`/`undefined`,
the offered times shown in the client's zone and in UTC, the client's private link shown. The
same pass on the client's private page for the five states, both languages, found one defect
(counts such as "3 more times" printed Latin digits inside Persian sentences), now fixed.

`tsc --noEmit`: 0 errors. i18n parity 1122/1122; every key the code references exists;
`check-content-placeholders.mjs` passes; no physical CSS property in any changed file;
`tsconfig.tsbuildinfo` reverted.

## Manual verification

**Not verified in this environment — please check:**

- The forms in a real browser: the time-zone picker's detected zone, the hydration of the
  date list, keyboard and screen-reader use, dark mode, and Persian (RTL) layout of the
  three-column date/from/to row on a phone.
- The **owner pages with a real signed-in session and a browser**. They render correctly
  with a mock session (see *Tests*), but the confirm form's list of start times is computed
  in the browser after hydration (the clock is client-only, to avoid a hydration mismatch), so
  the server-rendered HTML offers only "A different time…" and only a browser shows the slots.
  The slot arithmetic itself is unit-tested (a 2-hour window gives four 30-minute starts).
  Cancel and complete were exercised through the service against the real stack, not by
  clicking the buttons.
- A real calendar app importing the `.ics` files (Apple Calendar, Google Calendar, Outlook):
  the file follows the RFC and the tests pin its shape, but only a real client proves that a
  moved call *updates* the entry.
- A real Resend send of the invitation (D-01).

## Known issues

1. **No owner-side availability.** The owner picks a time by hand; nothing stops two
   different clients being confirmed at the same time. A "this overlaps another confirmed
   call" warning would be cheap and is not built.
2. **No reminders** before a call, and no "you have not confirmed this in N hours" nudge
   beyond the dashboard banner.
3. **An invitation's SEQUENCE is only as good as the client.** Some mail apps ignore updates
   from an address that is not the calendar's organiser; the private page always shows the
   truth and the `.ics` can be re-downloaded.
4. **The client's e-mail is not verified.** Anyone can request a call for any address; the
   acknowledgement (and later the invitation) goes to that address, and the per-e-mail limit
   (3/day) bounds the harm. Same exposure as the Brief Builder.
5. **A private link is a bearer token.** Anyone holding it can cancel the call. Documented in
   the privacy policy ("treat it like a password").
6. **The invalid-token page returns HTTP 200** (a friendly state, `noindex`) rather than 404.
7. **No automatic retention.** A finished consultation stays with its inquiry until deleted on
   request; only the *page* closes after 14 days.
8. Unchanged Phase 19 limits: real sending off; retry timing bounded by the daily sweep on the
   free plan.

## New debt

- Owner-availability / overlap warning (above).
- Reminders.
- `scripts/verify-consultations-stack.mjs` needs a hand-built local stack; a `docker compose`
  file would make it one command (Phase 21).
- The `enforce_inquiry_stage_transition` `search_path` advisory (Phase 14) — one line in a
  future migration.

## Decisions needed

- **D-09** — is a free, 30-minute, request-based intro call what you want? The build assumes so
  (the Decision Register default). Changing the length is one constant and one column default.
- **Should "Book a consultation" appear in the main navigation?** Built as a secondary action
  (palette, Contact, About), not in the header, to keep *Start a project* the single primary action.
- **Are the limits in Decision 3 right?** In particular the 12-hour minimum lead time.

## Rollback

Header of `db/migrations/0019_consultations.sql` (a complete, ordered block; valid only while no
row uses a new value). Revert the code first: the Phase 19 code does not read the new columns, so
the order matters only in the other direction — if `0019` is rolled back while the Phase 20
code is deployed, the consultation pages fail closed and the rest of the site is unaffected.

## Final status

**COMPLETE (code).** Migration live and verified; 33/33 unit tests, 22/22 real-stack checks, a
clean build and a smoke test of the built app. Owner and client pages were also rendered in both languages against real data (owner pages with a mock session). Not verified: the pages in a real browser, real
sign-in, and real calendar clients (see *Manual verification*).
Next in sequence: Phase 21 — Testing (M3).
