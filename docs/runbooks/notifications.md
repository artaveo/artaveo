# Runbook — Notifications & Outbox (Phase 19)

For the owner. Everything here happens in the Vercel dashboard, the Resend
dashboard, or `/admin/notifications` (owner-only).

## 1. First deploy of Phase 19 — do these in order

1. **Migrations `0017_notifications_outbox_v2.sql` and
   `0018_recommender_email.sql`** — already applied to the live Supabase project
   (`ukzovqnpqjcrwofycalc`) on 19 September 2026, before the code. Both are
   backward-compatible with the Phase 18 code, so there is no window in which the
   site is broken. If you ever rebuild the database from `db/migrations/`, apply
   them in order (`0017` after `0002`, `0018` after `0017` and `0015`).
2. **Set `CRON_SECRET` in Vercel** (Settings → Environment Variables, all
   environments), value = a random string of at least 16 characters
   (`openssl rand -hex 32`). Redeploy afterwards — variables only reach a new
   deployment.

   Why this is not optional: the daily route (`/api/cron/notifications`) now
   answers `401` without it. Until it is set, the daily run — notification
   retries **and scheduled article publishing** — does not run. (Before Phase 19
   the route ran open to anyone when the variable was missing; the Phase 9.3
   note that Vercel creates the secret itself was wrong.)
3. Push the code (GitHub Desktop), let Vercel deploy.
4. Smoke test (section 2).

## 2. Smoke test (about five minutes)

1. Open `/en/admin/notifications` signed in as the owner. Expect: the banner
   "Real sending is off…", no "CRON_SECRET is not set" warning, and two `Sent`
   rows from earlier inquiries whose delivery reads "Logged only — not
   delivered".
2. Submit a test brief at `/en/start` (and one at `/fa/start`). Reload the log.
   Expect four new rows for two briefs: a new-inquiry alert and a client
   confirmation each, status `Sent`, delivery "Logged only". Open one: the
   delivery log shows attempt #1 from `console`.
3. Submit the same brief twice quickly (double click). Expect **one** pair of
   rows, not two.
4. In the Vercel dashboard → Project → Cron Jobs → run
   `/api/cron/notifications` once. It should return `200`. Calling the URL in a
   browser without the header must return `401`.

5. **Recommender e-mail** (`/en/admin/content/recommendations`): create a link
   with an address you own and the language "Persian". The row shows
   "E-mail to <address> · Sent · Logged only — not delivered". Open
   `/admin/notifications`: a "Recommendation link e-mail" row in Persian, with
   the link in it. Revoke the link: the address disappears from the row and the
   message in the log now reads `[removed]`.
6. **Manual publish notice**: publish (or re-publish) any article; a
   "Article published" row appears saying who published it.

Nothing is delivered to a real mailbox in this state — that is expected until
section 5.

## 3. What the states mean

| Status | Meaning |
| --- | --- |
| Pending | Saved, not yet attempted, or waiting for its turn. |
| Sending | A worker holds it right now (a two-minute lease; if that worker died, the lease expires and the message is picked up again). |
| Sent | The provider accepted it. With the console provider this means *logged only* — the page says so. |
| Will retry | The last attempt failed in a way worth retrying (timeout, rate limit, provider outage). The next attempt time is shown. |
| Failed for good | Either the provider refused it in a way retrying cannot fix (bad key, unverified sender domain, bad address), or it used all its attempts (5 by default). It is waiting for you. |

Retry delays after a failure: 1 min → 5 min → 30 min → 2 h → 2 h. These are
**minimum** delays — a message is only retried when something runs a sweep:

- after every new inquiry or recommendation submission (a small sweep of older
  due messages, at most three, is done in the same request);
- the daily cron run;
- you, with **Send due messages now**, or **Retry now** on one message;
- optionally an external scheduler (section 6).

So on the free Vercel plan, with no traffic and no external scheduler, a
message that failed once can wait up to a day for its next attempt.

## 3b. E-mailing a recommender (D-14)

In `/admin/content/recommendations`, "Generate link" has two optional fields:
the recommender's e-mail and the language to write to them in. With an address,
the site sends them the link (the page shows whether it went out); without one,
nothing changes and you share the link by hand.

When you **Request change** while moderating and the request has an address, your
note is e-mailed to them, in their language, with the same link. Requests without
an address just show the note on the reopened page, as before.

**The address is kept only while the request is open.** It is deleted — and the
stored e-mails have their address and text overwritten with `[removed]` — when
you revoke the link, approve or reject the recommendation, the link expires
unused, or the recommendation is deleted. Revoking or finishing a request also
deletes any e-mail for it that had not gone out yet. Approve/reject/revoke do it
immediately; the daily run cleans up anything else. One gap, stated in the
privacy policy: a link with **no expiry** that is never used or revoked keeps its
address — set an expiry (the default is 30 days) or revoke it.

A `[removed]` message cannot be retried. Anyone who can open the recommendations
page (including an editor) can see a live request's address.

## 3c. Consultation e-mails (Phase 20)

Five kinds ride the same outbox: `consultation-requested` (alert to you, `Reply-To`
the client), `consultation-received`, `consultation-confirmed` and
`consultation-cancelled` (to the client, in the language they used on the site),
and `consultation-client-update` (to you, when the client cancels or asks for new
times). Two things are different from every other message:

- **Attachments.** A confirmation carries a calendar invitation (`.ics`,
  `METHOD:REQUEST`) and a cancellation of a confirmed time carries the matching
  `METHOD:CANCEL`. They are stored in `notification_outbox.attachments` exactly as
  sent, and `/admin/notifications/[id]` lists their file names. The console provider
  logs only the file names, never the calendar text.
- **One dedupe key per state change.** A confirmation's key includes the calendar
  `SEQUENCE`, so moving a call sends a new invitation that *updates* the client's
  calendar entry (same UID) rather than adding a second one. A client's second
  "different time" request is its own message; repeating the same request is not.

A client who cancels a call you never confirmed gets no e-mail (there is nothing to
remove from their calendar); you get the notice. Everything else about failures,
retries and the alert is § 4, unchanged.

## 4. A message failed for good

You will see it in three places that do not depend on the failing e-mail: the
red banner on `/admin`, the red banner on `/admin/notifications`, and the row
itself. If sending works at all, you also get a `System alert` e-mail.

1. Open the message. Read **Last error** and the delivery log.
2. Fix the cause. Typical ones:
   - `resend responded 401/403` — the API key is wrong or revoked, or the sender
     domain is not verified in Resend.
   - `resend responded 422` — the address or a header is invalid.
   - `EMAIL_PROVIDER=resend … not fully configured` banner — `RESEND_API_KEY` or
     `EMAIL_FROM_ADDRESS` is missing in Vercel.
3. Press **Retry now**. The message gets up to three more attempts and is sent
   immediately; the page reports what really happened. A message that was
   `Sent` is never sent a second time by this button.

Nothing is lost while a message waits: the inquiry itself is always saved
first, and is visible in `/admin/leads` regardless of e-mail.

The yellow "N recent inquiries have no notification record" warning means an
inquiry was saved but its e-mails were never queued (a database hiccup between
two writes). Open the lead in `/admin/leads` and reply to the client by hand —
there is no button that re-queues it. (If the visitor submits the very same
brief again from the same page, the missing e-mails are queued then; that is a
side effect of idempotent replay, not something to rely on.)

## 5. Turning on real sending (needs D-01: a real, DNS-authenticated domain)

1. Buy the domain; set `NEXT_PUBLIC_SITE_URL` to it (also fixes the links inside
   the e-mails, which point at the interim Vercel URL until then).
2. In Resend: add the domain, add the DNS records they show (SPF, DKIM), wait
   until it reads *Verified*. Consider adding a DMARC record.
3. In Vercel set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=…`,
   `EMAIL_FROM_ADDRESS=Artaveo <hello@yourdomain>` and redeploy.
4. `/admin/notifications` now says "Sending through Resend." Submit a test
   brief with an address you own. Expect the client confirmation in that inbox
   (in the language you picked) and the owner alert in `artaveo.dev@gmail.com`.
   Reply to each: the confirmation's reply goes to the owner address, the owner
   alert's reply goes to the client.
5. **Update the privacy policy** (`lib/legal-content.ts`, section "Where it's
   stored") to name the provider — it currently says no e-mail service is used —
   and bump `PRIVACY_LAST_UPDATED`. Then close the D-01-dependent parts of
   `docs/phases/PHASE-9.3-README.md`.
6. Provider-outage rehearsal (the § 9.3 exit criterion): temporarily set a wrong
   `RESEND_API_KEY`, submit a brief, watch the message go to *Failed for good*
   on the first attempt (401 is permanent), see the alert banner, restore the
   key, press **Retry now**.

## 6. More timely retries without upgrading (optional)

The route accepts requests at any frequency; only Vercel's own scheduler is
capped at once a day on the free plan. Point a free external scheduler
(cron-job.org, or a GitHub Actions `schedule:`) at:

```
GET https://<your-domain>/api/cron/notifications
Header: Authorization: Bearer <the same CRON_SECRET>
```

every 5–10 minutes. Overlapping runs are safe (each message is claimed
atomically), and the same call also publishes due scheduled articles, so a
scheduled article then goes live within minutes of its date instead of at the
06:00 UTC run. Keep the secret out of any public repository.

## 7. Deleting someone's data on request

The privacy policy promises deletion on request. Deleting the inquiry in the
database also deletes its notification copies and their delivery log
(`on delete cascade` on `notification_outbox.inquiry_id`, then on
`notification_attempts.outbox_id`). Messages that are not tied to an inquiry
(recommendation alerts, publish notices, system alerts) contain only the
owner's own address plus a recommender's name, relationship and company —
delete those rows by hand if a recommender asks.

A consultation is deleted together with its inquiry (`consultations.inquiry_id` is
`on delete cascade`), and every consultation e-mail row carries the inquiry id, so
the invitation copies go with it — checked against a real database in Phase 20.

A recommender who asks you to delete their address before the request finishes:
revoke their link (that clears it and redacts the e-mails).

There is still **no automatic retention schedule** for the outbox (the privacy
policy says so plainly). Tracked as debt.

## 8. Rollback

See the header of `db/migrations/0019_consultations.sql` (first, Phase 20), then
the headers of `db/migrations/0018_recommender_email.sql` and
`db/migrations/0017_notifications_outbox_v2.sql` (drop the function and the
attempts table, restore the two check constraints, drop the new columns). Revert the code first, otherwise the Phase 19 worker calls a function
that no longer exists (it then logs an error and sends nothing — messages stay
safely queued).
