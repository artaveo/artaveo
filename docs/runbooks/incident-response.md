# Runbook — something is wrong (Phase 24)

Written 21 September 2026. Background and definitions: `docs/observability.md`. Everything below starts at **`/en/admin/observability`** (owner only; MFA if you enrolled).

## 0. First two minutes, whatever the trigger

1. Open `/en/admin/observability`. Read **Alerts** first, then **Health**.
2. **Health → Database "Not answering"** → it is Supabase, not the site: open the Supabase dashboard for project `ukzovqnpqjcrwofycalc` (status banner, *Database → Logs*). The site fails honestly meanwhile (the Brief Builder says it could not save; nothing fake succeeds). Nothing to fix on your side unless a key was rotated — then § 6.
3. **The page itself says "could not be read"** → the database is unreachable or migration `0021` is not applied. Same first step.

## 1. An alert e-mail arrived (or the dashboard shows a banner)

The e-mail names the rule and what to do. The page repeats it with the same words. In short:

| Alert | First move |
|---|---|
| **An inquiry arrived and no e-mail was queued** | *Leads*: read the newest briefs now — a person is waiting. Then *Notifications*: is the outbox failing? |
| **E-mail messages are failing** | *Notifications* → open a failed message → *Last error*. `401/403` = key or sender domain; `422` = a bad address; timeouts = the provider. Fix, then *Retry now*. While D-01 is open real sending is off and this cannot fire from a provider. |
| **The same error keeps repeating** | *Errors*: sort by *Times*; open the group's reference; § 3 below. |
| **The audit log is missing entries** | The database refused an insert into `audit_log`. Check migration `0008` is applied and the database is up; the log lines named `audit.write_failed` carry the reason. Until fixed, admin changes and sign-ins are not all recorded. |
| **The daily run has not completed** | `CRON_SECRET` missing/short in Vercel, or the deployment is old. `docs/runbooks/notifications.md`. Set it, redeploy, then *Run workflow* on *Uptime* or open the cron URL with the header. |
| **Missing required settings** | `docs/security.md` § 6. The alert names the variables (never values). |

A **warning** never e-mails you. Look when you can.

## 2. The uptime check turned red in GitHub

Open the failed run; each step is separate:
- **Step 1 red** → the deployment is not answering: Vercel → Deployments (is the latest one Ready? *Instant Rollback* to the previous one is a click), and Vercel's status page.
- **Step 2 red** → the site answers but a brief would **not** be saved: database, outbox table or limiter. The response body names which check failed (`database`, `outbox`).
- **Step 3 red** → the start page does not render or lost its heading: a deploy broke it; roll back, then read the build.
- **Step 4 red** → an error-level alert is firing (the log prints which); or the check could not read the database; or the secret is wrong (the message says so).

A single red run followed by green is usually a platform blip (each step already retries three times). Two in a row is real.

## 3. A visitor says "it failed" (or sent a screenshot)

1. **Ask for the reference** on the error page (*Reference: 1234567890*), or the time and what they were doing.
2. `/en/admin/observability` → **Request reference or error number** → paste it.
   - A digest finds the **error group**: event name, message, route pattern, how often, last request id.
   - A request id finds everything that request wrote: the error, events, audit rows, the lead, its timeline, the e-mails.
3. To read the log lines around it: **Vercel → Logs**, search the request id — only within about an hour on Hobby. Older than that, the group's message and the records above are what exist.
4. Fixed it? **Mark resolved.** If it comes back it reopens itself — that is how you learn a fix did not hold.
5. Known and not worth acting on? **Ignore** (it keeps counting; it never alarms).

**"The form said there was an error but I see nothing"** — before Phase 24 that was `inquiry.persist_failed` with no record. Now: *Errors* → that event. If it is absent, the failure happened before the server (the visitor's connection, the platform's ≈ 4.5 MB body cap on a large attachment — `docs/security.md` § 5).

## 4. Browser reports: `csp.violation` and `client.error`

These come **from visitors' browsers**, so treat them as hints, not facts (anyone can post them; they never alarm).
- **`csp.violation`** — the Content Security Policy blocked something. The message says *directive*, *blocked origin*, *page*. One-off reports about a strange origin usually come from a visitor's browser extension. **A blocked origin that is one of your own** (fonts, images from Supabase Storage, Vercel Analytics) is a real regression: fix the policy in `lib/security/csp.ts`, or as an emergency set `CSP_REPORT_ONLY=1` in Vercel and redeploy (nothing is blocked; violations are still reported).
- **`client.error`** — an uncaught error in a page's JavaScript. Look at the route and the count: the Brief Builder (`/[locale]/start`) failing for many people is urgent; one report from an unusual browser is not.

## 5. "No alert, but something feels wrong"

- *Recent events*: is `inquiry.submitted` still appearing when you expect briefs? The *What the site did* table shows 24 h / 7 d / 30 d counts (from the day Phase 24 went live).
- *Health → Last daily run* older than a day, or *Last external check* "not recorded yet" — the second means the GitHub workflow is not set up (`docs/observability.md` § 5).
- *Notifications* → any message `pending` or `failed` with an old *next attempt*.
- Vercel → **Logs** with level *Error*.

## 6. A secret or key changed (or leaked)

`docs/runbooks/secrets-rotation.md`. After redeploying, look at **Health** and **Alerts** on the Observability page: `config.invalid` should be gone, the database *Answering*, and the next daily run/check should record itself.

## 7. Rolling back this phase

Code: revert the deployment (Vercel → *Instant Rollback*). Database: `0021` only **adds** (three nullable `request_id` columns, two tables, three functions); older code ignores all of it. The rollback SQL is in the migration's header. Do **not** drop the `request_id` columns while the new code is deployed — inserts into `inquiries` name that column.
