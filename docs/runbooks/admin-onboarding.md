# Admin onboarding (Phase 13)

There is deliberately no admin sign-up flow — `db/migrations/0008_admin_and_audit.sql`'s
own comment says so: a user only becomes an admin by getting a matching
row in `admin_users`, and that row is created by the project owner
directly. This runbook is that manual step. Nothing here can be
automated from a coding session — it needs your own Supabase dashboard
access.

## 1. Create your Supabase Auth user

Supabase dashboard → your `Artaveo` project (`ukzovqnpqjcrwofycalc`) →
**Authentication → Users → Add user → Create new user**.

- Email: your real email.
- Password: a strong, unique password (this is what `/admin/login` checks).
- Leave "Auto Confirm User" checked — there's no email-confirmation flow
  wired up for the admin panel, so an unconfirmed user can never sign in.

Copy the new user's **UUID** from the users list — you need it for the
next step.

## 2. Insert your `admin_users` row

Supabase dashboard → **SQL Editor**, run (with your real UUID):

```sql
insert into public.admin_users (id, role)
values ('00000000-0000-0000-0000-000000000000', 'owner');
```

Use `'owner'` for yourself. A future editor gets their own Auth user via
the same Step 1, then a row here with `role = 'editor'` — same process,
run by you, never through the app.

## 3. Sign in and enroll MFA

Visit `/en/admin/login` (or `/fa/admin/login`) and sign in. Because
you're `role = 'owner'`, the app immediately routes you to
`/admin/security` — MFA is required for the owner role (roadmap § 13),
not optional. Scan the QR code with any TOTP authenticator app (Google
Authenticator, 1Password, Authy, …), enter the 6-digit code it shows to
confirm, and you're in.

If you ever lose access to your authenticator app: there is no recovery
flow in this phase (no backup codes, no email-reset-MFA). Recovering
requires you, directly in the Supabase dashboard, to delete the stuck
factor row from `auth.mfa_factors` for your user, then re-enroll from
`/admin/security`. Recorded as known debt below — worth a real recovery
flow before a second owner-role admin ever exists, but not before then.

## Known debt this runbook exists because of

- No self-service MFA recovery (backup codes / admin-assisted reset) —
  see above.
- No email verification / password-reset flow for admin accounts yet —
  Phase 19 (Notifications) ships the provider this would need; wiring it
  to admin accounts specifically is unscoped follow-up.
- No UI for the owner to invite an editor or manage the `admin_users`
  table — Steps 1–2 above are the only way to add one, on purpose (no
  in-app privilege escalation surface exists yet).
