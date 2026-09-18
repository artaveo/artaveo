-- Migration: 0016b_validate_scheduled_constraint
-- Follow-up to 0016_insights (same pattern as 0011b / 0012b).
--
-- 0016 added `articles_scheduled_requires_date` as NOT VALID so it could not
-- fail on an unexpected old row. It was applied to the live project on
-- 18 Sep 2026 after checking the table: 0 articles, 0 rows with
-- `status = 'scheduled' and published_at is null`. This validates it, so the
-- rule now covers existing rows as well as new writes.
--
-- ROLLBACK: none needed (validating a constraint changes no data). To undo the
-- constraint itself, see 0016_insights.sql's rollback.

alter table public.articles validate constraint articles_scheduled_requires_date;
