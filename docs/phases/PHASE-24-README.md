# Phase 24 — Observability

**Status:** ✅ COMPLETE (code) — migration `0021` verified on the local stack; **applied to the live project only after the numbers below were green — see *Database* for the live state and the order you must respect.**
**Date:** 21 September 2026.
**Migration:** `db/migrations/0021_observability.sql`.
**Model, event names, alert rules, setup, limits:** `docs/observability.md`. **What to do when something is wrong:** `docs/runbooks/incident-response.md`.

## Objective

Roadmap § Phase 24:
- structured logs with correlation IDs from request to database to outbox
- error tracking; business events (inquiry submitted, notification failed, content published, auth events)
- uptime check on the inquiry endpoint; alert on repeated notification failure

Plus what Phase 13, 19 and 23 explicitly left for this phase: a real alert when an audit row is dropped, an alert on `[rate-limit] … failed` and on the start-up configuration findings, and the Content Security Policy report endpoint.

## Before you push — in this order

1. **Migration `0021` first.** The new code writes `request_id` into `inquiries`, `inquiry_events` and `notification_outbox`. **If the code is live before the migration, saving a brief fails** (the insert names a column that does not exist). The migration is purely additive (three nullable columns, two tables, three functions) and older code ignores all of it, so applying it early is safe; applying it late is not.
2. **Read the privacy-policy paragraph** this phase added (`lib/legal-content.ts`, section *What we collect*, dated 21 September 2026). It is a public statement about what is recorded and for how long; it is worded to match what the code does, including the caveat that a browser-written error message could in principle contain a fragment of a page. Change it if you disagree, not the code around it.
3. **Push.** No new dependency, no new environment variable.
4. **Set up the external check** (GitHub, once — `docs/observability.md` § 5): secret `CRON_SECRET`, optional variable `SITE_URL`, then *Actions → Uptime → Run workflow*. Until you do, *Last external check* on the Observability page says "not recorded yet" and nothing watches the site from outside.
5. **The log format changed.** Every log line is now one JSON object with an `event` field; the old prefixes (`[security-config]`, `[rate-limit]`, `[cron]`) are gone. Search Vercel's log for `event`.

### Five-minute check after the first deploy
1. Open the home page and one case study in **both languages** — unchanged. (The policy gained one directive, `report-uri /api/observe/csp`; nothing should look different.)
2. `curl -sI https://<site>/en | grep -i x-request-id` — a UUID, different on every call.
3. `curl -s https://<site>/api/health` → `{"ok":true}`; `curl -s https://<site>/api/health/inquiry` → `"ok":true` with four named checks.
4. Sign in → `/en/admin/observability`. Expect: no alerts (or only the warning about the external check not having run), *Database: Answering*, the funnel, an empty or short error list. **Look for `csp.violation` groups** — this is the first time you can see what the Content Security Policy blocks in production. One about a strange origin is a visitor's browser extension; one naming your own site, Supabase Storage or Vercel Analytics is a real regression (`docs/runbooks/incident-response.md` § 4).
5. Submit a test brief at `/start`. Then on the Observability page: *What the site did* shows one more brief; *Recent events* lists `inquiry.submitted`; open the lead → its e-mails' detail pages show a *Request reference* that leads back to everything that request wrote.

## What was built

| Area | What |
|---|---|
| **Correlation id** | `proxy.ts` makes a UUID per request (never accepted from the caller), sets it on the request and the response (`x-request-id`). Written to log lines, `inquiries`, `inquiry_events`, `notification_outbox`, `audit_log.correlation_id` (a `uuid` column since 0008 that nothing ever filled), `ops_events`, `error_groups`, and sent as a header on every database request. Public Server Actions bind it with `bindRequestId(await getRequestId())`; route handlers with `runWithRequestId`. |
| **Structured logs** | `lib/observability/logger.ts` is the only place server code may call `console` (a test fails otherwise). About 70 ad-hoc `console.*` calls became events with names, or tracked errors. Redaction is built in (`redact.ts`). |
| **Error tracking** | `error_groups` + `record_error_event` (atomic, fingerprinted, one-hour window count, a cap of 500 groups with a shared `overflow` row, a regression reopens itself). Fed by `captureError` (every swallowed failure), the daily run's failed steps, Next's `onRequestError` (`instrumentation.ts`), browser errors (`components/site/error-reporter.tsx` → `/api/observe/client-error`) and CSP reports (`/api/observe/csp`). The error page now shows a *Reference* (the digest); `app/global-error.tsx` covers the root layout. |
| **Business events** | `ops_events` + `record_ops_event` (de-duplicating, flood-capped for informational rows): `inquiry.submitted`, `consultation.requested`, `evidence.submitted`, `content.published`, `notification.exhausted`, `alert.raised`, `cron.completed`, `monitor.checked`, `rate_limit.unavailable`, `audit.write_failed`. Auth events stay in `audit_log` (now correlated) and every audit entry is also one log line (`audit.recorded`, without its payload). |
| **Alerts** | Eleven stateless rules (`alert-rules.ts`): error-level are e-mailed once a day per problem and fail the external check; warnings are shown only. Evaluated by the daily run, by `/api/ops/check`, and every time the admin dashboard or the Observability page opens. |
| **Uptime check** | `.github/workflows/uptime.yml`: liveness, **"a brief would be saved"** (`/api/health/inquiry` — database, outbox, limiter; *not* a real submission), the start page, and `/api/ops/check` (alerts). No third-party action. |
| **Owner page** | `/admin/observability` (owner-only): alerts with what to do, health, funnel, error groups with resolve/ignore/reopen, recent events, a **reference lookup** (request id or digest → every record that carries it). Nav link, dashboard banner, request reference on a notification's page. 92 new keys, both languages. |
| **Fixes found on the way** | `submitInquiry`'s failed insert returned `code: 'error'` and wrote nothing anywhere (now `inquiry.persist_failed`); the same silent path in the consultation request, recommendation submit, attachment upload and consultation updates; the About page showed *"see the Decision Register"* (an internal document) in public English text, and its Persian said something the claims ledger does not (both now say "UTC — no fixed city is published"). |
| **Carried-over Phase 23 debt closed** | The limiter failing open is now an event and a warning; start-up configuration errors are a live `config.invalid` alert (names only); the CSP report endpoint exists with its own limits. |

## Decisions

1. **Alerts are questions, not messages.** Stateless: nothing to acknowledge, nothing to clear, nothing to get out of sync. Only "an e-mail went out today" is remembered (the outbox `dedupe_key`).
2. **The database, not the log, is where the important things live** — because Hobby keeps logs about an hour. The log stays the detailed, short-lived layer.
3. **GitHub's failure e-mail is the alert channel that works today.** The site's own e-mail is log-only until D-01, and would be down in the outages that matter. So the external check *fails* on an error alert. It uses only `curl`/`jq`.
4. **"The inquiry endpoint" is checked without submitting.** A synthetic submission would put fake leads in the pipeline. The check covers the dependencies (database, outbox, limiter) plus the page; a bug inside the action is what error tracking is for. Disclosed in the code, the workflow and the docs.
5. **Browser-supplied records never alarm** (`client`, `csp`): anyone can post them. They are listed, capped and rate-limited.
6. **`report-uri` only, no `report-to`.** The first version had both and a real browser never delivered a report in the test: with `report-to` present Chromium uses the batching Reporting API. `report-uri` is delivered at once by every engine. It is the older, formally deprecated form; the endpoint already parses both formats, so adding `report-to` later is one line.
7. **The request id is bound with `enterWith`, in each public action's own frame**, because wrapping the action body would break the Phase 23 rule that the reviewed body is what is inspected. The alternative (reading `headers()` in the logger) would make prerendered pages dynamic — so the logger never does, and a test pins both facts.
8. **Everything stored is scrubbed twice** (private field names, then value shapes) and paths are reduced to route patterns, because the private-link pages carry their token in the URL. Deliberately over-eager.
9. **90 days** of events and error groups; the shared `overflow` group is never purged by age (it is the record that the cap was hit).
10. **Thresholds are judgements, not measurements** (`THRESHOLDS` in `alert-rules.ts`), each a named constant.

## Database

`0021_observability.sql` (additive; rollback SQL in its header): `request_id uuid` on `inquiries`, `inquiry_events`, `notification_outbox` (nullable, partial indexes); tables `ops_events` and `error_groups` (RLS on, **no policy**); functions `record_ops_event`, `record_error_event`, `purge_ops_data` (`service_role` only, `search_path = ''`). Verified on the local stack (all 22 migrations from scratch) and by direct SQL before any application code used it; the integration suite then exercises every branch, including the 500-group cap and a 30-way race.

**Live state:** see *Live project* below.

## Tests

| | Before | After |
|---|---|---|
| Unit | 372 | **443** — 71 new (`observability-redact` 22, `-core` 20, `-alerts` 14, `-static` 15) |
| Integration (real PostgreSQL + PostgREST) | 166 | **226** — 60 new (`observability` 42, `observability-routes` 18); one Phase 23 test updated for structured logging |
| Browser + accessibility | 205 | **237** — 32 new (`observability.spec`); the full run: 237 passed in 14.0 minutes, none failed |
| Lint | 0 errors / 82 warnings | 0 errors / 82 warnings (cap unchanged) |
| `tsc --noEmit` | clean | clean |
| i18n parity | 1129/1129 | 1222/1222 (93 new keys: 92 in `Admin`, 1 in `ErrorPage`) |

What the suites are for, file by file: `docs/testing.md` (*Observability tests*). Highlights: a database test **plants an address, a name, a private token and free text, and searches every stored row for them**; a **simulated database outage while saving a brief** is now a tracked error and the visitor still sees the same message; **every alert rule against real rows** including its boundary and "never recorded is not an alert"; a browser test blocks a real inline script in the admin and finds it as a CSP group; another throws a real uncaught error and finds it scrubbed. Three existing tests changed on purpose (the console provider now logs no message content — not even attachment names; the cron route's constant-time check moved to a shared helper; the rate-limit failure is a structured line). `scripts/ts-resolve-hook.mjs` (test infrastructure only) learned that `next/server` needs its extension under plain Node.

## Manual verification

Done: the built app in a real Chromium against the local stack — the request id on every route type, health endpoints, the Observability page in both languages and both themes with axe, resolve/reopen, the reference lookup, an editor refused, a blocked script and an uncaught error reported. The workflow's shell steps were run against a fake `curl` for ok / degraded / failing / unreadable / no-secret / non-https / degraded-limiter.

**Not verified (cannot be from a sandbox):** a real Vercel deployment; a real scheduled GitHub run and its failure e-mail; whether Supabase's own logs show `x-request-id`; Next.js itself calling `onRequestError` for a real render error (the hook and its capture are tested with the documented argument shapes); a real Resend send (alert e-mails are log-only until D-01 — the mechanism is tested); the Persian wording of the new page read by a native speaker; the page in Safari/Firefox and with a screen reader.

## Known issues

1. **Admin content actions do not bind the request id.** Their audit rows and framework-reported errors carry it, but a log line from deep inside one does not. Add `bindRequestId(await getRequestId())` where it earns it.
2. **Logs older than about an hour are gone** on the Hobby plan; the database records (90 days) are what exist after that.
3. **GitHub's schedule is best-effort** and is switched off after 60 days without repository activity (the `monitor.silent` warning is the site noticing). The failure e-mail depends on your GitHub notification settings.
4. **The funnel counts start at deploy**; earlier activity is not in it.
5. **Fixed-window, single-region assumptions** of Phase 23 still apply; the health endpoint's 15-second cache is per instance.
6. **Browser reports can be forged** (bounded, never alarming — `docs/security.md` § 8 item 8).
7. `x-request-id` reaches Server Actions through the same request-header mechanism as the CSP nonce; verified on `next start`, not on Vercel.

## New debt

- Bind the request id in admin content actions (or a small wrapper) once someone needs it.
- A security card on `/admin/security` showing configuration findings (still only on the Observability page and in the log).
- An e-mail or chat channel for alerts that does not depend on the outbox (a second channel) — not needed while GitHub's e-mail exists.
- Drop `inquiry_attachments` and `media_assets.uploaded_by_ip_hash` (unchanged from Phase 23).
- Revisit `report-to` if Firefox starts supporting the Reporting API for CSP.

## Decisions needed

- **GitHub setup** (the check does nothing until then): secret `CRON_SECRET`, variable `SITE_URL` when D-01 gives a domain.
- **The privacy-policy paragraph**: confirm the wording and the 90-day retention.
- **Thresholds**: are three failed sends an hour, ten of one error an hour, and a day-and-a-half without a daily run the right levels for you? (`THRESHOLDS`.)
- **D-01** — until the domain exists no alert is e-mailed by the site; GitHub's e-mail carries it.

## Rollback

Revert the deployment (Vercel *Instant Rollback*); older code ignores the new columns, tables and functions. **Do not drop the `request_id` columns while the new code is live.** SQL to remove everything is in the migration's header. To silence only the reporting: remove `report-uri` from `lib/security/csp.ts`, or disable the workflow in the Actions tab.

## Final status

**COMPLETE (code).** See *Tests* for the verified numbers and *Manual verification* for what was and was not seen. Migration `0021` is live (below).
Next in sequence: Phase 25 — Backup & Recovery (M3).

## Live project

**Migration `0021` was applied to Supabase project `ukzovqnpqjcrwofycalc` on 21 September 2026, before the code was delivered** (the code inserts `request_id`, so the order matters). Checked afterwards by query: `request_id` exists on all three tables; `ops_events` and `error_groups` exist with row-level security on and **no policy**; `record_ops_event`, `record_error_event` and `purge_ops_data` are executable by `service_role` only (`proacl` is `{postgres=X/postgres,service_role=X/postgres}`, no `anon`, `authenticated` or public entry) with an empty `search_path`; both new tables are empty. Security advisors: the expected `rls_enabled_no_policy` (18 tables — the two new ones added to Phase 23's 16) and the plan-limited leaked-password warning; nothing new. Existing rows are untouched (the new columns are nullable and unfilled for them), and code from before this phase keeps working against the new schema.
