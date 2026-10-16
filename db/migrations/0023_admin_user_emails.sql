-- Migration: 0023_admin_user_emails
-- Neon (October 2026). The backup manifest (scripts/backup/collect.mjs) records
-- each admin's e-mail, so a restore into a brand-new project can recreate the
-- admin's sign-in account and remap `admin_users.id` (docs/runbooks/backup-restore.md
-- § 5b). Under Supabase that came from the Auth admin API; under Neon the
-- accounts live in `neon_auth."user"`, a schema the Data API does not expose.
-- This function is the one narrow window onto it: id and e-mail of ADMINS only,
-- callable by `service_role` only (0022 revoked EXECUTE from PUBLIC by default).
--
-- plpgsql, not sql, on purpose: the body is resolved when called, not when
-- created, so the migration also applies where `neon_auth` does not exist (the
-- local test stack creates a stand-in).
--
-- ROLLBACK:
--   drop function if exists public.admin_user_emails();

create or replace function public.admin_user_emails()
returns table (id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
    select a.id, u.email
      from public.admin_users a
      left join neon_auth."user" u on u.id = a.id
     order by a.created_at;
end;
$$;

revoke all on function public.admin_user_emails() from public, anon, authenticated;
grant execute on function public.admin_user_emails() to service_role;
