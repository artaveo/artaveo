-- Migration: 0024_live_site_corrections
-- Phase 26 (roadmap § 11A, revision 45) — two CONTENT rows, no schema change.
--
-- 1. 26.5: the article `concurrent-seat-booking` goes back to draft. It explains
--    a past permission gap in the transport system Artaveo wants to sell — an
--    engineering note, not customer reading (§ 16.1). It stays in the admin,
--    editable; Phase 33 keeps engineering articles unpublished.
-- 2. 26.4: one service FAQ answer (business website, "Can I update the content
--    myself after launch?") named "Phase 15 on this roadmap" in public copy.
--    The English answer is reworded with the same meaning; the Dari answer
--    never had the reference and is unchanged.
--
-- Both statements are guarded by their current value, so re-running the file,
-- or applying it to a database without these rows (the local test stack applies
-- every migration BEFORE importing content), changes nothing.
--
-- ROLLBACK:
--   update public.articles set status = 'published'
--     where slug = 'concurrent-seat-booking' and status = 'draft';
--   update public.faqs set answer = jsonb_set(answer, '{en}', to_jsonb(
--     'The content structure is built CMS-ready from day one, so moving to self-service editing later (Phase 15 on this roadmap) does not require rebuilding the site.'::text))
--     where id = '81c4c6b2-9f32-43a0-8dc7-a271ca15f133';

update public.articles
   set status = 'draft'
 where slug = 'concurrent-seat-booking'
   and status = 'published';

update public.faqs
   set answer = jsonb_set(
         answer,
         '{en}',
         to_jsonb('The content is structured for editing from day one, so adding self-service editing later does not mean rebuilding the site.'::text)
       )
 where id = '81c4c6b2-9f32-43a0-8dc7-a271ca15f133'
   and answer ->> 'en' like '%(Phase 15 on this roadmap)%';
