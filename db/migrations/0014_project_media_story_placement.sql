-- Migration: 0014_project_media_story_placement
-- Out-of-sequence work (§ 23.1, not a roadmap phase) — a Case Study
-- media/narrative refinement pass requested directly by Zakir, per an
-- owner-supplied brief. Fixes the "screenshot wall" problem: every
-- `placement = 'main'` image (0013) rendered as one long stack of full-
-- width screenshots directly under the header, before any written
-- narrative — six in a row for Transportation System, five for
-- Pazhuhesh Portal. The brief's target is `Story → Evidence → Story →
-- Evidence → Gallery`, which needs the media model to distinguish three
-- things `placement: 'main' | 'gallery'` could not: exactly one HERO
-- image, small STORY groups that sit beside a specific piece of prose,
-- and the supporting GALLERY grid (unchanged from 0013).
--
-- Two additive columns, both nullable and only meaningful when
-- `placement = 'story'`:
--   story_key    — groups the rows that form one visual "evidence
--                  moment" (e.g. three screenshots that are one
--                  booking flow, rendered together, not as three
--                  separate stacked blocks).
--   story_anchor — names the `Project` case-study field (in the exact
--                  camelCase the TS type/UI already use — 'context',
--                  'problemAndGoals', 'architecture', 'keyDecisions',
--                  'engineeringHighlight', 'dataIntegrityAndSecurity',
--                  'responsiveAndRtl', 'quality', 'currentStatusAndNext',
--                  'lessonsLearned') this story group renders directly
--                  after. This is what makes placement fully
--                  data-driven: `CaseStudy` renders whatever story
--                  groups exist for a given anchor, in `sort_order`,
--                  with no `if (project.slug === ...)` branching and no
--                  per-project rendering tree — a project with no rows
--                  at a given anchor simply shows nothing there, same
--                  "absent means not yet true" rule 0013 and the rest
--                  of this template already follow.
--
-- `placement` grows from ('main', 'gallery') to ('hero', 'story',
-- 'gallery') — 'main' is fully replaced, not kept as a third option,
-- since every row backfilled below gets a real hero/story value and
-- nothing else in the codebase writes 'main' (the admin project-media
-- editor never sets `placement` at all; new rows keep relying on the
-- column default, which stays 'gallery' — admin behavior is
-- unchanged, per the brief's "do not redesign admin").
--
-- 'gallery' rows (0013's `placement = 'gallery'`, sort_order 7–14 for
-- Transportation System and 6–11 for Pazhuhesh Portal) are untouched —
-- same rows, same order, same captions, same alt text. No screenshot
-- is added, removed, renamed or duplicated; only the `placement` value
-- changes on the twelve rows that were `'main'`, and two new nullable
-- columns are added.
--
-- ROLLBACK:
--   update public.project_media set placement = 'main', story_key = null, story_anchor = null
--     where placement in ('hero', 'story');
--   alter table public.project_media drop column if exists story_key;
--   alter table public.project_media drop column if exists story_anchor;
--   alter table public.project_media drop constraint if exists project_media_placement_check;
--   alter table public.project_media add constraint project_media_placement_check
--     check (placement in ('main', 'gallery'));

alter table public.project_media
  add column if not exists story_key text,
  add column if not exists story_anchor text;

alter table public.project_media
  drop constraint if exists project_media_placement_check;

-- Transportation System (project_media.sort_order 1–6 were all 'main')
update public.project_media pm
set placement = 'hero'
from public.projects p
where pm.project_id = p.id and p.slug = 'transportation-system' and pm.sort_order = 1;

update public.project_media pm
set placement = 'story', story_key = 'booking-flow', story_anchor = 'problemAndGoals'
from public.projects p
where pm.project_id = p.id and p.slug = 'transportation-system' and pm.sort_order in (2, 3, 4);

update public.project_media pm
set placement = 'story', story_key = 'operations', story_anchor = 'architecture'
from public.projects p
where pm.project_id = p.id and p.slug = 'transportation-system' and pm.sort_order = 5;

update public.project_media pm
set placement = 'story', story_key = 'reports', story_anchor = 'keyDecisions'
from public.projects p
where pm.project_id = p.id and p.slug = 'transportation-system' and pm.sort_order = 6;

-- Pazhuhesh Portal (project_media.sort_order 1–5 were all 'main')
update public.project_media pm
set placement = 'hero'
from public.projects p
where pm.project_id = p.id and p.slug = 'pazhuhesh-portal' and pm.sort_order = 1;

update public.project_media pm
set placement = 'story', story_key = 'public-experience', story_anchor = 'context'
from public.projects p
where pm.project_id = p.id and p.slug = 'pazhuhesh-portal' and pm.sort_order in (2, 3);

update public.project_media pm
set placement = 'story', story_key = 'admin-roles', story_anchor = 'dataIntegrityAndSecurity'
from public.projects p
where pm.project_id = p.id and p.slug = 'pazhuhesh-portal' and pm.sort_order in (4, 5);

alter table public.project_media
  add constraint project_media_placement_check
    check (placement in ('hero', 'story', 'gallery'));
