-- Migration: 0032_articles
-- Roadmap: Phase 33 (§ 11A) — Articles revamp.
--
-- 33.1 Insights become Articles («مقاله‌ها») at /articles (/insights redirects,
--      next.config.mjs). An article gets the cover image its card needs (B-37:
--      a large cover, a tag, a title), tags of its own, and an audience:
--      'customer' (topics a customer reads — what online ticket sales change
--      for a transport company, what a website costs, product updates) or
--      'engineering' (how something is built inside).
-- 33.3 Engineering articles stay unpublished, and no article is published or
--      scheduled without a cover: the database refuses it
--      (`articles_publish_rules`), whatever writes the row — the admin, the
--      daily scheduler or a hand-written query.
-- 33.2 The navigation item becomes `articles`, /articles. The site shows it
--      in the footer (and the search) from the first published article and in
--      the header and mobile menu from the fourth (`lib/shell-settings.ts`
--      `applyArticleRule`); the owner's switch in Content → Navigation still
--      hides it altogether, so `has_content` turns on here — the code decides
--      the rest by the count.
--
-- The one existing article (`concurrent-seat-booking`, a draft about how seat
-- bookings stay correct) is engineering content: it is marked so and can no
-- longer be published by mistake.
--
-- ROLLBACK:
--   alter table public.articles drop constraint if exists articles_publish_rules;
--   alter table public.articles drop constraint if exists articles_tags_is_array;
--   alter table public.articles drop column if exists cover_media_id, drop column if exists tags, drop column if exists audience;
--   alter table public.navigation_items drop constraint navigation_items_key_check;
--   update public.navigation_items set key = 'insights', href = '/insights', has_content = false where key = 'articles';
--   alter table public.navigation_items add constraint navigation_items_key_check check (key in ('home', 'products', 'work',
--     'services', 'process', 'about', 'insights', 'designSystem', 'contact', 'start', 'consultation', 'privacy', 'terms'));

alter table public.articles
  add column if not exists cover_media_id uuid references public.media_assets (id) on delete restrict,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists audience text not null default 'customer' check (audience in ('customer', 'engineering'));

alter table public.articles
  add constraint articles_tags_is_array check (jsonb_typeof(tags) = 'array');

create index if not exists articles_cover_media_id_idx on public.articles (cover_media_id);

update public.articles set audience = 'engineering' where slug = 'concurrent-seat-booking';

-- Only a customer article with a cover reaches the public site, now or on its scheduled day.
alter table public.articles
  add constraint articles_publish_rules check (
    status not in ('published', 'scheduled') or (audience = 'customer' and cover_media_id is not null)
  );

-- 33.2 the navigation item
alter table public.navigation_items drop constraint navigation_items_key_check;
update public.navigation_items set key = 'articles', href = '/articles', has_content = true where key = 'insights';
alter table public.navigation_items add constraint navigation_items_key_check check (key in (
  'home', 'products', 'work', 'services', 'process', 'about', 'articles', 'designSystem', 'contact', 'start', 'consultation', 'privacy', 'terms'
));
