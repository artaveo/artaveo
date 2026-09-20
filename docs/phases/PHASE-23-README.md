# Phase 23 — Security Hardening

**Status:** ✅ COMPLETE (code) — migration `0020` verified on the local stack and **applied to the live project on 20 September 2026** (checked afterwards, see *Database*).
**Date:** 20 September 2026.
**Migration:** `db/migrations/0020_security_hardening.sql`.
**Model, controls, secret inventory, residual risks:** `docs/security.md` (new). **Rotation procedure:** `docs/runbooks/secrets-rotation.md` (new).

## Objective

Roadmap § Phase 23:
- security headers and CSP; rate limits on every public mutation; CSRF posture of server actions verified
- XSS review of rich content, SQL injection review of any raw query, IDOR tests on admin resources
- upload hardening; secret inventory and rotation plan; dependency policy

The phase started as a review, not as a list of features: every place the code accepts input, produces markup or a query, stores a file, or reads a secret was read, and what was found was fixed or written down. The findings are in `docs/security.md` § 7.

## Before you push

1. **Migration `0020` first** (it is already applied to the live project if the status above says so). The new code needs its objects: without `rate_limit_buckets`/`consume_rate_limit` the limiter **fails open** (the site works, unprotected, with the older record-based limits); without the private bucket and `inquiry_files` **attachment uploads fail** (an honest error, nothing is lost).
2. **Read the two things that change what visitors and you see:**
   - **Brief Builder attachments no longer accept SVG**, and the copy says so (`attachmentsRules`, `attachmentInvalidType`).
   - **The lead page now shows attachments** (a new card) — before this phase the owner could only find them in the media library, where editors could too.
3. **Push, then look at the deployment log** for lines starting `[security-config]` (`docs/security.md` § 6). Then do the **five-minute check** below.
4. **Owner-only settings** — `docs/security.md` § 8 (Supabase sign-ups off, e-mail confirmation, password length; enrol the authenticator; GitHub/Vercel settings from Phase 22).
5. No new dependency. `next.config.mjs` gains `poweredByHeader: false` and `serverActions.bodySizeLimit: '6mb'`.

### Five-minute check after the first deploy
1. Open the home page and one case study in **both languages**: they should look exactly as before. (If anything is missing — a font, an image, the language switcher — that is the Content Security Policy blocking it: set `CSP_REPORT_ONLY=1` in Vercel, redeploy, and tell me what the browser console said.)
2. `/en/admin/login` → sign in → click through Dashboard, Leads, Content, Notifications. Nothing should change.
3. Submit a test brief at `/start` **with a small PNG attached**. In `/admin/leads/<it>` the attachment appears; clicking it downloads the file.
4. `curl -I https://<site>/en` — you should see `content-security-policy`, `x-content-type-options`, `strict-transport-security`, and no `x-powered-by`.

## Findings and what was done

The full table (15 rows, severity, state) is `docs/security.md` § 7. The ones that matter most:

| Finding | Fix |
|---|---|
| **Visitor attachments were stored in the editors' media library.** An editor — who § 13 says has no access to leads — could see, delete and embed a lead's private files; anyone with a URL could read them; the public bucket also allowed listing every object. | A **private** bucket (`inquiry-files`) and a table only the server reads; the owner opens files through `/api/admin/inquiry-files/[id]` (owner + MFA checked, 60-second download link, audit row, plain 404 for everyone else); unlinked files swept after 24 h; the listing policy dropped. |
| **Upload type judged from the sender's label**; SVG (script-capable) accepted from strangers; predictable file names. | Bytes decide (`lib/upload-inspection.ts`: PNG/JPEG/GIF/WebP header, sane size; SVG only for the admin, with a deny-list); CSPRNG names. |
| **No rate limit** on sign-in, MFA, link tokens, attachment removal, calendar route; every failed sign-in wrote an audit row with attacker-chosen text. | One atomic Postgres limiter, one policy table, applied to all nine public/sign-in scopes; audit only when a limit is first crossed; e-mail cut to 254 characters. |
| **No security headers** at all; no CSP. | Baseline headers everywhere, stricter for private links and the admin, a two-variant CSP (nonce in the admin). |
| **CSV export ran visitor text as spreadsheet formulas.** | `lib/csv.ts`. |
| **Lead search accepted filter syntax** (`x,stage.eq.won`). | `lib/postgrest.ts`; a test proves the old code was injectable, and the new code is not. |
| **Forms could fall back to a GET** before hydration — a password in the URL. | `method="post"` on all state-changing forms; a test forbids new ones. |
| `getClientIp` trusted the first forwarded hop anywhere; the IP hash fell back to a public constant. | `pickClientIp` (platform header first on Vercel, addresses validated); salt derived from the service key when none is set. |

Also: `httpOnly` session cookies; the Markdown link `/\evil.example`; OG text capped; recommendation input limits and type checks; `enforce_inquiry_stage_transition` search path.

**What was reviewed and found sound:** the Markdown renderer (no HTML pass-through, links filtered), JSON-LD escaping, plain-text e-mails, 192-bit link tokens, the cron route (fails closed, constant-time compare), RLS on every table, the service-role key confined to server-only code, and Server Action CSRF (the framework's `Origin` check — now proven by a test with a control).

## Decisions

1. **Two CSP variants.** The public site keeps `'unsafe-inline'` for scripts because it is prerendered; the admin has a strict nonce policy. The alternative (every public page dynamic) trades the site's performance for a stricter policy against an XSS class the site is not otherwise exposed to. Written out in `docs/security.md` § 3 so it can be reversed with eyes open.
2. **The limiter fails open.** A limiter outage must not become a site outage or lock the owner out of sign-in. Phase 24 should alert on it.
3. **A private bucket, not a hidden one.** Visitor files are lead data; § 13 makes leads owner-only; so the file store follows the same rule, not an "unguessable URL".
4. **The file's id is the capability**, not the visitor's IP: a phone switching from wifi to mobile data between choosing a file and pressing Send must still work.
5. **HSTS without `includeSubDomains`/`preload`** until the production domain exists (D-01).
6. **`CSP_REPORT_ONLY=1`** as an escape hatch, because a policy that cannot be relaxed quickly is a policy people are afraid to ship.
7. **Deliberately not done:** signing OG URLs (residual risk documented), a CSP violation report endpoint (a new public mutation — belongs with Phase 24), SAST/CodeQL, a Web Application Firewall (a Vercel setting).

## Database

`0020_security_hardening.sql` (additive; rollback notes in its header):
- `rate_limit_buckets` + `consume_rate_limit(text, int, int)` — RLS on with no policy; execute for `service_role` only; pinned `search_path`.
- `inquiry_files` — private visitor files; check constraints (raster types, ≤ 5 MiB, name length), unique path, cascade on inquiry delete; RLS on, no policy.
- Storage: bucket `inquiry-files` (private, 5 MiB, four raster types); the `media` bucket's public **listing** policy dropped (objects are still served by URL — a public bucket needs no policy for that).
- `enforce_inquiry_stage_transition` gets `search_path = ''`.

Left in place, unused: `inquiry_attachments`, `media_assets.uploaded_by_ip_hash` (0 rows live). Drop later.

**Live state, before and after.** Before — migrations through `0019`; 0 visitor uploads, 0 attachments, 0 objects in `media`; 1 auth user (the owner), no stray accounts; Supabase advisors: `rls_enabled_no_policy` (expected), `function_search_path_mutable` (fixed here), `auth_leaked_password_protection` (Pro-plan feature — open, documented). **After applying `0020`:** `inquiry_files` and `rate_limit_buckets` exist with RLS on and no policy; `consume_rate_limit` is executable by `service_role` only (no `anon`, `authenticated` or `PUBLIC` grant); the `media` bucket has no storage policy left, and `inquiry-files` is private (5 MiB, four raster types); `function_search_path_mutable` is gone from the advisors, which now show only the expected `rls_enabled_no_policy` (16 tables, two more than before — the new ones) and the plan-limited leaked-password warning.

## Tests

| | Before | After |
|---|---|---|
| Unit | 233 | **372** — 139 new (`security-input` 35, `security-csp` 15, `security-static` 89) |
| Integration (real PostgreSQL + PostgREST) | 134 | **166** — 27 new (`security.integration`), 5 attachment tests rewritten |
| Browser + accessibility | 164 | **205** — 41 new (`security.spec.ts`) |
| Lint | 0 errors / 82 warnings | 0 errors / 82 warnings (cap unchanged) |
| `tsc --noEmit` | clean | clean |
| Dependency gate | passed | passed |

Highlights: every Server Action is checked by parsing the source — gated **before** it touches data, or a reviewed public entry point that calls the limiter — so a new action cannot slip in unreviewed; the limiter is tested for a 40-way race (exactly 10 pass); the search injection and the CSRF replay each have a **control** (the same request without the fix / from our own origin) so a passing test means the defence works, not that the probe was malformed; the browser suite fails on any CSP violation on any page in both languages.

`docs/testing.md` has the table of what is where.

## Manual verification

Done: the built app on the local stack, in a real browser (Chromium): headers on every route in both languages; the admin's nonce reaching next-intl's rewrite (the same nonce in the header and on every script — checked with `curl` and by the browser suite); an injected inline script blocked in the admin; `httpOnly` cookies; the sign-in limit through the form; the private attachment end to end.

**Not verified (cannot be from a sandbox):** a real Vercel deployment (platform headers, the 4.5 MB body cap, the Firewall, `x-real-ip`); real Supabase Storage (signed URLs, the headers it adds); Supabase Auth's own limits; a real phone; the dark theme and screen-reader behaviour of the one visible change (the new "Attachments" card on the lead page and the new sign-in message). **The Content Security Policy has never been seen against real production content** — hence `CSP_REPORT_ONLY` and the five-minute check.

## Known issues

1. **Public pages allow inline scripts** (decision 1).
2. **Files between ~4.5 and 5 MB will fail on Vercel** before our code runs (platform body cap — stated by Vercel's documentation as I know it, not verified). If so, lower the limit to 4 MB (`docs/security.md` § 5 lists the four places).
3. **`/api/og` renders any text** (capped) on the brand's domain.
4. **Fixed-window limits** allow up to twice the limit across a window boundary.
5. **Preview deployments** log a CSP error for Vercel's toolbar.
6. **SVG inspection is a deny-list.** Admin-only, and shown only through `<img>`.
7. **Supabase leaked-password protection** needs the Pro plan.
8. `typescript.ignoreBuildErrors: true` in `next.config.mjs` (older) means a type error would not stop a Vercel build; CI's `tsc` catches it before merge, which is why it was left alone. Removing it is a one-line change worth making once CI has run on GitHub.

## New debt

- Drop `inquiry_attachments` and `media_assets.uploaded_by_ip_hash`.
- Alert on `[rate-limit] … failed` and on `[security-config]` errors (Phase 24); a CSP report endpoint (Phase 24, with its own limit).
- Sign OG URLs if the brand-domain risk matters.
- A security card on `/admin/security` showing the configuration findings (today they are in the deployment log only).
- Hash-based CSP for the public pages (Next experimental SRI) — revisit when it leaves experimental.

## Decisions needed

- **Enable MFA for the owner account** (`/admin/security`) — the strongest single control against a stolen password; optional by your decision (revision 27).
- **Confirm the Supabase Auth settings** in `docs/security.md` § 8 and tick them off.
- **Upload limit:** keep 5 MB, or lower to 4 MB to sit under Vercel's cap?

## Rollback

Revert the code; migration `0020`'s header lists the SQL to undo it (drop the two tables and the function, delete the private bucket once empty, restore the public listing policy). Nothing else depends on it. To disable only the new headers/policy without reverting: `CSP_REPORT_ONLY=1` for the policy; the static headers are one function in `lib/security/static-headers.mjs`.

## Final status

**COMPLETE (code).** Verified on the local stack with a real PostgreSQL/PostgREST and the built app in a real browser: 372 unit, 166 integration and 205 browser/accessibility tests green (the full browser run: 205 passed in 10.7 minutes, none flaky), lint at 0 errors under the unchanged warning cap, `tsc` clean, dependency gate passed. Migration `0020` is live and was checked after applying. **Not verified:** a real Vercel deployment and real Supabase Storage (see *Manual verification*), so the first thing to do after pushing is the five-minute check. **The Content Security Policy has not been seen against production** — `CSP_REPORT_ONLY=1` is the way back that needs no code change.
Next in sequence: Phase 24 — Observability (M3).
