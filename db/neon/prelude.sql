-- Neon prelude — run ONCE on a fresh Neon database, BEFORE db/migrations/*.sql.
--
-- The site moved from Supabase to Neon in October 2026. Migrations 0001–0021
-- were written against Supabase and lean on four things the platform provided:
-- the `anon` / `authenticated` / `service_role` roles, `auth.users` (0008's
-- foreign key), and `storage.buckets` / `storage.objects` (0012, 0020). This
-- file provides exactly those, so 0001–0021 apply UNCHANGED (their history stays
-- the history); 0022_neon_platform then removes the stand-ins and finishes the
-- move. It is the Neon counterpart of tests/support/stack/shim.sql.
--
-- Roles on Neon:
--   * `authenticator` / `authenticated` / `anonymous` are created by Neon when the
--     Data API is enabled on the branch. Do that first (external JWKS provider,
--     no default grants — see docs/runbooks/backup-restore.md § Neon).
--   * `service_role` (created here, BYPASSRLS) is what the server's own JWT
--     (`lib/db/service-token.ts`, claim `role: service_role`) switches to — the
--     same trust level the Supabase service-role key had.
--   * `anon` exists only because 0003–0009's public-read policies name it;
--     nothing ever runs as it on Neon (an unauthenticated Data API request runs
--     as `anonymous`, which is granted nothing).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    raise exception 'Enable the Neon Data API on this branch first (it creates the authenticator role).';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant service_role to authenticator;

grant usage on schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- Stand-ins removed again by 0022_neon_platform.
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz not null default now()
);
