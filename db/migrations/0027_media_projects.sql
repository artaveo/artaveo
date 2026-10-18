-- Migration: 0027_media_projects
-- Roadmap: Phase 27 (§ 11A) — owner's review of the new admin, 18 October 2026.
--
-- Every image the owner picks (a project's cover, a gallery block, a case-study
-- screenshot) used to come from one flat list of the whole media library. With
-- dozens of projects, each with dozens of screenshots, that list is unusable.
-- `media_assets.project_id` says which project an image belongs to, so the
-- pickers and the media library show "this project's images" first and can be
-- filtered per project. Optional: an image may belong to no project (a logo, an
-- article picture), and deleting a project keeps its images, unassigned.
--
-- Backfill: an image already attached to a project (its case-study screenshots,
-- `project_media`, or its cover, `projects.cover_media_id`) belongs to that project.
--
-- `media_assets` stays private (no public policy, 0007) — nothing about it changes
-- for a visitor.
--
-- ROLLBACK:
--   drop index if exists public.media_assets_project_id_idx;
--   alter table public.media_assets drop column if exists project_id;

alter table public.media_assets
  add column if not exists project_id uuid references public.projects (id) on delete set null;

create index if not exists media_assets_project_id_idx on public.media_assets (project_id);

update public.media_assets m set project_id = pm.project_id
  from public.project_media pm
  where pm.media_id = m.id and m.project_id is null;

update public.media_assets m set project_id = p.id
  from public.projects p
  where p.cover_media_id = m.id and m.project_id is null;
