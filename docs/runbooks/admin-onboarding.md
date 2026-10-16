# Admin onboarding (Phase 13; Neon since October 2026)

There is deliberately no admin sign-up flow — `db/migrations/0008_admin_and_audit.sql`'s
own comment says so: a user only becomes an admin by getting a matching
row in `admin_users`, and that row is created by the project owner
directly. This runbook is that manual step. Nothing here can be
automated from a coding session — it needs your own Neon Console access.

Sign-in is Neon's Managed Better Auth (project `Artaveo`, branch `main`).
Passwords could not be carried over from Supabase (the two services hash
them differently), so after the move every admin is created once, here.

## 1. Create your Neon Auth user

Neon Console → project **Artaveo** → **Auth → Users → Create user**.

- Email: your real email.
- Password: a strong, unique password (this is what `/admin/login` checks).

Copy the new user's **ID** (a UUID) — you need it for the next step. You
can also read it in the SQL Editor:

```sql
select id, email from neon_auth."user" order by "createdAt" desc;
```

## 2. Insert (or re-point) your `admin_users` row

Neon Console → **SQL Editor** (database `artaveo`), with your real UUID:

```sql
insert into public.admin_users (id, role)
values ('00000000-0000-0000-0000-000000000000', 'owner');
```

**After the Supabase → Neon move** the old row is still there under your
old Supabase user id (the data was copied as it was). Re-point it instead
of inserting a second one — it keeps its creation date:

```sql
update public.admin_users
   set id = '<your new Neon Auth user id>'
 where role = 'owner' and id not in (select id from neon_auth."user");
```

Use `'owner'` for yourself. A future editor gets their own Auth user via
the same Step 1, then a row here with `role = 'editor'` — same process,
run by you, never through the app.

## 3. Close the doors you don't use

Neon Console → **Auth → Configuration**:

- **Sign-ups: off.** Nobody becomes an admin without step 2, but an open
  sign-up still lets strangers fill the user table.
- **OAuth providers: none.** Neon enables a shared Google provider by
  default; the admin signs in with e-mail and password only.
- **Trusted domains**: the production domain, `https://artaveo-seven.vercel.app`
  and `http://localhost:3000` (for local development). Add the real domain
  here the day it goes live (D-01) — sign-in from an untrusted origin is
  refused.

## 4. Sign in and (optionally) enroll two-factor

Visit `/en/admin/login` (or `/fa/admin/login`) and sign in. Two-factor is
optional for both roles (revision 27) and strongly recommended for the
owner: `/admin/security` → **Set up authenticator app**, scan the QR code
with any TOTP app (Google Authenticator, 1Password, Authy, …) and confirm
with the 6-digit code it shows. From then on every sign-in asks for a code.

The codes are the app's own (`lib/admin/totp.ts`; Neon Auth has no TOTP).
The secret is stored encrypted under `MFA_ENCRYPTION_KEY`.

If you ever lose access to your authenticator app: there is no recovery
flow (no backup codes). Recover in the Neon SQL Editor by clearing the
factor for your user, then re-enroll from `/admin/security`:

```sql
update public.admin_users
   set totp_secret = null, totp_pending_secret = null, totp_enrolled_at = null, totp_last_step = null
 where id = '<your user id>';
```

## Known debt this runbook exists because of

- No self-service MFA recovery (backup codes / admin-assisted reset) —
  see above.
- No password-reset or password-change screen for admin accounts — reset
  a password from the Neon Console (Auth → Users).
- No UI for the owner to invite an editor or manage the `admin_users`
  table — Steps 1–2 above are the only way to add one, on purpose (no
  in-app privilege escalation surface exists yet).
