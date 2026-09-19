-- Migration: 0018_recommender_email
-- Roadmap: Phase 19 follow-up — D-14 (owner said yes, 19 September 2026).
--
-- Lets the owner give a recommendation request the recommender's e-mail
-- address, so the site can send the link — and, when the owner asks for a
-- change, the "please change this" message — through the outbox instead of the
-- owner copying links by hand (the Phase 16 gap).
--
-- This stores one more personal address, so it is deliberately narrow:
--   - `recipient_email` is OPTIONAL and per request; a request without one
--     behaves exactly as before.
--   - `recipient_locale` (en | fa) is the language the e-mails are written in,
--     chosen by the owner; required whenever an address is stored.
--   - The address is cleared (set to NULL) by the application when the request
--     is revoked, when its recommendation is approved or rejected, and by the
--     daily sweep for anything that expired unused or whose recommendation no
--     longer exists (`lib/recommendation-privacy.ts`). The copies of those
--     e-mails kept in `notification_outbox` are redacted at the same time.
--     A link with no expiry that is never used or revoked keeps its address
--     until the owner revokes it — that is disclosed in the privacy policy.
--   - Same RLS as the table already has: enabled, no public policy.
--
-- Also widens `notification_outbox.kind` (0017) with the two recommender-facing
-- events.
--
-- ROLLBACK:
--   delete from public.notification_outbox
--    where kind in ('recommendation-request', 'recommendation-changes');
--   alter table public.notification_outbox drop constraint if exists notification_outbox_kind_check;
--   alter table public.notification_outbox add constraint notification_outbox_kind_check
--     check (kind in ('owner-alert', 'client-confirmation', 'evidence-submitted', 'content-published', 'system-alert'));
--   alter table public.recommendation_requests
--     drop constraint if exists recommendation_requests_recipient_check,
--     drop column if exists recipient_email,
--     drop column if exists recipient_locale;

alter table public.recommendation_requests
  add column if not exists recipient_email text,
  add column if not exists recipient_locale text;

alter table public.recommendation_requests drop constraint if exists recommendation_requests_recipient_locale_check;
alter table public.recommendation_requests
  add constraint recommendation_requests_recipient_locale_check
  check (recipient_locale is null or recipient_locale in ('en', 'fa'));

alter table public.recommendation_requests drop constraint if exists recommendation_requests_recipient_check;
alter table public.recommendation_requests
  add constraint recommendation_requests_recipient_check
  check (recipient_email is null or (recipient_locale is not null and char_length(recipient_email) <= 320));

alter table public.notification_outbox drop constraint if exists notification_outbox_kind_check;
alter table public.notification_outbox
  add constraint notification_outbox_kind_check
  check (kind in (
    'owner-alert', 'client-confirmation', 'evidence-submitted', 'content-published', 'system-alert',
    'recommendation-request', 'recommendation-changes'
  ));
