-- Migration: 0015_recommendation_requests
-- Roadmap: § 16 "Verified Evidence (Recommendations & Testimonials)"
--
-- `recommendations` already exists (0005) — created empty ahead of this
-- phase, same "schema exists ahead of the CMS that populates it" pattern
-- § 12 already used for Phase 15. This migration is Phase 16 itself:
--
--   1. `recommendation_requests` — the single-use request link § 16
--      calls for ("the owner generates a single-use request link; the
--      recommender submits statement, role, relationship, optional
--      profile URL and explicit consent to publish"). One row per link.
--      `token` is the public secret (looked up by exact match from the
--      public `/recommend/[token]` route via the service-role client —
--      never exposed through RLS to `anon`, same trust model
--      `inquiry_attachments`' IP-hash check already uses: mediated
--      entirely through server code, not through a public read policy).
--
--   2. Extends `recommendations` with the columns a real moderation flow
--      needs that 0005 didn't yet: `consent_to_publish` (the explicit
--      consent § 16 requires before anything is shown), `request_id`
--      (which link produced this row, for traceability and for
--      reopening on "request change"), `moderation_note` (what the
--      admin asks the recommender to change — § 16: "request change"),
--      and `related_service_id` (a testimonial can be tied to a
--      service, not only a project — § 16: "testimonial = tied to a
--      delivered project/service"; 0005 only had `related_project_id`).
--      `status` grows a fourth value, `'changes-requested'` — the loop
--      that closes when the recommender revisits the same link.
--
-- Design notes:
--
-- - No separate `kind` ('recommendation' | 'testimonial') column.
--   § 16's own definition — "recommendation = about working with the
--   developer; testimonial = tied to a delivered project/service" — is
--   fully determined by whether `related_project_id`/`related_service_id`
--   is set, so a second column would only be able to go out of sync with
--   the columns that already carry the real signal. `types/content.ts`
--   derives it at read time.
--
-- - No automated e-mail when a link is generated or a change is
--   requested. Phase 19 (Notifications & Outbox) is the provider
--   abstraction this would properly send through, and it doesn't exist
--   yet (same reason Phase 15 left the public nav/settings read-path
--   unwired rather than half-building a bespoke path this phase would
--   throw away) — the owner copies the link from the admin panel and
--   shares it directly. Recorded as known follow-up, not silently
--   assumed solved.
--
-- - No database trigger enforcing the status transition graph, unlike
--   `enforce_inquiry_stage_transition()` (0010). The lead pipeline's
--   trigger exists because that graph is a one-way sales funnel with
--   real business consequences to a skipped stage; moderation here is a
--   small, fully reversible admin action set (approve / request change
--   / reject, plus "undo" back to pending) gated by a single
--   `editor`-role check already enforced in `app/actions/content.ts` —
--   adding a second enforcement layer in the database would duplicate
--   that check without preventing a materially different failure mode.
--
-- - `touch_recommendation_requests_updated_at()` sets `search_path = ''`
--   from the start, applying 0011b's own lint fix at creation time
--   instead of shipping the same advisor finding again and needing a
--   follow-up migration to fix it.
--
-- - `recommendation_requests` gets a token index for the public lookup
--   and an index on `recommendation_id` for the admin traceability
--   join; the existing `recommendations_status_idx` (0005) already
--   covers the moderation queue's own filter.
--
-- RLS: `recommendation_requests` — no public policies at all
-- (service-role only), same default 0001/0008 already established for
-- every table with no draft/publish concept that also isn't public
-- content. `recommendations`' existing 0005 policy (public select only
-- for `status = 'approved'`) is untouched and already covers the new
-- columns — `consent_to_publish` is enforced at the write boundary
-- (`app/actions/recommendations.ts` refuses to insert without it), not
-- by RLS, the same way `articles`' `published` boolean already governs
-- the row without a column-level policy.
--
-- ROLLBACK:
--   drop trigger if exists recommendation_requests_touch on public.recommendation_requests;
--   drop table if exists public.recommendation_requests;
--   alter table public.recommendations drop constraint if exists recommendations_status_check;
--   alter table public.recommendations add constraint recommendations_status_check check (status in ('pending', 'approved', 'rejected'));
--   alter table public.recommendations drop column if exists consent_to_publish;
--   alter table public.recommendations drop column if exists request_id;
--   alter table public.recommendations drop column if exists moderation_note;
--   alter table public.recommendations drop column if exists related_service_id;

create table if not exists public.recommendation_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  token text not null unique,
  -- Internal-only label so the owner can tell links apart in the admin
  -- list ("Sara — Pazhuhesh project"). Never shown to the recommender.
  note text,

  -- Owner-set hint for what this specific link is for — determines
  -- whether the resulting row reads as a recommendation or a
  -- testimonial (see the design note above). Never chosen by the
  -- recommender: which project/service they worked on is a fact the
  -- owner already knows, not something to invent-by-selection.
  suggested_related_project_id uuid references public.projects (id) on delete set null,
  suggested_related_service_id uuid references public.services (id) on delete set null,

  created_by uuid references public.admin_users (id) on delete set null,
  expires_at timestamptz,
  used_at timestamptz,
  revoked_at timestamptz,
  recommendation_id uuid references public.recommendations (id) on delete set null
);

create unique index if not exists recommendation_requests_token_idx on public.recommendation_requests (token);
create index if not exists recommendation_requests_recommendation_idx on public.recommendation_requests (recommendation_id);

alter table public.recommendation_requests enable row level security;
-- No policies — service-role only (see RLS note above).

create or replace function public.touch_recommendation_requests_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recommendation_requests_touch on public.recommendation_requests;
create trigger recommendation_requests_touch
  before update on public.recommendation_requests
  for each row
  execute function public.touch_recommendation_requests_updated_at();

alter table public.recommendations
  add column if not exists consent_to_publish boolean not null default false,
  add column if not exists request_id uuid references public.recommendation_requests (id) on delete set null,
  add column if not exists moderation_note text,
  add column if not exists related_service_id uuid references public.services (id) on delete set null;

alter table public.recommendations drop constraint if exists recommendations_status_check;
alter table public.recommendations
  add constraint recommendations_status_check
  check (status in ('pending', 'approved', 'rejected', 'changes-requested'));

create index if not exists recommendations_request_idx on public.recommendations (request_id);
