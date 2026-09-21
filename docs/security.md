# Security model (Phase 23)

This is the one place that says **what is protected, from whom, by what, and what is knowingly left open.** The roadmap ranks security third (after truthfulness and data integrity); where this file and the code disagree, the code has a bug — most of what is written here is pinned by a test, named next to it.

Reviewed: 20 September 2026 (Phase 23). Threat model in one line: an anonymous stranger on the internet with a browser and a script, and — separately — someone who has stolen a session or a secret. Not in scope: a compromised laptop, a hostile Supabase or Vercel employee, and nation-state adversaries.

## 1. Trust boundaries

| Boundary | Who is on the far side | What crosses it | Control |
|---|---|---|---|
| Browser → public pages and Server Actions | anyone | forms, uploads, private links | validation, rate limits, CSP, `Origin` check (below) |
| Browser → `/admin` and admin Server Actions | the owner, an editor | session cookie | session + role checked **in every action and page**, not in a layout; MFA when enrolled |
| Server → Supabase | our own database | service-role key | key only in server-only code; RLS on every table with **no policies** — the browser can never reach the database |
| Server → e-mail provider | Resend | outbox messages | plain text only, idempotent, no HTML built from visitor text |
| Vercel cron → `/api/cron/notifications` | Vercel | `Authorization: Bearer CRON_SECRET` | fails **closed**; constant-time comparison |

The browser never talks to Supabase (no browser client exists, no `NEXT_PUBLIC_` key). That is why the database policies are "none": every read and write is a decision made by our server code.

## 2. Controls, and where each is tested

| Control | Where | Pinned by |
|---|---|---|
| Security headers on every path (`nosniff`, framing, referrer, permissions, COOP, HSTS) | `lib/security/static-headers.mjs` → `next.config.mjs` | `security-csp.test.mjs`, `security.spec.ts` (every route type, both languages) |
| Content Security Policy — public variant and admin (nonce) variant | `lib/security/csp.ts`, `proxy.ts` | `security-csp.test.mjs`; `security.spec.ts` (no violation on any page; an injected script does not run in the admin) |
| Private links and the admin: `no-store`, `no-referrer`, `noindex` | `PRIVATE_SOURCES` in `static-headers.mjs` | `security.spec.ts` |
| Rate limits on every public mutation and on sign-in | `lib/security/rate-limit-policy.ts`, migration `0020` | `security-input.test.mjs` (policy), `security-static.test.mjs` (every public action calls the limiter), `rate-limit.integration.test.mjs`, `security.spec.ts` |
| Every Server Action is gated or a reviewed public entry point | `tests/unit/security-static.test.mjs` | itself |
| CSRF | framework `Origin` check, `SameSite=Lax` cookies | `security.spec.ts` (foreign-origin call refused, control call runs) |
| XSS: no visitor text becomes HTML | React escaping; Markdown renderer with no HTML pass-through; the sink inventory | `security-static.test.mjs` (sink list), `security-input.test.mjs` (links), `security.spec.ts` (hostile lead) |
| Query injection: no filter built from free text | `lib/postgrest.ts` | `security-input.test.mjs`, `security.integration.test.mjs` |
| CSV injection | `lib/csv.ts` | `security-input.test.mjs`, `security.integration.test.mjs` |
| Uploads: bytes checked, private bucket, sweep | `lib/upload-inspection.ts`, `app/actions/inquiry-attachments.ts` | `security-input.test.mjs`, `cms.integration.test.mjs`, `security.spec.ts` |
| Session cookie `httpOnly` | `lib/supabase/server-auth.ts`, `lib/supabase/middleware.ts` | `security.spec.ts` |
| Configuration and secrets | `lib/security/config-check.ts`, `instrumentation.ts`, section 6 | `security-static.test.mjs` (inventory), `security-input.test.mjs` |
| Open reporting endpoints (CSP reports, browser errors) | `app/api/observe/*`, `lib/observability/reports.ts` | `observability-static.test.mjs`, `observability-routes.integration.test.mjs`, `observability.spec.ts` |
| Dependencies | Phase 22 gate (`scripts/audit-gate.mjs`), Dependabot, secret scan | CI |

## 3. Headers and the Content Security Policy

**Every path** gets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` that switches off every browser feature the site does not use, `Cross-Origin-Opener-Policy: same-origin` and HSTS for one year. HSTS deliberately has **no `includeSubDomains` and no `preload`** — those are commitments about a whole domain that cannot be withdrawn quickly, and the production domain is still undecided (D-01). Add both once it is, in `static-headers.mjs`.

**The policy has two variants, and that is a trade-off, not an oversight.**

- **Admin** (dynamic, per request): `script-src 'self' 'nonce-…' 'sha256-<theme script>'`. **No `'unsafe-inline'`.** An injected inline script in the admin does not run — tested. The admin is where an XSS would do the most damage.
- **Public site** (prerendered, served from the CDN): `script-src 'self' 'unsafe-inline'`. A strict nonce policy needs the HTML generated per request, because the nonce is in the markup; making every public page dynamic would give up static rendering, CDN caching and the cache-first service worker, i.e. the performance the design is built on (roadmap principle 17). Everything that does not depend on scripts is still strict on both variants: no plugins, no framing, `base-uri`/`form-action` `'self'`, images only from the site and the Storage host, connections and fonts same-origin, no `eval`.
- **What protects the public side from XSS instead** is that visitor-supplied text is never rendered as HTML — one inventory of every place the code can turn a string into markup (two: the theme script and JSON-LD), enforced by a test that fails if a third appears. If you later want the strict policy there too, the options are hash-based CSP via Next's experimental SRI, or making the public pages dynamic; both cost something measurable and should be a decision.
- `style-src` keeps `'unsafe-inline'` on both (style attributes are used throughout); script-less style injection is a much smaller risk.

**Switch:** `CSP_REPORT_ONLY=1` (Vercel env + redeploy) makes the policy report instead of block. Use it if a legitimate resource is ever blocked in production and you need the site working while the cause is fixed. `instrumentation.ts` warns at startup while it is set.

**Known, harmless in production:** Vercel's preview toolbar (`vercel.live`) is not allowed and will log a CSP error on preview deployments only.

## 4. Rate limits

Attempts are counted in Postgres (`rate_limit_buckets`, function `consume_rate_limit`, one atomic statement) so the count is shared by every serverless instance. Keys hold only a salted hash. The full table is `RATE_LIMITS` in `lib/security/rate-limit-policy.ts`:

| Scope | Per address | Second dimension | Overall |
|---|---|---|---|
| Brief Builder submit | 15 / hour | — | 300 / hour |
| Upload / remove attachment | 20 / hour · 40 / hour | — | 400 / hour |
| Consultation request | 15 / hour | — | 300 / hour |
| CSP violation report (`/api/observe/csp`, Phase 24) | 30 / hour | — | 300 / hour |
| Browser error report (`/api/observe/client-error`, Phase 24) | 20 / hour | — | 200 / hour |
| Cancel / change a consultation | 40 / hour | link token, 20 / hour | — |
| Recommendation submit | 30 / hour | link token, 15 / hour | 300 / hour |
| Calendar download | 120 / hour | link token, 60 / hour | — |
| Admin sign-in | 20 / 15 min | e-mail, 10 / 15 min | 300 / 15 min |
| Admin MFA code | 20 / 15 min | user, 10 / 15 min | — |

- **Fixed windows**: a caller can use one window's allowance at its end and the next at its start — at most twice the limit across a boundary.
- **Fails open.** If the limiter cannot be reached (database down, or code deployed before migration `0020`) the request is allowed and the error is logged. A limiter that blocks everyone when it breaks turns its outage into the site's outage and locks the owner out of sign-in. The older record-based limits (5 inquiries per address per hour, 3 per e-mail per day, the consultation equivalents) still apply. Since Phase 24 the failure is a `rate_limit.consume_failed` log line and a `rate_limit.unavailable` event (at most one a minute), which raises the `rate_limit.unavailable` warning on `/admin/observability` (`docs/observability.md` § 4).
- **The address**: on Vercel the platform's `x-real-ip` is used (Vercel does not forward a client-supplied value). Elsewhere `x-forwarded-for` is only as good as the proxy in front of it, so a host that is not Vercel needs a look at `pickClientIp` first. An unknown caller shares one bucket — the safe direction.
- **Housekeeping**: the daily run deletes windows that ended more than an hour ago.
- **Not limited by this mechanism**: visits to a link page (a token is 192 bits; volumetric abuse is the platform's — see section 8, Vercel Firewall). Server Actions have no rate limit until they reach a limited action; the framework's body size limit is 6 MB.

## 5. Uploads

- **Two paths.** The admin library (`media` bucket, public URLs, editor-level) and the Brief Builder (private `inquiry-files` bucket, visitors). Until Phase 23 both wrote into the same public bucket and the same table: an editor could see, delete and embed a lead's private files, and anyone with a URL could read them.
- **The bytes decide.** `inspectUpload` requires the first bytes to be the declared type (PNG, JPEG, GIF, WebP), the header to be readable, and the canvas to be at most 16,384 px a side and 50 megapixels (the image optimiser decodes what is stored). A page uploaded with an `image/png` label is refused.
- **SVG** is text, and text can carry script. Visitors cannot upload it. In the admin it is accepted only if it contains no script, foreign object, event handler, entity, `@import`, `javascript:` or external reference — a denylist, which can miss things, which is why it is admin-only and why the site only ever shows it through `<img>` (where script never runs).
- **Names** are `<time>-<96 random bits>-<cleaned name>`, from the platform CSPRNG (they used `Math.random`).
- **Visitor files**: private bucket, no public URL; a row in `inquiry_files` only the server can read; linked to a brief only if still unlinked (max 3); the owner opens one through `/api/admin/inquiry-files/[id]`, which checks session, MFA and owner role and redirects to a **60-second** download link (`Content-Disposition: attachment`) and writes an audit row. Anything else answers the same plain 404. Unlinked files are deleted after 24 hours by the daily run. The file's random id is the capability to link or remove it, so a phone that changes network between choosing a file and pressing Send still works.
- **Size**: 5 MB in code and buckets. **Vercel caps a function's request body at about 4.5 MB (platform limit, not verified from here)** — a file between 4.5 and 5 MB will fail at the platform with a generic error before any of our code runs. If you see that, lower the limit to 4 MB in `lib/media-upload.ts`, migration `0012`/`0020` and the copy (`attachmentsRules`, `cmsUploadRules`, `attachmentTooLarge`). `next.config.mjs` sets the Server Action body limit to 6 MB so the framework's own 1 MB default does not refuse a 2 MB image first.
- **Left in place, unused**: `inquiry_attachments` and `media_assets.uploaded_by_ip_hash` (migration `0012`) — zero rows in production on 20 September 2026. Drop them in a later clean-up migration.

## 6. Secret inventory

Nothing here is a secret **in the repository**: `.env.example` holds names and the public project URL only, `.env*` is git-ignored, and the CI secret scan (gitleaks, full history) passes. The variables the application reads, what they protect, and what a leak costs:

| Variable | Purpose | If it leaks | Rotate |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | The server's database access; bypasses every row-level rule | **Total**: read and write everything, including leads and private files | Supabase → Project Settings → API → generate a new JWT secret / service key; set in Vercel; redeploy. All sessions and the anon key change with a JWT secret rotation. |
| `SUPABASE_ANON_KEY` | Cookie-bound sign-in client (server-side only) | Low on its own: tables have RLS with no policies, so it reads nothing. It could be used to attempt sign-ins (rate limits are ours, Supabase Auth has its own). | Rotates with the JWT secret |
| `SUPABASE_URL` | Project address | Public information (it is in `.env.example`) | — |
| `INQUIRY_IP_HASH_SECRET` | Salts stored IP hashes and rate-limit keys | Hashes could be reversed for known addresses (2^32 IPv4 space) | Set a new random value and redeploy; old hashes and buckets simply stop matching (limits reset, nothing breaks). If unset, a key derived one-way from the service-role key is used instead — set your own to make it independent. |
| `CRON_SECRET` | Authorises the daily run | Anyone can trigger retries, scheduled publishing and clean-up (no data is returned, but it costs sends) | New random value (≥ 16 chars) in Vercel, redeploy. The route refuses to run without it. |
| `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_PROVIDER` | E-mail sending (still `console` until D-01) | Send as the site's domain; read nothing | New key in Resend, replace, redeploy, delete the old one |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (public by design) | — | — |
| `CSP_REPORT_ONLY` | Escape hatch for the policy | — (it weakens, see section 3) | Remove when not needed |
| `PGREST_URL`, `SERVICE_JWT` | **Test stack only** (`tests/support/stack`, `scripts/`); test values, not production | — | — |
| `NODE_ENV`, `NEXT_RUNTIME`, `VERCEL`, `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA`, `SOURCE_VERSION` | Set by the platform/framework | — | — |

**Where they live:** Vercel → Project → Settings → Environment Variables (Production only for production secrets; see the Preview note in `docs/ci.md`). Nowhere else — not in chat, tickets, screenshots or the repository. **Startup check:** `instrumentation.ts` prints, once per server start, which of these is missing or weak (names only, never values); read it in the Vercel deployment logs after any change. Full rotation steps and the "I think a secret leaked" checklist: `docs/runbooks/secrets-rotation.md`.

**Owner accounts** (not environment variables): the owner's Supabase Auth password and, if enrolled, the authenticator. MFA is optional by owner decision (revision 27); it is the single strongest control against a stolen password and is worth enabling — `/admin/security`.

## 7. Findings from the Phase 23 review, and their state

| # | Finding | Severity | State |
|---|---|---|---|
| 1 | Lead search interpolated typed text into a PostgREST `or()` filter — the text could rewrite the filter | Low (owner-only page; still a class of bug) | Fixed: `lib/postgrest.ts`; tested against the real database |
| 2 | CSV export wrote visitor text unescaped: `=HYPERLINK(...)` in a name runs in Excel/Sheets | Medium (a stranger's text reaches the owner's spreadsheet) | Fixed: `lib/csv.ts` |
| 3 | Visitor attachments lived in the editors' media library: an editor could see, delete and embed a lead's private files, contrary to § 13 | High (role boundary) | Fixed: private bucket + owner-only route |
| 4 | Public bucket allowed anyone with the anon key to list every object | Medium | Fixed: policy dropped (migration `0020`) |
| 5 | Upload type judged from the sender's `file.type`; SVG accepted from strangers; predictable file names | Medium | Fixed: byte inspection, no visitor SVG, CSPRNG names |
| 6 | No rate limit on sign-in, MFA, link tokens, attachment removal, calendar route; failed sign-ins wrote an audit row each with attacker-chosen text | Medium | Fixed: section 4; sign-in audit row per crossed limit, never attacker text |
| 7 | `getClientIp` trusted the first `x-forwarded-for` hop anywhere; two copies of the hash function fell back to a public constant secret | Medium (limits bypass, reversible hashes) | Fixed: `pickClientIp`, derived salt |
| 8 | No security headers at all (only `sw.js`) | Medium | Fixed: section 3 |
| 9 | Login and other forms could fall back to a GET submission before hydration, putting the password in the URL | Medium | Fixed: `method="post"` everywhere; a test forbids new ones |
| 10 | OG image endpoint rendered unbounded text | Low | Capped; residual risk in section 8 |
| 11 | Markdown link `/\evil.example` was accepted as a site-relative link | Low | Fixed |
| 12 | Session cookie readable by page scripts | Low–medium | Fixed: `httpOnly` |
| 13 | Recommendation submit had no length limits and trusted argument types | Low | Fixed |
| 14 | `enforce_inquiry_stage_transition` had a mutable `search_path` (Supabase advisor) | Low | Fixed in `0020` |
| 15 | Supabase leaked-password protection is disabled | Low | **Open, plan limit**: a Pro-plan feature. Compensating: unique strong password, MFA, sign-in limits |

## 8. Residual risks and things only the owner can do

1. **Public pages allow inline scripts** (section 3). Deliberate; the compensating control is the sink inventory.
2. **`/api/og` renders any text given to it** on the brand's domain (capped at 120 characters). Someone can make an image with chosen words. Fix if it matters: sign the URL with a secret and refuse unsigned ones.
3. **Volumetric abuse** (many requests, not clever ones) is Vercel's to absorb. In the Vercel project: enable **Attack Challenge Mode** if you are ever attacked, and consider a Firewall rule rate-limiting `/api/*` and POSTs. Not verifiable from code.
4. **MFA is optional** (owner decision, revision 27). Enrol at `/admin/security`.
5. **Supabase Auth settings** live in the dashboard, not the repository. Check once, and after any Supabase change: **Sign-ups disabled** (Authentication → Sign In / Providers → Allow new users to sign up: off — there is no admin sign-up flow, so an open sign-up only creates useless accounts, but it is also a way to fill the auth tables); **e-mail confirmations on**; **minimum password length ≥ 12**. On 20 September 2026 the project had exactly one auth user (the owner) and no stray accounts.
6. **GitHub / Vercel settings** from `docs/ci.md` (branch protection requiring `CI passed`; separate Preview database) still stand — they are part of this model.
7. **Backups** are Phase 25.
8. **Anyone can post to the two reporting endpoints** (Phase 24) and so can add rows to the error list. Bounded by: per-address and overall rate limits, an 8 KB body cap, a cap of 500 distinct error groups (past it, one shared `overflow` row), and the fact that `client` / `csp` groups never raise an alert. What a stranger can do is make the *Errors* list noisier; they cannot wake you, fill the table, or read anything.

## 9. Adding to the system — the checklist

- New Server Action → add its file to `PUBLIC_ACTIONS` or `GATES` in `tests/unit/security-static.test.mjs`. Public means: a `checkRateLimit()` call and a row in `RATE_LIMITS`.
- New environment variable → a row in section 6 above, a line in `.env.example`.
- New place that renders a string as HTML → do not. If it is unavoidable, add it to `HTML_SINKS` with a reason.
- New form → `method="post"` (or `"get"` for a pure filter).
- New upload path → `inspectUpload`, a random name, and decide public or private bucket before writing code.
- New table → RLS on, no policy (the browser never reads it).
