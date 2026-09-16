-- Migration: 0012_media_storage_and_inquiry_attachments
-- Roadmap: § 15 "CMS & Media" — the media-upload pipeline and Brief
-- Builder attachments this phase's own bullet list names, both
-- deferred out of 15.1/15.2.
--
-- `media_assets` (0007) already has every column an uploaded file's row
-- needs (url, alt, width, height, type, size_bytes, focal_x, focal_y) —
-- this migration adds the Storage bucket rows actually land in and the
-- one new table needed to link an upload to an inquiry.
--
-- Bucket `media` is public-read (Supabase's own bucket-level `public`
-- flag, not an RLS policy) — same reasoning `project_media`'s 0003 RLS
-- policy already established: gating happens through the referencing
-- content's own `published` flag, not the asset URL itself, which is
-- effectively a CDN path once known (identical to how a `/public` static
-- asset already works today). All writes go through the service-role
-- client in Server Actions, which bypasses RLS entirely, so the only
-- policy this migration adds is an explicit public SELECT — matching the
-- project's own style of explicit policies over relying solely on the
-- bucket's implicit `public` flag.
--
-- `inquiry_attachments` follows `inquiries`' own RLS convention exactly
-- (0001's header comment): no policies at all, service_role only — an
-- uploaded file is linked to an inquiry only via the server action that
-- already re-validates and rate-limits the inquiry submission itself.
--
-- ROLLBACK:
--   drop table if exists public.inquiry_attachments;
--   drop policy if exists "media bucket is publicly readable" on storage.objects;
--   delete from storage.buckets where id = 'media';
--   alter table public.media_assets drop column if exists uploaded_by_ip_hash;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "media bucket is publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

-- Brief Builder uploads (`app/actions/inquiry-attachments.ts`) are public —
-- no admin session to rate-limit against — so they need the same
-- never-store-the-raw-IP hash `inquiries.submitter_ip_hash` (0001) already
-- uses, to cap uploads per IP per hour. `null` for every admin-library
-- upload (those are rate-limited by requiring an authenticated session
-- instead).
alter table public.media_assets
  add column if not exists uploaded_by_ip_hash text;

create index if not exists media_assets_uploaded_by_ip_hash_idx on public.media_assets (uploaded_by_ip_hash);

create table if not exists public.inquiry_attachments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  media_id uuid not null references public.media_assets (id) on delete cascade
);

create index if not exists inquiry_attachments_inquiry_id_idx on public.inquiry_attachments (inquiry_id);
create index if not exists inquiry_attachments_media_id_idx on public.inquiry_attachments (media_id);

alter table public.inquiry_attachments enable row level security;
-- No policies created — service_role only (see header note).
