# Secrets: rotation and "I think something leaked"

What each secret is and what it protects: `docs/security.md` § 6. This file is the procedure. Nothing here needs code — every secret is an environment variable in **Vercel → Project → Settings → Environment Variables**, read when the server starts, so **every change needs a redeploy** (Deployments → the latest → ⋯ → Redeploy).

## Routine rotation (suggested: once a year, and whenever someone who had access leaves)

Do them one at a time, and after each one run **Check it worked** below.

### `CRON_SECRET`
1. Generate: `openssl rand -hex 32`.
2. Replace it in Vercel (Production). Redeploy.
3. Vercel's scheduler picks up the new value with the new deployment.

### `INQUIRY_IP_HASH_SECRET`
1. Generate: `openssl rand -hex 32`. Replace in Vercel. Redeploy.
2. Effect: stored IP hashes and rate-limit windows stop matching, so **limits restart from zero** — nothing breaks. (This is also the way to "forget" who was who.)

### `RESEND_API_KEY` (when real e-mail is on — D-01)
1. Resend dashboard → API Keys → create a new key (sending access only).
2. Replace in Vercel. Redeploy. Send a test (`/admin/notifications` → "Send due messages now", or submit a brief).
3. Delete the old key in Resend **after** the test succeeds.

### Supabase keys (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`)
The service-role key is the important one: it can read and write **everything**.
1. Supabase dashboard → Project Settings → API (or the key-management page it points to). Rotate the service key / JWT secret there. Note what the page says about the effect on sessions: rotating the JWT secret signs every user out, the owner included.
2. Copy the new keys into Vercel (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`). Redeploy.
3. Sign in again at `/admin/login`.
4. Your own `.env.local` needs the same new values.

### The owner's password and authenticator
Supabase → Authentication → Users → the owner → send a password reset, or change it from the admin once a password-change screen exists (known debt, Phase 13). Enrol or re-enrol the authenticator at `/admin/security`.

## Check it worked (after any change)
1. **Deployment log**: open the new deployment's runtime log and look for log lines with `"event":"config.finding"`, and open `/en/admin/observability` → *Health* / *Alerts* (`config.invalid`). Each names a variable that is missing or weak. No such line = nothing wrong. (It never prints a value.)
2. `/admin/login` → sign in → `/admin` loads.
3. **Daily run**, by hand:
   ```bash
   curl -i -H "Authorization: Bearer $CRON_SECRET" https://<your-site>/api/cron/notifications
   ```
   `200` with `"ok":true` = fine. `401 cron-secret-not-configured` = the variable is missing in that environment. A request without the header must give `401`.
4. Submit a test brief at `/start` (or `/consultation`); it appears in `/admin/leads`.

## "I think a secret leaked"
Speed matters more than certainty. In this order:

1. **Which one?** Match it to the table in `docs/security.md` § 6 — the "if it leaks" column says how bad it is.
2. **Rotate it now** using the section above. For `SUPABASE_SERVICE_ROLE_KEY` do it before anything else; it is the only one whose leak means the data is exposed.
3. **Find how it leaked** so it does not happen again. Search the repository history: the pipeline's secret scan (gitleaks) runs on every pull request over the full history; run it locally with the same `.gitleaks.toml` if in doubt. If it was pasted into a chat, an issue, a screenshot or a shared document, delete it there too — rotating makes the old value useless, deleting stops the next reader from wondering.
4. **Look for use of the old value.**
   - Supabase → Logs (API / Auth) for the time window since the leak: requests you do not recognise, sign-ins from unfamiliar places.
   - `/admin` → the audit log entries (`audit_log`): `admin.sign_in_succeeded` you did not do, `pipeline.csv_exported`, `pipeline.file_opened`.
   - `/admin/notifications` for messages you did not send.
5. **If the service-role key leaked and you cannot rule out use:** treat the leads as exposed. The people in them gave their details to you under the privacy policy on the site (`/privacy`); telling them is your decision, and the wording is yours — write down what you found and when, first.
6. Write what happened, what you rotated and when, in `docs/phases/` (or an incident note) — future you will want it.

## Owner-only settings that belong to this model
Checked once, and after any Supabase or Vercel change (details in `docs/security.md` § 8): Supabase Auth **sign-ups off**, **e-mail confirmation on**, **minimum password length ≥ 12**; GitHub **secret scanning + push protection** on (`docs/ci.md`); Vercel **Preview** environment with its own Supabase project or keys.
