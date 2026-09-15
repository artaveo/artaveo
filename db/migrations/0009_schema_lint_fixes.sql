-- Migration: 0009_schema_lint_fixes
-- Roadmap: § 17 Definition of Done — "verified" is not optional; this
-- migration is the fix pass after running Supabase's own security and
-- performance advisors against 0003–0008 (§ 20 "never silently skip a
-- failed step" applies to advisor findings too, not just build errors).
--
-- 1. Four foreign keys had no covering index (`get_advisors` type:
--    performance, "unindexed_foreign_keys"): project_media.media_id,
--    project_technologies.technology_id, recommendations.related_project_id,
--    service_technologies.technology_id. The join tables' primary keys
--    already cover the *other* column in each pair (project_id / service_id
--    comes first in the composite PK) but not this one — added explicitly.
-- 2. `faqs` had two permissive SELECT policies evaluated on every query
--    (`get_advisors` type: performance, "multiple_permissive_policies").
--    Replaced with one policy expressing the same rule (`scope = 'global'
--    OR (scope = 'service' AND parent service is published)`).
--
-- The `rls_enabled_no_policy` findings on `admin_users`, `audit_log`,
-- `consultations`, `inquiries`, `inquiry_events`, `media_assets`,
-- `notification_outbox` and `redirects` are not fixed here — they are the
-- expected, intentional "service-role only" pattern already recorded for
-- `inquiries`/`inquiry_events` in 0001_inquiries.sql and reconfirmed in
-- `docs/decisions-and-principles.md`, not a regression.
--
-- ROLLBACK:
--   drop policy if exists "faqs are publicly readable" on public.faqs;
--   create policy "global faqs are publicly readable" on public.faqs for select to anon, authenticated using (scope = 'global');
--   create policy "faqs of published services are publicly readable" on public.faqs for select to anon, authenticated using (scope = 'service' and exists (select 1 from public.services s where s.id = faqs.service_id and s.published = true));
--   drop index if exists public.service_technologies_technology_id_idx;
--   drop index if exists public.recommendations_related_project_id_idx;
--   drop index if exists public.project_technologies_technology_id_idx;
--   drop index if exists public.project_media_media_id_idx;

create index if not exists project_media_media_id_idx on public.project_media (media_id);
create index if not exists project_technologies_technology_id_idx on public.project_technologies (technology_id);
create index if not exists recommendations_related_project_id_idx on public.recommendations (related_project_id);
create index if not exists service_technologies_technology_id_idx on public.service_technologies (technology_id);

drop policy if exists "global faqs are publicly readable" on public.faqs;
drop policy if exists "faqs of published services are publicly readable" on public.faqs;

create policy "faqs are publicly readable"
  on public.faqs for select
  to anon, authenticated
  using (
    scope = 'global'
    or (scope = 'service' and exists (
      select 1 from public.services s
      where s.id = faqs.service_id and s.published = true
    ))
  );
