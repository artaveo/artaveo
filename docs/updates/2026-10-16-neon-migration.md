# Backend move — Supabase → Neon

**Status:** ✅ COMPLETE (code, schema, data) — the production switch needs the owner's steps at the end
**Date:** 16 October 2026
**Roadmap entry:** § 23.1 "Out-of-sequence work log" — **this is not a roadmap phase.** It replaces the platform D-10 chose; no feature changes.

## Objective

Move everything the site's backend ran on — database, admin sign-in, file storage — from the Supabase project `Artaveo` (`ukzovqnpqjcrwofycalc`) to a new, independent Neon project **`Artaveo`** (`calm-breeze-36870180`, `aws-ap-southeast-1` — the same region as before, so latency to Vercel and the privacy policy's region claim are unchanged). The site stays on Vercel. The two other projects in the Neon organization were not touched.

## What maps to what

| Supabase | Neon | Code |
|---|---|---|
| PostgREST + service-role key | **Data API** (PostgREST-compatible) + a short-lived `service_role` JWT the server signs itself (ES256). The Data API trusts only that key, published as `jwks.json` in the public `service-jwks` bucket. No token → refused; `anonymous` is granted nothing. | `lib/db/server.ts`, `lib/db/service-token.ts` |
| Storage (`media` public, `inquiry-files` private) | **Object Storage** buckets of the same names and access levels, S3 API with a scoped credential; presigned 60-second links for private files | `lib/db/storage.ts` |
| Supabase Auth (+ `@supabase/ssr` cookies) | **Managed Better Auth**, server-side only (`@neondatabase/auth`); no `/api/auth` route, no browser SDK | `lib/auth/server.ts`, `lib/auth/proxy-session.ts`, `proxy.ts` |
| Supabase MFA (TOTP) | **The app's own TOTP** (Neon Auth has none): RFC 6238, secret encrypted at rest, replay refused, a signed per-session cookie for "passed the second factor" | `lib/admin/totp.ts`, `app/actions/admin-auth.ts`, migration `0022` |

The ~270 query-builder calls did not change: `@supabase/postgrest-js` is only the PostgREST client library and speaks to the Data API as it did to Supabase's PostgREST. Call sites now import `getDbClient()` / `DbClient` instead of `getSupabaseServerClient()` / `SupabaseClient`.

## Schema

`db/neon/prelude.sql` (Neon only: roles, and stand-ins for the Supabase schemas `0001`–`0021` reference) → `0001`…`0021` unchanged → `0022_neon_platform` (drops the stand-ins and `admin_users`' foreign key into `auth.users`; adds the TOTP columns; revokes EXECUTE on functions from PUBLIC — on Neon the Data API's `anonymous` role is part of PUBLIC) → `0023_admin_user_emails` (the backup manifest's narrow window onto `neon_auth."user"`).

**Verified:** columns, constraints, indexes, policies, RLS flags and triggers fingerprinted on both databases — identical apart from the intended `0022` changes; all 9 function bodies identical once comments are stripped.

## Data

All 34 tables copied in one transaction (≈ 200 rows; the seed rows `0007`/`0013` insert were replaced by the live ones). **Verified:** an MD5 over every row of every table matches on both sides. Storage had no objects (every image is a local `/images/…` file), so there was nothing to copy. The one Supabase Auth user could not be copied — password hashes are not portable — see "Owner steps".

## Verification

- `tsc --noEmit` clean; `next build` succeeded against Neon (97 pages prerendered from the Data API).
- The real admin auth actions against a throw-away Neon branch: sign-in, wrong password / non-admin refused alike, TOTP enrolment, sign-out, challenge on the next sign-in, replayed code refused, a 2FA cookie from another session refused, factor removal, `proxy.ts` redirect + refreshed-cookie forwarding — 8 of 8.
- In the browser against the production build: sign-in → dashboard → enrol 2FA (QR shown under the CSP) → sign out → sign in → code page, admin blocked until the code → leads page.
- Storage against the real buckets: upload, duplicate key refused, public read, private read refused, presigned download with a Persian file name, delete.
- Unit suite: no new failures (the six that fail on Windows path separators failed before too).
- **Not run locally:** the integration and e2e suites (they need PostgreSQL + PostgREST binaries; CI has them). The test stack was rebuilt for Neon (`tests/support/stack/*`) and gained TOTP tests; CI is where it is proven.

## Owner steps (production switch)

1. **Vercel → Settings → Environment Variables (Production):** add every `NEON_*` variable and `MFA_ENCRYPTION_KEY` from `.env.local` (`docs/security.md` § 6), set `INQUIRY_IP_HASH_SECRET` if it is not set yet, then remove the three `SUPABASE_*` variables and redeploy.
2. **Admin account:** create it in Neon Auth and re-point `admin_users` — `docs/runbooks/admin-onboarding.md` § 1–2.
3. **Neon Auth settings:** sign-ups off, the shared Google provider removed, the production domain added to trusted domains when it exists — § 3 of the same runbook.
4. **After the site has run on Neon for a while:** pause, then delete, the Supabase project. Until then it is a frozen copy of 16 October.
