# Observability (Phase 24)

This file says **what the site records about itself, where you look when something is wrong, what wakes you up, and what none of it can tell you.** Where this file and the code disagree, the code has a bug — most of what is written here is pinned by a test, named next to it.

Written 21 September 2026. Operations by situation: `docs/runbooks/incident-response.md`.

## 1. What is recorded, and why it is in the database

Vercel's Hobby plan keeps runtime logs for about an hour (Vercel's documentation as I know it; check your plan's page). A site with one owner who is not watching a log viewer needs the important things to outlive that hour. So there are three layers:

| Layer | Lives | Holds | Read it |
|---|---|---|---|
| **Log lines** | Vercel's log (≈ 1 hour on Hobby) | one JSON line per event, everything the code decided to say | Vercel → project → Logs; search for `event:…` or a request id |
| **`ops_events`** | Database, 90 days | the few events an operator counts or acts on: a brief arrived, a message failed for good, the daily run finished, the limiter stopped answering | `/admin/observability` → *What the site did*, *Recent events* |
| **`error_groups`** | Database, 90 days | every distinct failure once, with a count, first/last seen, a request reference and a status you set | `/admin/observability` → *Errors* |

`audit_log` (who did what in the admin, every sign-in) and `inquiry_events` (a lead's timeline) are older and unchanged; they now carry the request id too. **Nothing here is an access log** — Vercel has one, and a record of every page view is not what this is for.

## 2. The correlation id

`proxy.ts` makes one UUID per request (never accepted from the caller — the header can be set by anyone), writes it onto the request and the response as `x-request-id`, and from there it is written next to everything the request produces:

| Where | Column / field | Set by |
|---|---|---|
| Every log line of the request | `requestId` | `lib/observability/logger.ts`, from the bound id |
| The lead | `inquiries.request_id` | `submitInquiry`, the consultation service |
| The lead's timeline | `inquiry_events.request_id` | same |
| Every e-mail the request queued | `notification_outbox.request_id` | `enqueueNotifications` |
| The audit row | `audit_log.correlation_id` (a `uuid` since 0008, never set until now) | `writeAuditLog` |
| Events and error groups | `ops_events.request_id`, `error_groups.last_request_id` | `track()`, `captureError()` |
| Requests to the database | `x-request-id` header | `lib/supabase/server.ts` |
| A server render error's visitor-facing number | `error_groups.digest` | Next.js; shown on the error page as *Reference* |

**To follow one request:** paste the id (or the digest from a visitor's screenshot) into `/admin/observability` → *Request reference or error number*. It lists the error, the events, the audit entries, the lead, the lead's timeline and the e-mails that carry it. A notification's detail page links to its own request the same way. To read the *log lines* of that request, search Vercel's log for the id — within the hour.

**How the id reaches deep code.** Two mechanisms, chosen because reading `headers()` anywhere opts a page out of static rendering and the logger runs while the public pages are prerendered:
- `runWithRequestId(id, fn)` — for code that owns its entry point: every route handler, the daily run.
- `bindRequestId(await getRequestId())` — the first line of each *public* Server Action (`inquiries`, `consultations`, `recommendations`, `inquiry-attachments`, and the sign-in and MFA actions). `getRequestId()` is the only function that reads the header and is called from a reviewed list of files (`tests/unit/observability-static.test.mjs`); the logger, the database client and the store never call `headers()` (also pinned).

**Known limit, said plainly.** An admin *content* action (publish, edit) does not bind the id. Its audit row still carries it (`writeAuditLog` reads the header itself), and an error it throws is caught by the framework hook with the id — but a `console`-style line from deep inside it has none. Add `bindRequestId(await getRequestId())` to an action when it earns it.

## 3. Logs and event names

**One place logs:** `lib/observability/logger.ts` (`log.info|warn|error(event, fields)`). A test fails if any server file calls `console` directly. A line:

```json
{"t":"2026-09-21T10:00:00.000Z","level":"error","event":"inquiry.persist_failed","requestId":"…","release":"a1b2c3d","env":"production","err":{"name":"Error","message":"…","code":"23503"},"consequence":"the brief was NOT saved"}
```

**Event names** are `area.what_happened` in lower snake case; they are the vocabulary alerts and the admin page filter on, so a new one is a small decision, not free text (a test checks every name in the code against the format). Which ones are *persisted* (`track` → `ops_events`, `captureError` → `error_groups`):

| Persisted event (`ops_events`) | Level | Written when |
|---|---|---|
| `inquiry.submitted` | info | a brief was saved — ids and labels only, never text |
| `consultation.requested` | info | a call request was saved |
| `evidence.submitted` | info | a recommender submitted a statement |
| `content.published` | info | an article/project/service went live (manual, or the scheduled sweep) |
| `notification.exhausted` | error | a message failed for good |
| `alert.raised` | warn | an alert e-mail was queued (once per problem per day) |
| `cron.completed` | info | the daily run reached its end (with the names of any steps that failed) |
| `monitor.checked` | info | the external check called `/api/ops/check` |
| `rate_limit.unavailable` | warn | the limiter did not answer and a request was let through (≤ 1 a minute) |
| `audit.write_failed` | error | an audit row could not be written (≤ 1 a minute) |

Errors (`error_groups`) come from `captureError(err, { event, source })`: every swallowed failure that used to be a `console.error` (the "the event itself was saved" cases), every failed step of the daily run, and everything Next.js reports through `onRequestError` — page renders, route handlers, Server Actions, the proxy — plus what browsers send (§ 4 of the runbook). **One failure is one group**: the fingerprint is the event, the error name, the message with ids/numbers/quoted values removed, and the route *pattern*; two requests failing for the same reason are one row with a count. Up to 500 distinct groups; past that, new ones share one `overflow` group (so an attacker or a bug cannot grow the table without limit).

**Group status.** *Resolved* means "I fixed it": if it happens again it **reopens itself** (a regression). *Ignored* keeps counting and never alarms.

**Found while building this phase:** `submitInquiry` returned `code: 'error'` when saving the brief failed and wrote nothing anywhere — the visitor saw an error, the owner saw nothing. It is now `inquiry.persist_failed`, a tracked error with the request id. Several other public actions had the same silent `return { ok: false, code: 'error' }` and were given the same.

## 4. Alerts

Alerts are **questions the data answers every time they are asked**, not messages that were sent: `lib/observability/alert-rules.ts` turns a snapshot of numbers into the list of rules currently firing. Nothing to acknowledge, nothing to clear — when the cause is fixed the answer becomes "no". What *is* remembered is only that an e-mail about a rule went out today (the outbox's `dedupe_key` is `ops-alert:<rule>:<UTC day>`), so **one problem is one e-mail a day**.

**Severity.** *Error* = broken now or a person is waiting: e-mailed once a day, and makes the external check fail. *Warning* = look when you can: shown on the page and in the check's output, never e-mailed.

| Rule | Severity | Fires when | Threshold (in `THRESHOLDS`) |
|---|---|---|---|
| `notifications.uncovered` | error | a brief is older than 10 minutes, from the last 7 days, and has **no** outbox row at all — nobody was told | > 0 |
| `notifications.failing` | error | send attempts are failing, or a message failed for good | ≥ 3 failed attempts in an hour, or ≥ 1 exhausted in 24 h |
| `errors.spike` | error | one error repeats inside its current hour | ≥ 10 in the hour |
| `audit.write_failed` | error | the security trail lost an entry | ≥ 1 in 24 h |
| `cron.stale` | error | the daily run has not completed | > 36 h since the last `cron.completed` — **only once one has been recorded** |
| `config.invalid` | error | a security-relevant variable is missing or weak (names only, from `checkSecurityConfig`, live) | any |
| `notifications.stuck` | warning | a message has been due for > 26 h | > 0 |
| `errors.new` | warning | an error not seen before appeared | ≥ 1 new open group in 24 h |
| `rate_limit.unavailable` | warning | the limiter failed and let a request through | ≥ 1 in an hour |
| `monitor.silent` | warning | the external check checked in once and then stopped | > 3 h — **only once it has checked in** |
| `auth.sign_in_pressure` | warning | the sign-in limit was crossed repeatedly | ≥ 2 crossings in a day |

**What never alarms:** errors from browsers and CSP reports (`source` `client` / `csp`). Anyone on the internet can post those; they appear on the page, they cannot wake you. (Pinned: `observability.integration.test.mjs` posts a dozen and checks the alert list stays empty.)

**How you find out.** Three independent routes, because e-mail is log-only until D-01:
1. The **admin dashboard** shows a banner while an alert is firing; `/admin/observability` lists them with what to do.
2. **E-mail** (`system-alert` through the outbox) — real once D-01 is done. It is the same outbox as every other message, so if e-mail is what is broken it fails like the rest — which is why this is not the only route.
3. **The external check** (§ 5) fails when an error alert fires; GitHub e-mails you about a failed scheduled run. That works today.

The daily run evaluates and e-mails too (at 06:00 UTC), so on a site with no external check the worst case is a day, not never.

**Thresholds are engineering judgements about a low-traffic site, not measurements.** Change them in one place (`THRESHOLDS`); the tests read the constants.

## 5. The external check

A site cannot report its own outage, and Vercel's Hobby cron runs once a day. `.github/workflows/uptime.yml` calls the site every 15 minutes from GitHub's runners. It uses no third-party action — `curl` and `jq` — so there is nothing to pin or trust. Four steps, each its own red line:

1. `GET /api/health` — the deployment answers (no database involved).
2. `GET /api/health/inquiry` — **a brief would be saved**: database, outbox and rate limiter answer. It deliberately does *not* submit a brief (that would put fake leads in the pipeline and fake e-mails in the outbox). What it cannot see is a bug inside the action; error tracking is for that.
3. `GET /en/start` — the page renders and contains its heading.
4. `GET /api/ops/check?probe=github` with `Authorization: Bearer $CRON_SECRET` — reads the database (if it cannot, the answer is `failing`, never "all clear"), records that the check ran, evaluates the alert rules, e-mails new error alerts, and answers `ok` / `degraded` / `failing`. The workflow fails on `failing`.

**Setup — once, in GitHub** (repository → Settings → Secrets and variables → Actions):
- **Secret** `CRON_SECRET` — the same value as in Vercel. Without it steps 1–3 run and step 4 says it was skipped.
- **Variable** `SITE_URL` (optional) — defaults to `https://artaveo-seven.vercel.app`. It must be `https://…`: it is where the secret is sent. Set it when D-01 gives you a domain.
- Then **Actions → Uptime → Run workflow** once by hand. In `/admin/observability` the *Last external check* line turns from "not recorded yet" to a time.

**Honest limits:** GitHub does not promise the minute (runs are late or skipped under load); it **switches scheduled workflows off after 60 days without repository activity** (the `monitor.silent` warning is the site noticing that; re-enable in the Actions tab); the failure e-mail goes to whoever last edited the schedule and depends on your GitHub notification settings; the workflow does not run in forks (`github.repository` guard).

## 5b. Why the policy reports with `report-uri` only

A browser that finds `report-to` next to `report-uri` uses the Reporting API instead: reports are batched (up to about a minute), need a `Reporting-Endpoints` header, and Firefox ignores it. `report-uri` is delivered at once by every engine and is what the browser test (`observability.spec.ts`, a real blocked script in a real Chromium) can actually verify — the first version had both, and the test never saw a report. `report-uri` is the older, formally deprecated form; the endpoint already parses the Reporting API's format too, so adding `report-to` later is one line in `lib/security/csp.ts`.

## 6. What is not verified (cannot be from a sandbox)

- **`onRequestError` fed by Next.js itself**: the hook and the capture code are tested with the argument shapes Next.js documents (`captureRequestError`, real database), but no test makes the built app throw a real render error and watches the hook fire — the site has no route that fails on purpose and adding one only for a test was not worth its risk. After the first deploy, the first real unhandled error settles it (it should appear as a `request.render_error` / `request.action_error` group with a digest).
- **A real Vercel deployment**: whether `x-request-id` from `proxy.ts` reaches Server Actions on Vercel's platform (it does on `next start`; the header travels the same way the CSP nonce does).
- **The `x-request-id` header on database calls**: it is sent; whether **Supabase's own logs show it** is only visible in the live project (Supabase → Logs → API). Nothing depends on it — every correlation above is stored by us.
- **A real scheduled GitHub run**, its e-mail, and GitHub's 60-day rule.
- **A real Resend send**: alert e-mails are log-only until D-01; the alert *mechanism* (outbox row, dedupe, once a day) is tested against a real database.
- **The Content Security Policy against production content**: the report endpoint exists so this can finally be seen — after the first deploy, open `/admin/observability` and look for `csp.violation` groups (the five-minute check in `PHASE-24-README.md`).
- **Log retention on your plan** and whether a log drain is worth it (not needed for anything here).

## 7. Privacy of the records

The rule the rest of the site follows: **a record about a failure must not become a second copy of a visitor's data.** Two layers, both applied (`lib/observability/redact.ts`, hostile-input tests in `observability-redact.test.mjs`, and a database test that plants an address, a name, a token and free text and searches every stored row for them):
- **Field names** — a value under `email`, `phone`, `token`, `password`, `goal`, `note`, `body`, `name`, `subject`… is replaced whole, however nested.
- **Value shapes** — whatever is left is scrubbed for what *looks* private: e-mail addresses (a database error quotes them: `Key (email)=(…) already exists`), JWTs, bearer credentials, `key=value` secrets, long random-looking tokens, long digit runs. Database `details` and `hint` (row values) are never kept.
- **Paths** — only route *patterns* or redacted paths are stored: the private-link pages carry their token in the URL, so `/consultation/<token>` would be a working key to somebody's page. Tokens and ids in paths become `[token]` / `[id]`; query strings are dropped.
- **No IP address** anywhere in these tables.
- **Retention:** 90 days (`purge_ops_data`, in the daily run). The privacy policy (`lib/legal-content.ts`, updated 21 September 2026) says what is kept and for how long.

The scrubbing is deliberately over-eager: losing a digit run from a log line costs a little debugging time; keeping a phone number costs a visitor's privacy. It cannot promise that an error message written by a browser never contains a fragment of a page — the policy says so.

## 8. Adding to the system — the checklist

- **New failure worth knowing about** → `await captureError(err, { event: 'area.what_failed', source })`; never `console`.
- **New business event** → `await track('area.what_happened', { subject, data })`. `data` holds ids and labels only.
- **New public Server Action** → `bindRequestId(await getRequestId())` as its first line (and the Phase 23 checklist).
- **New route handler** → `runWithRequestId(newRequestId(), …)`; never read the incoming `x-request-id`.
- **New alert rule** → a fact in `AlertFacts`, a rule in `deriveAlerts`, a row in `ALERT_TEXT`, a title and an action in *both* `messages/*.json` (`obsAlert<Id>`, `obsAlert<Id>Action`) — a test fails if any is missing.
- **New event name in `ops_events`** → nothing to migrate: the table takes any dotted name.
- **New `source` for error groups** → the migration's `check`, `ErrorSource` in `store.ts` (a test compares them).
