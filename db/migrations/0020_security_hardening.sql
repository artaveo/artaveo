-- Migration: 0020_security_hardening
-- Roadmap: Phase 23 — Security Hardening.
--
-- Four independent changes, all additive or a narrowing of access:
--
--  1. Rate limiting for every public mutation and for admin sign-in: one small
--     table plus one atomic function (`consume_rate_limit`). A fixed window per
--     key; the increment is a single INSERT … ON CONFLICT statement, so two
--     racing requests can never both read "9 of 10" and both pass. Keys hold
--     only salted hashes (never a raw IP or e-mail address). service_role only.
--
--  2. Storage: the `media` bucket had a public SELECT policy on
--     storage.objects. A public bucket serves objects by URL without any
--     policy; the policy only added the ability to LIST every object through
--     the Storage API. Dropped (least privilege).
--
--  3. Visitor uploads (Brief Builder attachments) move out of the public
--     `media` bucket and out of `media_assets` (the editors' CMS library — they
--     could see, delete and embed a lead's private files) into a PRIVATE bucket
--     `inquiry-files` and a table only the server can read. SVG is not allowed
--     there. `inquiry_attachments` and `media_assets.uploaded_by_ip_hash` (0012)
--     are left in place, unused (0 rows live on 20 September 2026), to be
--     dropped in a later clean-up migration — this one stays non-destructive.
--
--  4. `enforce_inquiry_stage_transition` gets a pinned search_path (Supabase
--     advisor `function_search_path_mutable`). Its body uses only NEW/OLD and
--     built-ins, so an empty path is safe.
--
-- ROLLBACK (in this order; nothing else depends on these objects):
--   alter function public.enforce_inquiry_stage_transition() reset search_path;
--   drop table if exists public.inquiry_files;
--   delete from storage.buckets where id = 'inquiry-files';   -- only once empty
--   create policy "media bucket is publicly readable"
--     on storage.objects for select to anon, authenticated using (bucket_id = 'media');
--   drop function if exists public.consume_rate_limit(text, int, int);
--   drop table if exists public.rate_limit_buckets;

-- ---------------------------------------------------------------------------
-- 1. Rate limiting
-- ---------------------------------------------------------------------------

create table if not exists public.rate_limit_buckets (
  bucket_key        text primary key check (char_length(bucket_key) between 1 and 200),
  hits              integer not null check (hits >= 0),
  window_started_at timestamptz not null default now(),
  expires_at        timestamptz not null
);

create index if not exists rate_limit_buckets_expires_idx on public.rate_limit_buckets (expires_at);

alter table public.rate_limit_buckets enable row level security;
-- No policies: same rule as inquiries (0001). Only the service-role key reads or writes.

create or replace function public.consume_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns table (allowed boolean, hit_count int, retry_after_seconds int)
language plpgsql
set search_path = ''
as $$
declare
  v_hits    int;
  v_expires timestamptz;
begin
  if p_key is null or char_length(p_key) not between 1 and 200 then
    raise exception 'invalid rate limit key' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100000 then
    raise exception 'invalid rate limit' using errcode = '22023';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit window' using errcode = '22023';
  end if;

  -- One statement: the window is opened or continued atomically. A denied
  -- attempt still counts (so a client that keeps hammering never "earns" a
  -- reset) but never extends the window.
  insert into public.rate_limit_buckets as b (bucket_key, hits, window_started_at, expires_at)
  values (p_key, 1, now(), now() + make_interval(secs => p_window_seconds))
  on conflict (bucket_key) do update
    set hits = case when b.expires_at <= now() then 1 else b.hits + 1 end,
        window_started_at = case when b.expires_at <= now() then now() else b.window_started_at end,
        expires_at = case
          when b.expires_at <= now() then now() + make_interval(secs => p_window_seconds)
          else b.expires_at
        end
  returning b.hits, b.expires_at into v_hits, v_expires;

  return query
    select v_hits <= p_limit,
           v_hits,
           greatest(0, ceil(extract(epoch from (v_expires - now())))::int);
end;
$$;

revoke all on function public.consume_rate_limit(text, int, int) from public;
revoke all on function public.consume_rate_limit(text, int, int) from anon, authenticated;
grant execute on function public.consume_rate_limit(text, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Storage: no listing of the public bucket
-- ---------------------------------------------------------------------------

drop policy if exists "media bucket is publicly readable" on storage.objects;

-- ---------------------------------------------------------------------------
-- 3. Private bucket and table for Brief Builder attachments
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inquiry-files',
  'inquiry-files',
  false,
  5242880, -- 5 MB, same as `media`
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create table if not exists public.inquiry_files (
  id                  uuid primary key default gen_random_uuid(),
  -- null until the visitor submits the brief; unlinked rows are swept after 24 h.
  inquiry_id          uuid references public.inquiries (id) on delete cascade,
  storage_path        text not null unique check (char_length(storage_path) between 1 and 200),
  content_type        text not null check (content_type in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
  size_bytes          integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  original_name       text not null check (char_length(original_name) between 1 and 120),
  uploaded_by_ip_hash text not null,
  created_at          timestamptz not null default now()
);

create index if not exists inquiry_files_inquiry_idx on public.inquiry_files (inquiry_id);
create index if not exists inquiry_files_unlinked_idx on public.inquiry_files (created_at) where inquiry_id is null;

alter table public.inquiry_files enable row level security;
-- No policies: service_role only, like `inquiries`.

-- ---------------------------------------------------------------------------
-- 4. Pinned search_path
-- ---------------------------------------------------------------------------

alter function public.enforce_inquiry_stage_transition() set search_path = '';
