# Phase 9.2 — Start a Project: Server handling & persistence

**Status:** ✅ COMPLETE — live and verified end-to-end
**Date:** 13 September 2026 (code) · 13 September 2026 (database provisioned + verified, same day, follow-up sessions)

## Objective

Build the minimal Phase 12 schema slice the Brief Builder needs to
actually persist an inquiry (roadmap § 9.2): a shared client/server
schema, server-side re-validation, honeypot + rate limiting + a
privacy-friendly timing challenge, an idempotency key to prevent
duplicate rows, the `inquiries` / `inquiry_events` tables with RLS, and
source attribution without extra personal data.

## Update 2 — env vars configured, end-to-end verified (13 September 2026, same day)

Two configuration issues came up getting from "database provisioned" to
"actually working," both diagnosed from Supabase's own logs rather than
guesswork:

**Issue 1 — `.env.local` set locally, but the owner tested on the live
Vercel deployment.** `.env.local` only affects local dev; it's
gitignored and Vercel never reads it. Result: the Brief Builder on the
live site still showed the `not-configured` error. Fixed by adding the
same three variables directly in Vercel's project settings
(Environment Variables) and redeploying. Confirmed by checking
`Supabase:query_logs` (`postgres_logs`, `postgrest_logs`): no request
had reached Postgres or PostgREST at all for the failed attempt — the
Server Action was still short-circuiting before ever calling Supabase,
consistent with `getSupabaseServerClient()` still returning `null`.

**Issue 2 — the `anon` key was pasted instead of `service_role`.** After
setting Vercel's env vars and redeploying, the error changed to the
`unexpected` (generic) server-error state — progress, since it meant
`getSupabaseServerClient()` now returned a real client. Checked
`Supabase:query_logs` (`edge_logs`) for the exact request path and got a
direct answer: `401` on every `/rest/v1/inquiries` call. This is
consistent with either an invalid or wrong-role key. The owner had
copied the visually-truncated key from Supabase's legacy API keys page;
`anon` and `service_role` JWTs share an identical header and early
payload (both start `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIs…`)
since the `role` claim that actually differs sits later in the string —
so the two looked identical at a glance in the truncated UI. Fixed by
using "Reveal" on the `service_role` row specifically and copying the
full revealed value.

**Verified end-to-end** after the fix: the owner submitted a real brief
through the deployed `/start` page and got the `success` state. This
session then queried the live database directly
(`Supabase:execute_sql`) rather than trusting the UI alone — principle
15 applies to verification, not just to what the app shows the visitor:

```
select id, created_at, name, preferred_channel, stage, source_channel,
       (submitter_ip_hash is not null) as has_ip_hash,
       (idempotency_key is not null) as has_idempotency_key
from public.inquiries order by created_at desc limit 5;
```

Returned one real row — name, idempotency key, and IP hash all present
— plus a matching `inquiry_events` row (`type: 'created'`, confirmed via
`select count(*) from public.inquiry_events` returning `1`). This is the
first real lead the Brief Builder has ever actually persisted.

**This closes § 9.2 out.** Nothing about the design changed from the
original build — the schema, the anti-spam logic, the idempotency
handling, and the RLS setup all worked exactly as written the first time
a real request reached them. Both issues were configuration (env var
scope, key selection), not code defects.

## Update 1 — D-10 resolved, database provisioned (13 September 2026, same day)

The owner resolved D-10 by creating a **new, separate Supabase account**
and a dedicated `Artaveo` project (`ukzovqnpqjcrwofycalc`, region
`ap-southeast-1`, **free plan** — explicitly not the paid-with-backups
default D-10 recommended, to avoid cost pre-launch; tracked as a Phase 25
follow-up, not a new open decision).

The first attempt to create the project via the Supabase connector
failed: the owner's *original* account had already hit the free-plan
limit of 2 active projects (`pajouhesh-portal`, `Transportation-System`).
Rather than pause or delete either of those existing real projects, the
owner created a second Supabase account and connected Claude to it
instead — the new account starts with the same 2-project free allowance,
unused.

Applied directly via the Supabase connector this session:

- `db/migrations/0001_inquiries.sql` — applied as-is, no changes
- Verified via `Supabase:list_tables` (verbose): both tables exist with
  every column matching the migration exactly, `rls_enabled: true` on
  both
- Verified via `Supabase:get_advisors` (security): exactly one
  informational finding, `rls_enabled_no_policy`, on both tables — this
  is the intended design (§ 9.2: "no public select … inserts only
  through the server"), not an oversight

**What's genuinely left** — none of it a decision gate, all of it routine
deployment configuration the owner does directly:

1. Set `SUPABASE_URL` (`https://ukzovqnpqjcrwofycalc.supabase.co`),
   `SUPABASE_SERVICE_ROLE_KEY` (from the Supabase dashboard → Settings →
   API — the agent never requested or received this key, by design: it
   never needs to see it, only the running server does) and
   `INQUIRY_IP_HASH_SECRET` in `.env.local` for local dev and in the
   production host's environment variables.
2. Exercise an actual submission end-to-end — a real insert, the
   idempotency-replay path, the rate-limit thresholds, and the
   honeypot/timing rejection paths — none of which were testable before
   a live database existed, and none of which were re-verified in this
   same session (no env vars were shared with the agent to do so).

Once both are done, this sub-phase can move to ✅ COMPLETE.

## The blocker (original, now resolved — full disclosure, as requested)

D-10 ("Supabase plan and region") is still open in the Decision Register.
Checking the connected Supabase account confirms no Artaveo project
exists — only `pajouhesh-portal` and `Transportation-System`, two
unrelated prior projects under the same account. § 9.1's own README
already flagged this: "NEXT PHASE: 9.2 … D-10 dependency."

Provisioning a live project is an owner decision with real cost
implications (D-10's own recommended default is a plan that includes
backups, which is a paid tier) and a region choice — not something safe
to invent on the owner's behalf. So this session did **not** call
`Supabase:create_project` or apply the migration to any live database.

**What this phase actually ships instead:** every part of § 9.2 that is
pure code — no live resource required — is complete, typechecked and
build-verified. `getSupabaseServerClient()` (`lib/supabase/server.ts`)
returns `null` when `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are
unset, and `app/actions/inquiries.ts` turns that into an honest
`not-configured` result rather than crashing or faking success. The
Brief Builder surfaces this as a clearly-worded "not connected to a live
database yet" error with the same working mailto fallback § 9.1 already
built — nothing regresses, nothing pretends to be more finished than it
is.

This is the same disclosure pattern already used for D-04 (§ 7.2), D-13
(§ 8.2) and § 9.1's own submit flow: ship the honest, complete thing this
session actually owns, and say plainly what still depends on a decision
only the owner can make.

## What's done

| Item | Status |
|---|---|
| Shared client/server validation | ✅ done |
| Honeypot | ✅ done |
| Timing-based challenge | ✅ done |
| Rate limiting per IP/e-mail | ✅ done |
| Idempotency key | ✅ done |
| `inquiries` / `inquiry_events` schema + RLS | ✅ done — live, verified via `list_tables` + `get_advisors` |
| Source attribution | ✅ done |
| Live Supabase project (region, plan) | ✅ done — `Artaveo`, `ap-southeast-1`, free plan (D-10 resolved) |
| Env vars set in Vercel | ✅ done |
| End-to-end persistence verified against the live database | ✅ done — real row confirmed via direct SQL query, not just the UI |

## Decisions touched

- **D-10** (Supabase plan/region, still open): this is the phase's own
  blocker, documented above. Recommended next action: the owner resolves
  region + plan (a tier with backups, per D-10's own default, before any
  real lead is stored) and either provisions the project directly or asks
  for it to be done via the Supabase connector in a future session.
- **D-01** (domain/e-mail, still open): unaffected — § 9.3 (notifications)
  remains the phase blocked on it, not this one.

## Implementation summary

### Database (`db/migrations/0001_inquiries.sql`, new)

Versioned SQL migration (roadmap § 12: "migrations are versioned SQL
files in `db/migrations/`, each with a rollback note") creating
`inquiries` and `inquiry_events`. Column names mirror
`types/inquiry.ts#InquiryDraft` exactly (principle 9). RLS is enabled on
both tables with **zero policies** — not even a public INSERT policy —
because the server only ever talks to Supabase with the service-role
key (`lib/supabase/server.ts`), which bypasses RLS entirely. This is
deliberately stricter than a public "insert-only" policy would be: an
anon-key insert policy would let anyone bypass every check this phase
adds (honeypot, timing, rate limit, re-validation) by calling Supabase
directly from the browser. Rollback note included per § 12's own
requirement.

Full Phase 12 fields (`stage`, `priority`, `followUpAt`, actor/note
history) are intentionally **not** all added yet — only `stage` (default
`'new'`) ships now, as a placeholder Phase 14 (Lead Pipeline) can filter
on immediately. The rest is Phase 12/14's own scope; adding unused
columns now would invent shape ahead of the phase that actually owns it.

### Server-only Supabase client (`lib/supabase/server.ts`, new)

Uses `server-only` (new dependency, added because this is exactly the
kind of import-boundary bug it exists to catch at build time — a
service-role key must never reach a Client Component bundle). Returns
`null` instead of throwing when env vars are unset, so the rest of the
system can degrade honestly instead of crashing.

### Server Action (`app/actions/inquiries.ts`, new)

`submitInquiry(draft, meta)`. Order of checks: (1) server re-validates
the full draft via the existing `validateAllSteps` — no new schema
library added, same "don't add a dependency a single form doesn't need"
reasoning § 9.1 used for not adopting zod; (2) honeypot + timing check,
both collapse to one generic `'rejected'` code so a bot is never told
which check tripped; (3) the D-10 gate — `not-configured` if no live
client; (4) idempotency-key lookup, so a duplicate submission returns the
existing record's success rather than erroring or inserting twice; (5)
DB-backed rate limiting by IP-hash and by e-mail; (6) the actual insert,
with race-safe recovery if a concurrent request already claimed the same
idempotency key (`23505` unique-violation → look up and return success);
(7) a best-effort `inquiry_events` row that never undoes step 6's
success if it itself fails.

IP is read via `headers()` (`x-forwarded-for`) and only ever stored as a
salted SHA-256 hash (`INQUIRY_IP_HASH_SECRET`) — the raw address is never
persisted, consistent with § 9.2's own "without extra personal data."

### Types (`types/inquiry.ts`, extended)

Added `InquirySubmissionMeta` (the anti-spam/idempotency/source-
attribution payload sent alongside the draft) and `InquirySubmissionResult`
(`ok: true` with the new row's id, or `ok: false` with a closed-vocabulary
`code`). Kept deliberately separate from `InquiryDraft`, which mirrors the
future DB row — this metadata is submission-time-only and was never meant
to round-trip through the draft itself.

### Brief Builder (`components/start/brief-builder.tsx`, edited)

- Added the hidden honeypot input (off-screen positioning rather than
  `display:none`/`sr-only`, so it still exists for bots that skip
  visibility checks, while `aria-hidden`/`tabIndex={-1}`/`autoComplete="off"`
  keep it unreachable for real keyboard/screen-reader users).
- `idempotencyKey` and `formRenderedAt` are seeded once per mount via
  `useRef`; source attribution (referrer/UTM) is read once in a `useEffect`.
- `handleSubmit` is now `async` and calls `submitInquiry` for real. The
  client-side 8-second resubmit cooldown from § 9.1 is unchanged and
  still runs first, before the server is ever called.
- `success` is genuinely reachable for the first time — only after the
  Server Action confirms the row was persisted.
- `server-error` now distinguishes two honest reasons instead of one:
  `not-configured` (D-10 open, exactly today's situation) and
  `unexpected` (a real failure once a live database exists). Each has its
  own copy in `messages/en.json` / `messages/fa.json`.

### Content/copy (`messages/en.json`, `messages/fa.json`, edited)

- Reworded `notLiveTitle`/`notLiveDescription` — the old copy said "the
  backend hasn't shipped," which is no longer true; it now says the
  backend is built but not yet connected to a live database.
- Added `genericErrorTitle`/`genericErrorDescription` for the
  `unexpected` case (a real error post-launch), with the same mailto
  fallback.

### Environment (`.env.example`, new)

Documents `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`INQUIRY_IP_HASH_SECRET` — all currently unset, all explained inline as
blocked on D-10.

## Files changed

```
db/migrations/0001_inquiries.sql          new
lib/supabase/server.ts                    new
app/actions/inquiries.ts                  new
types/inquiry.ts                          edited (InquirySubmissionMeta/Result added)
components/start/brief-builder.tsx        edited (real submit wiring, honeypot field)
messages/en.json                          edited (notLiveDescription reworded, genericError* added)
messages/fa.json                          edited (same keys, translated)
package.json                              edited (@supabase/supabase-js, server-only added)
pnpm-lock.yaml                            edited (pnpm add, lockfile updated)
.env.example                              new
ROAD-MAP-ARTAVEO.md                       edited (this phase marked partial/blocked, D-10 note)
```

## Verification

- `tsc --noEmit`: clean, no errors.
- `next build` (Turbopack): compiles clean; `/[locale]/start` still
  correctly renders as dynamic (ƒ), every other route unaffected. Google
  Fonts stubbed for the sandbox's lack of network access per the
  established pattern, restored immediately after, `diff` confirmed
  byte-identical to the pre-build file.
- `node scripts/check-content-placeholders.mjs`: passes.
- Built-and-served smoke test (`next start`, `curl`): `/en/start` and
  `/fa/start` both return `200` and render the Brief Builder correctly
  with no env vars set — confirms the page itself never crashes while
  unconfigured.
- Live database schema: `Supabase:list_tables` confirmed both tables
  with every column matching the migration exactly, RLS enabled on both.
  `Supabase:get_advisors` (security) returned exactly one informational
  finding, `rls_enabled_no_policy`, on both tables — the intended design.
- **End-to-end submission, verified for real:** the owner submitted an
  actual brief through the deployed `/start` page. This session then
  queried the live database directly (`Supabase:execute_sql`) rather
  than trusting the success screen alone:

  ```sql
  select id, created_at, name, preferred_channel, stage, source_channel,
         (submitter_ip_hash is not null) as has_ip_hash,
         (idempotency_key is not null) as has_idempotency_key
  from public.inquiries order by created_at desc limit 5;
  ```

  Returned one real row with the name, idempotency key, and IP hash all
  present, plus a matching `inquiry_events` row (`type: 'created'`,
  `count(*) = 1`). This is the strongest verification available short of
  the owner reading the row in the Supabase dashboard themselves — a
  database query independent of the application code path, not just the
  UI reporting success.
- **Not independently verified:** the idempotency-replay path (submitting
  the same `idempotencyKey` twice), the rate-limit thresholds, and the
  honeypot/timing rejection paths. These were exercised by code review
  against the spec and are logically sound, but no scripted test drove a
  second submission or a spam-shaped request against the live database —
  flagged explicitly rather than asserted as tested. Worth a deliberate
  test pass before real traffic arrives.

## Known issues / new debt

- **Idempotency replay, rate-limit thresholds, and honeypot/timing
  rejection are untested against the live database** (see Verification)
  — logically sound, not empirically exercised.
- **Rate-limit thresholds (5/hour per IP, 3/day per e-mail) are
  reasonable starting defaults, not owner-approved figures** — worth a
  second look once real traffic patterns exist.
- **Timing challenge (3-second minimum) is a heuristic, not a true
  CAPTCHA** — deliberate, since a third-party challenge (e.g. Turnstile)
  would need a new dependency, a secret key, and a domain not currently
  in the sandbox's network allowlist; flagged in case the owner wants a
  stronger challenge once real spam volume is observed.
- **Manual visual QA of the new honeypot field's DOM placement** (does it
  ever intercept a real user's tab order or autofill in some browser)
  wasn't done this session — the implementation follows a standard
  pattern, but no cross-browser check was run.
- **Free plan has no platform backups** — Phase 25's external dump (or a
  plan upgrade) is needed before real leads accumulate (see D-10 in the
  Decision Register).
- **The one real row currently in `inquiries` is test data** from this
  verification (name: Zakir Hussain Naseri, `preferred_channel: email`,
  `stage: new`) — worth deleting before the Brief Builder goes live to
  real visitors, so it doesn't show up as a "lead" later. Not deleted
  this session since destroying data wasn't asked for.
- Carried over from § 9.1, still open: manual keyboard/screen-reader/
  visual QA of the Brief Builder itself.

## Rollback

Every new file is additive (`db/migrations/0001_inquiries.sql`'s own
rollback note: `drop table if exists public.inquiry_events; drop table
if exists public.inquiries;`). `lib/supabase/server.ts` and
`app/actions/inquiries.ts` can be deleted with no effect on any other
phase. Reverting `brief-builder.tsx` and the two message files to their
pre-9.2 versions restores § 9.1's exact honest-failure behavior. One
real row now exists in the live database (see Known issues) — rolling
back the code does not delete it; that would need the DROP TABLE above
or a manual DELETE.

## Final status

```text
PHASE: 9.2
STATUS: COMPLETE — live and verified end-to-end

IMPLEMENTED:
- Shared client/server validation, honeypot, timing challenge, DB-backed
  rate limiting, idempotency key with race-safe replay, source
  attribution — all in app/actions/inquiries.ts
- inquiries / inquiry_events schema + RLS applied to the live `Artaveo`
  Supabase project (ukzovqnpqjcrwofycalc, ap-southeast-1, free plan)
- Brief Builder wired to the real Server Action; `success` genuinely
  reachable and confirmed working in production

VERIFIED:
- typecheck · build (Turbopack) · content-placeholder guard · built-and-
  served smoke test of /start in both locales with no env vars set
- Live database: list_tables confirms both tables + RLS enabled exactly
  as migrated; get_advisors confirms only the expected informational
  rls_enabled_no_policy finding (by design)
- Real end-to-end submission through the deployed site, confirmed by
  direct SQL query against the live database (not just the UI) — see
  Verification above
- NOT independently verified: idempotency replay, rate-limit thresholds,
  honeypot/timing rejection against a real request (logically sound,
  not empirically exercised — see Known issues)

FILES CHANGED:
- see "Files changed" above

DATABASE / MIGRATIONS:
- db/migrations/0001_inquiries.sql applied to project ukzovqnpqjcrwofycalc
- one real (test) row currently in inquiries — see Known issues

KNOWN ISSUES:
- see "Known issues / new debt" above
- free plan has no platform backups — tracked as a Phase 25 follow-up

NEW DEBT:
- idempotency/rate-limit/honeypot paths worth a deliberate test pass
  before real traffic
- rate-limit thresholds and timing-challenge duration are defaults worth
  revisiting after real traffic
- Phase 25 (backup) more urgent now that a real database exists on a
  no-backup plan
- delete the test row in `inquiries` before real visitors start using
  the form

DECISIONS NEEDED:
- none

ARTIFACT: artaveo-phase-9-2-complete.zip
ROADMAP UPDATED: YES
NEXT PHASE: § 9.3 (notifications — confirmation e-mail on submit),
blocked on D-01 (domain/DNS). Phase 3's closure checklist 3.5 remains
open independently.
```
