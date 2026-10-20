-- Migration: 0028_header_navigation
-- Roadmap: Phase 29.1 (§ 11A) — the header of Design System 2.0 is
-- Products · Services · Work · About + Start a Project (§ 14.0 Glass Header).
--
-- "How it works" (/process) leaves the header and the mobile menu. It stays in
-- the footer and the search (command palette) until Phase 31.2 folds it into
-- /services and redirects the old address. Nothing else changes: the owner can
-- put it back from the admin (Content → Site menu) at any time.
--
-- Products and Services are drawn by the header itself as mega menus from the
-- published products and services; Home is the logo. Their rows are untouched.
--
-- ROLLBACK:
--   update public.navigation_items set surfaces = '{header,footer,mobile,command-palette}' where key = 'process';

update public.navigation_items
  set surfaces = array(select s from unnest(surfaces) as s where s not in ('header', 'mobile'))
  where key = 'process';
