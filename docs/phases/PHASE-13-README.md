# Phase 13 — Admin Authentication & Authorization

**Status:** ✅ COMPLETE (code) — see "Known issues" for the one
live-environment step only the owner can do
**Date:** 16 September 2026

## Objective

A real login system for the admin panel: Supabase Auth for admin users
only, two fixed roles (`owner`, `editor`), MFA required for the owner
role, every `/admin` route and every admin Server Action independently
authorized server-side, and an audit trail of every auth event.

## Scope

Roadmap § 13:

> Supabase Auth for admin only; MFA required for the owner role · roles:
> `owner`, `editor` (content only, no leads) — permissions checked
> server-side on every action · protected `/[locale]/admin` routes and
> server actions; no reliance on hidden routes · secure sessions, auth
> event logging, audit log for every admin mutation

Explicitly out of scope for this phase (nothing to protect yet): the
lead pipeline (Phase 14) and CMS (Phase 15). The dashboard this phase
ships is intentionally a thin shell — identity, role, MFA status, sign
out — not a preview of later phases' screens.

## Dependencies

No open Decision Register item blocks this phase. `db/migrations/0008_admin_and_audit.sql`
(Phase 12) had already created `admin_users` and `audit_log`, RLS-enabled,
service-role only, with the two-role `check` constraint this phase relies
on — no new migration was needed.

**New dependency:** `@supabase/ssr@0.12.7`. The codebase had a
service-role Supabase client (`lib/supabase/server.ts`) but nothing that
could act *as* a signed-in user with cookie-persisted sessions —
`@supabase/ssr` is Supabase's own official package for exactly that in a
Next.js App Router project, and there is no lighter alternative that
does cookie refresh + RLS-scoped auth correctly (roadmap § 20: "don't
add dependencies without a reason").

## Implementation summary

### Two Supabase clients, two purposes

- `lib/supabase/server.ts` (existing, unchanged) — service-role, bypasses
  RLS, used for content reads and for the `admin_users` role lookup
  (which has no public read policy at all).
- `lib/supabase/server-auth.ts` (new) — cookie-bound, uses the `anon`
  key, acts as whichever user the request's cookies belong to. Every
  `auth.*` / `auth.mfa.*` call in this phase goes through this client,
  never the service-role one — signing in, checking MFA state and
  reading `auth.getUser()` all happen as the real user, subject to RLS,
  not as a trusted service identity impersonating them.

### Session refresh & route guard (`proxy.ts`, `lib/supabase/middleware.ts`)

`proxy.ts` already ran `next-intl`'s locale middleware; it now also
refreshes the Supabase session cookie on every request and, for any
`/admin/*` path except `/admin/login`, redirects straight to
`/admin/login?next=…` when there's no authenticated user at all. This is
deliberately the *cheap* half of the guard — it only checks "is there a
session", not "is this session an admin" (that needs a Postgres read,
which edge middleware pays on every single matched request; doing it
here would mean every admin page load costs an extra round-trip before
the page itself has run). The authoritative check lives server-side,
independently, in every page and Server Action — see next.

### Authorization (`lib/admin/auth.ts`)

`getAdminSession()` is the one real check: an authenticated Supabase
user is not an admin by itself, only a matching `admin_users` row makes
them one. It also resolves the session's current/next Authenticator
Assurance Level (AAL) from `auth.mfa.getAuthenticatorAssuranceLevel()`,
wrapped in React's `cache()` so calling it several times in one request
(layout, page, and a Server Action can all call it) costs one Supabase
round-trip, not several. `mfaSatisfied()` / `mfaDestination()` encode the
actual rule: MFA is required for `owner`, optional for `editor`; an
owner with a verified factor that's just not confirmed *this session*
goes to `/admin/mfa-challenge`, an owner with no factor enrolled at all
goes to `/admin/security` — the AAL response distinguishes these two
(`nextLevel` is `aal2` only when a verified factor actually exists), and
conflating them would either strand an unenrolled owner on a challenge
page with nothing to challenge, or hide the enrollment requirement from
one who already has a stale, unverified session.

Every protected page (dashboard, security) and every relevant Server
Action calls `getAdminSession()` itself and acts on the result — none of
them trust that `proxy.ts` or the `(protected)` layout already checked.
That is what "permissions checked server-side on every action" means in
practice here, not a single trusted gate.

### Server Actions (`app/actions/admin-auth.ts`)

`adminSignIn`, `verifyMfaChallenge`, `enrollMfaStart` / `enrollMfaVerify`
/ `unenrollMfaFactor`, `adminSignOut`. Error codes are deliberately
generic — a wrong password and a non-existent email both come back as
`invalid-credentials`, and a signed-in Supabase user who turns out to
have no `admin_users` row is silently signed back out and given the same
generic error — so a failed attempt can never be used to enumerate which
emails have accounts. `unenrollMfaFactor` exists because without it, an
owner who fumbles the first TOTP confirmation (wrong app, mistyped code
enough times) has no way to abandon that factor and start over — the
"ship the honest mechanism" reasoning D-13 already used elsewhere.

### Audit logging (`lib/admin/audit.ts`)

Every auth event in `app/actions/admin-auth.ts` — sign-in success and
failure, the not-an-admin rejection, sign-out, MFA challenge
success/failure, MFA enrollment success/failure, unenroll — writes an
`audit_log` row (`actor`, `action`, `entity`, `entityId`). Best-effort:
a failed insert is logged to the server console but never blocks the
auth flow it's describing (see Known issues/debt below).

### Pages (`app/[locale]/admin/`)

Route groups split public (`/admin/login`, `/admin/mfa-challenge` — both
still require *some* session state, see above) from protected
(`/admin`, `/admin/security`, gated by `(protected)/layout.tsx`). No
`SiteShell` — the admin panel is chrome-free like `/design-system`, its
own header/sign-out bar instead (`components/admin/admin-chrome.tsx`).
Sign-out is a plain `<form action={adminSignOut.bind(null, locale)}>` —
works without client JS. Every admin page sets `robots: { index: false,
follow: false }`; `/admin` itself is now also disallowed in
`app/robots.ts`.

### i18n

New `Admin` namespace, `messages/en.json` / `messages/fa.json` — 365/365
keys, parity verified. TOTP codes and the enrollment "setup key" are
rendered `dir="ltr"` even on `fa` (D-03: Latin digits in technical
values).

## Decisions

No new Decision Register entry and no ADR — the client architecture
(`@supabase/ssr`, cookie-bound vs. service-role clients, middleware
refresh + independent server-side re-checks) is Supabase's own
documented pattern for Next.js App Router, not a novel choice this
project needed to weigh alternatives for the way ADR-001's bilingual
storage decision did.

## Changed files

**New:**
- `lib/supabase/server-auth.ts`
- `lib/supabase/middleware.ts`
- `lib/admin/auth.ts`
- `lib/admin/audit.ts`
- `app/actions/admin-auth.ts`
- `components/admin/admin-auth-shell.tsx`
- `components/admin/admin-chrome.tsx`
- `components/admin/login-form.tsx`
- `components/admin/mfa-challenge-form.tsx`
- `components/admin/mfa-enrollment-panel.tsx`
- `app/[locale]/admin/(public)/login/page.tsx`
- `app/[locale]/admin/(public)/mfa-challenge/page.tsx`
- `app/[locale]/admin/(protected)/layout.tsx`
- `app/[locale]/admin/(protected)/page.tsx`
- `app/[locale]/admin/(protected)/security/page.tsx`
- `docs/runbooks/admin-onboarding.md`
- `docs/phases/PHASE-13-README.md` (this file)

**Modified:**
- `proxy.ts` — combined with the Phase 13 session refresh + route guard
- `app/robots.ts` — disallow `/admin`
- `.env.example` — added `SUPABASE_ANON_KEY`
- `messages/en.json`, `messages/fa.json` — new `Admin` namespace
- `package.json`, `pnpm-lock.yaml` — `@supabase/ssr` added
- `pnpm-workspace.yaml` — `allowBuilds` set for `@parcel/watcher` /
  `@swc/core` (needed for a clean, non-interactive `pnpm install` in this
  session; unrelated to Phase 13's own scope but required to verify it)

## Database / migrations

None new. `db/migrations/0008_admin_and_audit.sql` (Phase 12) already
shipped `admin_users` and `audit_log`, live on Supabase project
`ukzovqnpqjcrwofycalc`, RLS-enabled, service-role only.

## Tests

No automated test suite exists yet (Phase 21). Manual/static
verification performed this session:

- `npx tsc --noEmit` — clean, zero errors.
- `node scripts/check-content-placeholders.mjs` — clean (unaffected by
  this phase's files).
- `npx next build` — Turbopack compiles the entire app, including every
  new admin route, with **zero compile errors**. Page-data collection
  then fails at `/[locale]/services/[slug]` — a pre-existing Phase-12
  page that fetches live Supabase content at build time, which this
  sandbox has no network path to (`*.supabase.co` isn't a reachable
  host here). This is the same disclosed sandbox limitation earlier
  phase docs already recorded for Supabase-dependent pages, not a new
  gap this phase introduced; nothing in `/admin` touches that code path.
- i18n key parity: `en.json`/`fa.json` flattened and diffed — 365/365,
  no missing keys either direction.
- Manual grep of every new file for physical CSS properties (`ml-`,
  `pl-`, `left-`, `text-left`, …) — none found; all new UI is built from
  the existing logical-property component kit (`Field`, `Input`,
  `Button`, `Card`, `FormMessage`).

## Manual verification

Not runnable in this sandbox — needs the live Supabase project and a
real browser:

- Actually creating an owner account (`docs/runbooks/admin-onboarding.md`)
  and signing in end to end.
- Real TOTP enrollment against a real authenticator app and a real QR
  scan.
- Session refresh actually surviving past the access token's expiry.
- Screenshots for both locales/themes per the Definition of Done.

Same category of "sandbox can't verify, needs live deployment" gap
§§ 9.2 / 10.3 / 11.1 already disclosed — not hidden here either.

## Known issues

- **No admin exists yet.** By design (no sign-up flow) — the owner must
  run `docs/runbooks/admin-onboarding.md`'s manual steps once before
  `/admin/login` has anything to authenticate against. Not a blocker:
  the code path is complete and correct with zero admins provisioned,
  same as `/start` being complete with zero inquiries submitted.
- **No MFA recovery flow.** Losing the authenticator app currently means
  a manual `auth.mfa_factors` delete in the Supabase dashboard (see the
  runbook). Acceptable at one owner + zero-or-one editor scale; worth
  building before that changes.
- **No password-reset flow** for admin accounts. Phase 19 ships the
  email provider this would need.
- **Audit log inserts are best-effort**, not guaranteed — a failed
  insert is console-logged, not retried or alerted on. Turning that into
  a real alert is Phase 24 (Observability)'s scope.
- **No login rate limiting beyond Supabase Auth's own built-in
  throttling.** Sitewide rate limiting is Phase 23 (Security Hardening)'s
  scope; adding a bespoke one just for `/admin/login` here would
  duplicate work Phase 23 does properly, sitewide.

## New debt

- MFA recovery flow (see above).
- Audit log delivery guarantees / alerting (Phase 24).
- No in-app way for the owner to invite/manage editors — every
  `admin_users` row is still a direct SQL insert (documented in the
  runbook, deliberately no in-app privilege-escalation surface yet).

## Rollback

Purely additive — no migration to roll back. Reverting is: delete the
files listed above, restore `proxy.ts` to its pre-Phase-13 version
(next-intl middleware only), remove `@supabase/ssr` from `package.json`
/ `pnpm-lock.yaml`, drop the `Admin` key from both message files. The
existing `admin_users` / `audit_log` tables (Phase 12) can stay — they
have no public policies and nothing else reads them.

## Final status

**COMPLETE** for everything a coding session can implement and verify.
The one remaining step — provisioning the first real owner account — is
a manual, owner-only action documented in
`docs/runbooks/admin-onboarding.md`, the same category as D-01's domain
purchase: not a code gap, not blocking this phase's completion, just not
something any session can do on the owner's behalf.

**Next recommended phase:** 14 — Lead Pipeline. It's the first phase
that actually needs an authenticated admin to do anything with, so
running the onboarding runbook is worth doing before or during it.

## Addendum — 16 September 2026 (revision 26)

A real production bug in this phase's own code, found while the owner
ran `docs/runbooks/admin-onboarding.md` for the first time: signing in
as the newly-provisioned owner landed on `/en/en/admin/security` — a
genuine 404, not a missing page.

**Root cause:** `components/admin/login-form.tsx`,
`mfa-challenge-form.tsx` and `mfa-enrollment-panel.tsx` all call
`router.push()` from the locale-aware `useRouter` (`@/i18n/navigation`),
which — like a plain `<Link href="/admin/security">` elsewhere in this
codebase — prepends the *active* locale to whatever href it's given. All
three were instead building already-locale-prefixed `/${locale}/admin...`
paths before handing them to that same router, so the locale landed
twice.

**Fix:** dropped the manual `/${locale}` prefix in all three call sites;
`resolveNextPath` in `login-form.tsx` now strips the locale off an
incoming `next` query param instead of assuming the router won't re-add
it. `next`'s value itself was always correct — `proxy.ts`'s redirect
sets it from `request.nextUrl.pathname`, which does include the locale,
the right shape for a raw URL, just not for this locale-aware router.

Grepped the rest of the codebase for the same `${locale}` +
`router.push`/`href` pattern via the i18n-aware router or `Link` — no
other instances. `tsc --noEmit` and `next build` both clean afterward
(the latter reaching the same pre-existing, already-disclosed
`/[locale]/services/[slug]` gap, unrelated to this fix). See
`ROAD-MAP-ARTAVEO.md` revision 26 for the same note.

## Addendum 2 — 16 September 2026 (revision 27)

Two more issues from the same onboarding attempt, once the double-locale
404 above was fixed and the owner reached `/admin/security` for real.

**QR code rendered as literal text, not an image.**
`components/admin/mfa-enrollment-panel.tsx` was doing
`dangerouslySetInnerHTML={{ __html: state.qrCodeSvg }}` on the
assumption `qrCodeSvg` was bare SVG markup — it's actually Supabase's own
full `data:image/svg+xml;utf-8,<svg>...` data URI
(`app/actions/admin-auth.ts`'s `enrollMfaStart` passes `data.totp.qr_code`
straight through, correctly — the bug was only in how the panel
rendered it). Injecting that string as innerHTML rendered the
`data:image/svg+xml;utf-8,` prefix as a literal text node, with the
browser then separately parsing the embedded `<svg>` tag that happened
to follow it. Fixed with a plain `<img src={state.qrCodeSvg} />` — what
a data URI is actually for, and no `dangerouslySetInnerHTML` needed at
all now. Added a "can't scan it? use the setup key below" hint next to
it, since the setup key field already existed as a fallback but nothing
pointed a user at it (two new `Admin` keys: `mfaQrAlt`, `mfaQrTroubleHint`).

**MFA made optional for every role, at the owner's explicit request.**
This reverses part of this phase's original design ("owner role
requires MFA... MFA required and enforced for the owner role").
`lib/admin/auth.ts#mfaSatisfied` no longer force-redirects an owner who
hasn't enrolled a factor; it now only requires completing the aal2
challenge for a session where Supabase itself reports a verified factor
already exists and hasn't been confirmed yet this session
(`aal.next === 'aal2'`) — real protection for anyone who does enroll, no
forced first-time enrollment for anyone. `/admin/security` stays
reachable as a voluntary place to enroll (already linked from the
dashboard); the old role-conditional "required"/"optional" notice on
that page collapsed to one neutral, always-shown message, and the
now-dead `mfaRequiredNotice` key was removed from both locale files
rather than left unused.

**Security trade-off, disclosed rather than silently applied:** the
admin panel — including the Phase 14 Lead Pipeline, which holds every
prospective client's contact details and project brief — can now be
reached with a password alone if the owner (or a future editor) never
enrolls a factor. This was the owner's own explicit call, not a default
assumed here; worth revisiting if the admin account is ever shared
beyond the owner or if lead data volume/sensitivity grows enough to
matter.

`tsc --noEmit`: 0 errors. `next build`: clean, same pre-existing
Supabase-network gap, unrelated to either fix. i18n parity: 462/462.
See `ROAD-MAP-ARTAVEO.md` revision 27 for the same note.

## Addendum 3 — 16 September 2026 (revision 28)

One more real gap, found by the owner actually testing the revision-27
change live: `/admin/security`'s not-yet-enrolled screen had exactly one
control — "Set up authenticator app" — and no way to leave without
either using it or knowing to click the header nav. For a page revision
27 had just made voluntary rather than forced, that's a genuine dead
end, not what "optional" should feel like.

Re-traced the whole redirect chain end to end first, to rule out a
remaining forced-redirect bug rather than assume the fix: for an account
with no verified TOTP factor, `getAdminSession()`'s `aal.next` and
`aal.current` both resolve to `'aal1'`, so `mfaSatisfied` (unchanged
since revision 27) is `true` and nothing redirects there — confirmed by
the owner's own screenshot already showing the "Leads" nav link
rendered, meaning they'd reached a protected page without being sent to
`/admin/security` first. The redirect logic was correct; this was purely
a missing exit control on a screen reachable only by choice.

`components/admin/mfa-enrollment-panel.tsx`'s not-enrolled state now
shows a "Skip for now" link (→ `/admin`) next to "Set up authenticator
app", not just the one button. New `Admin.skipMfaButton` key, both
locales, 463/463 parity. `tsc --noEmit`: 0 errors. `next build`: clean,
same pre-existing gap, unrelated.

