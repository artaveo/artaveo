-- Test fixtures applied on top of the migrations and the imported site content.
-- Test data only — never applied to a real database, never shown on the real
-- site. Everything is keyed with an `e2e-` slug so it cannot be mistaken for
-- (or collide with) real content.

-- A published article in both languages: the Insights section (navigation
-- link, index, article page, feed) is invisible on the real site until an
-- article is published, so without one those routes could not be tested.
insert into public.articles (slug, status, published_at, title, excerpt, body, category)
values (
  'e2e-fixture-article',
  'published',
  '2026-09-01T06:00:00Z',
  '{"en": "A fixture article for the test suite", "fa": "یک مقاله آزمایشی برای مجموعه آزمون"}',
  '{"en": "Exists only in the test database.", "fa": "فقط در پایگاه داده آزمون وجود دارد."}',
  '{"en": "## First heading\n\nA paragraph of test text.\n\n## Second heading\n\nMore test text.\n\n## Third heading\n\nEven more.", "fa": "## عنوان اول\n\nیک بند متن آزمایشی.\n\n## عنوان دوم\n\nمتن آزمایشی بیشتر.\n\n## عنوان سوم\n\nباز هم متن."}',
  '{"en": "Engineering", "fa": "مهندسی"}'
)
on conflict (slug) do nothing;
