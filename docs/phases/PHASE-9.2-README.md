# Phase 9.2 — Start a Project: Server handling & persistence

**Status:** ⏳ PARTIAL — BLOCKED on D-10 for live wiring (code complete; see "What this phase does not do")
**Date:** 13 September 2026

## Objective

Build the minimal Phase 12 schema slice the Brief Builder needs to
actually persist an inquiry (roadmap § 9.2): a shared client/server
schema, server-side re-validation, honeypot + rate limiting + a
privacy-friendly timing challenge, an idempotency key to prevent
duplicate rows, the `inquiries` / `inquiry_events` tables with RLS, and
source attribution without extra personal data.

## The blocker (full disclosure, as requested)

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

## What's done vs. what's blocked

| Item | Status |
|---|---|
| Shared client/server validation | ✅ done — server re-validates via the same `validateAllSteps` the client already uses |
| Honeypot | ✅ done — hidden field in the Brief Builder, checked server-side |
| Timing-based challenge | ✅ done — rejects submissions faster than 3s from form mount (privacy-friendly, no third-party CAPTCHA/dependency) |
| Rate limiting per IP/e-mail | ✅ done — DB-backed (no new dependency), 5/hour per IP-hash, 3/day per e-mail |
| Idempotency key | ✅ done — client-generated UUID, DB unique constraint, race-safe replay handling |
| `inquiries` / `inquiry_events` schema + RLS | ✅ written (`db/migrations/0001_inquiries.sql`) — **not applied to any live database** |
| Source attribution | ✅ done — referrer/UTM/channel only, no extra PII |
| Server Action wiring `success` end-to-end | ✅ code done — **not reachable in production until D-10 resolves and env vars are set** |
| Live Supabase project (region, plan, backups) | ❌ blocked on D-10 — owner decision |
| Migration applied to a live database | ❌ blocked on the above |

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
  with **no env vars set** — confirms the page itself never crashes while
  D-10 is unresolved; the "not configured" path only triggers on actual
  submit, which requires interaction and wasn't exercised as scripted
  browser automation this session (see Known issues).
- **Not verified this session (requires a live database, which doesn't
  exist yet):** an actual successful insert, the idempotency replay path,
  the rate-limit thresholds, and the honeypot/timing rejection paths
  against a real request. These are logically verified by code review
  against the spec but not exercised end-to-end — flagged explicitly
  rather than asserted as tested.

## Known issues / new debt

- **End-to-end persistence is unverified** (see Verification) — this is
  the phase's own central blocker, not an oversight: there is nothing to
  test end-to-end until D-10 resolves and a project exists.
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
- Carried over from § 9.1, still open: manual keyboard/screen-reader/
  visual QA of the Brief Builder itself.

## Rollback

Every new file is additive (`db/migrations/0001_inquiries.sql` is inert
until applied — nothing runs it automatically). `lib/supabase/server.ts`
and `app/actions/inquiries.ts` can be deleted with no effect on any other
phase. Reverting `brief-builder.tsx` and the two message files to their
pre-9.2 versions restores § 9.1's exact honest-failure behavior. No data
exists anywhere to roll back, since nothing has been persisted (no live
database).

## Final status

```text
PHASE: 9.2
STATUS: PARTIAL — BLOCKED (on D-10, for live wiring only; code complete)

IMPLEMENTED:
- Shared client/server validation, honeypot, timing challenge, DB-backed
  rate limiting, idempotency key with race-safe replay, source
  attribution — all in app/actions/inquiries.ts
- inquiries / inquiry_events schema + RLS as a versioned migration
  (db/migrations/0001_inquiries.sql) — written, not applied
- Brief Builder wired to the real Server Action; `success` genuinely
  reachable once a live database exists

VERIFIED:
- typecheck · build (Turbopack) · content-placeholder guard · built-and-
  served smoke test of /start in both locales with no env vars set
- NOT verified: actual persistence, idempotency replay, rate-limit
  behaviour, honeypot/timing rejection against a real request (needs a
  live database — see Known issues)

FILES CHANGED:
- see "Files changed" above

DATABASE / MIGRATIONS:
- db/migrations/0001_inquiries.sql written; NOT applied to any project

KNOWN ISSUES:
- see "Known issues / new debt" above

NEW DEBT:
- end-to-end persistence verification owed once D-10 resolves
- rate-limit thresholds and timing-challenge duration are defaults worth
  revisiting after real traffic

DECISIONS NEEDED:
- D-10 (Supabase plan and region for Artaveo) — this phase's own blocker;
  see "The blocker" above for the exact next action

ARTIFACT: artaveo-phase-9-2-partial.zip
ROADMAP UPDATED: YES
NEXT PHASE: once D-10 resolves — provision the project, apply the
migration, set the three env vars, then verify end-to-end persistence
before this phase can be marked complete. Until then, § 9.3
(notifications) remains separately blocked on D-01 regardless.
```
