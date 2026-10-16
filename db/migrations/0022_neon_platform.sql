-- Migration: 0022_neon_platform
-- The move from Supabase to Neon (October 2026).
--
-- Applies to the Neon database (after db/neon/prelude.sql and 0001–0021) and to
-- the local test stack. It must never run on the old Supabase project — it drops
-- the `storage` and `auth` schemas, which there are Supabase's own — so it
-- refuses to run anywhere a Supabase-only schema exists.
--
-- What changes:
--
-- 1. `admin_users.id` no longer references `auth.users`. Admin sign-in is Neon's
--    Managed Better Auth now; its users live in `neon_auth.user`, a schema Neon
--    manages (and migrates) itself, so no foreign key reaches into it. The id is
--    still the auth user's UUID, and `lib/admin/auth.ts` still requires a row
--    here before anyone is treated as an admin.
--
-- 2. TOTP two-factor moves into the app (Managed Better Auth has no TOTP
--    plugin). The secret is stored ENCRYPTED (AES-256-GCM, key MFA_ENCRYPTION_KEY,
--    lib/admin/totp.ts) — a database dump alone does not yield working codes.
--    `totp_pending_secret` holds an enrollment that has not been confirmed with
--    a first code yet; `totp_last_step` refuses a code being replayed within
--    its 30-second window.
--
-- 3. The prelude's stand-ins for Supabase's `auth` and `storage` schemas go.
--    Files live in Neon Object Storage buckets (`media`, public_read;
--    `inquiry-files`, private), which are configured on the branch, not in SQL.
--
-- 4. Functions: Postgres grants EXECUTE to PUBLIC by default, and on Neon the
--    Data API's `anonymous` role is part of PUBLIC — so a SECURITY DEFINER
--    function such as consume_rate_limit would be callable without a token.
--    EXECUTE is revoked from PUBLIC on every function in `public` (now and for
--    new ones); `service_role` keeps it.
--
-- ROLLBACK (Neon):
--   alter table public.admin_users drop column if exists totp_secret,
--     drop column if exists totp_pending_secret, drop column if exists totp_enrolled_at,
--     drop column if exists totp_last_step;
--   grant execute on all functions in schema public to public;

do $$
begin
  if exists (select 1 from pg_namespace where nspname in ('supabase_migrations', 'supabase_functions', 'graphql', 'realtime')) then
    raise exception '0022_neon_platform is for the Neon database only — this looks like a Supabase project.';
  end if;
end
$$;

alter table public.admin_users drop constraint if exists admin_users_id_fkey;

alter table public.admin_users
  add column if not exists totp_secret text,
  add column if not exists totp_pending_secret text,
  add column if not exists totp_enrolled_at timestamptz,
  add column if not exists totp_last_step bigint;

drop schema if exists storage cascade;
drop schema if exists auth cascade;

revoke execute on all functions in schema public from public;
alter default privileges in schema public revoke execute on functions from public;
grant execute on all functions in schema public to service_role;
