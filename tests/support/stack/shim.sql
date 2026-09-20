-- Test-only stand-in for the parts of Supabase the migrations depend on.
--
-- The real project gets these from the platform; a plain PostgreSQL has none
-- of them. Nothing here is application schema — it exists so that
-- db/migrations/0001…0019 can be applied unchanged and PostgREST can serve
-- the result the way Supabase does. Applied by tests/support/stack/stack.mjs
-- BEFORE the migrations, on a throw-away database.
--
-- What is deliberately mirrored from Supabase, because the RLS tests depend on it:
--   * roles anon / authenticated / service_role, with service_role BYPASSRLS
--   * `authenticator` as the login role PostgREST connects with, switching to
--     the JWT's role per request
--   * default privileges: every object created later in `public` is granted
--     to anon, authenticated and service_role (Supabase does exactly this — it
--     is why a table with RLS enabled and NO policy is the thing that keeps it
--     private, not the absence of a grant)
--
-- What is NOT mirrored (and so is not verified by the suite): Supabase's own
-- auth.* and storage.* logic (only the tables the migrations reference exist).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator noinherit login password 'authenticator-test-only';
  end if;
end
$$;

grant anon, authenticated, service_role to authenticator;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- auth.users — only the columns the app or the migrations touch.
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

-- storage.* — the bucket table 0012 inserts into and the objects table it
-- puts a policy on.
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
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant select on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated, service_role;
