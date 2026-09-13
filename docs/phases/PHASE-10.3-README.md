# Phase 10.3 — Installable PWA: Offline Behaviour for the Brief Builder

**Status:** ✅ COMPLETE
**Date:** 13 September 2026

## Objective

Make the Brief Builder's offline behaviour honest and resilient: the form
may open offline (it's just UI), but the success screen only ever
appears after the server has actually confirmed persistence — never on
queueing alone (roadmap § 10.3, principle 15).

## Scope

§ 10.3 offers a choice: "either block with a clear 'you're offline —
reconnect to send' message, or queue the payload locally and retry
automatically once back online (browser-side outbox, same idea as the
server-side outbox in Phase 19)."

**Starting point, found on inspection (not assumed):** a pre-flight
`navigator.onLine` check and a block-style `OfflineState` screen already
existed in `components/start/brief-builder.tsx`, dating from § 9.1 —
before Phase 10 existed. Two real gaps in it, found by reading the code
rather than by guessing:

1. It only checked `navigator.onLine` *before* calling the server
   action. If connectivity dropped *during* the request itself (the
   common real-world case — a flaky mobile connection, not a device in
   airplane mode), `submitInquiry(...)`'s rejected promise had no
   `catch` at all. That's an unhandled rejection, not an honest offline
   message — a real correctness bug, not a documented trade-off.
2. `OfflineState` was called without `title`/`description` props, so it
   silently fell back to the component's own hardcoded **English**
   defaults — on the Persian locale too. A real, if minor, § 17
   Definition-of-Done violation ("English and Persian verified").

Given the existing SW/PWA infrastructure from §§ 10.1–10.2 and Phase
10's own framing of this as mirroring Phase 19's outbox, this phase
implements the **queue** option, not just a hardened block — it fixes
both gaps above and adds the browser-side outbox itself.

## Dependencies

No Decision Register item applies. Compatible with `app/actions/inquiries.ts`
(§ 9.2) as-is: it has a minimum fill-time check (`MIN_FORM_FILL_MS`, 3
seconds) but no maximum staleness check, so a delayed retry — seconds,
hours, or days later — re-validates exactly like a fresh submission. The
idempotency key is preserved across the delay, so a retry after a
partial prior success (e.g. the insert succeeded but the response never
reached the client) correctly replays rather than double-inserting.

## Implementation summary

**`lib/inquiry-offline-queue.ts`** (new) — a one-slot, `localStorage`-backed
outbox: `readQueuedInquiry` / `writeQueuedInquiry` / `clearQueuedInquiry`,
storing `{ draft, meta, queuedAt }` as JSON under one fixed key.
`localStorage`, not IndexedDB or the Background Sync API: the payload is
small and plain, and only needs to survive a reload/reopen while the
`/start` page itself does the retry — no code path needs the browser to
send anything while the site is fully closed, which is the one thing
only Background Sync could add (and it isn't available in every browser
this site supports, notably Safari). Corrupt or missing entries are
treated as "nothing queued," never thrown — this is a best-effort
convenience layer, not a source of new failure modes.

**`components/start/brief-builder.tsx`** — the actual submit path was
restructured around one shared function, `attemptSubmit`, called from
three places:

1. **A normal Submit click**, when already online.
2. **A mount-time hydration effect** — if a previous visit (this tab
   reloaded, or the visitor closed and reopened the browser) left a
   queued submission behind, its exact draft and submission metadata
   (including the original `idempotencyKey` and `formRenderedAt`, not
   fresh ones) are restored, the wizard jumps to Review so the visitor
   can see what's about to send, and the send is retried immediately if
   already online.
3. **An online-transition effect** — connectivity returning while a
   queued item is still sitting there (queued during this same session,
   or left over from #2 if it started offline) triggers the same retry.

`attemptSubmit` is the one and only place `success` is ever set, and
only after `submitInquiry` returns `{ ok: true }` — identical guarantee
whether the call came from a live click or an automatic retry minutes
or hours later. Its `catch` block is what closes gap #1 above: any
thrown error (not just a `navigator.onLine`-detected one) now queues the
payload and shows the same offline state, instead of an unhandled
rejection.

**Queue invalidation on edit.** `updateDraft` (called on every real
field change) now also calls `clearQueuedInquiry()`. "Queued" means
"this exact brief is waiting to send" — once the visitor changes
anything, silently resending the old snapshot later would send
something they no longer agreed to. They'll queue a fresh one if they
go offline again before their next Submit. A non-op re-submit (clicking
"Back" from the queued screen, then Submit again without changing
anything) reuses the same `idempotencyKey` and is harmless either way.

**Race condition found and fixed while implementing this:** `isOnline`
previously defaulted to `true` and was corrected inside a `useEffect`.
Since the new online-transition retry effect also runs on that same
first mount, it could — for the fraction of a render cycle before the
correction landed — see the stale default `true` while the device was
actually offline, and incorrectly attempt a live submit instead of
queuing. Fixed by reading `navigator.onLine` directly in `useState`'s
lazy initializer instead of defaulting and correcting later; confirmed
this doesn't affect hydration, since `isOnline` plays no part in what
the very first render's JSX looks like. A `retryInFlight` ref also
guards against the mount-hydration effect and the online-transition
effect both firing a retry for the same queued item (declaration order
makes the guard synchronous and reliable: the mount effect's own retry
attempt sets the flag before the online-transition effect's check runs
in the same commit).

**Gap #2 (missing i18n) fixed:** the `offline` render branch now passes
explicit `title`/`description` from new `BriefBuilder.offlineQueuedTitle`
/ `offlineQueuedDescription` keys (both locales), rewritten to describe
the actual queue-and-auto-retry behaviour rather than the old generic
"you're offline" copy. A new `BriefBuilder.successQueuedNote` key adds
one honest extra sentence to the success screen — but only when
`deliveredFromQueue` is true (set by `attemptSubmit` only on a
queue-originated success) — so a visitor who was genuinely offline for
part of the process is told so, without implying every success involved
a delay.

## Decisions

None needed.

## Changed files

```
lib/inquiry-offline-queue.ts        new — one-slot localStorage outbox
components/start/brief-builder.tsx  attemptSubmit, mount/online-transition
                                     retry effects, isOnline race fix,
                                     queue-invalidation-on-edit, i18n fix
messages/en.json                    + 3 BriefBuilder keys
messages/fa.json                    + 3 BriefBuilder keys
```

## Database / migrations

None — no server-side change. `app/actions/inquiries.ts` (§ 9.2) is
unmodified; verified compatible by inspection (see Dependencies above).

## Tests

No automated test suite exists yet (Phase 21). `lib/inquiry-offline-queue.ts`
was exercised directly with `tsx` against a mocked `localStorage`: empty
read, write/read round-trip (draft and meta fields, `queuedAt` stamped),
single-slot overwrite behaviour, clear, and two corruption cases
(invalid JSON, valid-but-malformed object) both degrading to "nothing
queued" rather than throwing. 9/9 assertions passed. Not a committed
test file — reproducible from the module's own source once a test
runner exists (Phase 21).

## Manual verification

- `tsc --noEmit`: clean.
- `next build` (Turbopack, fonts stubbed and restored per the
  established sandbox pattern — `diff` confirmed byte-identical
  restoration): clean, all 40 routes generated, no new warnings.
- `lib/inquiry-offline-queue.ts` unit-verified as above (9/9 pass).
- Re-read the full retry/race-condition reasoning end to end (mount
  effect → online-transition effect → `attemptSubmit`) tracing exact
  render/commit ordering to confirm the `retryInFlight` guard and the
  lazy `isOnline` initializer actually close the race described above,
  rather than merely looking like they do.
- En/fa: new keys present and parseable in both message files; Persian
  copy reviewed against the transliteration ("آرتاویو") and
  ‌ی-ezafe orthography conventions used throughout the rest of
  `fa.json`, consistent with §§ 10.1/10.2's own additions.
- Light/dark, RTL: no new markup beyond passing different strings into
  the existing `OfflineState`/`SuccessState` components, which already
  carry both themes and both directions correctly.
- **Not verifiable in this sandbox** (no real browser / DevTools
  offline toggle / `localStorage` persistence across reloads available
  here): actually filling the Brief Builder, going offline mid-submit,
  confirming the queued screen appears with the correct copy, reloading
  the tab while still offline and confirming the draft rehydrates to
  Review, then reconnecting and confirming an automatic send with the
  "you were offline" success note. This is the same category of
  live-only check flagged in §§ 10.1 and 10.2 — recommended to close all
  three together in one pass against the deployed site.

## Known issues

- Single global `localStorage` key: two different browser tabs each
  queuing a submission while offline would have the second write
  silently replace the first. Acceptable at this form's expected volume
  (one visitor filling one brief at a time); not fixed here.
- No Background Sync API — the queue only retries while `/start` is
  open in a tab; a visitor who queues a submission and never reopens the
  site won't have it sent in the background. Documented in
  `lib/inquiry-offline-queue.ts`'s own comment as a deliberate,
  cross-browser-compatibility trade-off, not an oversight.
- The same live-browser verification gap noted in §§ 10.1/10.2's phase
  docs applies here too — see Manual Verification above.

## New debt

None new.

## Rollback

Revert the two changed files and delete
`lib/inquiry-offline-queue.ts`. Any visitor with a genuinely queued
`localStorage` entry from before the rollback would simply have it sit
inert (the reverted code no longer reads it) until the browser's own
storage eviction — no data loss risk, since the entry never contained
anything that wasn't already safely in the visitor's own browser to
begin with.

## Final status

**COMPLETE.** Both real gaps found in the pre-existing offline handling
are fixed, and the queue/auto-retry option from § 10.3's own two-option
spec is implemented end-to-end. This was the last open sub-phase of
Phase 10 — with §§ 10.1, 10.2 and 10.3 all complete, Phase 10 itself is
ready for its own exit-criteria pass (Home/Work/Services/About/Process/
Insights offline-browsable, Lighthouse PWA checks, both locales/themes)
once the live-only verification items from all three phase docs are
checked against the deployed site.
