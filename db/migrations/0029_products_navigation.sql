-- Migration: 0029_products_navigation
-- Roadmap: Phase 30.1 (§ 11A) — /products and /products/[slug] exist now.
--
-- The `products` navigation item was hidden (`has_content = false`) until the
-- pages were built (0026). It is turned on here; the site itself still keeps it
-- out of every menu, the footer and the search while no product is published
-- (§ 15 "hidden from the nav until ≥ 1 product is published" —
-- lib/shell-menus.ts). The owner can still switch it off in the admin.
--
-- ROLLBACK:
--   update public.navigation_items set has_content = false where key = 'products';

update public.navigation_items set has_content = true where key = 'products';
