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

### The server's Data API signing key (`NEON_SERVICE_JWT_PRIVATE_KEY`, `NEON_SERVICE_JWT_KID`)
The important one: whoever holds it can read and write **everything** in the database. The Data API trusts the public half, published as `jwks.json` in the public `service-jwks` bucket of the `main` branch. Rotate without downtime by publishing the new key **next to** the old one first:
1. Generate a new pair (Node, no dependencies) — it prints the new `kid`, the private key for Vercel (base64 PEM, one line) and the public JWK:
   ```bash
   node -e "const c=require('crypto');const {privateKey,publicKey}=c.generateKeyPairSync('ec',{namedCurve:'P-256'});const kid='artaveo-server-'+new Date().toISOString().slice(0,10);console.log(kid);console.log(Buffer.from(privateKey.export({format:'pem',type:'pkcs8'})).toString('base64'));console.log(JSON.stringify({...publicKey.export({format:'jwk'}),kid,alg:'ES256',use:'sig'}))"
   ```
2. Download the current `jwks.json` (`https://<branch storage endpoint>/service-jwks/jwks.json`), add the new JWK to its `keys` array, upload it back (Neon Console → Object storage → `service-jwks`, or `neon buckets`).
3. Set `NEON_SERVICE_JWT_PRIVATE_KEY` and `NEON_SERVICE_JWT_KID` in Vercel to the new values. Redeploy. Your own `.env.local` too.
4. After the deployment is live (and at least 5 minutes — a token's lifetime — have passed), remove the old JWK from `jwks.json` and upload it again. The old private key is now worthless.

### Object Storage credential (`NEON_STORAGE_ACCESS_KEY_ID`, `NEON_STORAGE_SECRET_ACCESS_KEY`)
Reads and writes every stored file, including visitors' private attachments.
1. Neon Console → Settings → Credentials → the `artaveo-app-storage` credential → rotate (or `neon credentials rotate <token_id>`). The access key id stays; only the secret changes.
2. Replace `NEON_STORAGE_SECRET_ACCESS_KEY` in Vercel. Redeploy.

### `NEON_AUTH_COOKIE_SECRET`
1. Generate: `openssl rand -base64 32` (at least 32 characters). Replace in Vercel. Redeploy.
2. Effect: the cached session cookie of every signed-in admin stops validating; they are asked to sign in again.

### `MFA_ENCRYPTION_KEY`
Rotate only if it leaked: every enrolled authenticator becomes unreadable with a new key.
1. Generate: `openssl rand -base64 32`. Replace in Vercel. Redeploy.
2. Each admin who had two-factor clears it (the SQL in `docs/runbooks/admin-onboarding.md` § 4) and enrols again at `/admin/security`.

### The database password (`DATABASE_URL`, operations only)
The app never uses it. Neon Console → Roles → `artaveo_owner` → Reset password; update wherever you keep it for `pg_dump`.

### The owner's password and authenticator
Neon Console → Auth → Users → the owner → reset the password (there is no password-change screen in the admin yet — known debt, Phase 13). Enrol or re-enrol the authenticator at `/admin/security`.

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
2. **Rotate it now** using the section above. For `NEON_SERVICE_JWT_PRIVATE_KEY` and the storage credential do it before anything else; they are the ones whose leak means the data is exposed. For a leak, skip the "next to the old one" step: replace the JWKS with only the new key at once.
3. **Find how it leaked** so it does not happen again. Search the repository history: the pipeline's secret scan (gitleaks) runs on every pull request over the full history; run it locally with the same `.gitleaks.toml` if in doubt. If it was pasted into a chat, an issue, a screenshot or a shared document, delete it there too — rotating makes the old value useless, deleting stops the next reader from wondering.
4. **Look for use of the old value.**
   - Neon Console → Monitoring / logs (Data API, Object storage, Auth) for the time window since the leak: requests you do not recognise, sign-ins from unfamiliar places.
   - `/admin` → the audit log entries (`audit_log`): `admin.sign_in_succeeded` you did not do, `pipeline.csv_exported`, `pipeline.file_opened`.
   - `/admin/notifications` for messages you did not send.
5. **If the signing key or the storage credential leaked and you cannot rule out use:** treat the leads as exposed. The people in them gave their details to you under the privacy policy on the site (`/privacy`); telling them is your decision, and the wording is yours — write down what you found and when, first.
6. Write what happened, what you rotated and when, in `docs/phases/` (or an incident note) — future you will want it.

## Owner-only settings that belong to this model
Checked once, and after any Neon or Vercel change (details in `docs/security.md` § 8): Neon Auth **sign-ups off**, **no OAuth providers**, **trusted domains** only the site's own; GitHub **secret scanning + push protection** on (`docs/ci.md`); Vercel **Preview** environment pointed at its own Neon branch, never `main`.
