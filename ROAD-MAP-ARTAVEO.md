# ROAD-MAP — ARTAVEO
## Independent Full-Stack Developer · Freelance Business Platform

## Document status

**Last revision:** 18 September 2026 (revision 36 — Phase 17 marked complete (code): Insights / Engineering Journal. **Migrations `0016_insights.sql` and `0016b_validate_scheduled_constraint.sql` applied and verified live** on Supabase project `ukzovqnpqjcrwofycalc` (tables, RLS with no policy, indexes, validated constraint, `updated_at` trigger — including a rolled-back constraint/cascade test and a real two-transaction trigger test — and `get_advisors` clean apart from the intended `rls_enabled_no_policy` INFO on the three new tables; details in `docs/phases/PHASE-17-README.md` § "Before you push"). `0016` adds three join tables (`article_projects`, `article_services`, `article_related` — RLS enabled, no policy, related stored in both directions), a `NOT VALID` check making `scheduled ⇒ published_at is not null` a database rule, a partial index for the daily sweep, and the `updated_at` touch trigger `articles` never had. Public: `/[locale]/insights` (404 while nothing is published), `/[locale]/insights/[slug]` (ToC from 3 headings, LTR code blocks with a translated, touch-visible copy button, media-library images with the asset's required alt text, related work/services/articles — published items only — `BlogPosting` JSON-LD, `article_view` event) and `/[locale]/insights/feed.xml` (RSS 2.0 per locale, excerpts, 15-minute CDN cache); sitemap entries; Home section 11 now reads the database; the Insights nav link (header, mobile nav, footer, command palette) appears only when an article is published — resolved in the root layout and handed to the client nav via `SiteFlagsProvider`, replacing the hand-flipped `hasContent: false` (`lib/site.ts` no longer exports the pre-filtered `visibleMainNav`/`visibleCommandItems`). The article body is a documented Markdown subset parsed by an own ~350-line parser (`lib/articles/markdown.ts`) to an AST rendered as React elements — there is no HTML output path, so raw HTML and unsafe links degrade to text; no new dependency; no tables or nested lists yet. Reading time is computed per locale at read time (`en` 200 / `fa` 180 words per minute — heuristics, not measurements). Admin: go-live date for `scheduled`, preview at `/admin/content/articles/[id]/preview?lang=`, related-item pickers, "insert image" from the media library, archive, and two new publish gates — no unresolved `[PLACEHOLDER]` (§ 16.3, which the build-time check cannot see in database content) and no embedded image that no longer exists. **Scheduled publishing** is a real stored state change made by `lib/insights-scheduler.ts` — one atomic, idempotent `update … where status='scheduled' and published_at <= now()` — run from the existing daily cron route (no second `vercel.json` entry: Hobby's allowance is small and exceeding it fails the deploy), so a scheduled article goes live at the 06:00 UTC run on its date, a day not a minute, and the form says so. **Fixed a Phase 15 bug found on the way:** `updateArticle` wrote the form's `status`, which for a published article always arrived as `draft`, so saving a typo fix silently unpublished it — invisible until now because nothing public read `articles`. Deliberately not built, disclosed: tables and nested lists in article bodies, full-text RSS, `next/image` for uploaded article images, a cover/OG image, redirects on slug change, case-study→article backlinks; **one article is written, as an unpublished draft** (`concurrent-seat-booking`, both languages, inserted into the live database and linked to the Transportation System case study and the Backend service; source in `docs/content/articles/`) — its claims and evidence are in `docs/content/claims-ledger.md`, and its "one statement, all or nothing" section is **unverified against the live `hold_seats` function** (the body is not in the Transportation System repository, and that database sits on a different Supabase account), so a two-line check is required before publishing; the other three topics are a backlog with evidence pointers in `docs/content/insights-topics.md`. `tsc --noEmit`: 0 errors. `npm run test:articles`: 16/16. `next build`: completes (exit 0) against a **mock PostgREST server** — this sandbox has no route to Supabase — with `/insights`, both published fixture articles and the feed generated in both locales; prerendered HTML inspected in `en` and `fa`; the empty state (zero published articles: index 404, feed 404, no sitemap entries, no home section, no nav link) rebuilt and confirmed. i18n parity: 823/823 (42 new keys, 1 removed, 2 reworded). Content-placeholder script passes; no physical CSS properties in any new/changed component; `next/font/google` stub applied and reverted, `app/[locale]/layout.tsx` differs from `HEAD` only by the Phase 17 edits; `tsconfig.tsbuildinfo` reverted. **Not verified:** the application's PostgREST queries against real Supabase (the `.or()` delete on `article_related`, the `head` count — the database objects themselves are verified live), the admin flows (need an authenticated session), a real browser (light/dark, mobile, keyboard, RTL typography, the copy button, the active-section highlight), the cron on Vercel. **Fixed, pre-existing:** every Persian date on the site rendered in the Solar Hijri calendar although D-03 says Gregorian — `lib/format.ts` mapped `fa` to plain `'fa'`, but `Intl` uses Solar Hijri for any `fa` tag; now `fa-u-ca-gregory` (also the availability chip, which used `fa-IR`, and the admin recommendations list). Full detail, every decision and the complete known-limitations list: `docs/phases/PHASE-17-README.md`. Revision 35's notes below remain for history.)

**Previous revision:** 18 September 2026 (revision 35 — Phase 16 marked complete: Verified Evidence (Recommendations & Testimonials). Migration `0015_recommendation_requests.sql` — a new `recommendation_requests` table (single-use `token`, no public RLS policy; access mediated entirely through server code) and four new columns on `recommendations` (0005) — `consent_to_publish`, `request_id`, `moderation_note`, `related_service_id` — plus a fourth `status` value, `'changes-requested'`; applied and verified live on Supabase, `get_advisors` clean. Public `/[locale]/recommend/[token]` (`app/actions/recommendations.ts#submitRecommendation`, `lib/recommendations.ts#resolveRequestToken`) — re-validates everything server-side, reuses the Brief Builder's honeypot + minimum-fill-time anti-spam pattern, no separate per-IP rate limit (the unguessable token itself is the access control), and merges only the visitor's own locale into the bilingual `statement` on a "request change" resubmission so an admin's already-completed translation of the other locale survives. Home section 10 (§ 3.3) — `components/home/recommendations.tsx` — reads Supabase directly via a new `queryApprovedRecommendations()` selector, hidden until at least one row is approved; no ratings anywhere. Admin `/admin/content/recommendations` (editor-accessible per § 13): a request-link generator with copy/revoke controls, a moderation queue (per-locale completeness + consent, both checked independently before Approve is allowed; Request Change requires a note; Reject), inline typo/translation edits, and a manual-entry path for the two verification types a request link never produces (`platform-review`, `public-profile`). `kind` (`'recommendation'` vs `'testimonial'`) is derived from whether a project/service is linked, never a stored column. Deliberately not built, disclosed rather than silently incomplete: no automated e-mail on link generation or change-request — Phase 19's provider abstraction is the right home for that, and the owner shares links directly for now. `tsc --noEmit`: 0 errors. `next build`: Turbopack compiles successfully; page-data collection fails at the same pre-existing, already-disclosed Phase-12 Supabase-network gap every prior build has shown, unrelated to this work. i18n parity: 782/782 (95 new keys — 8 `Recommendations`, 30 `RecommendPage`, 57 `Admin`, both locales). `next/font/google` stub applied and reverted, confirmed byte-identical via `diff`; `tsconfig.tsbuildinfo` reverted with `git checkout --`. Not verifiable from this sandbox: the request-link page and moderation queue rendered in an actual browser, and a real end-to-end submission against the live Supabase project — full detail, every decision, and the complete known-limitations list: `docs/phases/PHASE-16-README.md`. Revision 34's notes below remain for history.)

**Previous revision:** 17 September 2026 (revision 34 — **out-of-sequence work, not a roadmap phase** — Case Study media/narrative refinement, from an owner-supplied brief separate from the copy/localization work (revisions 31–33). Fixed the "screenshot wall": `/work/[slug]` was stacking every `placement: 'main'` screenshot full-width directly under the header — six in a row for Transportation System, five for Pazhuhesh Portal — before any case-study prose appeared. Migration `0014_project_media_story_placement` (applied live to Supabase, verified against all 25 `project_media` rows afterward) grows `placement` from `'main' | 'gallery'` to `'hero' | 'story' | 'gallery'` and adds `story_key`/`story_anchor` columns: exactly one `hero` image per project now renders once, centered and controlled, at the top; `story` screenshots render grouped by `story_key` immediately after the specific case-study section named by `story_anchor` — fully data-driven (`CaseStudy` builds an anchor→groups map from whatever `project.media` actually contains; there is no `if (project.slug === ...)` branch anywhere); `gallery` is untouched from `0013`. Exact mapping — Transportation System: hero `01-home-overview`; story `booking-flow` (→ Problem & Goals) `02`–`04`; story `operations` (→ Architecture) `05`; story `reports` (→ Key Decisions) `06`; gallery `07`–`14`. Pazhuhesh Portal: hero `01-home-overview`; story `public-experience` (→ Context) `02`–`03`; story `admin-roles` (→ Data Integrity & Security, the section that already describes the two admin roles) `04`–`05`; gallery `06`–`11`. New `components/work/case-study-media.tsx` (`CaseStudyHeroMedia`, `CaseStudyEvidenceGroup`) renders every hero/story image at its real aspect ratio (`media_assets.width`/`height`, already present, just never selected before this pass) with `object-contain` — never `object-cover` crop — inside a container capped by width for a landscape shot and by height for a portrait one (several real Pazhuhesh captures are taller than wide), so nothing is ever cropped or becomes an oversized block regardless of source shape; a 3+ image evidence group gives the first item visual emphasis with the rest in a 2-column supporting grid, a 2-image group is balanced side-by-side, matching the brief's own layout spec. Real, already-verified captions (from `0013`) render under each story image — no new copy was written, satisfying the brief's explicit "no copywriting pass" instruction. `types/content.ts` and `lib/supabase/content-queries.ts` updated accordingly. `ProjectGallery` and the admin project-media editor were reviewed and left unchanged — the gallery already used `object-contain` in its lightbox and `object-cover` only for small thumbnails (an explicitly allowed exception), and the admin editor never sets `placement` at all (new rows still default to `'gallery'`), so nothing there needed touching, per the brief's "do not redesign admin." `tsc --noEmit`: 0 errors. `next build`: compiles successfully (Turbopack); page-data collection fails at the same pre-existing, already-disclosed Phase-12 Supabase-network gap every prior build has shown, unrelated to this change. **No real rendered-browser check was performed** — this sandbox has no network route to Supabase and no credentials set, so neither `next dev` nor the build's page-data step can actually render either case study; visual rhythm, aspect-ratio caps, RTL alignment and mobile stacking are therefore unverified in an actual browser and this is stated as an open item, not glossed over — see the full report in `docs/updates/2026-09-17-case-study-media-narrative.md`, including why each `story_anchor` was chosen. Revision 33's notes below remain for history.)

**Previous revision:** 17 September 2026 (revision 33 — **out-of-sequence work, not a roadmap phase** — a third, exhaustive line-by-line pass over the copy/localization brief after Zakir insisted every line of the brief be checked with nothing skipped, however long it took. Read every remaining live content source in full, not sampled: `lib/about-content.ts` (story, languages, 8-phase process, quality commitments, Working Agreement — all already natural, independently composed, first-person; left unchanged), `lib/site.ts` (structural config only, no prose), `lib/inquiry-content.ts` (Brief Builder option labels — already fine), and the rest of `lib/home-content.ts` (process steps, developer bio, unpublished insight drafts — already fine). In `messages/fa.json`: rewrote `Common.siteDescription` (visible in both SEO meta and the footer) to active voice; found and fixed two strings written in fully colloquial spoken Persian (`NotFound.description`, `ErrorPage.description` — "نداره", "اومد", "می‌تونی") against the site's established written-informal register; fixed `Pwa.installDescription` (formal "دستگاه‌تان" → informal "دستگاهت"), `BriefBuilder.successQueuedNote` and `Price.quote` (formal verb conjugations), and `ServiceDetail.requirements` (dropped a formal "شما"). Per brief §6, lightly tightened `Hero.description` in English (split one long sentence into two, active voice) — the one English string that packed multiple ideas past what §6 flags. **Largest finding this pass, live in Supabase:** the entire `faqs` table (service FAQs, rendered on every `/services/[slug]` page) was written in the formal "شما" register — "به شما اطلاع می‌دهم", "در اختیارتان بگذارم", "خودتان می‌نویسید؟" — while every other public string on the site uses the informal "تو" register; all 6 affected rows fixed. The same register slip was in two service taglines (`admin-dashboards`, `backend-api-database` — "تیم شما"/"محصول شما") and one `service_addons.description` ("شما متن نهایی را تحویل دهید") — all fixed to match. Ran a full regex sweep across every `fa` jsonb column in `services`, `service_packages`, `service_addons`, `site_settings`, `engagement_models` and `project_sections` for the formal-register pattern afterward and confirmed nothing else was missed. `next build`, `tsc --noEmit`, i18n parity (687/687, unchanged — a wording pass, no new keys) and the content-placeholder script all re-run clean; `next/font/google` stub applied and reverted, confirmed byte-identical via `diff`, `tsconfig.tsbuildinfo` reverted with `git checkout --`. Full detail across all three passes: `docs/updates/2026-09-17-copy-localization-refinement.md`. Revision 32's notes below remain for history.)

**Previous revision:** 17 September 2026 (revision 32 — **out-of-sequence work, not a roadmap phase** — a deeper follow-up pass on revision 31, same day, after Zakir correctly flagged that pass as too narrow. The brief's actual complaint was that Persian and English were "sort of using the same format" — sentences mirroring the English clause order and length rather than being independently composed — and revision 31 had only fixed three flagged spots instead of checking the site's prose against that standard. Went back for a real pass: rewrote `messages/fa.json` prose in `Hero`, `FeaturedWork`, `Work`, `CaseStudy.pendingNotice`, `Services`, `ServicesIndex`, `TechStack`, `Process`, `ProcessPage.agreementDescription` and `AboutPage.description` — each given its own Persian sentence order/length instead of a fragment-for-fragment translation (dash-list-plus-clause English patterns split into separate Persian sentences; passive constructions made active first-person where the English used passive). Fixed two real register inconsistencies: `BriefBuilder.offlineQueuedTitle`/`offlineQueuedDescription` and `ServiceDetail.requirements` used the formal "شما" pronoun while every other string in the same flows uses the informal "تو" register the rest of the site is written in. **Important correction to revision 31's own work:** `lib/home-content.ts`'s `featuredProjectsData` (the two case studies' prose) turned out to be dead code — per `lib/home-content-projects.ts`'s own comment, it's only the historical input to `scripts/import-content-to-db.ts`, never read at request time; the actually-rendered case-study text lives in Supabase `project_sections`, read by `queryProjectBySlug`. Revision 31's sentence-split fix inside `featuredProjectsData` was therefore correct for the repo's seed source but had zero effect on the live site — the real fix needed to happen in Supabase. Went back there directly: found and rewrote `responsive-and-rtl` for both projects (both mirrored the English "RTL-first from the ground up — using..." fragment structure almost verbatim), and reviewed every other live `project_sections` row plus the full `services` table content directly in Supabase — those were already independently composed, not translated-feeling, and were left alone per the brief's own instruction not to rewrite copy that already meets the bar. `next build`, `tsc --noEmit`, i18n parity (687/687, unchanged) and the content-placeholder script all re-run clean. Full detail, including the addendum documenting exactly what changed between the two passes: `docs/updates/2026-09-17-copy-localization-refinement.md`. Revision 31's notes below remain for history.)

**Previous revision:** 17 September 2026 (revision 31 — **out-of-sequence work, not a roadmap phase, per Zakir's explicit instruction** (a full-site Persian/English copy and localization refinement pass — audited per the owner-supplied brief, not assigned a phase number; Phase 16 remains the next item in the phase sequence). **Audit (Phase A of the brief):** read `messages/en.json`/`fa.json` (687 keys), `lib/home-content.ts`, `lib/services-content.ts`, `lib/about-content.ts`, `lib/site.ts`, `lib/inquiry-content.ts`, the shared heading components (`components/home/hero.tsx`, `why-artaveo.tsx`, `final-cta.tsx`, `components/ui/patterns.tsx`'s `PageHeader`/`SectionHeader`), and the live case-study/service copy in Supabase (`project_sections`, `services`). Automated scans for the brief's mechanical failure modes (Latin comma instead of `،`, missing spacing around Latin technical terms, the brief's listed abstract-phrase set) came back clean — this codebase's Persian was already written carefully, not machine-translated. Three genuine issues were found and fixed, not a mechanical rewrite of already-good copy (per the brief's own "do not rewrite unnecessarily" principle): (1) `WhyArtaveo`'s heading was a near word-for-word mirror of the English three-clause structure ("One developer. One workflow. The whole product." → "یک توسعه‌دهنده. یک روند کاری. کل محصول.") — exactly the brief's own worked example of what not to do; rewritten to `"یک نفر همه‌چیز را می‌سازد، از معماری تا محصول نهایی."`, same meaning, its own Persian rhythm. (2) The abstract noun-phrase "مرزهای شفاف میان..." ("clear boundaries between...") appeared twice in `lib/home-content.ts` (a capability tagline and a differentiator sentence) — both rewritten as direct, active sentences. (3) One run-on, four-idea Persian sentence in the Pezhohesh case-study `dataIntegrityAndSecurity` field (`lib/home-content.ts`) split into four single-idea sentences, dropping a stray "رویکرد" abstraction along the way. In Supabase (live-edited, not a migration — this is CMS content, not schema): the Pazhuhesh Portal case study's `context` and `problem-and-goals` sections were tightened (split a run-on opening sentence; fixed one colloquial "یه" → the correct written "یک" — a register slip, informal speech in an otherwise professional-register paragraph); the Transportation System case study's `engineering-highlight` section had its longest compound sentences broken into shorter ones without cutting any technical content. Confirmed via SQL scan across every `project_sections` and `services` row that no other instance of the colloquial "یه" or the brief's abstract-phrase list remained. Heading composition (brief §2/§5): `PageHeader`/`SectionHeader` already accept `title` as a `React.ReactNode`, and `Hero`/`WhyArtaveo`/`FinalCta` already read independent `titleLine1`/`titleLine2` keys per locale — the architecture already supports locale-specific line composition; only `WhyArtaveo`'s Persian *content* needed rewriting, not the component. `tsc --noEmit`: 0 errors. i18n parity: 687/687 (no keys added or removed — a content-wording pass, not a new-feature phase). `node scripts/check-content-placeholders.mjs`: passes (`home-content.ts`, `site.ts`, `services-content.ts`, `about-content.ts`, `contact-content.ts`, `inquiry-content.ts`, `legal-content.ts`). `next build`: Turbopack compiles successfully; page-data collection fails at the same pre-existing, already-disclosed Phase-12 Supabase-network gap (this run at `/[locale]/services/[slug]`, same root cause as every prior phase) — unrelated to this work. `next/font/google` stub applied and reverted per the established pattern, confirmed byte-identical via `diff`; `tsconfig.tsbuildinfo` reverted with `git checkout --`. No CSS or component structure changed, so no physical-CSS-property grep was needed. Not verifiable from this sandbox: the actual rendered visual balance of the rewritten headings and case-study paragraphs in a browser, in both locales — the brief's own Phase E ("verify... no awkward line breaks... judge the actual visual composition") needs a real browser pass, which this sandbox cannot do; Zakir should eyeball `/fa` and `/en` after this ships. Full detail: `docs/updates/2026-09-17-copy-localization-refinement.md`. Revision 30's notes below remain for history.)

**Previous revision:** 17 September 2026 (revision 30 — **out-of-sequence work, not a roadmap phase** (Zakir: Phase 15 is already complete and Phase 16 is next; this closes a gap Phase 15's own revision 29 disclosed but doesn't belong in the phase sequence itself — logged here as a revision, the same way revisions 24/26/27/28 recorded real fixes without inventing a sub-phase number for them). **Case Study Media:** the public rendering of `project_media`'s screenshot gallery, closing "`project_media`'s gallery is similarly real and editable but not yet rendered on the public case-study template" from revision 29. 25 real screenshots captured against the actual running `Transportation-System`/`pezhohesh-portal` repos (demo data only, per D-06) — 14 for Transportation System, 11 for Pazhuhesh Portal — reviewed against each source repo's code before capture (not guessed from memory), committed under `public/images/work/<slug>/{main,gallery}/`. Migration `0013_project_media_placement.sql`: adds `project_media.placement` ('main' | 'gallery', a second closed vocabulary independent of the existing `kind` column) and populates real `media_assets`/`project_media` rows for both projects with real width/height/file-size metadata and bilingual `alt`/`caption` text — applied and verified live on Supabase (`ukzovqnpqjcrwofycalc`), `get_advisors` shows no new findings. Backfilled `projects.cover_image` for both rows from `null` to their new first `main` image, fixing the `/work` grid and homepage Featured Work tiles, which were silently showing the placeholder for both real projects until now. `types/content.ts`: new `ProjectMediaItem`/`ProjectMediaKind`, `Project.media?`. `lib/supabase/content-queries.ts`: `fetchProjectsByFilter` now joins `project_media`→`media_assets` alongside the existing sections/technologies queries. `components/work/case-study.tsx`: the Hero media block now renders every `placement: 'main'` item as its own frame (`BrowserFrame` for `kind: 'desktop'`, the existing `DeviceFrame` for `kind: 'mobile'` — both components §6.1 already named as the intended media pattern, unused until now); a project with no `media` yet still falls back to the old single-`coverImage` rendering, so this is additive, not a rewrite. New `components/work/project-gallery.tsx` (client component — `placement: 'gallery'` items only) renders a thumbnail grid opening a lightbox (existing `Dialog` primitive) with the full image and its caption. New `CaseStudy.gallery` i18n key, both locales, 687/687 parity. `tsc --noEmit`: 0 errors. `next build`: Turbopack compiles successfully; page-data collection then fails at the same pre-existing, already-disclosed Phase-12 Supabase-network gap (this run it surfaced first at `/[locale]/services/[slug]`, same root cause as every prior phase) — unrelated to this work. `next/font/google` stub applied and reverted per the established pattern, confirmed byte-identical via `diff`. Content-placeholder check and i18n parity both pass; grepped both changed components for physical CSS properties (RTL correctness) — none found. One item was flagged for Zakir mid-session — the Achievements gallery screenshot (`pazhuhesh-portal/gallery/08-achievements.png`) shows real named students and their specific admission/scholarship outcomes, already public on the Achievements page itself but reused here in a different, more marketing-oriented context than D-06's resolution specifically weighed — **Zakir confirmed it's fine to keep as-is.** Not verifiable from this sandbox: real static generation of `/work/[slug]` against live data (same gap every phase since 12.2 has hit) and the gallery lightbox's actual rendered appearance in a browser. Full detail: `docs/updates/2026-09-17-case-study-media.md`. Revision 29's notes below remain for history.)

**Previous revision:** 16 September 2026 (revision 29 — Phase 15 marked complete: CMS & Media, delivered and documented as one phase, not a numbered sub-series (an earlier working session had provisionally split it into "15.1"/"15.2"/"15.3" for its own sequencing and briefly logged two separate revisions for that; Zakir asked for one Phase 15 in the roadmap and this revision replaces both of those with this single entry — see `docs/phases/PHASE-15-README.md`'s own note on this). Two migrations: `0011_content_workflow_touch.sql` (an `updated_at`-touch trigger for `services`/`engagement_models`) and `0012_media_storage_and_inquiry_attachments.sql` (the `media` Storage bucket, `inquiry_attachments`, and a rate-limiting `uploaded_by_ip_hash` column on `media_assets`), both applied and live-verified on Supabase, advisors clean. New admin read layer (`lib/admin/content.ts`, `lib/admin/media.ts`, `lib/admin/settings.ts`) and Server Actions layer (`app/actions/content.ts`, `app/actions/media.ts`, `app/actions/settings.ts`, `app/actions/inquiry-attachments.ts`) give `editor`-accessible (per § 13's role split) CRUD for every § 15 entity: services (+ process steps, packages, add-ons, FAQs), engagement models, global FAQs, projects (+ case-study sections, curated tech-stack picker, screenshot gallery), articles (its own richer `draft → review → scheduled → published → archived` status enum), the media library (real uploads — server-side type/size validation, safe-generated filenames, required bilingual alt text, click-to-set focal point driving CSS `object-position`), site settings (availability, response commitment, languages, external profiles), and navigation item structure (href/surfaces/order — never the fixed key set or its translated label). Every entity with a `published` flag reuses that existing boolean rather than a new draft/publish schema state, with per-locale completeness computed at read time gating the one publish action server-side — a deliberate, disclosed reading of § 15's "per-locale" language, not a genuine independent per-locale publish flag (no table models that; building one would mean touching RLS and every public selector). Brief Builder attachments (`/start`) — real uploads through the identical validation rules, rate-limited per IP hash, capped at 3 files, linked to the inquiry on submit, best-effort like `inquiry_events`. Deliberately not wired, and clearly disclosed rather than silently incomplete: the public header/footer/mobile-nav/command-palette/Availability Card still render from the static `lib/site.ts`/`lib/home-content.ts` values, not the now-real, now-editable `navigation_items`/`site_settings` tables — that public read-path switch touches the root layout and 16 files importing `lib/site.ts`, several unrelated to navigation at all, a larger and riskier refactor than a CMS phase and one this session had no way to visually verify; `project_media`'s gallery is similarly real and editable but not yet rendered on the public case-study template. 263 new `Admin` + 9 new `BriefBuilder` i18n keys across the whole phase, both locales, 686/686 final parity. `tsc --noEmit`: 0 errors (one real bug fixed along the way — a bad type cast in `projectCompleteness`, and a dropped function declaration line caught by a second `tsc` pass after a `str_replace` mistake). `next build`: compiles every route with zero errors; the isolate-and-rebuild check used throughout this phase confirmed every new admin route — services, engagement models, FAQs, projects, articles, media, settings, navigation, in both locales — builds and pre-renders its unauthenticated-redirect state correctly, with the only failure remaining the same pre-existing, already-disclosed Phase-12 Supabase-network gap. Full detail, every decision, and the complete known-limitations list: `docs/phases/PHASE-15-README.md`. Revision 28's notes below remain for history.)

**Previous revision:** 16 September 2026 (revision 28 — one more real gap found by the owner testing the optional-MFA change live: `/admin/security`'s not-yet-enrolled screen had exactly one control, "Set up authenticator app", and no way to leave without either using it or knowing to click the header nav — for a page that revision 27 had just made voluntary rather than forced, a genuine dead end, not what "optional" should feel like. Re-traced the whole redirect chain end to end to rule out a remaining forced-redirect bug first (`getAdminSession()`'s `aal.next`/`aal.current` for an account with no verified TOTP factor both resolve to `'aal1'`, so `mfaSatisfied` — unchanged since revision 27 — is `true` and nothing redirects there; confirmed the owner's own screenshot already showed the "Leads" nav link rendered, meaning they'd already reached a protected page without being sent to `/admin/security` first) — the redirect logic itself was correct, this was purely a missing exit control on a screen reachable only by choice. `components/admin/mfa-enrollment-panel.tsx`'s not-enrolled state now shows a "Skip for now" link (→ `/admin`) next to "Set up authenticator app", not just the one button. New `Admin.skipMfaButton` key, both locales, 463/463 parity. `tsc --noEmit`: 0 errors. `next build`: clean, same pre-existing Supabase-network gap, unrelated. Confirmed against `origin/main` (`git fetch`): the owner had already pushed and presumably deployed revision 27's code exactly as delivered — this is a genuinely new, additional fix on top of it, not a re-fix of something that silently failed to deploy.)

**Previous revision:** 16 September 2026 (revision 27 — two more issues found and fixed during the owner's actual MFA enrollment attempt, one real bug in Phase 13's own code and one deliberate policy change at the owner's request:

1. **QR code rendered as literal text, not an image.** `components/admin/mfa-enrollment-panel.tsx` was doing `dangerouslySetInnerHTML={{ __html: state.qrCodeSvg }}` on the assumption `qrCodeSvg` was bare SVG markup — it's actually Supabase's own full `data:image/svg+xml;utf-8,<svg>...` data URI (`app/actions/admin-auth.ts`'s `enrollMfaStart` passes `data.totp.qr_code` straight through, correctly — the bug was only in how the panel rendered it). Injecting that string as innerHTML rendered the `data:image/svg+xml;utf-8,` prefix as a literal text node, with the browser then separately parsing the embedded `<svg>` tag that happened to follow it — visually confusing, and not a reliable way to display it. Replaced with a plain `<img src={state.qrCodeSvg} />`, which is what a data URI is actually for; no `dangerouslySetInnerHTML` needed at all now. Added a "can't scan it? use the setup key below" hint alongside it, since the setup key field already existed as a fallback but nothing pointed a user at it.
2. **MFA made optional for every role, at the owner's explicit request** — this reverses part of § 13's original design ("owner role requires MFA... MFA required and enforced for the owner role"). `lib/admin/auth.ts#mfaSatisfied` no longer force-redirects an owner who hasn't enrolled a factor; it now only requires completing the aal2 challenge for a session where Supabase itself reports a verified factor already exists and hasn't been confirmed yet this session (`aal.next === 'aal2'`) — real protection for anyone who does enroll, no forced first-time enrollment for anyone. `/admin/security` stays reachable as a voluntary place to enroll (already linked from the dashboard); the old role-conditional "required"/"optional" notice on that page collapsed to one neutral, always-shown "optional — recommended" message, and the now-dead `mfaRequiredNotice` key was removed from both locale files rather than left unused. **Security trade-off, disclosed rather than silently applied:** the admin panel — including the Phase 14 Lead Pipeline, which holds every prospective client's contact details and project brief — can now be reached with a password alone if the owner (or a future editor) never enrolls a factor. This was the owner's own explicit call, not a default assumed here; worth revisiting if the admin account is ever shared beyond the owner or if lead data volume/sensitivity grows enough to matter.

`tsc --noEmit`: 0 errors. `next build`: Turbopack compiles every route with zero errors; page-data collection hits the same pre-existing, already-disclosed `/[locale]/services/[slug]` gap (no sandbox network route to Supabase), unrelated to either fix. i18n parity re-verified: 462/462. Not verifiable from this sandbox: the QR code actually scanning correctly in a real authenticator app, and sign-in now skipping the forced security redirect — both need the owner's next real attempt.)

**Previous revision:** 16 September 2026 (revision 26 — real production bug found and fixed during Phase 14 admin-onboarding, in Phase 13's own admin-auth code, not Phase 14's: signing in as the newly-provisioned owner landed on `/en/en/admin/security` — a genuine 404, not a missing page. Root cause: `components/admin/login-form.tsx`, `mfa-challenge-form.tsx` and `mfa-enrollment-panel.tsx` all call `router.push()` from the locale-aware `useRouter` (`@/i18n/navigation`), which — like a plain `<Link href="/admin/security">` elsewhere in this codebase — prepends the *active* locale to whatever href it's given. All three were instead building `/${locale}/admin...` paths (also already locale-prefixed) before passing them to that same router, so the locale landed twice. Fixed by dropping the manual `/${locale}` prefix in all three (`resolveNextPath` in `login-form.tsx` now strips an incoming `next` query param's locale instead of assuming the router won't re-add it); `next`'s value itself was always correct (`proxy.ts`'s redirect sets it from `request.nextUrl.pathname`, which does include the locale — that's the right shape for a raw URL, just not for this locale-aware router). Grepped the rest of the codebase for the same `${locale}` + `router.push`/`href` pattern via the i18n-aware router or `Link` — no other instances. `tsc --noEmit`: 0 errors. `next build`: Turbopack compiles every route with zero errors; page-data collection hits the same pre-existing, already-disclosed `/[locale]/services/[slug]` gap (no sandbox network route to Supabase) — unrelated to this fix. Not verifiable from this sandbox: an actual sign-in against the live deployment — that needs the owner's next attempt, which is exactly what surfaced this.)

**Previous revision:** 16 September 2026 (revision 25 — Phase 14 marked complete: Lead Pipeline. `db/migrations/0010_lead_pipeline.sql` closes `inquiries.stage`/`inquiry_events.type` to their real vocabularies and adds a `BEFORE UPDATE OF stage` trigger enforcing the diagram's transition graph in the database itself (live-verified: a valid transition succeeded, an invalid one was rejected), plus the one genuinely new column the phase needed, `tags` (GIN-indexed) — `priority`/`follow_up_at` already existed (Phase 12.1) and "notes" are `inquiry_events.note` (§ 9.2). New `/admin/leads` list page (filter by stage/priority/tag/search, paginated, inline stage control, per-row SLA badge, CSV export) and `/admin/leads/[id]` detail page (full brief, pipeline controls, notes/activity timeline, fuller SLA indicator), both gated owner-only via new `lib/admin/auth.ts#canAccessLeads()` per § 13's own role split ("editor: content only, no leads") — editors never see the nav link and are redirected if they hit the URL directly. The SLA indicator deliberately doesn't invent a numeric hour threshold the owner never set (`site_settings.response_commitment` is prose, not a number) — it checks only the "same day" clause against the site's configured timezone, documented as a known limitation; "time to first reply" is approximated as time-to-first-admin-action (`inquiry_events`) until Phase 19/20 ship real outbound reply tracking. CSV export is real columns only, respects active filters, no invented metrics. 88 new `Admin` i18n keys both locales, 461/461 parity. Mid-session, fast-forward-merged the owner's own fix for a real Phase-13 production build failure (revision 24, below) before finishing verification, and confirmed this phase's own new files don't share that mistake. `tsc --noEmit`: 0 errors. `next build`: Turbopack compiles every route including both new leads pages with zero errors; page-data collection then fails at the same pre-existing, already-disclosed `/[locale]/services/[slug]` gap (no sandbox network route to Supabase) — both leads pages are fully dynamic/session-gated, so this doesn't touch them. See `docs/phases/PHASE-14-README.md`. Revision 24's notes below remain for history.)

**Previous revision:** 16 September 2026 (revision 24 — real production build failure fixed, unrelated to Phase 13: the owner's first Vercel deploy of this session's work reached real Supabase network access for the first time (this sandbox never has it — see revision 22/23's notes) and failed at static generation of `/en` with `useLocale is not callable within an async component`. Root cause: Phase 12.2 made `getFeaturedProjects()`/`getAllServices()` `async`, which silently turned `components/home/featured-work.tsx`'s `FeaturedWork` and `components/home/services.tsx`'s `Services` into async Server Components — but both still called the client-safe `useLocale`/`useTranslations` hooks from `next-intl` instead of the async-safe `getLocale`/`getTranslations` from `next-intl/server`, a mismatch that can only surface once a build actually reaches static generation with real data, which no sandbox session had done until this deploy. Fixed both call sites (behavior identical — same translator/locale values, just awaited); `featured-work.tsx` keeps a `type`-only `useTranslations` import for `ProjectFeature`'s prop signatures, which never executes at runtime. Searched the rest of the codebase for the same pattern (any exported async function still calling `useLocale`/`useTranslations` rather than the `/server` equivalents) — no other instances found; every other component using these hooks is a genuine synchronous Server Component receiving pre-resolved data as props (Phase 12.2's own pattern for `case-study.tsx`/`service-detail.tsx` etc.). `tsc --noEmit` clean; `next build` recompiles clean and reaches the same, already-disclosed page-data-collection wall this sandbox always hits (no network route to Supabase) — no new compile error. Not verifiable from this sandbox: the actual fixed static generation of `/en`/`/fa` against live data — that needs the next real Vercel deploy, which is exactly what surfaced this in the first place.)

**Previous revision:** 16 September 2026 (revision 23 — Phase 13 marked complete: Admin Authentication & Authorization. Added `@supabase/ssr` (the one new dependency, justified — no existing client could act as a signed-in user with a cookie-persisted session; the pre-existing `lib/supabase/server.ts` is service-role only, by design, and stays that way) and a second Supabase client, `lib/supabase/server-auth.ts`, cookie-bound via the `anon` key, used for every `auth.*`/`auth.mfa.*` call so the admin sign-in flow runs as the real user under RLS, never as a trusted service identity. `proxy.ts` now also refreshes the Supabase session cookie and redirects an unauthenticated visitor away from any `/admin/*` path except `/admin/login` — deliberately the cheap half of the guard (session existence only, no `admin_users` read at the edge on every request); the authoritative check is `lib/admin/auth.ts#getAdminSession()` (React `cache()`-deduped per request), which resolves both the caller's `admin_users` role (`owner`/`editor` — the table Phase 12 already created) and their session's Authenticator Assurance Level via `auth.mfa.getAuthenticatorAssuranceLevel()`, and is called independently by every protected page and every admin Server Action, never trusted from a single layout-level gate. MFA is enforced for `owner` only (roadmap's own wording), distinguishing "a verified factor exists but wasn't confirmed this session" (→ `/admin/mfa-challenge`) from "no factor enrolled at all yet" (→ `/admin/security`) via the AAL response's `nextLevel`, since conflating the two would strand an unenrolled owner on a challenge screen with nothing to challenge. `app/actions/admin-auth.ts` ships sign-in, MFA challenge-verify, TOTP enroll/verify/unenroll and sign-out, every one writing an `audit_log` row (`lib/admin/audit.ts`, best-effort — a failed insert is console-logged, never blocks the auth flow it's describing) and returning deliberately generic error codes (wrong password and unknown email both read back as `invalid-credentials`; a real Supabase user with no `admin_users` row is signed back out and given the same generic error) so a failed attempt can't be used to enumerate admin emails. New chrome-free pages under `app/[locale]/admin/` (route groups split `(public)` — login, MFA challenge, both still requiring *some* aal1 session — from `(protected)` — dashboard, security/MFA-management), no `SiteShell`, own header with a plain `<form action={adminSignOut.bind(null, locale)}>` sign-out that works with no client JS; every page `noindex`, `/admin` now also disallowed in `app/robots.ts`. New `Admin` i18n namespace, 365/365 key parity both locales; TOTP codes and the enrollment setup key render `dir="ltr"` even on `fa` per D-03. No new migration — Phase 12's `db/migrations/0008_admin_and_audit.sql` already shipped `admin_users`/`audit_log` with the two-role `check` constraint this phase relies on. `tsc --noEmit`: 0 errors. `next build`: Turbopack compiles every route including all new admin pages with zero errors; page-data collection then fails at the pre-existing `/[locale]/services/[slug]` (a Phase-12 page needing live Supabase network access this sandbox doesn't have) — the same disclosed limitation revision 22 already recorded, not a new gap, and nothing in `/admin` touches that code path. One real open item, documented rather than invented around: there is deliberately no admin sign-up flow, so no admin account exists yet — the owner must run the new `docs/runbooks/admin-onboarding.md` (create a Supabase Auth user, insert one `admin_users` row, sign in, enroll MFA) before `/admin/login` has anything to authenticate against; same category as D-01's domain purchase, not a code gap. See `docs/phases/PHASE-13-README.md`. Revision 22's notes below remain for history.)

**Previous revision:** 15 September 2026 (revision 22 — Phase 12.2 marked complete, closing Phase 12 in full: the one-way import script (`scripts/import-content-to-db.ts`) and the selector-layer switch. The import script reads `lib/home-content.ts`/`lib/services-content.ts`'s real content at runtime via Node's native `--experimental-strip-types` — no hand-transcription — builds one row model, and renders it two ways: `--sql` output for review/manual application, or real `@supabase/supabase-js` upserts when `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are set. This session's sandbox has no network route to `*.supabase.co`, so the `--sql` output was applied via the Supabase MCP's `execute_sql`; every row count (projects, project_sections, project_technologies, services, service_process_steps, service_packages, service_addons, faqs, engagement_models, technologies) was cross-checked exactly against the source content, determinism confirmed by diffing two consecutive `--sql` runs, and the security advisors re-run clean. Two real defects were caught and fixed before anything touched the database: `EngagementModel`'s field is `name` not `title` (caught via the `--sql` dry-run showing null titles), and an early draft's live-write path called a nonexistent `exec_sql` RPC (replaced with real structured Supabase-JS calls). The selector switch made `getFeaturedProjects()`/`getAllProjects()`/`getProjectBySlug()` and `getAllServices()`/`getServiceBySlug()`/`getEngagementModels()` async and Supabase-backed behind their original names, via a new `lib/supabase/content-queries.ts` query/mapper layer. Two real architectural problems surfaced and were fixed: (1) `lib/home-content.ts` is still imported by a genuine Client Component (`site-shell.tsx`) for its synchronous `getDeveloperProfile()`, and content-queries.ts's `server-only` import would have poisoned that whole file for every importer — fixed by moving the project selectors to a new `lib/home-content-projects.ts`; (2) the import script loads these files directly via Node, which can't resolve the `@/` path alias content-queries.ts needs — fixed with a dynamic `import()` inside each selector so the unreached code path never triggers resolution for the script's raw-data-only use. The genuinely client-side `/start` multi-step form (`steps.tsx`/`brief-builder.tsx`/`review.tsx`) now receives `services`/`engagementModels` as props threaded from its Server Component page rather than importing selectors during render; `lib/inquiry-summary.ts`'s summary/mailto functions take the same data as parameters instead of fetching it themselves, since they're called from both that Client Component and server-side email-template code. `tsc --noEmit`: 0 errors, full project (first real typecheck of Phase 12's code — `node_modules` didn't exist at session start, installed fresh via `npm install`). `next build` (Turbopack) compiled and bundled successfully; static generation itself (`generateStaticParams`/`generateMetadata` for `/work/[slug]`, `/services/[slug]`) could not be verified from this sandbox — no network route to Supabase, and unlike the established Google-Fonts stub, this couldn't be worked around without feeding the build fake data and risking a real rendering bug going unnoticed. This is flagged as the one real open verification gap: check it on the first real deploy. See `docs/phases/PHASE-12.2-README.md`. Revision 21's notes below remain for history.)

**Previous revision:** 15 September 2026 (revision 21 — Phase 12.1 marked complete: the ADR (`docs/adr/ADR-001-bilingual-storage.md`) and the full Phase 12 core-entities schema, live on the Artaveo Supabase project (`ukzovqnpqjcrwofycalc`). Decided `jsonb` localized-value columns over per-locale columns or `*_translations` tables — a `{en, fa}` object round-trips to `types/content.ts#LocalizedText` with no reassembly, and handles array-shaped translatable fields (`highlights`, `constraints`, …) as a `jsonb` array of `{en, fa}` objects, which structurally rules out the index-misalignment risk two parallel `text[]` columns would carry. Seven migrations (`0003`–`0009`) create all 20 new tables from § 12's core-entities table (`projects`, `project_sections`, `project_media`, `technologies`, `project_technologies`/`service_technologies`, `services`, `service_process_steps`, `service_packages`, `service_addons`, `faqs`, `engagement_models`, `recommendations`, `articles`, `consultations`, `media_assets`, `site_settings`, `navigation_items`, `redirects`, `admin_users`, `audit_log`) plus pipeline columns (`priority`, `follow_up_at`) on the existing `inquiries` table; `project_sections` follows § 12's own normalized design (type + jsonb body + sortOrder) rather than flat columns, matching the roadmap's own stated schema. `site_settings` and `navigation_items` are seeded with today's real, owner-confirmed values (D-08 availability/response commitment, D-02/D-05 profiles, `lib/site.ts`'s nav structure) — not placeholder content. RLS enabled on every table: public `select` gated on `published`/`status` for content tables and their children, unconditional public `select` for the three tables with no draft concept (`technologies`, `site_settings`, `navigation_items`), service-role-only (no policy) for lead/admin/business tables — same intentional pattern `inquiries` already established in Phase 9.2. Ran Supabase's own security + performance advisors twice (before and after a `0009` fix migration): found and fixed 4 missing foreign-key indexes and a duplicate-policy pair on `faqs`; the remaining findings are the 8 expected `rls_enabled_no_policy` cases and `unused_index` on tables nothing queries yet — both inert, not regressions. Live-verified the bilingual check constraints by attempting an insert with a missing `fa` key from this session (correctly rejected, and the whole test transaction rolled back cleanly — confirmed by re-querying for zero leftover rows). No application code changed this session — selectors, pages and components are untouched, so the live site is unaffected; import script + selector switch is deferred to Phase 12.2 (large, cross-cutting change, its own session) — see `docs/phases/PHASE-12.1-README.md`. Revision 20's notes below remain for history.)

**Previous revision:** 15 September 2026 (revision 20 — Phase 11.3 (performance & accessibility) and 11.4 (pre-launch content check) both marked complete, and the **M1 LAUNCH gate approved by Zakir** on the interim Vercel URL. § 11.3: fixed disabled image optimization (`next.config.mjs`), a font preloaded on every locale despite only ever painting on `fa` (`app/[locale]/layout.tsx`), a real WCAG AA contrast failure at 3.04:1 in `identity.tsx` (computed via OKLCH→luminance, not eyeballed), and two hand-rolled overlays with no focus trap (`MobileNav`/`CommandPalette` — new shared `lib/use-focus-trap.ts`); everything else audited (heading hierarchy, other contrast, RTL icon mirroring, reduced-motion, focus-visible, 200%-zoom overflow, form-error announcement) and found already correct. § 11.4: found and fixed a real broken external link (`lib/site.ts`'s Fiverr URL redirected to the generic sign-up page instead of the real profile — verified against Zakir's own GitHub bio, then the corrected URL directly), documented an undocumented env var (`NEXT_PUBLIC_SITE_URL`) tied to D-01, removed five dead delivery-manifest `.txt` files and the superseded `Data/` logo-exploration folder from the repo root; crawled all 47 generated routes' rendered HTML for broken internal links (zero found); re-confirmed the claims ledger, i18n parity, and 404 design were all still correct. Asked Zakir directly, in-conversation, whether to proceed with a purchased domain or launch on the interim Vercel URL, and whether he approved the M1 gate now — he chose the interim URL and approved launch (15 Sep 2026); D-01's row and § 11.4's gate line record this. Branch protection and Vercel preview-deployment settings remain open as dashboard-only follow-up (no code representation to fix from a coding session), not launch blockers. `tsc --noEmit`, content-placeholder check, i18n parity, and `next build` (47 routes) all clean throughout. See `docs/phases/PHASE-11.3-README.md` and `docs/phases/PHASE-11.4-README.md`.

**Previous revision:** 13 September 2026 (revision 19 — D-07 resolved (owner confirmed Afghanistan) and Phase 11.2 marked complete: legal & privacy. Researched Afghanistan's legal landscape before writing anything — no comprehensive data-protection statute exists (confirmed via IAPP and multiple legal trackers), so § 11.2's own "if EU-based, GDPR-grade…" instruction doesn't apply; `/privacy` and `/terms` (`lib/legal-content.ts`, `components/legal/legal-content.tsx`) instead document that honestly and offer GDPR-style rights (access/correction/deletion by e-mail) voluntarily, as good practice, never claiming legal compliance with a regime that doesn't apply. The privacy policy discloses a real gap rather than inventing a policy that doesn't exist yet: there is no automated data-retention/deletion schedule in the current implementation. No imprint page — researched and confirmed Afghanistan has no equivalent to the EU/German "Impressum" statute (TMG §5); real identity/contact info already lives on `/about` and in the footer. No cookie-consent banner — confirmed `@vercel/analytics` is cookieless and the only cookie this site sets (`artaveo-locale`) is strictly functional, so § 11.2's own "if any non-essential cookie is used" condition is never triggered. `lib/site.ts#legalNav` + `components/site/site-footer.tsx` finally close the "locale-aware legal links" gap § 5.2 left open. Both new pages reuse § 11.1's own SEO pattern (canonical/hreflang/OG/`BreadcrumbList`) and are added to `app/sitemap.ts`; `lib/legal-content.ts` is registered in `scripts/check-content-placeholders.mjs`. `tsc --noEmit` and `next build` both clean (47 routes); i18n key parity re-verified after adding `PrivacyPage`/`TermsPage` + `Nav.privacy`/`Nav.terms`/`Footer.legal` to both message files; rendered HTML spot-checked in both locales (canonical, Persian title, footer links, real paragraph content all confirmed present). Flagged explicitly, in the content file's own doc comment and here: this is not legal advice, and the Terms' liability section in particular should be reviewed by an actual lawyer before being relied on as an enforceable contract. See `docs/phases/PHASE-11.2-README.md`. Revision 18's notes below remain for history.)

**Previous revision:** 13 September 2026 (revision 18 — Phase 11.1 marked complete: SEO & analytics events. `lib/seo.ts` (`SITE_URL` resolved against the interim Vercel domain per D-01, `absoluteUrl()`, `buildAlternates()`, `buildPageOpenGraph()`), `lib/analytics.ts` (typed `trackEvent()` over `@vercel/analytics`'s `track()`), `lib/structured-data.ts` (JSON-LD builders for `Person`/`ProfessionalService`/`WebSite`/`BreadcrumbList`/`CreativeWork`/`Service`/`FAQPage`) and `components/site/json-ld.tsx` + `components/site/view-tracker.tsx` from the previous session are now wired into every page. Every route (`/`, `/work`, `/work/[slug]`, `/services`, `/services/[slug]`, `/about`, `/process`, `/contact`, `/start`) has canonical + `en`/`fa`/`x-default` hreflang alternates, a per-page `openGraph`/`twitter` block, and a `BreadcrumbList`; case studies add `CreativeWork`, service pages add `Service` (no `Offer` yet — D-04 still open, every package is `type: 'quote'`) and `FAQPage` where a service has real FAQ content; the root layout mounts one sitewide `WebSite`+`ProfessionalService`+`Person` graph. `app/robots.ts` and `app/sitemap.ts` cover every static and dynamic route across both locales (32 URLs today), excluding the already-`noindex` `/design-system`. Dynamic Open Graph images (`app/api/og/route.tsx`, `next/og`) render for `en` pages only — Persian pages keep the static `/brand/og-image.png` fallback because Satori has no bundled font with Perso-Arabic glyphs and fetching Vazirmatn from Google Fonts at request time isn't verifiable from this sandbox (network egress allow-list has no `fonts.gstatic.com`) — tracked as follow-up debt, not silently faked. Analytics events wired to real triggers: `language_switch` (`language-switcher.tsx`), `brief_start`/`brief_step`/`brief_submit` (`brief-builder.tsx`, `brief_submit` fired only after genuine server-confirmed persistence, same gate `success` itself uses), `package_compare` + `cta_click` (`package-comparison.tsx`), `cta_click` (`identity.tsx`'s `IdentityCta`, `hero.tsx`, the new `components/ui/cta-buttons.tsx` used by `CTASection`, `hire-channel-selector.tsx`), `external_profile_click` (`identity.tsx`'s `ExternalProfileLinks`, the platform link in `hire-channel-selector.tsx`), `project_view`/`service_view` (`ViewTracker` mounted from `work/[slug]` and `services/[slug]`'s own page components, keeping `case-study.tsx`/`service-detail.tsx` as Server Components). `page_view` is deliberately left to `<Analytics />`'s own automatic tracking, not re-emitted by hand. `consultation_request` and `search_used` are typed in `lib/analytics.ts` but intentionally not wired — Phase 20 (Consultation) and Phase 18 (Search) don't exist yet. `identity.tsx`, `hire-channel-selector.tsx` and `hero.tsx` became Client Components to attach these handlers; `components/ui/patterns.tsx` did **not** — its `CTASection` stayed a Server Component by extracting only the two buttons into the new `cta-buttons.tsx` Client Component, after the first build attempt caught a real bug this avoided (a Server Component passing a rendered icon function into what would have been a client `CTASection`, which `next build` correctly rejects with "Functions cannot be passed directly to Client Components"). `tsc --noEmit` and `next build` both clean; spot-checked the rendered HTML output directly (canonical/hreflang/JSON-LD/OG meta tags and the sitemap/robots bodies) rather than only trusting a clean build. See `docs/phases/PHASE-11.1-README.md`. Not verifiable in a code sandbox: real social-platform link-preview rendering of the dynamic OG images, and Search Console/actual crawler behaviour — both need the live deployment. Revision 17's notes below remain for history.)

**Previous revision:** 13 September 2026 (revision 17 — Phase 10.3 marked complete, closing Phase 10 in full: the Brief Builder's offline submission now goes through a real browser-side outbox (`lib/inquiry-offline-queue.ts`, one-slot `localStorage`), with `success` set in exactly one shared function regardless of whether the send was immediate or an automatic retry after reconnecting. Two real gaps found in § 9.1's pre-existing offline handling — no `catch` around a mid-request connectivity drop, and the offline screen silently showing English copy on `fa` — are both fixed. A genuine race condition (`isOnline` defaulting to `true` and being corrected inside an effect that could run after the new retry effect on the same first mount) was found and fixed via a lazy `useState` initializer. `tsc --noEmit` and `next build` both clean; the queue module unit-verified against a mocked `localStorage` (9/9 pass). See `docs/phases/PHASE-10.3-README.md`. All three of §§ 10.1–10.3's own code-level verification is done; what remains for Phase 10 is one live-deployment pass covering all three phase docs' open items together (real install/update cycle, real offline reload, real offline-then-reconnect Brief Builder submission). Revision 16's notes below remain for history.)

**Previous revision:** 13 September 2026 (revision 16 — Phase 10.2 marked complete: `public/sw.js` (generated by § 10.1's `scripts/generate-sw.mjs`) now runs cache-first for static assets and stale-while-revalidate for the six named content-page types, both versioned to the same `BUILD_ID` used for update detection, with old-deploy caches deleted on activate. The network-only guarantee for mutations and future admin/CMS/client-portal routes is a structural `method !== 'GET'` check plus a closed content-page allow-list, not a maintained denylist. Two path-matching predicates unit-tested (31/31 pass); `tsc --noEmit` and `next build` clean. See `docs/phases/PHASE-10.2-README.md` for the one scope nuance (fully-offline client-side link navigation isn't guaranteed, only full loads/reloads are) and the live-deployment checks still needed. Revision 15's notes below remain for history.)

**Project status:** Phase 1 complete (audit pending) · Phase 2 **PARTIAL** · Phase 3 **PARTIAL — Home mounted and pushed (`4ef6f87`), closure checklist 3.5 open** · Phase 4 **COMPLETE** · Phase 5 **COMPLETE** · Phase 6 **COMPLETE (6.1 engine, 6.2 Transportation System, 6.3 Pezhohesh Portal)** · Phase 7 **COMPLETE (7.1 catalogue & blueprint, 7.2 packages/add-ons/pricing signals/engagement models — all prices shown as "Ask for a quote" pending D-04)** · Phase 8 **COMPLETE (8.1 About/Process/Quality, 8.2 Working Agreement, 8.3 Hire Channel Selector at `/contact`)** · Phase 9 **PARTIAL (9.1 Brief Builder ✅ at `/start`; 9.2 server handling & persistence ✅ — live and verified end-to-end; 9.3 notifications ⏳ structure complete, real sending intentionally inactive pending D-01)** · Phase 10 **COMPLETE (10.1 manifest/install/update, 10.2 caching strategy, 10.3 offline Brief Builder behaviour — all shipped; live-deployment exit-criteria pass still open, see the three phase docs' Known Issues)** · **Phase 11 COMPLETE — M1 LAUNCH GATE APPROVED (15 September 2026)** (11.1 SEO & analytics events ✅; 11.2 legal & privacy ✅ — D-07 resolved (Afghanistan); 11.3 performance & accessibility ✅; 11.4 pre-launch content check ✅, and Zakir approved launching on the interim Vercel URL rather than waiting on a purchased domain — see D-01's updated row) · Phase 12 **COMPLETE (12.1 ADR + full core-entities schema ✅ — live on Supabase project `ukzovqnpqjcrwofycalc`, all 24 tables RLS-enabled and advisor-clean; 12.2 import script + data population + selector switch ✅ — every published Project/Service/ServicePackage/ServiceAddon/EngagementModel/Technology read now comes from Supabase, `tsc --noEmit` clean, `next build` compiles — static generation itself unverified from this sandbox, no network route to Supabase; verify on first real deploy)** · Phase 13 **COMPLETE (code) — Admin Authentication & Authorization: Supabase Auth admin sign-in, `owner`/`editor` roles checked server-side on every page and action, MFA optional for both roles (owner's own choice, revision 27 — real protection for anyone who enrolls, not forced on anyone), audit-logged auth events, `/admin` routes protected in both middleware and every page — `tsc --noEmit` clean, `next build` compiles with zero errors across every new route; one open item, by design, not a code gap: no admin account exists yet, see `docs/runbooks/admin-onboarding.md`)** · Phase 14 **COMPLETE (code) — Lead Pipeline: transitions enforced in the database via a real trigger (live-verified), `/admin/leads` list + detail pages, SLA indicator against the published response commitment (honestly scoped to what's actually computable), CSV export, owner-only per § 13's role split — `tsc --noEmit` clean, `next build` compiles every route with zero errors, 461/461 i18n parity** · Phase 15 **COMPLETE (code) — CMS & Media: real admin CRUD for every § 15 entity (services cluster, projects & articles, media library with real uploads, settings/availability, navigation structure) plus Brief Builder attachments, all `editor`-accessible per § 13's role split, `tsc --noEmit` clean and `next build` compiling every new route with zero errors — 686/686 i18n parity; the public site's nav/settings read path is real, disclosed follow-up work, not yet switched over — see `docs/phases/PHASE-15-README.md`) · Phase 16 **COMPLETE (code) — Verified Evidence: single-use request links, moderation queue (approve · request change · reject), public `/recommend/[token]` submission page, Home section 10 (hidden until ≥ 1 published), `editor`-accessible per § 13's role split, `tsc --noEmit` clean and `next build` compiling with zero errors — 782/782 i18n parity; no automated e-mail on link generation yet, disclosed pending Phase 19 — see `docs/phases/PHASE-16-README.md`) · Phase 17 **COMPLETE (code)** (Insights / Engineering Journal — public `/insights`, `/insights/[slug]` and per-locale RSS; scheduled publishing via the daily cron; admin preview, related items and image insertion; 823/823 i18n parity; migrations `0016`/`0016b` applied live — see `docs/phases/PHASE-17-README.md`) — see `docs/phases/PHASE-9.1-README.md`, `docs/phases/PHASE-9.2-README.md`, `docs/phases/PHASE-9.3-README.md`, `docs/phases/PHASE-10.1-README.md`, `docs/phases/PHASE-10.2-README.md`, `docs/phases/PHASE-10.3-README.md`, `docs/phases/PHASE-11.1-README.md`, `docs/phases/PHASE-11.2-README.md`, `docs/phases/PHASE-11.3-README.md`, `docs/phases/PHASE-11.4-README.md`, `docs/phases/PHASE-12.1-README.md`, `docs/phases/PHASE-12.2-README.md`, `docs/phases/PHASE-13-README.md`, `docs/phases/PHASE-14-README.md`, `docs/phases/PHASE-15-README.md`, `docs/phases/PHASE-16-README.md` and `docs/phases/PHASE-17-README.md`.  
**Next step:** Phase 17 is code-complete and its migrations are live, on top of Phase 16 — push the code (see `docs/phases/PHASE-17-README.md`); the next phase in sequence is Phase 18 (Search & Command Palette). One draft article exists (`concurrent-seat-booking`); the journal stays invisible on the public site until it is published — run the verification query in `docs/content/claims-ledger.md` first, review it in `/admin/content/articles`, then publish (other topics: `docs/content/insights-topics.md`). Phase 16 is code-complete, on top of Phase 15. The owner still needs to run `docs/runbooks/admin-onboarding.md` once against the live Supabase project (create the owner's Supabase Auth user, insert their `admin_users` row, sign in; MFA enrollment is optional, revision 27, not a blocking step) before Phase 13/14/15/16's admin UI has anything to authenticate against. Also still open from Phase 12: verify a real production build's static generation (`generateStaticParams`/`generateMetadata` for `/work/[slug]` and `/services/[slug]`) against the live Supabase project on the next real deploy — this sandbox has no network route to `*.supabase.co`, which is also why Phase 16's own request-link page and moderation queue are unverified in a real browser (see `docs/phases/PHASE-16-README.md`'s Known Issues). Other open items remain follow-up, not blockers: Phase 3's closure checklist 3.5; § 9.3 (real e-mail sending, and Phase 10's live-deployment verification pass), both waiting on a real purchased domain (D-01, deliberately deferred post-launch); branch protection + preview-deployment settings in GitHub/Vercel (dashboard-only, Zakir's own action); Phase 13's own known debt (MFA recovery flow, admin password reset, audit-log delivery guarantees, and now the security trade-off of optional MFA itself — see `docs/phases/PHASE-13-README.md`); Phase 14's own known debt (no backward stage transitions yet, SLA's first-reply proxy pending Phase 19/20, no bulk pipeline actions — see `docs/phases/PHASE-14-README.md`); Phase 15's own known debt (no delete/archive for services/projects/articles, no reordering UI for nested collections, no "add new technology" affordance, and — the largest single open item — the public site's navigation/settings/Availability-Card rendering still reads the static `lib/site.ts`/`lib/home-content.ts` values rather than the now-editable database tables, a deliberately separate, larger refactor — see `docs/phases/PHASE-15-README.md`); Phase 16's own known debt (no automated e-mail when a request link is generated or a change is requested — Phase 19's provider abstraction is the right home for that, see `docs/phases/PHASE-16-README.md`).
**Document type:** canonical product + design + engineering roadmap **and** implementation prompt for AI agents (v0, Claude, others).  
**Repository:** `github.com/artaveo/artaveo`  
**Stack already in repo:** Next.js 16 · React 19 · TypeScript 5.7 · Tailwind CSS v4 · Base UI + shadcn primitives · Geist / Geist Mono / Vazirmatn · Vercel Analytics  
**Languages / direction:** English (LTR) + Persian (RTL) — both first-class  
**Themes:** Light + Dark — both intentional  
**Final release decision:** **MANUAL APPROVAL REQUIRED**

This document records the real state of the project, the product direction, the benchmark decisions, known debt, the phased plan and the completion criteria. It is the single source of truth for planning. Detailed implementation history lives in phase documents (section 19), not here.

> **Numbering rule.** Phases that have started (1, 2, 3) keep their numbers forever. No new phase is ever inserted before a phase that has started. Anything discovered later — even if it "should" have been done earlier — is recorded in section 6 (Debt) or added as a later phase with the label **Historical debt / added after audit**. Completed phases are never re-marked as incomplete because a later audit found more work.

> **How an AI agent must use this document.** Before writing code, read sections 1–8, the section of the phase being implemented, section 14 (components), section 16 (content rules), section 17 (Definition of Done) and section 18 (completion protocol). Implement **one phase (or sub-phase) per session**. Never implement a later milestone to make an earlier one look finished. Never replace required backend behaviour with UI simulation.

> **End-of-message status line.** Every message that delivers work on a phase must end with one short status line, so whoever is driving the session always knows exactly where things stand without re-reading the roadmap:
> - which sub-phase(s) that message just completed (e.g. "4.1.2 done"),
> - what the next sub-phase is (e.g. "next: 4.1.3"),
> - and a plain recommendation of **same chat or new chat** for that next sub-phase (long/unrelated sub-phases — e.g. a new phase, or one needing a fresh audit — usually mean a new chat; small continuations of the same file set usually mean the same chat).
> If a phase has no numbered sub-phases, report against the phase itself. This rule applies from this revision forward; it is not retroactive.

> **End-of-phase delivery rule.** Finishing a phase or sub-phase means the changed files actually leave the session, not just that they exist on disk. Order matters — **output first, status line second**, never the reverse:
> 1. **Deliver the changed files.** Per § 6.5, that means pushed to a branch (not `main`) with a pull request opened for review — not a direct push to `main`, even once push access exists. If the session's environment has no write/push credentials configured (check before claiming otherwise — do not assume), the default fallback is a **plain zip of the actual changed/new files, at their real repo-relative paths**, plus a short note listing any files that need deleting (a zip can't represent a deletion) — not a git patch or bundle. The owner works from GitHub Desktop against a local working copy, not the git CLI, so the delivered artifact must be something that drops directly into that working copy and shows up as changes/new files on its own — nothing requiring `git am`, `git clone`, or any other CLI step. Only offer the CLI-oriented formats (patch/bundle) if the owner asks for them specifically.
> 2. **Then** give the end-of-message status line above (what finished, what's next, same/new chat).
> Reporting "phase done" without either a pushed branch/PR or a working-copy-ready zip is incomplete — the roadmap file existing in the repo's history is not itself delivery.

---

# 1. Product goal

Artaveo is **not** a portfolio template and **not** a fake agency site. It is a **Freelance Business Platform for one independent full-stack developer**: a brand, a body of proof, a service catalogue, a qualified-lead engine and — over time — a small operating system for the business.

It has three layers:

### 1.1 Public Brand & Proof — the front door

- identity, positioning and a truthful availability signal
- real projects presented as engineering case studies
- decision records, architecture diagrams and engineering highlights
- proof-linked expertise (every skill points to evidence)
- verified recommendations (hidden until they exist)
- insights / engineering journal
- external profiles (GitHub, Fiverr, LinkedIn, Contra) that tell the same story

### 1.2 Service Commerce — the conversion layer

- a curated service catalogue (few, clear services — not a keyword list)
- productized packages with explicit **included / not included**
- transparent pricing signals (starting-from and what drives cost)
- engagement models, including a low-risk **Discovery Sprint**
- hire channels: direct, or via a platform with buyer protection
- a structured **Brief Builder** instead of a bare contact form
- consultation requests

### 1.3 Business Operations — the operating layer

- lead pipeline with an auditable state machine
- CMS for projects, services, packages, articles, media, settings
- evidence moderation (recommendations / testimonials)
- notifications with an outbox and delivery log
- analytics, audit log, backup and recovery
- later: proposals, invoices, client portal

### 1.4 The ten-second test

A stranger landing on any page must understand within ten seconds:

```text
WHO is this?          → one named developer behind the Artaveo brand
WHAT is built?        → web applications, business systems, full-stack products
WHAT is the proof?    → real projects with real technical depth
HOW do I start?       → one obvious action: Start a Project
```

### 1.5 Artaveo must never feel like

a student CV · a generic template · a fake agency with a "team" · a startup landing page without a service model · a marketplace clone · a Dribbble concept · an over-animated developer portfolio · a logo wall of 60 technologies.

---

# 2. Product & architecture principles

1. **Truth is a hard constraint.** No invented clients, metrics, ratings, years, awards, team members, logos or outcomes — ever.
2. **Every public claim is traceable** to a record: a repository, a live URL, a document, a verified recommendation, or a line in the claims ledger (section 16.4).
3. **Empty means hidden.** A section with no real content is not rendered publicly. Empty states exist for admin and pre-production only.
4. **Proof beats decoration.** Case studies demonstrate thinking, not screenshots alone.
5. **Few clear services beat many vague ones.** Every service answers: for whom, what problem, what is included, what is not, how long, from how much.
6. **Reduce client uncertainty** before the first conversation: scope, process, payment, ownership and handover are published.
7. **One primary action everywhere:** *Start a Project*. Secondary: *View Work*, *Book a Consultation*.
8. **Direct communication** with the developer is a product feature, not a hidden detail.
9. **Typed content mirrors the future database.** Content that lives in files today must have the same shape as the tables it will move into (no rewrites at Phase 12).
10. **i18n before pages.** Locale routing and dictionaries exist before new pages are built; nothing is retrofitted.
11. **RTL is first-class,** not a mirrored afterthought. Latin technical terms inside Persian text are bidi-isolated; code is always LTR.
12. **Server boundary for every mutation.** Validation, authorization, rate limiting and persistence happen server-side. The browser is never the source of truth.
13. **Sensitive state changes are state machines** with history (inquiries, publishing, evidence moderation).
14. **Provider abstraction** for email, calendar, payments, storage and analytics. No business logic coupled to one vendor.
15. **Never fake success.** A form shows success only after the record is persisted.
16. **Accessibility is a release requirement** (WCAG 2.2 AA), not polish.
17. **Performance shapes design.** Server-first rendering, minimal client JS, optimized media, font subsetting.
18. **The design must be premium with motion disabled.** Motion is optional enhancement.
19. **Reusable components, no giant files,** clear separation of presentation, domain logic, data access, validation and configuration.
20. **Every phase is verified** before it is marked complete (section 17).

When requirements conflict, prioritize in this order:

```text
1. Truthfulness of content
2. Data integrity
3. Security & privacy
4. Accessibility
5. Maintainability
6. Performance
7. Visual polish
```

---

# 3. Target standards

| Area | Standard |
|---|---|
| Security | OWASP ASVS principles, OWASP Top 10 |
| Accessibility | WCAG 2.2 AA |
| Semantics | HTML5 landmarks, correct heading hierarchy |
| Validation | One schema per payload, shared by client and server |
| Data | PostgreSQL (Supabase), RLS + server-side authorization |
| Privacy | Data minimization, documented retention, GDPR-grade handling if operating from the EU (see D-07) |
| Localization | `en` + `fa`, locale routes, `Intl` formatting, bidi isolation |
| Performance | Core Web Vitals on mobile: LCP < 2.5 s, CLS < 0.1, INP < 200 ms |
| SEO | Unique metadata per page and locale, hreflang, structured data |
| Observability | Structured logs, error tracking, correlation IDs, business events |
| Testing | Unit + integration + E2E for critical flows |
| Delivery | CI quality gates, preview deployments, protected `main` |
| Documentation | Roadmap + phase documents + ADRs + runbooks |

---

# 4. Benchmark

## 4.1 Why these three

| Platform | What it represents | Why it matters for Artaveo |
|---|---|---|
| **Contra** | Portfolio-as-a-business | Closest model to what Artaveo is: a profile that looks like a personal site, with work, services, recommendations and a direct hire action |
| **Toptal** | Vetted, premium developer credibility | How serious engineering talent is presented to companies: title, expertise, engagement types, low-risk trial |
| **Fiverr** | Productized services | The most mature package mechanics (tiers, delivery time, revisions, extras, requirements, FAQ) — and a real sales channel the owner already uses |

Upwork Project Catalog is a secondary reference only; its mechanics overlap with Fiverr's.

Every borrowed pattern ends as exactly one of:

```text
ADOPT               → use as-is (in Artaveo's own visual identity)
ADAPT               → use a modified version, reason recorded
REJECT WITH REASON  → do not use, reason recorded
```

Never copy another company's visual identity, copy, illustrations or layouts pixel-for-pixel. Borrow information and interaction patterns only.

## 4.2 Contra — observed

**Structure.** A profile that reads like a personal website: project work first, then toggles for services for sale, recommendations and About. Tools/skills are connected to projects. Built-in proposals, contracts, milestone payments and invoices; clients can pay without creating an account. Expert/partner badges for specific tools.

**Strengths to learn from**

- work-first credibility; services sit next to the proof
- recommendations as a first-class section, separate from reviews
- skills connected to projects instead of floating tags
- milestone-based engagements with defined deliverables
- one direct hire/contact action, always visible

**Weaknesses Artaveo must fix**

- identity lives on a platform URL, inside a shared template — every profile looks alike and the freelancer does not own SEO or design
- little organic discovery: the platform itself advises freelancers to bring their own clients
- opaque gatekeeping around opportunities and approvals
- payouts depend on Stripe availability by country
- small client pool; unsuitable as the only channel for a new freelancer

## 4.3 Toptal — observed

**Structure.** Public developer profiles show a verification line ("Verified Expert in Engineering"), location, member-since date, a written bio with "Show more", a long skills list, employment/project history where each item ends with a "Technologies:" line, a "most amazing thing I've built" answer, and hire CTAs. Engagements are hourly, part-time or full-time, starting with a trial period of up to two weeks.

**Strengths to learn from**

- professional title + concise, outcome-led bio
- every experience item states the technologies actually used
- the "most amazing thing I've built" prompt surfaces real engineering depth
- explicit engagement types (hourly / part-time / full-time / managed project)
- a low-risk start (trial) reduces hiring anxiety

**Weaknesses Artaveo must fix**

- pricing is opaque: no public rate card, an undisclosed markup on the freelancer's rate, deposit + subscription before hiring
- skills lists balloon into 40+ unordered tags mixing core stack with trivia — the "logo wall" problem in text form
- identity is partially hidden (last initial only) and there is no direct contact; everything funnels through the platform
- CV-centric: years of experience lead, proof follows
- every profile repeats the same platform marketing boilerplate

## 4.4 Fiverr — observed

**Structure.** A gig page with up to three packages (Basic / Standard / Premium), each with price, delivery time, revisions and included items; gig extras (faster delivery, extra revisions, source files); description with what is and is not offered; FAQ; buyer requirements collected at order time; gallery with images, PDFs and video; seller card with member-since, average response time, last delivery and languages; "offers video consultations".

**Strengths to learn from**

- side-by-side tier comparison that makes scope obvious in one glance
- delivery time and revision count as explicit, comparable fields
- add-ons that raise order value without forcing the top tier
- requirements collected up front → fewer bad starts
- trust signals that are *measurable and true*: response time, languages, last delivery

**Weaknesses Artaveo must fix**

- race to the bottom: the same "full-stack Next.js" service is listed from a few dollars to several hundred, so price signals mean nothing
- review manipulation is documented across the marketplace, so star ratings carry less trust
- rigid tiers are a poor fit for custom software; real projects need a scoping step
- high platform fees and restrictions on off-platform communication make long-term relationships awkward
- template sameness ("I will …" titles, identical package copy)

## 4.5 Decision matrix

| # | Pattern | Source | Decision | Artaveo implementation |
|---|---|---|---|---|
| B-01 | Profile that feels like a personal site | Contra | **ADAPT** | Own domain, own design system, own SEO — the site is canonical; platform profiles link back to it |
| B-02 | Work first, services next to proof | Contra | **ADOPT** | Home and About lead with case studies; every service lists related projects |
| B-03 | Skills connected to projects | Contra | **ADAPT** | **Proof-Linked Expertise Matrix**: a skill is shown only if linked to ≥ 1 project, service or article (or explicitly labelled *Learning*) |
| B-04 | Recommendations section | Contra | **ADAPT** | **Verified Recommendations** with relationship, date, source link and verification label; hidden until real |
| B-05 | Milestone engagements | Contra | **ADOPT** | Working Agreement publishes milestone-based payment and deliverables per milestone |
| B-06 | Platform-owned identity & template | Contra | **REJECT** | Loses SEO, brand and control |
| B-07 | Professional title + outcome-led bio | Toptal | **ADOPT** | Identity Header: name, title, one-line value, availability |
| B-08 | "Technologies:" line per experience item | Toptal | **ADOPT** | Every project card and case study shows its actual stack |
| B-09 | "Most amazing thing I've built" | Toptal | **ADAPT** | **Engineering Highlight** block in every case study: the hardest problem and how it was solved |
| B-10 | Trial period | Toptal | **ADAPT** | **Discovery Sprint**: a small, fixed-price first engagement with a concrete deliverable (scope, architecture, estimate) |
| B-11 | Engagement types | Toptal | **ADAPT** | Engagement Model Selector (Discovery, Fixed-scope, Productized, Care plan, Long-term part-time) |
| B-12 | Opaque pricing & markup | Toptal | **REJECT** | Transparent pricing signals (D-04) |
| B-13 | Exhaustive skill tag lists | Toptal | **REJECT** | Curated categories with evidence counts |
| B-14 | Hidden identity / no direct contact | Toptal | **REJECT** | Named developer, direct contact, direct Start-a-Project |
| B-15 | Three-tier package comparison | Fiverr | **ADAPT** | Starter / Standard / **Custom** — the third tier is always "scoped after discovery", fixing rigidity for software |
| B-16 | Delivery time + revisions per tier | Fiverr | **ADOPT** | Explicit fields in the package model; shown as ranges when honest |
| B-17 | Gig extras | Fiverr | **ADOPT** | Configurable add-ons, never hard-coded prices in UI |
| B-18 | Buyer requirements before start | Fiverr | **ADAPT** | Each package lists what the client must provide; Brief Builder collects it |
| B-19 | FAQ per service | Fiverr | **ADOPT** | Per-service FAQ + global FAQ, FAQPage structured data |
| B-20 | Seller card: response time, languages, last delivery | Fiverr | **ADAPT** | **Availability Card**: availability state, response commitment, timezone overlap, languages — only values the owner actually keeps |
| B-21 | Star ratings / review counts | Fiverr | **REJECT** | Manipulation-prone and unavailable for a new brand; use verified statements instead |
| B-22 | Price-led competition | Fiverr | **REJECT** | Value-led services with "what drives cost", no bottom-tier bait |
| B-23 | Platform buyer protection (escrow) | Fiverr / Contra | **ADAPT** | **Hire Channel Selector**: clients who need protection can hire through a platform profile (D-05); trade-offs shown honestly |

## 4.6 Failure modes Artaveo must design against

| Failure mode | Seen in | Artaveo countermeasure |
|---|---|---|
| Client cannot estimate cost before talking | Toptal | Starting-from per package, typical ranges, "what drives cost" block |
| Price means nothing (bait tiers) | Fiverr | Fewer, honest tiers; Custom tier instead of a fake cheap one |
| Social proof cannot be trusted | Fiverr | Verification labels, source links, relationship + date, no ratings |
| New freelancer has no reviews yet | All | Proof-first case studies, public code, engineering journal, Discovery Sprint as low-risk start |
| Scope creep and disputes | Fiverr / custom work | Included / not included, change-request rule, milestones in Working Agreement |
| Freelancer disappears / slow replies | All | Published response commitment + SLA indicator in lead pipeline |
| Client loses access to their own product | Freelance industry | Handover package: code ownership, accounts in client's name, documentation |
| Identity and SEO owned by a platform | Contra / Toptal | Own domain, structured data, hreflang, content engine |
| Skill lists that prove nothing | Toptal | Proof-linked expertise |
| Payment rails unavailable in some countries | Contra | Payment methods listed per D-07; platform channel as alternative |

---

# 5. Completed history

This history reflects the real state of `main` (commit `5bc6a61`, 10 September 2026). It must be preserved; later audits may add debt but may not erase it.

```text
Phase 1   Design System Foundation              ✅ COMPLETE  (built with v0 — audit pending, see 6.4)
Phase 2   Global Shell                          ⚠️ PARTIAL   (components exist, not mounted; i18n simulated)
Phase 3   Home Page                             ⏳ PARTIAL   (Home mounted in SiteShell with 10 sections; closure 3.5 open)
Phase 4   Brand Identity & Design System        ⬜ NEXT      (added after audit — see 6.6)
```

**Phase 1 — delivered:** OKLCH colour tokens for light/dark (`app/globals.css`), brand colour, typography with Geist / Geist Mono / Vazirmatn, spacing, radius, Button / Badge / Card / Input primitives, and a showcase page for colours, typography, spacing, layout, buttons, cards and forms (`/design-system`).

**Phase 2 — delivered:** `site-header`, `mobile-nav`, `site-footer`, `theme-toggle`, `language-switcher`, `command-palette`, `breadcrumb`, `page-transition`, `site-shell`, `lib/site.ts`, `components/icon.tsx`.  
**Phase 2 — missing:** `SiteShell` is not used by any route; the language switcher only flips `dir` (no locale routes, no dictionaries); "Home" is missing from navigation; the command palette uses a hard-coded list.

**Phase 3 — delivered in `main` (`4ef6f87`):** `app/page.tsx` renders the Home inside `SiteShell` with Hero, Capability Strip, Featured Work, Services, Why Artaveo, Tech Stack, Process, About Preview, Insights Preview and Final CTA; `types/content.ts` defines content shapes; `lib/home-content.ts` now contains only the two real projects (Transportation System, Pezhohesh Portal) with facts taken from their repositories; fictional projects and metrics removed.  
**Phase 3 — still open:** closure checklist 3.5 (site-config placeholders, voice, unused fake images, `noindex`, empty-means-hidden for Insights, bilingual content shape, phase document).

---

# 6. Debt found in audit (added 10 September 2026)

These findings do not change the historical status of phases 1–3. They are resolved inside Phase 3 (closure), Phase 4 (design) and Phase 5 (i18n) unless stated otherwise.

## 6.1 Content debt — P0 (blocks any public deployment)

- ~~`lib/home-content.ts` contains fictional projects (*Atlas Analytics*, *Meridian Pay*, *Northline Commerce*) with invented metrics~~ — **resolved in Phase 3 (`4ef6f87`)**.
- `public/images/work-*.png` (AI-generated screenshots of those fictional products) are no longer referenced but are still in the repository — delete (3.5).
- `lib/site.ts`: the e-mail `hello@artaveo.studio` is unverified (domain ownership not confirmed — D-01); `socialLinks` point to the root of github.com / x.com / linkedin.com; an X profile is not part of the strategy.
- Copy uses "we / our / the studio" and implies a team (nav descriptions, site description, Home metadata, Hero "View our work"). The voice rule is in section 16.1.

## 6.2 UX / architecture debt

- `/` renders the design-system showcase, duplicating `/design-system`.
- No locale routing (`/en`, `/fa`), no dictionaries, no translated metadata.
- Mobile navigation is a sheet; decide in Phase 5.2 whether to keep it (acceptable if accessible) or switch to a full overlay.
- Command palette is not fed by content.
- No `loading`, `error` or `not-found` boundaries per locale.
- `README.md` is v0 boilerplate.

## 6.3 Documentation debt

- The previous revision referenced `ROAD-MAP_ARTAVEO.md`; the canonical file name is **`ROAD-MAP-ARTAVEO.md`**.
- The previous revision had two sections numbered 62 and a dependency rule that contradicted its release levels (database before design system vs. home page before database). Resolved by section 8 of this revision.
- No `docs/` folder yet.

## 6.4 Audit items for completed work

- **P1-A (Design System audit):** verify contrast of all token pairs in both themes (AA), focus-visible styles on every primitive, RTL behaviour of every primitive, and that Vazirmatn is actually applied for `lang="fa"`. Scheduled in Phase 4.2; results recorded in `docs/phases/PHASE-4-README.md` with a back-reference in `PHASE-1-README.md`.

## 6.5 Delivery-process debt

- v0 pushes directly to `main`, and every merge to `main` auto-deploys. Until Phase 22, rule: v0 and other agents work on a branch; `main` changes only through a reviewed pull request.

## 6.6 Roadmap gap — design system & brand identity (added 10 September 2026, after audit)

- Phase 1 delivered exactly the foundation v0 was asked for (tokens, typography, spacing, Button / Badge / Card / Input, breakpoints, container). The **full design system** specified in the previous roadmap revision — links, icon buttons, all form controls, tables, dialogs, tooltips, tabs, accordions, pagination, surfaces/shadows/borders, loading/empty/error states — the **Professional Identity System** (identity header, availability, external profiles, hire CTAs) and the **responsive system** (explicit breakpoint matrix) were compressed into section 14 of revision 1 without a phase that builds them.
- There is **no brand identity yet**: `public/icon.svg` and the favicons are v0 defaults, `placeholder-logo.*` files are unused templates, and no art direction has been chosen — the current UI is the default shadcn/v0 look.
- Resolution: new **Phase 4 — Brand Identity & Design System Completion**, placed before i18n and before any new page, because every later page (package table, FAQ accordion, Brief Builder stepper, dialogs, admin tables) is assembled from these parts. Phase 1 keeps its status (numbering rule).

---

# 7. Decision Register (owner decisions)

Some phases cannot be completed honestly without a decision from the owner. Agents must not invent these answers; they mark the dependent phase **BLOCKED** (section 18.6) and continue with work that is safe to do.

| ID | Decision | Recommended default | Blocks (phase) |
|---|---|---|---|
| **D-01** | Brand spelling, production domain, sending e-mail domain | **Spelling resolved: "Artaveo"** (confirmed by the approved logo, 10 Sep 2026). Domain and e-mail still open — register the domain, use it for e-mail with SPF, DKIM and DMARC configured. **13 Sep 2026:** owner confirmed the interim domain is the Vercel URL (`https://artaveo-seven.vercel.app`) and explicitly chose to build § 9.3's notification structure now against a console/no-op provider rather than wait — see `docs/phases/PHASE-9.3-README.md`. **15 Sep 2026:** owner explicitly approved launching M1 on the interim Vercel URL rather than waiting for a purchased domain — see § 11.4's M1 LAUNCH gate below. A real domain purchase + DNS authentication + activating real e-mail sending (§ 9.3) remain open as post-launch follow-up, not pre-launch blockers. | 4.1 · 9.3 · 11.4 |
| **D-02** | Public identity: real name, portrait, published location / timezone | **Resolved (11 Sep 2026):** name **Zakir Naseri**; portrait `public/Profile-pic.jpg` (referenced as `/Profile-pic.jpg`); timezone **UTC**, no city published | 3.3 (Hero) · 4.5 · 8.1 |
| **D-03** | Persian variant for `fa`: Dari-leaning (fa-AF), Iranian (fa-IR) or neutral; calendar and digits | Neutral vocabulary; Gregorian dates with Persian month names; Persian digits in prose, Latin digits in code, IDs and technical values. If Solar Hijri is added later, note that Afghan and Iranian month names differ (e.g. *Hamal* vs *Farvardin*) | 4.1 (Persian type) · 5.1 |
| **D-04** | Pricing transparency | Publish **starting-from** prices for productized packages and **typical ranges** for custom work; Discovery Sprint at a fixed price | 7.2 — still open; § 7.2's mechanics are built and live with every price as `'quote'` ("Ask for a quote") so nothing invented ships in the meantime. (§ 9.1's Brief Builder budget-range step turned out not to depend on this after all — it's a generic, self-reported client budget bucket, not a published price; see `docs/phases/PHASE-9.1-README.md`.) |
| **D-05** | Hire channels and which external profiles are real | Direct + one platform profile (Fiverr) for clients who want buyer protection; list only profiles that exist | 8.3 · 5.2 (footer) — **default applied 12 Sep 2026** in § 8.3's Hire Channel Selector and (since § 5.2) the footer; not yet marked formally "Resolved" pending owner sign-off in `docs/decisions.md` |
| **D-06** | Publication rights for case studies (Transportation System, Pezhohesh Portal): client/employer consent, what may be shown | Transportation System: resolved 12 Sep 2026 — Zakir's own project, no external client. Pezhohesh Portal: resolved 12 Sep 2026 — Zakir owns the Pezhohesh Complex institute itself and built the site for it; no separate client relationship. Both approved for publication. Screenshots with **demo data only**; no customer/student PII; confidential details generalised | 6.2 · 6.3 |
| **D-07** | Jurisdiction of operation (privacy law, invoicing, business registration, payment rails) | **Resolved (13 Sep 2026):** owner confirmed Artaveo is operated from **Afghanistan**. Afghanistan has no comprehensive data-protection statute (verified by research before writing § 11.2's privacy policy — only narrow sectoral clauses exist in telecom/banking law, no dedicated data-protection authority). The roadmap's own "if EU-based, GDPR-grade…" instruction doesn't apply; § 11.2 instead documents this honestly and offers GDPR-style rights (access/correction/deletion on request) voluntarily, as good practice, not as a claim of legal compliance with a specific regime. No imprint page: Germany/EU's "Impressum" requirement (TMG §5) has no Afghan equivalent found in the same research pass. | 11.2 · 29 |
| **D-08** | Availability state and response commitment | **Resolved (11 Sep 2026):** response commitment published as **"replies within a few hours, same day"** | 4.5 (Availability) · 14 (SLA) |
| **D-09** | Consultation format: free intro call length, paid consultation, tool | Free 20–30 min intro call, request-based in v1 | 20 |
| **D-10** | Supabase plan and region | Start on the plan that includes backups before real leads are stored, or implement Phase 25's external dump first | **Resolved (13 Sep 2026):** owner created a new, dedicated Supabase account and project (`Artaveo`, project ref `ukzovqnpqjcrwofycalc`, region `ap-southeast-1`) on the **free plan** — explicitly not the recommended paid-with-backups default, to avoid cost while the site is pre-launch. `db/migrations/0001_inquiries.sql` applied 13 Sep 2026 (`inquiries`/`inquiry_events` live, RLS enabled, zero policies, confirmed via `get_advisors`), env vars configured in Vercel, and a real end-to-end submission verified by direct query the same day. **Follow-up (not a fresh decision, just this default's other half):** the free plan has no platform backups — Phase 25's external dump (or a plan upgrade) is needed before real leads accumulate, tracked there. See `docs/phases/PHASE-9.2-README.md`. |
| **D-11** | Optional early-client offer | None unless the owner explicitly wants one; if used, it is labelled clearly and time-boxed | 7.2 |
| **D-12** | Visual direction and light-theme / small-size logo variants | **Resolved (12 Sep 2026):** owner approved the primary mark (`Artaveo_-_Logo.png`, received 10 Sep 2026) and the derived tokens/variants delivered in § 4.1 (colour tokens, all logo variants, light-theme + small-size rules per `docs/design/art-direction.md`). § 4.6 unblocked. | 4.1 · 4.6 |
| **D-13** | Sitewide deposit percentage / warranty window length for the Working Agreement | **No single sitewide figure invented.** § 8.2 states the mechanism instead: deposit split and warranty length are agreed per engagement during Define (§ 8.1 Process, phase 02) and written into that project's own agreement — a $500 fix and a $50,000 build don't carry the same risk profile, so one blanket number would either overstate small work or understate large work. Same reasoning § 7.2 already used for D-04 (ship the honest mechanism, not an invented figure) | 8.2 |

Decisions and their dates are recorded in `docs/decisions.md`.

---

# 8. Release milestones & dependency rule

```text
M1  CREDIBLE LAUNCH       Phases 3–11   Brand identity, complete design system, real content, real services, working inquiry, SEO, legal, live on own domain
M2  OPERATING LAYER       Phases 12–20  Full schema, admin, lead pipeline, CMS, evidence, journal, search, notifications, consultation
M3  PRODUCTION ASSURANCE  Phases 21–26  Tests, CI/CD gates, security, observability, backup/restore, performance & a11y certification
M4  GROWTH & BUSINESS     Phases 27–31  Proposals, client portal, invoicing, content growth, conversion analytics
M5  FINAL AUDIT           Phase 32      International-grade audit → manual release decision
```

## 8.1 Why content-first (and why this does not bypass architecture)

A new freelance brand needs a live, credible site **early**; a CMS with no content earns nothing. So M1 ships with **typed file-based content** whose shapes are identical to the future tables (principle 9), plus **one real backend slice** — the inquiry — because a contact flow that fakes success is not acceptable. The full database, admin and CMS follow in M2 by migrating the same shapes, not by rewriting pages.

## 8.2 Dependency direction

```text
Decisions (D-xx)
→ Content truth + typed content model        (3)
→ Brand identity + design system completion  (4)
→ i18n routing + shell                       (5)
→ Work / case studies                        (6)
→ Services / packages / pricing              (7)
→ About / process / working agreement        (8)
→ Inquiry backend slice                      (9)
→ Installable PWA & offline-safe shell       (10)
→ Launch readiness                           (11)  ── M1 gate
→ Full schema → Auth → Pipeline → CMS → Evidence → Journal → Search → Notifications → Consultation   ── M2
→ Tests → CI/CD → Security → Observability → Recovery → Certification                                ── M3
→ Growth tools                                                                                        ── M4
→ Final audit                                                                                         ── M5
```

Later phases may inform earlier design decisions, but they are never used as an excuse to skip an earlier phase's Definition of Done.

---

## 8.3 Phase index — one line per phase

**Read this table first.** Everything below it (sections 9–13) is the detailed version of the same 30 phases, for when a phase actually starts. If a phase feels confusing in the detailed section, come back here first to see where it sits and what it depends on.

```text
M1 — CREDIBLE LAUNCH (own domain, real content, no fake backend)
  Phase 3   Content Truth Pass & Home Page   Remove fake content, publish the real Home page                    ⏳ PARTIAL
  Phase 4   Brand Identity & Design System   Turn the approved logo into full tokens + missing UI components    ✅ COMPLETE (4.1 debt tracked separately, non-blocking)
  Phase 5   Internationalization & Shell     Real en/fa routing + translated header, footer, nav                    ✅ COMPLETE
  Phase 6   Work & Case Study Engine         /work page + full case studies for the two real projects            ✅ COMPLETE (6.1 engine ✅; 6.2 Transportation System ✅; 6.3 Pezhohesh Portal ✅ — see docs/phases/PHASE-6.2-README.md, PHASE-6.3-README.md)
  Phase 7   Services, Packages & Pricing     Service catalogue, package tiers (Starter/Standard/Custom), pricing signals    ✅ COMPLETE (7.1 catalogue & blueprint, 7.2 packages/add-ons/engagement models — all prices "Ask for a quote" pending D-04; see docs/phases/PHASE-7.1-README.md, PHASE-7.2-README.md)
  Phase 8   About, Process & Agreement       About page, process page, payment/ownership/handover terms    ⏳ PARTIAL (8.1 ✅ + 8.2 ✅ complete — see docs/phases/PHASE-8.1-README.md, PHASE-8.2-README.md; 8.3 Hire channels blocked on D-05)
  Phase 9   Start a Project (Inquiry v1)     Multi-step brief form + first real backend (saves leads, sends e-mail)    ⏳ PARTIAL (9.1 Brief Builder ✅ at /start; 9.2 persistence ✅ live & verified; 9.3 notifications ⏳ structure complete, sending inactive pending D-01 — see docs/phases/PHASE-9.1-README.md, docs/phases/PHASE-9.2-README.md, docs/phases/PHASE-9.3-README.md)
  Phase 10  Installable PWA & Offline Shell  Site installs like an app, browsable offline; Brief Builder never fakes success offline    ✅ COMPLETE (10.1/10.2/10.3 all shipped — see docs/phases/PHASE-10.1-README.md, PHASE-10.2-README.md, PHASE-10.3-README.md; live-deployment exit-criteria check still open)
  Phase 11  Launch Readiness (M1 gate)       SEO, legal pages, analytics, performance/a11y check, deploy    ✅ COMPLETE — M1 LAUNCH GATE APPROVED 15 Sep 2026 (11.1–11.4 all shipped — see docs/phases/PHASE-11.1-README.md through PHASE-11.4-README.md; launched on the interim Vercel URL, real domain deferred post-launch per D-01)

M2 — OPERATING LAYER (database + admin panel)
  Phase 12  Data Model & Migrations          Move file-based content into a real Postgres database          ✅ COMPLETE (12.1 ADR + schema, 12.2 import + selector switch)
  Phase 13  Admin Auth & Authorization       Login system for the admin panel                                  ✅ COMPLETE (code) — see docs/phases/PHASE-13-README.md; owner onboarding step still open, see docs/runbooks/admin-onboarding.md
  Phase 14  Lead Pipeline                    Track inquiries through stages (New → Won/Lost) in the admin       ✅ COMPLETE (code) — see docs/phases/PHASE-14-README.md; owner onboarding step still open, see docs/runbooks/admin-onboarding.md
  Phase 15  CMS & Media                      Admin screens to edit projects/services/articles + image uploads    ✅ COMPLETE (code) — see docs/phases/PHASE-15-README.md
  Phase 16  Verified Evidence                Collect and publish real client recommendations    ✅ COMPLETE (code) — see docs/phases/PHASE-16-README.md
  Phase 17  Insights / Engineering Journal   Blog/article system                                   COMPLETE (code) — migrations 0016/0016b applied live — see docs/phases/PHASE-17-README.md
  Phase 18  Search & Command Palette         Site search wired to real content
  Phase 19  Notifications & Outbox           Reliable e-mail sending — an outage never loses a lead
  Phase 20  Consultation                     Let clients request/book a call

M3 — PRODUCTION ASSURANCE (make it safe to trust)
  Phase 21  Testing                          Automated tests for the critical flows
  Phase 22  CI/CD & Release Gates            Automatic checks before every deploy
  Phase 23  Security Hardening               Headers, rate limits, upload safety, dependency checks
  Phase 24  Observability                    Logging, error tracking, alerts
  Phase 25  Backup & Recovery                Real, restore-tested database backups
  Phase 26  Performance & a11y Certification Final speed and accessibility sign-off

M4 — GROWTH & BUSINESS (only once M1–M3 are live)
  Phase 27  Proposal & Estimate Builder      Turn a qualified lead into a formal proposal
  Phase 28  Client Portal (minimal)          Simple client-facing project page
  Phase 29  Invoicing & Payments             Send invoices, accept payment
  Phase 30  Content Growth                   Newsletter, /now, /uses, public changelog
  Phase 31  Conversion Analytics             Funnels, drop-off tracking, channel attribution

M5 — FINAL AUDIT
  Phase 32  International-Grade Audit        Full audit of everything above → manual release decision
```

**How to read the numbers inside a phase (e.g. "4.1", "4.2"…):** these are just sub-steps of that one phase, in build order — they are not separate phases and not related to any other number in this document. "4.1" only ever means "the first sub-step of Phase 4"; it has nothing to do with a section called "4" elsewhere. If a sub-step number ever looks like it's colliding with something else in the document, that's a documentation bug — flag it, don't try to make sense of it.

---

# 9. Milestone M1 — Credible Launch  ✅ LAUNCHED (M1 LAUNCH gate approved by Zakir, 15 September 2026 — see § 11.4)

Each phase below lists its goal, sub-phases and **exit criteria**. Exit criteria are in addition to the general Definition of Done (section 17).

## Phase 3 — Content Truth Pass & Home Page  ⏳ PARTIAL

**Goal:** a truthful, finished home page mounted inside the site shell, fed by a typed content layer.

> Phase 3 comes before i18n routing (Phase 5) only because it had already started. To respect principle 10, all Phase 3 content is bilingual-shaped from day one (`{ en, fa }`), and Phase 5 moves the page under `app/[locale]/` without rewriting it.

### 3.1 Content truth pass
- delete the fictional projects, their metrics and the AI-generated product images (6.1)
- replace placeholder e-mail and social links with real values from D-01 / D-05, or remove them until they exist
- rewrite the voice to section 16.1 (one developer, "I"; brand name "Artaveo")
- add a build-time guard that fails if a published content item contains an unresolved placeholder pattern such as `[CLIENT_NAME]`

### 3.2 Typed content layer
- `content/` holds data; `types/content.ts` holds shapes that match the Phase 12 tables: `Project`, `Service`, `ServicePackage`, `ServiceAddon`, `EngagementModel`, `Recommendation`, `Article`, `Technology`, `SiteSettings` (incl. availability)
- every translatable field is `{ en: string; fa: string }`; every item has `published` and `sortOrder`
- selectors (`getPublishedProjects()`, `getFeaturedServices()`…) are the only way pages read content, so the source can later switch to the database without touching components
- selectors return empty arrays for missing content; sections check emptiness and do not render

### 3.3 Home sections (in order)

```text
01 Hero                 Identity Header + value statement + Availability chip + Start a Project / View Work
02 Proof Strip          Only computed, true facts (published case studies, public repos, languages, stack focus)
03 Selected Work        The real projects as large cards with honest status badges
04 Services             4–6 curated services, each with a starting-from signal when D-04 allows
05 Why Artaveo          One developer · direct communication · end-to-end ownership · documented handover
06 How to Work Together Engagement models incl. Discovery Sprint + hire channels teaser
07 Process              Condensed 5-step view linking to /process
08 Expertise            Proof-Linked Expertise Matrix (replaces the old "Tech Stack" logo list)
09 About Preview        The person: portrait (D-02), short story, languages, timezone
10 Recommendations      Rendered only when ≥ 1 verified recommendation is published
11 Insights             Rendered only when ≥ 1 article is published
12 Final CTA            Availability + response commitment + Start a Project
```

Compatibility note: this keeps every section of the original v0 plan; "Capability Strip" becomes the Proof Strip, "Tech Stack" becomes the Expertise matrix, and "How to Work Together" is new.

### 3.4 Wiring
- `/` renders the Home page inside `SiteShell` ✅ (`4ef6f87`)
- `/design-system` stays, marked `noindex`, excluded from sitemap and main navigation

### 3.5 Closure checklist (open items after the 10 September push)
- `lib/site.ts`: remove `hello@artaveo.studio` until D-01 is decided; replace root `github.com` / `linkedin.com` links with real profile URLs or remove them; drop X
- voice (16.1): nav descriptions ("How we can help you ship", "The studio and how it operates"), `siteConfig.tagline/description`, Home metadata ("development studio") and Hero "View our work" → first person / brand wording
- delete unused `public/images/work-*.png` and unused v0 placeholder assets
- `/design-system`: `robots: { index: false, follow: false }`
- Insights Preview: render nothing while no article is published (principle 3) — "In writing" cards are allowed only in the admin/preview view
- placeholder guard from 3.1
- bilingual shape (3.2): content fields become `{ en, fa }` and pages read through selectors; Persian copy itself is authored in Phase 5
- phase document `docs/phases/PHASE-3-README.md` with screenshots (Light/Dark × LTR/RTL × mobile/tablet/desktop)

**Scope moved out of Phase 3 (recorded, not dropped):** the Availability chip, Identity Header, Sticky Mobile CTA and the Expertise-matrix layout are designed and built in Phase 4 (4.5, 4.6); "How to Work Together", starting-from signals and proof-linked expertise *data* arrive with Phases 7 and 8. **Home is a living page:** every later phase that produces content for a Home section wires that section as part of its own Definition of Done.

**Exit criteria:** no fictional content anywhere in the repo's published content; every Home section renders correctly or is hidden when empty; Light/Dark × LTR/RTL × mobile/tablet/desktop screenshots recorded in the phase document; no horizontal overflow.

---

## Phase 4 — Brand Identity & Design System Completion  ✅ COMPLETE (see `docs/phases/PHASE-4-README.md`, `PHASE-4.3-README.md`, `PHASE-4.4-README.md`, `PHASE-4.5-README.md`, `PHASE-4.6-README.md`, `PHASE-4.7-README.md`)

> **Historical debt / added after audit (10 September 2026)** — see 6.6. Phase 1 keeps its status; this phase restores the design scope of the previous roadmap revision and adds the missing brand identity.

**Goal:** a distinctive Artaveo identity and a complete, documented design system, applied to the existing shell and Home — so every later page is assembled from finished parts instead of inventing UI on the fly.

### 4.1 Art direction & brand identity — ⏳ PARTIAL (derived tokens/variants delivered and owner-approved via D-12, resolved 12 Sep 2026; placeholder-mark swap-back still open as separate, non-blocking debt — see `docs/phases/PHASE-4.1-README.md`) (D-01 — logo received 10 Sep 2026, spelling resolved)

The primary mark is approved — a faceted charcoal "A" (folded-ribbon facets) with a gold interior facet, paired with a wide-tracked wordmark **ARTAVEO** and the tagline "Digital Development". This sub-phase no longer proposes direction options from scratch; it **derives the system from the approved logo** and fills the gaps the logo doesn't cover (light theme, small sizes, RTL, motion).

**Assets received and placed** (provided outside the repo; status as of 11 Sep 2026):
```text
public/brand/source/artaveo-master-reference.png   full-resolution original render (reference only, not production-optimized)
public/brand/artaveo-lockup-full-light.png          mark + wordmark + tagline, dark text, transparent background     ✅
public/brand/artaveo-lockup-compact-dark.png        mark + wordmark, no tagline, white text, transparent background ✅
public/brand/artaveo-lockup-compact-light.png       mark + wordmark, no tagline, dark text, transparent background  ✅
```
> **Folder fix — resolved (11 Sep 2026):** all three lockup PNGs are now directly under `public/brand/`; only `artaveo-master-reference.png` remains in `public/brand/source/`, as intended.

These three lockups are usable production assets (real transparency, no white/black fringe) and already cover the **Full — Light**, **Compact — Dark** and **Compact — Light** rows below. The original master stays reference-only: its background is a photographic smoke texture, not transparent, and the mark is a glossy 3D render (gradients, bevel highlights, rim light) rather than flat vector art — fine for colour sampling and as an occasional large hero asset, not for header/favicon use.

**4.1.1 Colour tokens derived from the logo** (measured from the supplied files):
- charcoal facet (mark) → base of a new **brand-neutral** scale, sampled around `#353535` (mid-facet) to `#5D5B5D` (highlight facet)
- gold interior facet / tagline → **brand accent**, sampled around `#C68B4B`–`#CD9E57` depending on file — use as an accent only (borders, icons, small highlights, the tagline-style small caps line), never as body text or large fills, since it doesn't clear AA contrast on either pure black or pure white at text sizes
- confirm both against the existing OKLCH tokens from Phase 1; adjust the brand hue to match the gold rather than inventing a new one

**4.1.2 Logo system — PNG status: mostly complete; SVG vector set: complete and verified (11 Sep 2026)**

All 7 PNG variants are in hand. Re-verified this round with pixel-level connected-component analysis (not just a visual side-by-side) against the master reference:

| Variant | PNG status | File |
|---|---|---|
| **Full — Light** (mark + wordmark + tagline, dark text) | ✅ correct, transparent | `artaveo-lockup-full-light.png` |
| **Compact — Dark** (mark + wordmark, no tagline, white text) | ✅ correct, transparent | `artaveo-lockup-compact-dark.png` |
| **Compact — Light** (mark + wordmark, no tagline, dark text) | ✅ correct, transparent | `artaveo-lockup-compact-light.png` |
| **Flat mark — Dark** (mark only, flat charcoal + gold) | ✅ geometry connected (verified via erosion test); ⚠️ no alpha channel — opaque white background baked in, not transparent | `artaveo-mark-flat-dark.png` |
| **Flat mark — Light** (mark only, flat charcoal + gold, thin inner contour) | ✅ correct, transparent, connected | `artaveo-mark-flat-light.png` |
| **Monochrome — White** (mark only, single flat white) | ❌ **still has the lower-right-facet disconnect** — connected-component analysis found two separate shapes (179,349px and 104,960px), not one. The "shape-consistency check passed" note previously recorded here for this file was not correct. | `artaveo-mark-mono-white.png` |
| **Monochrome — Black** (mark only, single flat black) | ✅ correct, transparent, connected | `artaveo-mark-mono-black.png` |

**SVG vector set — rebuilt 11 Sep 2026, all 4 verified:**

`artaveo-mark-flat-dark.svg`, `artaveo-mark-flat-light.svg`, `artaveo-mark-mono-black.svg`, `artaveo-mark-mono-white.svg` in `public/brand/` were re-traced from the PNGs above (`potrace`, per-colour masks, smoothed for `flat-dark` to remove source JPEG-grain noise before tracing). All four were rendered and the ribbon-crossing fold zoomed in on to confirm no gap: connected, smooth curves, no autotrace jaggedness. **`artaveo-mark-mono-white.svg` was not traced from its defective source PNG** — it was built from `artaveo-mark-mono-black.svg`'s verified-correct silhouette, filled white, since the two mono variants share identical geometry. So the SVG deliverable is correct even though the mono-white **PNG** on disk still isn't.

Colours corrected to the **official** values (`#1A1A1A` charcoal / `#D4A24C` gold — matches the live `--brand` token, `oklch(0.74 0.12 79)`, hue 79) per `docs/design/art-direction.md`'s later supersession note, not the earlier `#333940`/`#D6963D` sampling recorded in §4.1.1 above.

Old defective files removed: `artaveo-mark-flat.svg`, `artaveo-mark-mono-black-approved-shape-REFERENCE.svg`, `artaveo-mark-mono-white-approved-shape-REFERENCE.svg` (all superseded by the 4 files above — no replacement needed, they don't correspond to a mark-only PNG in the current set).

**Still open / new debt:**
- `artaveo-mark-mono-white.png` (the raster file) should be regenerated properly (or at minimum re-exported from the same source as the black mono) — it's not currently used directly by any production code path (the SVG is), but it's a wrong asset sitting in the repo.
- `artaveo-mark-flat-dark.png` has no transparency (opaque white background) — fine for the SVG (traced via colour threshold, not alpha), but the PNG itself would show a white box if ever placed on a dark surface directly.
- Minor, non-blocking: the white mono PNG measures roughly `#FAFAFA` rather than pure `#FFFFFF`, and the black mono PNG measures roughly `#0A0A0A` rather than pure `#000000`.

**Optional, not blocking:** a **Full — Dark** lockup (mark + wordmark + tagline, white text, transparent) would only be needed for a large dark-background hero placement; the compact-dark lockup already covers real UI needs.

**4.1.3 Everything else this sub-phase still owns — ✅ delivered, see `docs/design/art-direction.md` § 4.1.3**
- benchmarks are used for patterns only; no visual copying (section 4)
- clear-space and minimum-size rules for every lockup variant above ✅ (measured ratios of the mark's own height, not fixed pixels — survives the eventual approved-shape swap); the wordmark is Latin-only and is never mirrored in RTL contexts (in `fa` layouts it still reads left-to-right, set apart from the surrounding RTL text) ✅ (`dir="ltr"` pinned explicitly everywhere the wordmark renders)
- favicon, app icons (light/dark), Open Graph image template — replacing the v0 default `icon.svg` and placeholder logos, built from the flat/monochrome variants above, not the 3D render ✅. **Updated 11 Sep 2026** to the corrected, connectivity-verified mono mark: `public/artaveo-icon.svg`, `public/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, `public/apple-icon.png`, and the four `public/icon-{light,dark}-{16,32}x{16,32}.png` fallbacks were all rebuilt from `artaveo-mark-mono-black.svg` (now correct). `components/site/artaveo-mark.tsx` (header/footer) had its two inline `<path>` values swapped for the same corrected geometry — this was the live-rendered instance of the same disconnected-facet defect, so it's fixed alongside the static assets rather than left stale. The "temporary placeholder" comments in `app/layout.tsx`, `app/manifest.ts` and this component have been updated to drop the temporary framing.
  - **Partially closed 13 September 2026 (§ 10.1):** `public/icon-192.png`, `public/icon-512.png` and `public/icon-512-maskable.png` (PWA manifest icons, `app/manifest.ts`) are now rebuilt from the corrected mono mark — see `docs/phases/PHASE-10.1-README.md`. **Still open:** `public/brand/og-image.png` is still built from the old defective trace; same fix applies, recommended before any public share of the OG image (Phase 11 SEO work).
- semantic colours (success / warning / danger / info) in both themes, chosen to sit alongside the charcoal/gold palette without competing with the gold accent ✅ — audited (warning was already fixed in § 4.1.1; success/info/destructive/chart-4/chart-5 checked against the corrected gold this round and found to already have enough hue separation, no changes needed)
- **typography pairing:** ✅ the wordmark's own geometric, wide-tracked display style is a strong cue for the Latin display face; pair it with a readable Latin text face, and the Persian face (Vazirmatn or a chosen alternative) matched in optical size and weight; separate scales and line-heights per script; numeral rules per D-03 — formalized as: Geist Mono (uppercase, wide-tracked) for display/labels, Geist Sans for text, Vazirmatn for `fa` with its own line-height, numeral rule recorded for Phase 5.3
- **imagery rules:** ✅ product screenshots only inside frames with demo data; architecture diagrams in one consistent style; no stock photos of people; no AI images of fictional products
- **iconography:** ✅ one icon set (lucide) with size and stroke rules and an explicit RTL mirroring list; stroke weight chosen to sit comfortably next to the mark's facet style — and six components' inconsistent mirroring fixed along the way
- **motion principles:** ✅ durations, easing, what may animate, reduced-motion behaviour; the design must stand without motion — the mark's rim-light/glow is a static design detail here, not something to animate on every hover

**Output:** `docs/design/art-direction.md` records the derived tokens, the approved logo variants (with the files above), and the light-theme + small-size rules — for the owner to confirm rather than choose from scratch.

### 4.2 Token refinement & design-system audit (closes P1-A) — ✅ complete (see `docs/phases/PHASE-4-README.md`)
- AA contrast for every text/background pair in both themes; one focus-ring token used everywhere
- surface / elevation levels, border and shadow scales, radius scale, z-index scale, motion tokens
- layout tokens: container widths, grid, section-spacing rhythm, reading width for prose
- **responsive matrix:** small mobile 320–374 · mobile 375–639 · tablet 640–1023 · laptop 1024–1279 · desktop 1280–1535 · large 1536–1919 · ultra-wide ≥ 1920 (capped content width, no stretched lines)
- logical properties only in components (`ms-*`, `me-*`, `ps-*`, `start-*`) — no physical left/right

### 4.3 Missing primitives — ✅ complete (4.3a/b/c all done — see `docs/phases/PHASE-4.3-README.md`)
Existing: Button, Badge, Card, Input. Add — each RTL-correct, keyboard-accessible, both themes, built on the existing Base UI / shadcn foundation:

| Group | Primitives |
|---|---|
| Actions | Link (inline, standalone, external with indicator) · IconButton · ButtonGroup · Kbd — ✅ `components/ui/actions.tsx` |
| Forms | Label · Field (label + hint + error) · Textarea · Select · Checkbox · RadioGroup · Switch · SegmentedControl · FileInput shell (upload wiring in Phase 15) · FormMessage — ✅ `components/ui/form-controls.tsx`, `select.tsx`, `segmented-control.tsx`, `file-input.tsx` (Label/Textarea were already in `input.tsx` from earlier work) |
| Overlays | Dialog · Sheet / Drawer · Popover · Tooltip · DropdownMenu · Toast — ✅ `components/ui/dialog.tsx`, `sheet.tsx`, `popover.tsx`, `tooltip.tsx`, `dropdown-menu.tsx`, `toast.tsx` |
| Disclosure & navigation | Tabs · Accordion · Pagination · Stepper (Brief Builder) · Progress — ✅ `components/ui/tabs.tsx`, `accordion.tsx`, `pagination.tsx`, `stepper.tsx`, `data-display.tsx` |
| Data display | Table (with stacked mobile mode) · Tag · Avatar · Separator · Skeleton · Status badge set (*Live · In development · Private · Archived · Concept*) — ✅ `components/ui/table.tsx`, `tag.tsx`, `data-display.tsx` |
| Content | Callout · Code block (LTR-locked, copy button) · Blockquote · Prose styles for articles in `en` and `fa` — ✅ `components/ui/content.tsx`, `prose.tsx` |

Split into sessions if needed: **4.3a** actions + forms · **4.3b** overlays · **4.3c** disclosure, data display, content. All three delivered; demoed in `/design-system` (§4.7 still owns turning that into the formal living-documentation deliverable).

### 4.4 Patterns & states — ✅ complete (see `docs/phases/PHASE-4.4-README.md`)
- Page Header, Section Header (promoted from Home to `components/ui/patterns.tsx`), CTA Section (generalised from Home's `FinalCta`), feature list, proof row without numbers ✅ `components/ui/patterns.tsx`
- state patterns: Empty (admin/preview only), Loading (skeletons), Error (inline / section / page), Success, Rate-limited, Offline ✅ `components/ui/states.tsx`
- Browser Frame / Device Frame, diagram container with text alternative ✅ `components/ui/frames.tsx`
- form layouts: single-column and multi-step ✅ `components/ui/form-layout.tsx`

### 4.5 Identity components (restores the previous revision's Professional Identity System)
- Identity Header (name, title, tagline, portrait slot — content per D-02)
- Availability Chip + Availability Card (states from settings, "last updated")
- Response Commitment Note
- External Profile Links (verified URLs only)
- primary Hire CTA and Consultation CTA variants
- Sticky Mobile CTA

### 4.6 Visual pass on Shell & Home — ✅ complete (see `docs/phases/PHASE-4.6-README.md`)
> **Exception — the header/nav mark placeholder.** Swapping the literal "A" placeholder box in the header for the actual mark file is a small, reversible asset swap, not a design decision — it doesn't need to wait for D-12 or for the rest of this sub-phase. Done as part of 4.1.3, now using the corrected, connectivity-verified mark (11 Sep 2026 — see 4.1.2). The **rest** of 4.6 below (full direction applied to nav/footer/command-palette, Home redesign) still waits for D-12.
- apply the chosen direction to header, mobile navigation, footer, command palette and every Home section
- redesign the Home "Tech Stack" block into the Expertise-matrix layout (data wiring follows in Phases 7–8)
- fix known Home issues: Hero code-panel line overflow around 1024 px, "Why Artaveo" heading line break, portrait-placeholder head shape
- no content changes beyond the rules of Phase 3

### 4.7 Living documentation — ✅ complete (see `docs/phases/PHASE-4.7-README.md`)
- `/design-system` presents every token, primitive, pattern and state in Light/Dark × LTR/RTL with usage notes and do / don't examples (still `noindex`)

**Exit criteria:** D-12 approved and recorded (derived tokens, logo variants, light-theme and small-size rules); every primitive verified for keyboard, screen reader, RTL and both themes (results in `docs/phases/PHASE-4-README.md`); no component uses physical left/right; no hard-coded colours outside tokens; the Home visual pass approved by the owner; no dependency added without a reason.

---

## Phase 5 — Internationalization & Shell Completion  ✅ COMPLETE (see `docs/phases/PHASE-5.1-README.md`, `PHASE-5.2-README.md`)

**Goal:** real bilingual routing and a finished global shell **before** any new page is built.

### 5.1 Locale infrastructure (routing, dictionaries, Persian specifics — per D-03) — ✅ complete (see `docs/phases/PHASE-5.1-README.md`)
- `app/[locale]/…` with `en` and `fa`; middleware negotiates the locale on first visit and respects a stored choice
- the language switcher maps to the **equivalent route** in the other locale (never back to Home)
- `<html lang dir>` set server-side per locale — no client-side direction flip, no flash
- typed message keys; a missing key fails type-check or tests
- metadata, navigation, validation messages, empty/error states and alt text are all translated
- Vazirmatn for `fa`, with line-height and letter-spacing tuned separately from Latin
- dates, numbers and currency through `Intl` with the chosen conventions
- Latin technical terms inside Persian sentences wrapped with `<bdi>` (e.g. *Next.js*, *PostgreSQL*)
- code blocks, terminal output, URLs and e-mail addresses always LTR
- icon mirroring rules: directional icons mirror, brand/media icons never do

> Merged from the previous revision's separate 5.1 (routing) / 5.2 (dictionaries) / 5.3 (Persian specifics): routing without dictionaries has nothing to render, and the Persian rules apply to the same locale layer — none of the three has an independent decision gate or owner-approval step (D-03 is already resolved), so they are one unit of work.

### 5.2 Shell completion & global boundaries — ✅ complete (see `docs/phases/PHASE-5.2-README.md`)
- "Home" added; navigation: Work · Services · Process · About · Insights (Insights hidden until content exists) · Contact
- right controls: Search · Language · Theme · **Start a Project**
- mobile: accessible navigation (decide sheet vs full overlay and record the decision) + wire the **Sticky Mobile CTA** (built in 4.5) on content pages
- header: sticky, scroll-state, solid on content pages, keyboard accessible, skip-to-content link
- footer: only real links; external profiles from D-05; locale-aware legal links
- command palette fed by the content selectors, per locale
- `loading`, `error` and `not-found` per locale, designed (not default)

> Merged from the previous revision's separate 5.4 (shell completion) / 5.5 (global boundaries): the boundary pages are small, ride along with the same shell-wiring work, and depend on 5.1 being done first — no independent reason to split them into two sessions.

**Exit criteria:** switching language on any existing route lands on the same route in the other locale with correct `lang`/`dir`; no hard-coded UI strings; RTL review completed for the shell.

---

## Phase 6 — Work & Case Study Engine  ✅ COMPLETE (see `docs/phases/PHASE-6.1-README.md`, `PHASE-6.2-README.md`, `PHASE-6.3-README.md`)

**Goal:** real projects become the strongest proof on the site.

### 6.1 `/work` index, case study template & shared infrastructure  ✅ complete (see `docs/phases/PHASE-6.1-README.md`)
- project grid (1 / 2 / 2–3 columns), featured first
- filters (category, technology) appear **only when there are enough projects to need them** (threshold recorded in config; with two projects, no filters)
- honest status badges: *Live* · *In development* · *Internal / private* · *Archived* · *Concept*
- case study template:

```text
Hero + Snapshot         title, one-line outcome, status, year, role, stack (only true fields)
Context                 who it is for and why it exists
Problem & Goals
Constraints             time, budget, infrastructure, language, connectivity…
My Role & Scope         exactly what was done personally
Architecture            accessible diagram + short explanation
Key Decisions           Decision Record cards: context → decision → trade-off
Engineering Highlight   the hardest problem and how it was solved
Data Integrity & Security
Responsive & RTL
Quality                 testing, performance, accessibility — what was actually done
Current Status & Next   honest: what is finished, what is not
Lessons Learned
Links                   live demo · repository · related service
Next Project
```

Metadata that is unknown or not true is omitted, never guessed.

- "How this was built" links from each case study to the public repository and, where allowed, to its roadmap and phase documents — real, verifiable process evidence
- media v1: screenshots captured with **demo data only**; Browser Frame / Device Frame components; required alt text; `next/image` with explicit sizes and priority only for above-the-fold media

> Merged from the previous revision's separate 6.1 (`/work` index) / 6.2 (case study template) / 6.5 (engineering evidence) / 6.6 (media v1): all four are reusable engine/template infrastructure with no independent decision gate and no per-project content to verify — they are built once and used by both case studies below.

### 6.2 Case study — Transportation System  ✅ complete (see `docs/phases/PHASE-6.2-README.md`)
Candidate highlights from the repository (verify each against the code before publishing):
- intercity booking with a live seat map; seat holds and confirmation enforced server-side, never in the browser
- PostgreSQL row-level security combined with server-side authorization and a permission center for limited admins
- operations admin: routes, buses, drivers, trips, trip lifecycle, bookings, reports, CSV exports
- coupons, loyalty foundation, public CMS lite and responsive image cropping
- payment infrastructure: database-level payment state machine, payment status history, refunds including partial refunds
- honest status: in active development; real payment-provider integration pending
- process evidence: phased roadmap and per-phase implementation documents

### 6.3 Case study — Pezhohesh Complex Portal  ✅ complete (see `docs/phases/PHASE-6.3-README.md`; project `status` field still needs Zakir's confirmation — see known issues)
- bilingual Dari/English portal with RTL-native interface
- two admin roles with role-based routing and department-scoped permissions
- offline-first data layer and installable PWA with caching tuned per data type; admin excluded from caching
- server-side rate-limited submissions via an edge function

> 6.2 and 6.3 stay independent sub-phases (not merged into 6.1 or each other): each is substantial, distinct content-verification work against a different real codebase, and both are separately gated by D-06 (publication consent) per project.

**Exit criteria:** both case studies published in `en` and `fa` (or explicitly blocked on D-06); every factual claim listed in the claims ledger; no real personal data visible.

---

## Phase 7 — Services, Packages & Pricing Signals  ✅ COMPLETE (see `docs/phases/PHASE-7.1-README.md`, `PHASE-7.2-README.md`)

**Goal:** a visitor can understand, compare and pre-qualify an offer without a call.

### 7.1 Curated service catalogue & detail blueprint  ✅ complete (see `docs/phases/PHASE-7.1-README.md`)

| Service | Type | Notes |
|---|---|---|
| Business Website | Productized | Marketing sites with CMS-ready structure, SEO, bilingual option |
| Web Application / MVP | Custom (starts with Discovery Sprint) | Full-stack product builds |
| Admin Dashboards & Internal Tools | Productized + Custom | Role-based admin, reports, exports |
| Backend, API & Database | Custom | Supabase / PostgreSQL, auth, RLS, integrations |
| Performance, Accessibility & SEO Fix | Productized | Audit + implemented fixes, before/after report |
| Bug Fix & Rescue | Productized (small) | Diagnose and fix an existing codebase |
| Care Plan (Maintenance) | Monthly | Updates, monitoring, small changes, backups check |

The previous revision's 13 overlapping services are merged into these; overlap dilutes positioning.

Service detail blueprint (every service page):

```text
Title + one-line promise
Who it is for / not for
Problem
What I do
Included            ✓ list
Not included        ✗ list (always present)
Deliverables
Process             steps specific to this service
Timeline            range, with what changes it
Packages            comparison table
Add-ons
What I need from you (requirements)
Related work
FAQ
Start this service  → Brief Builder pre-filled with the service
```

> Merged from the previous revision's separate 7.1 (catalogue) / 7.2 (detail blueprint): the blueprint is the page template that renders each catalogue entry — there is no catalogue work that doesn't immediately need the blueprint it's rendered through, so they are one page-building task.

### 7.2 Package model, add-ons, pricing signals & engagement models (per D-04)  ✅ complete (see `docs/phases/PHASE-7.2-README.md`) — every `price` is `type: 'quote'`; D-04 itself is still open
- tiers: **Starter · Standard · Custom** (Custom = "scoped after discovery", never a fake price)
- fields per tier: `summary`, `forWhom`, `included[]`, `notIncluded[]`, `deliverables[]`, `deliveryDays {min,max}`, `revisions`, `supportDays`, `requirements[]`, `price {amount, currency, type: fixed | from | quote}`
- mobile: stacked cards with a sticky tier switcher; desktop: side-by-side table with a "Not included" row
- add-ons: configurable records (`title`, `description`, `price`, `deliveryImpactDays`); never hard-coded in components
- **What drives cost** block: number of roles, integrations, content volume, languages, deadlines
- typical ranges for custom work; starting-from for packages; payment schedule summary linking to the Working Agreement
- optional early-client offer only if D-11 says so
- engagement models:

| Model | When it fits | Billing |
|---|---|---|
| **Discovery Sprint** | New or unclear projects — the low-risk first step | Fixed price, fixed deliverable: scope, architecture outline, estimate |
| Fixed-scope Project | Clear scope after discovery | Milestones |
| Productized Service | Standard needs matching a package | Package price + add-ons |
| Care Plan | Live product needing ongoing care | Monthly |
| Long-term Part-time | Ongoing product development | Monthly block of hours |

> Merged from the previous revision's separate 7.3 (package model) / 7.4 (add-ons) / 7.5 (pricing signals) / 7.6 (engagement models): all four are the pricing/commerce data mechanics that feed the same package-comparison section of the 7.1 blueprint, and D-04/D-11 gate them together. Kept as its own sub-phase rather than folded into 7.1 because the combined catalogue + blueprint + packages + add-ons + pricing + engagement models is genuinely too large for one session — the same size exception already used for the old Phase 4.3 (a/b/c) split.

**Exit criteria:** ✅ met — every published service has all blueprint sections in both locales; no price shown that the owner has not approved (every `Price` is `type: 'quote'`, since D-04 remains open); package table accessible (real table semantics on desktop via `PackageComparison`, sticky tier switcher + labelled cards on mobile).

---

## Phase 8 — About, Process & Working Agreement  ✅ COMPLETE (see `docs/phases/PHASE-8.1-README.md`, `PHASE-8.2-README.md`, `PHASE-8.3-README.md`)

**Goal:** answer the questions clients are afraid to ask.

### 8.1 About, Process & Quality baseline  ✅ complete (see `docs/phases/PHASE-8.1-README.md`)
- **About:** story (not a CV) · the person (D-02) · technical focus · how I work · values · languages · timezone and overlap hours · tools · external profiles (verified only) · CTA
- **Process:** `01 Discover · 02 Define · 03 Design · 04 Architect · 05 Build · 06 Test · 07 Launch · 08 Support` — each with purpose, activities, output, client involvement, decisions and risks
- **Quality baseline:** a short, honest page of what every project receives — only commitments the owner actually keeps (e.g. TypeScript, tests on critical flows, WCAG 2.2 AA target, security review, documentation, handover)

> Merged from the previous revision's separate 8.1 (About) / 8.2 (Process) / 8.5 (Quality baseline): three straightforward content pages with no independent decision gate and no owner-approval iteration beyond the phase's normal exit criteria.

### 8.2 Working Agreement ("How we'll work")  ✅ complete (see `docs/phases/PHASE-8.2-README.md`)
- communication channel and cadence (e.g. weekly written update, demo per milestone)
- response commitment (D-08)
- milestones, deposits and payment timing
- **ownership:** code and IP transfer to the client on payment; third-party accounts (domain, hosting, database) created in the client's name
- handover package: repository, documentation, environment template, runbook, credentials transfer
- warranty window for defects; what counts as a change request and how it is priced
- confidentiality / NDA availability

> Kept as its own sub-phase: this page carries the heaviest legally-adjacent commitments (IP transfer, payment timing, warranty) and is the most likely to need its own separate round of owner review before publishing.

### 8.3 Hire channels (per D-05)  ✅ complete (see `docs/phases/PHASE-8.3-README.md`)
**Hire Channel Selector** comparing: *Direct* (direct contact, no platform fee) vs *Via platform* (buyer protection/escrow, platform fees and rules). The website stays canonical; platform profiles link back to it. Shipped at `/contact` (page map § 15) alongside direct contact (email, WhatsApp), the response commitment (D-08) and `ExternalProfileLinks` — the route the rest of the site's "Start a project" CTAs already pointed to.

> D-05 itself is not formally marked "Resolved" in the Decision Register below — this phase did not invent an answer. It implements D-05's own recommended default (Direct + Fiverr, real profiles only), which was already live sitewide in `lib/site.ts#socialLinks` since Phase 5.2; § 8.3 surfaces that same, already-shipped strategy as the comparison the roadmap calls for, rather than picking a new one. Owner sign-off to formally record D-05 in `docs/decisions.md` is still open (that file itself remains a pre-existing gap — noted since Phase 3, not created here).

**Exit criteria:** every commitment on these pages is approved by the owner and recorded in `docs/decisions.md`.

---

## Phase 9 — Start a Project (Inquiry v1 — first real backend slice)  ⏳ PARTIAL (9.1 ✅ complete — see `docs/phases/PHASE-9.1-README.md`; 9.2 ✅ complete — live and verified end-to-end, see `docs/phases/PHASE-9.2-README.md`; 9.3 ⏳ structure complete, real sending intentionally inactive pending D-01, see `docs/phases/PHASE-9.3-README.md`)

**Goal:** qualified, persisted, notified inquiries — no fake success.

### 9.1 Brief Builder  ✅ COMPLETE (13 September 2026 — see `docs/phases/PHASE-9.1-README.md`)
Steps: engagement model / service → project type → goal → key features (checklist) → timeline → budget range (optional; ranges per D-04) → links / references → contact details → preferred language and channel → consent.
- pre-fill from the page that launched it (`?service=`, `?package=`)
- per-step validation, back/forward without data loss, keyboard and screen-reader friendly
- final **Brief Summary** screen before submit; the client receives the same summary by e-mail
- form states: `Idle · Editing · Step error · Submitting · Persisted-notification-pending · Success · Server error · Rate limited · Offline`
- scope limit: file attachments are deferred to Phase 15 (uploads are a security surface); v1 accepts links

> Merged from the previous revision's separate 9.1 (Brief Builder) / 9.5 (states) / 9.6 (scope limits): the state list is the Brief Builder's own UI/flow behaviour, and the scope-limit note is a one-line caveat on the same form — neither is independent build work.

**Shipped 13 September 2026** at `/start` (`docs/phases/PHASE-9.1-README.md`): all steps above, per-step validation, `?service=`/`?package=` prefill, and the full state list as `BriefBuilderStatus` (`types/inquiry.ts`). As of § 9.2 (shipped the same day), `success` and `server-error` are both genuinely reachable and backed by a real database — see § 9.2 below. The budget-range step turned out not to need D-04 at all — it is a generic, self-reported client bucket, not a published price. Every site-wide "Start a project" CTA now targets `/start` instead of `/contact`.

### 9.2 Server handling & persistence (minimal slice of the Phase 12 schema)  ✅ COMPLETE — live and verified end-to-end (see `docs/phases/PHASE-9.2-README.md`)
- one schema shared by client and server; server re-validates everything
- honeypot + rate limit per IP/e-mail + optional privacy-friendly challenge
- idempotency key per submission to prevent duplicates on double click or retry
- `inquiries` and `inquiry_events` tables; RLS: no public select; inserts only through the server
- source attribution (referrer, UTM, channel) stored without extra personal data

> Merged from the previous revision's separate 9.2 (server handling) / 9.3 (persistence): validation, rate-limiting and idempotency only make sense in the context of what they're protecting — the same insert path into the same tables — so these were never separable work.

**Status (13 September 2026): COMPLETE.** D-10 resolved — see the Decision Register. The `Artaveo` Supabase project is live (`ukzovqnpqjcrwofycalc`, `ap-southeast-1`, free plan), `db/migrations/0001_inquiries.sql` applied (`inquiries`/`inquiry_events`, RLS enabled, zero policies — confirmed via `get_advisors`, only the expected informational `rls_enabled_no_policy` finding), env vars set in Vercel, and a real submission through the deployed `/start` page verified end-to-end by direct database query: a live row in `inquiries` (correct name, idempotency key, IP hash all present) plus its `inquiry_events` audit row — not just the UI's own success message. `success` is genuinely reachable in production.

Two configuration issues came up during setup, both fixed and worth noting for future phases touching env vars: (1) `.env.local` was set correctly but only affects local dev — Vercel needed the same three variables added separately in its own project settings, then a redeploy; (2) the first Vercel value pasted was actually the `anon` key, not `service_role` — both legacy JWTs share an identical header and early payload (`"iss":"supabase"`), so their truncated on-screen display looks the same at a glance; the difference (the `role` claim) only appears later in the string. Diagnosed both times from Supabase's own logs (`query_logs`: no request ever reached Postgres/PostgREST for the first issue; a `401` on every `/rest/v1/inquiries` call for the second) rather than by guessing.

### 9.3 Notifications (requires D-01 domain + DNS authentication)  ⏳ PARTIAL — structure complete, real sending intentionally inactive (see `docs/phases/PHASE-9.3-README.md`)
- owner alert + client confirmation through a provider abstraction
- **outbox pattern:** persist first, send after; failed e-mails are retried and never lose the inquiry

> Kept as its own sub-phase: blocked on an external dependency (domain + DNS authentication under D-01, still open) independent of the rest of Phase 9, and it is distinct provider-integration work reused again in Phase 19.

**Exit criteria:** end-to-end submission verified in both locales; duplicate submission creates one record; provider outage does not lose data; spam controls tested.

**Status (13 September 2026): structure shipped, real sending deliberately off.** Per the owner's explicit call, § 9.3's full scope was implemented against the interim Vercel URL (`https://artaveo-seven.vercel.app`) rather than waiting on D-01: `notification_outbox` table (outbox pattern, `db/migrations/0002_notification_outbox.sql`), an `EmailProvider` abstraction defaulting to a console/no-op provider (`lib/notifications/provider.ts`), bilingual templates reusing § 9.1/9.2's own summary builder (`lib/notifications/templates.ts`), enqueue + best-effort inline send wired into `submitInquiry` (`app/actions/inquiries.ts`), and a daily Vercel Cron retry sweep (`app/api/cron/notifications`, `vercel.json` — Hobby plan's once-per-day cadence ceiling documented as an accepted trade-off). A real provider (Resend) is built but inert until `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `EMAIL_FROM_ADDRESS` (on the real, DNS-authenticated domain) are set — a pure env-var change once D-01 resolves, no code change. `tsc --noEmit` and `next build` both clean; migration applied to the live Supabase project with only the expected informational advisor finding. Full exit-criteria closure (a real send surviving a real provider outage) is deferred to that same short follow-up.

---

## Phase 10 — Installable PWA & Offline-Safe Shell  ✅ COMPLETE (10.1 — see `docs/phases/PHASE-10.1-README.md`; 10.2 — see `docs/phases/PHASE-10.2-README.md`; 10.3 — see `docs/phases/PHASE-10.3-README.md`; exit-criteria live-deployment check still open, see 10.3's Known Issues)

> **Historical debt / added after audit (11 September 2026)** — decided during a chat discussion, not found by an automated audit, but recorded under the same rule: it did not exist when Phases 3–9 were planned, so it is appended here rather than inserted earlier.

**Goal:** the marketing site (Home, Work, Services, About, Process, Insights) opens instantly and stays browsable with no or poor connection, and can be installed like an app — without ever letting the Brief Builder pretend a submission succeeded while offline.

By this point Phase 6, 7, 8 and 9 have already shipped Work, Services, About/Process and the Brief Builder, so there is real multi-page content worth caching — this is why the phase sits here rather than right after Phase 5.

### 10.1 Web app manifest, install experience & update handling  ✅ COMPLETE (13 September 2026 — see `docs/phases/PHASE-10.1-README.md`)
- `manifest.json`: name, short name, theme colour, background colour, `display: standalone`, `start_url`
- icons generated from the Phase 4 mark-only variants (flat/monochrome, not the 3D render) at the standard PWA sizes
- install prompt follows platform conventions; never a custom nagging banner
- when a new deploy publishes, a visitor with the site already open or installed gets a visible "update available" prompt rather than silently running stale content forever

> Merged from the previous revision's separate 10.1 (manifest/install) / 10.5 (update handling): both are the installed-app lifecycle experience around the same manifest/service-worker registration, with no independent blocker.

**Shipped 13 September 2026:** `app/manifest.ts` (`id`/`scope` added); `public/icon-192.png` / `icon-512.png` / `icon-512-maskable.png` regenerated from the corrected mono mark, closing the debt recorded in § 4.1 below; `scripts/generate-sw.mjs` generates a lifecycle-only `public/sw.js` (no caching — that's § 10.2) stamped with a fresh `BUILD_ID` per build, wired into `package.json`'s `build` script; `next.config.mjs` sends `Cache-Control: no-cache` for `/sw.js`; `components/site/pwa-manager.tsx` (mounted in the root layout) registers the worker, shows a dismissible "update available" reload prompt on a genuine update, and a dismissible install prompt on `beforeinstallprompt` (Chromium/Android only, as expected — iOS has no equivalent event and uses its own Share-sheet install path, correctly left untouched). `tsc --noEmit` and `next build` both clean. Not verifiable in a code sandbox: the real `beforeinstallprompt`/install/update cycle needs one live check against the Vercel deployment after push — see known issues in the phase doc.

### 10.2 Service worker & caching strategy  ✅ COMPLETE (13 September 2026 — see `docs/phases/PHASE-10.2-README.md`)
- **cache-first** for static assets: fonts, the logo files, icons, CSS/JS bundles
- **stale-while-revalidate** for content pages: Home, Work (index + case studies), Services (catalogue + detail), About, Process, Insights — a repeat visit opens instantly from cache while a fresh copy loads in the background
- cache versioned to the deploy; a new publish invalidates the old cache instead of leaving visitors on stale content indefinitely
- **never cached, network-only:** the Brief Builder's **submit** request itself, and every other server mutation; from Phase 13 onward, every admin route, the lead pipeline, CMS screens, and later the client portal (Phase 28) — excluded from the service worker's scope entirely, the same rule the Pezhohesh Portal case study already applied to its own admin (section 6.3)

> Merged from the previous revision's separate 10.2 (caching strategy) / 10.3 (what stays network-only): the exclusion list is the other half of the same caching-strategy decision, not separate work.

**Shipped 13 September 2026:** both strategies live inside the same `public/sw.js` generated by § 10.1's `scripts/generate-sw.mjs`, versioned with the same `BUILD_ID` used for update detection (`artaveo-static-<id>` / `artaveo-content-<id>`; `activate` deletes any other `artaveo-*` cache). Static: `/_next/static/*` (covers hashed CSS/JS and every self-hosted font), `/brand/*`, `/images/*`, the icon family, `/manifest.webmanifest`. Content: the six named page types, matched only on real navigations (not Next's own RSC fetches) so the worker can't interfere with App Router's prefetch/streaming behaviour. The network-only guarantee for mutations is a single `request.method !== 'GET'` check — structural, not a maintained path list — and future admin/CMS/client-portal routes are excluded the same way § 10.1's content-page list already excludes `/start`/`/contact`/`/design-system`: they simply never match either matcher. Two path-matching predicates unit-tested with 31 hand-written cases (all pass); `tsc --noEmit` and `next build` both clean. Known, documented limitation: fully-offline **client-side** link navigation between content pages isn't guaranteed (only a full load/reload is) — a deliberate scope call to avoid risking App Router's own RSC semantics, detailed in the phase doc. Not verifiable in a code sandbox: a real offline reload and Lighthouse's PWA checks against the live deployment — same open item as § 10.1, recommended to close both together.

### 10.3 Offline behaviour for the Brief Builder  ✅ COMPLETE (13 September 2026 — see `docs/phases/PHASE-10.3-README.md`)
- the form itself may open offline (it's just UI), but submission follows principle 15 (never fake success): if offline at submit time, either block with a clear "you're offline — reconnect to send" message, or queue the payload locally and retry automatically once back online (browser-side outbox, same idea as the server-side outbox in Phase 19)
- the success screen only ever appears after the server has actually confirmed persistence — never on queueing alone

> Kept as its own sub-phase: this is the safety-critical "never fake success" behaviour (principle 15) and warrants isolated, careful verification rather than being folded into general caching work.

**Shipped 13 September 2026:** § 9.1 had already added a pre-flight `navigator.onLine` check and a block-style offline screen, before Phase 10 existed — found on inspection, not assumed, along with two real gaps in it: no `catch` around the actual submit call (a mid-request connectivity drop was an unhandled rejection, not an honest message) and a missing i18n wire-up (the offline screen silently showed English copy even on `fa`). This phase implements the roadmap's **queue** option: `lib/inquiry-offline-queue.ts` (new, one-slot `localStorage` outbox) plus a `components/start/brief-builder.tsx` restructure around one shared `attemptSubmit` function called from a normal Submit click, a mount-time hydration effect (restores a queued draft + its original idempotency key after a reload/reopen), and an online-transition retry effect. `success` is set in exactly one place, only after the server confirms persistence, whether the send was immediate or an automatic retry later. A real race condition (`isOnline` defaulting to `true` and being corrected inside an effect that could run after the new retry effect on the very same first mount) was found and fixed via a lazy `useState` initializer. `lib/inquiry-offline-queue.ts` unit-verified against a mocked `localStorage` (9/9 assertions); `tsc --noEmit` and `next build` both clean. Not verifiable in a code sandbox: actually going offline mid-submit in a real browser and confirming the queued-then-sent flow end to end — same open item as §§ 10.1/10.2, recommended to close all three together against the live deployment.

**Exit criteria:** Home, Work, Services, About, Process and Insights are navigable with the network turned off after one prior visit; Lighthouse's installability and PWA checks pass; the Brief Builder never shows a false success while offline; every admin/CMS/client-portal route (as they come online in later phases) is verifiably outside the service worker's cache scope; both locales and both themes checked per the standard Definition of Done.

---

## Phase 11 — Launch Readiness  (M1 gate)

### 11.1 SEO & analytics events  ✅ COMPLETE (13 September 2026 — see `docs/phases/PHASE-11.1-README.md`)
- unique titles/descriptions per page and locale · canonical · hreflang · sitemap · robots · dynamic Open Graph images · structured data: `Person`, `ProfessionalService`, `WebSite`, `BreadcrumbList`, `CreativeWork` for case studies, `Service` + `Offer` only where a price is published, `FAQPage` for FAQs
- analytics events: `page_view · project_view · service_view · package_compare · cta_click · brief_start · brief_step · brief_submit · consultation_request · external_profile_click · language_switch · search_used` — no form contents, no personal data in events

> Merged from the previous revision's separate 11.1 (SEO) / 11.3 (analytics events): both are marketing/measurement metadata wired into the same pages, with no independent blocker.

**Shipped 13 September 2026:** `lib/seo.ts` (`SITE_URL`/`absoluteUrl`/`buildAlternates`/`buildPageOpenGraph`), `lib/og.ts` + `app/api/og/route.tsx` (dynamic OG images, `en` only — `fa` keeps the static `/brand/og-image.png` fallback; see the route's own doc comment for the font-availability reason), `lib/structured-data.ts` + `components/site/json-ld.tsx` (every JSON-LD type this section asks for; `Offer` is wired but never emitted today since D-04 is still open and every package is `type: 'quote'`), and `lib/analytics.ts` + `components/site/view-tracker.tsx`. Every page now has canonical + `en`/`fa`/`x-default` hreflang, a per-page `openGraph`/`twitter` block, and a `BreadcrumbList`; the root layout mounts one sitewide `WebSite`+`ProfessionalService`+`Person` graph. `app/robots.ts` (disallows the already-`noindex` `/design-system` and `/api/`) and `app/sitemap.ts` (32 URLs: 7 static routes + 2 projects + 7 services, each ×2 locales) are both live. Nine of the twelve analytics events are wired to real triggers (`language_switch`, `brief_start`/`brief_step`/`brief_submit`, `package_compare`, `cta_click`, `external_profile_click`, `project_view`/`service_view`); `page_view` is intentionally left to `<Analytics />`'s own automatic tracking rather than re-emitted by hand; `consultation_request` and `search_used` are typed but not wired since Phases 20/18 don't exist yet. `tsc --noEmit` and `next build` both clean; rendered HTML spot-checked directly for canonical/hreflang/JSON-LD/OG tags and the sitemap/robots bodies, not just a clean build. Not verifiable in a code sandbox: real social-platform previews of the dynamic OG images and actual crawler/Search Console behaviour — both need the live deployment.

### 11.2 Legal & privacy (per D-07)  ✅ COMPLETE (13 September 2026 — see `docs/phases/PHASE-11.2-README.md`)
Privacy policy (what the inquiry collects, why, retention, rights, processors) · terms · imprint if required · prefer cookie-less analytics; if any non-essential cookie is used, a consent banner with a real reject option.

> Kept as its own sub-phase: gated by D-07 (jurisdiction of operation), which is not yet marked resolved in the Decision Register.

**Shipped 13 September 2026.** D-07 resolved this session (owner confirmed Afghanistan — see the Decision Register). `/privacy` and `/terms` (`lib/legal-content.ts`, `components/legal/legal-content.tsx`, both routes under `app/[locale]/`) ship bilingual, honest legal content: what the Brief Builder collects and why, where it's stored (Supabase RLS + Vercel), the real retention gap (no automated deletion job exists yet — disclosed, not glossed over), and voluntary access/correction/deletion rights offered by e-mail regardless of what Afghan law does or doesn't require. No imprint page — researched and confirmed Afghanistan has no equivalent to the EU's "Impressum" statute. No cookie-consent banner — confirmed by research that `@vercel/analytics` is cookieless, and the only cookie this site sets (`artaveo-locale`) is strictly functional, so there is no non-essential cookie to gate. `lib/site.ts#legalNav` + `components/site/site-footer.tsx` close the "locale-aware legal links" gap § 5.2 had flagged and left open pending real pages. Both pages carry full canonical/hreflang/OG/`BreadcrumbList` per § 11.1's own pattern. `tsc --noEmit` and `next build` both clean; i18n key parity re-verified; rendered HTML spot-checked in both locales. **Not legal advice** — flagged in `lib/legal-content.ts`'s own doc comment that a lawyer should review this, particularly the Terms' liability section, before it's relied on as an enforceable contract.

### 11.3 Performance & accessibility pass  ✅ COMPLETE (15 September 2026 — see `docs/phases/PHASE-11.3-README.md`)
- mobile CWV targets from section 3; route JS budget recorded; fonts subset and preloaded carefully; images sized and modern formats
- keyboard-only pass, screen reader pass (one desktop + one mobile), 200 % zoom, reduced motion, contrast, form errors announced, RTL reading order

> Merged from the previous revision's separate 11.4 (performance budget) / 11.5 (accessibility): both are whole-site audit-and-fix passes of the same kind, mirroring how Phase 26 later combines the two into a single "Performance & Accessibility Certification" phase.

**Shipped 15 September 2026:** full-site code audit found and fixed four real gaps — `next.config.mjs` had image optimization disabled sitewide (`unoptimized: true` since initial commit; removed, AVIF/WebP formats added), the Persian font was preloaded on every English page despite never being painted there (now gated to `dir="rtl"`), two text labels in `components/ui/identity.tsx` failed WCAG AA contrast at 3.04:1 (computed via OKLCH→luminance, not eyeballed; fixed to full-opacity `muted-foreground` at 5.74:1+), and `MobileNav`/`CommandPalette` — the two hand-rolled overlays that predate the `Dialog` primitive — had no focus trap and `CommandPalette`'s "ESC" hint didn't actually work (new shared `lib/use-focus-trap.ts` fixes both). Heading hierarchy, design-token contrast elsewhere, RTL icon mirroring, `prefers-reduced-motion` handling, focus-visible styling, 200%-zoom overflow handling, and form-error announcement were all audited and found already correct — recorded in the phase doc rather than re-fixed. `tsc --noEmit`, content-placeholder check, i18n key parity (323/323 keys), and `next build` (47 routes) all clean; rendered HTML spot-checked for the font-gating and image-optimizer fixes specifically. **Needs a live deployment to verify:** real mobile CWV numbers, an accurate per-route JS budget (this Next/Turbopack version's build output no longer prints one), actual image byte savings, and a genuine screen-reader + keyboard walkthrough — same category of sandbox-can't-verify gap § 11.1/§ 10.3 already disclosed, not hidden here either.

### 11.4 Pre-launch content check & deploy  ✅ COMPLETE — M1 LAUNCH gate approved (15 September 2026 — see `docs/phases/PHASE-11.4-README.md`)
- every claim in the claims ledger · no visible placeholder · every link resolves · both locales complete · 404 designed
- production domain (D-01) · environment variables audited · preview deployments on · `main` protected

> Merged from the previous revision's separate 11.6 (pre-launch content check) / 11.7 (deploy): both are the final go/no-go checklist immediately before flipping the release switch, naturally done in the same pass.

**Gate:** `M1 LAUNCH — MANUAL APPROVAL REQUIRED`. **Approved by Zakir, 15 September 2026** — launching on the interim Vercel URL (`https://artaveo-seven.vercel.app`) rather than waiting on a purchased domain; see D-01's updated row above.

**Shipped 15 September 2026, content-check half:** re-verified every claims-ledger entry is still evidenced (no re-audit of the upstream repos' current state needed — the ledger's dated snapshots are what the case studies describe, not a live-tracking commitment); found and fixed a real broken external link (`lib/site.ts`'s Fiverr URL pointed at `/sellers/zakir_naseri`, which redirects to Fiverr's generic sign-up page — the real profile, confirmed live, is `/zakir_naseri`, matching what Zakir's own GitHub bio links to); crawled every rendered route's internal `href`s programmatically against the 47 generated pages — zero broken internal links; confirmed both locale-aware 404 pages are real designed states, not framework defaults; re-confirmed i18n key parity (unaffected, no content touched); audited every `process.env.*` reference in the codebase against `.env.example` and found `NEXT_PUBLIC_SITE_URL` (controls canonical URL/OG/sitemap, directly tied to D-01) was used in code but undocumented — added; removed five leftover delivery-manifest `.txt` files sitting in the repo root since phases 4.1.3–9.3 (already-applied, dead instructions, not project content) and the unreferenced `Data/` folder (3.3 MB of superseded logo exploration PNGs, superseded by `public/brand/source/artaveo-master-reference.png` — still in git history if ever needed). `tsc --noEmit`, content-placeholder check, and `next build` (47 routes) all clean after every fix.

**Domain (D-01):** with the launch approved on the interim Vercel URL, `NEXT_PUBLIC_SITE_URL` (now documented in `.env.example`, see above) is left unset — `lib/seo.ts` already falls back to `https://artaveo-seven.vercel.app` with no code change needed. Buying a real domain and DNS-authenticating it (to also unlock § 9.3's real e-mail sending) remains open as **post-launch** follow-up, not a launch blocker.

**Still open — GitHub/Vercel dashboard settings only Zakir can set (no code representation to audit or fix from a coding session):** branch protection on `main`, and confirming preview deployments are on in the Vercel project. Neither blocks the site being live today; both are deploy-safety hardening worth doing soon. `vercel.json` contains only the § 9.3 cron schedule — nothing in-repo works against either setting's default-on behavior.

---

# 10. Milestone M2 — Operating Layer

## Phase 12 — Data Model & Migrations  ✅ COMPLETE (12.1 schema + 12.2 import script/data population/selector switch — see `docs/phases/PHASE-12.1-README.md`, `docs/phases/PHASE-12.2-README.md`)

**Goal:** the typed content model becomes the database, without changing page components.

- ADR for bilingual storage (per-locale columns vs `*_translations` tables) before the first migration — ✅ done, `docs/adr/ADR-001-bilingual-storage.md` (decided `jsonb` localized-value columns)
- migrations are versioned SQL files in `db/migrations/`, each with a rollback note — ✅ done, `0003`–`0009`, live on Supabase project `ukzovqnpqjcrwofycalc`
- one-way import script from `content/` to the database; selectors switch source behind the same interface — ✅ done (12.2). (Content actually lives in `lib/*-content.ts`, not a `content/` folder — the import script's real source.) `scripts/import-content-to-db.ts` reads the file-based content at runtime and either upserts to Supabase directly or emits SQL for review/manual application; content live-verified row-for-row against the source. Selectors (`getFeaturedProjects()`/`getAllProjects()`/`getProjectBySlug()` in `lib/home-content-projects.ts`, `getAllServices()`/`getServiceBySlug()`/`getEngagementModels()` in `lib/services-content.ts`) now read from Supabase behind their original names, `async`; every page/component updated to `await` them or (the `/start` Client Component wizard) receive them as a prop.
- RLS on every table; public reads only for `published = true` rows; writes only through server code — ✅ done, all 24 tables RLS-enabled, advisor-clean (see phase doc for the two findings found and fixed)

Core entities and key fields:

| Entity | Key fields |
|---|---|
| `projects` | id, slug, title*, excerpt*, status, role*, year, category, liveUrl, repoUrl, featured, published, sortOrder |
| `project_sections` | projectId, type (context, problem, architecture, decision, highlight…), body*, sortOrder |
| `project_media` | projectId, mediaId, kind (desktop, mobile, diagram), caption*, sortOrder |
| `technologies` | id, slug, name, category, learning (bool) |
| `project_technologies` / `service_technologies` | join tables — power the Proof-Linked Expertise Matrix |
| `services` | id, slug, title*, promise*, forWhom*, notFor*, problem*, included*, notIncluded*, type, published |
| `service_packages` | serviceId, tier, summary*, deliverables*, deliveryMin/Max, revisions, supportDays, requirements*, priceAmount, currency, priceType |
| `service_addons` | serviceId, title*, description*, priceAmount, currency, deliveryImpactDays |
| `faqs` | scope (global / service), question*, answer*, sortOrder |
| `engagement_models` | slug, title*, whenItFits*, billing*, sortOrder |
| `recommendations` | personName, personTitle, company, relationship, statement*, date, sourceUrl, verification, relatedProjectId, status |
| `articles` | slug, title*, excerpt*, body*, status, publishedAt, readingTime, categoryId |
| `inquiries` / `inquiry_events` | brief fields, stage, priority, source, followUpAt / stage history, actor, note |
| `consultations` | inquiryId, requestedWindows, timezone, status, confirmedAt |
| `media_assets` | url, alt*, width, height, type, size, focalX, focalY |
| `site_settings` | availabilityState, nextOpening, responseCommitment*, timezone, languages, externalProfiles |
| `navigation_items`, `redirects` | — |
| `admin_users`, `roles` | — |
| `audit_log` | actor, action, entity, entityId, before, after, correlationId, at |
| `outbox_messages` | type, payload, attempts, lastError, status |

`*` = translatable field.

## Phase 13 — Admin Authentication & Authorization  ✅ COMPLETE (code — see `docs/phases/PHASE-13-README.md`)
- Supabase Auth for admin only; MFA required for the owner role
- roles: `owner`, `editor` (content only, no leads) — permissions checked server-side on every action
- protected `/[locale]/admin` routes and server actions; no reliance on hidden routes
- secure sessions, auth event logging, audit log for every admin mutation

**Shipped 16 September 2026:** `lib/supabase/server-auth.ts` (new cookie-bound Supabase client, `@supabase/ssr`, `anon` key — distinct from the existing service-role `lib/supabase/server.ts`) powers every `auth.*`/`auth.mfa.*` call. `proxy.ts` refreshes the session cookie and redirects unauthenticated visitors away from `/admin/*` (except `/admin/login`) — the cheap, session-only half of the guard. `lib/admin/auth.ts#getAdminSession()` is the authoritative check (real `admin_users` role + Authenticator Assurance Level, React `cache()`-deduped per request), called independently by every protected page and every admin Server Action in `app/actions/admin-auth.ts` (sign-in, MFA challenge, TOTP enroll/verify/unenroll, sign-out), each of which writes an `audit_log` row (`lib/admin/audit.ts`) and returns deliberately generic error codes so a failed attempt can't enumerate admin emails. MFA is enforced for `owner` only, routing an unconfirmed-this-session factor to `/admin/mfa-challenge` and a never-enrolled owner to `/admin/security`. New chrome-free pages under `app/[locale]/admin/` (`(public)`: login, MFA challenge; `(protected)`: dashboard, security), `noindex`, `/admin` disallowed in `app/robots.ts`. New `Admin` i18n namespace, 365/365 key parity. No new migration — Phase 12's `db/migrations/0008_admin_and_audit.sql` already shipped `admin_users`/`audit_log`. `tsc --noEmit` clean; `next build` compiles every route with zero errors (page-data collection fails only at the pre-existing, Phase-12, Supabase-network-dependent `/[locale]/services/[slug]` — unrelated to this phase, already-disclosed sandbox limitation). **Not verifiable in a code sandbox:** there is no admin account yet — by design, no sign-up flow exists — so real sign-in, real TOTP enrollment against a live authenticator app, and real session-refresh-past-expiry all need the owner to run `docs/runbooks/admin-onboarding.md` against the live Supabase project first.

## Phase 14 — Lead Pipeline  ✅ COMPLETE (code — see `docs/phases/PHASE-14-README.md`)
```text
NEW → REVIEWED → QUALIFIED → CONTACTED → DISCOVERY → PROPOSAL → WON | LOST → ARCHIVED
```
- transitions enforced in the database; every transition written to `inquiry_events`
- notes, tags, priority, follow-up date, source attribution, link to service/package
- **SLA indicator** comparing time-to-first-reply with the published response commitment
- CSV export; no fake dashboards or invented business metrics

**Shipped 16 September 2026:** `db/migrations/0010_lead_pipeline.sql` closes `inquiries.stage` and `inquiry_events.type` to their real, closed vocabularies and adds `enforce_inquiry_stage_transition()`, a `BEFORE UPDATE OF stage` trigger that is the real "transitions enforced in the database" — rejects any move outside the diagram's forward edges, `lost` from any pre-`proposal` stage, and `won`/`lost` → `archived`; live-verified on the Supabase project (a valid `new → reviewed` update succeeded, an invalid `reviewed → won` update was rejected by the trigger, both inside one rolled-back transaction). A new `tags text[]` column (GIN-indexed) is the one field this phase's list didn't already have — `priority`/`follow_up_at` shipped in Phase 12.1's own migration, "notes" are `inquiry_events.note` (already there since § 9.2). `lib/admin/pipeline.ts` (queries, batched per-page SLA lookups) and `app/actions/pipeline.ts` (stage/priority/follow-up/tags mutations, note-adding, CSV export) power a new `/admin/leads` list page (filterable by stage/priority/tag/search, paginated, per-row inline stage control and SLA badge) and `/admin/leads/[id]` detail page (full brief, pipeline controls, notes/activity timeline, the fuller SLA indicator). Per § 13's own role split ("editor: content only, no leads"), the whole area is gated by a new `lib/admin/auth.ts#canAccessLeads()` — editors never see the nav link and are redirected if they hit the URL directly. The SLA indicator deliberately does not invent a numeric hour threshold the owner never set (`site_settings.response_commitment` is prose, not a number) — it operationalizes only the "same day" clause, against the site's configured timezone, documented as a known limitation rather than silently narrowed; "time to first reply" is approximated as time to the first non-`created` `inquiry_events` row, the closest honest proxy available before Phase 19/20 ship real outbound reply tracking. CSV export includes only real `inquiries` columns, respects the admin's active filters, and is generated server-side (owner-authorized) then downloaded client-side as a `Blob`. 88 new `Admin` i18n keys in both locales, 461/461 parity. Mid-session, fast-forward-merged the owner's own fix for a real Phase-13 production build failure (`components/home/featured-work.tsx`/`services.tsx` calling client-only `useLocale`/`useTranslations` from an async Server Component — see that commit) before finishing verification; checked this phase's own new files for the same mistake and found none. `tsc --noEmit`: 0 errors. `next build`: Turbopack compiles every route including both new leads pages with zero errors; page-data collection then fails at the same pre-existing, already-disclosed `/[locale]/services/[slug]` gap (no sandbox network route to Supabase) — both leads pages are fully dynamic/session-gated, not statically generated, so this doesn't touch them. See `docs/phases/PHASE-14-README.md`.

## Phase 15 — CMS & Media  ✅ COMPLETE (code) — see `docs/phases/PHASE-15-README.md`
- editors: projects + case-study sections, services, packages, add-ons, FAQs, engagement models, articles, settings/availability, navigation
- draft → preview → publish → unpublish; per-locale completeness indicator; publishing a locale requires its required fields
- media uploads: type/size validation server-side, safe names, storage policy, required alt text, focal-point cropping for responsive crops
- on-demand revalidation of affected routes after publish
- attachments for the Brief Builder enabled here, behind the same upload rules

**Shipped 16 September 2026:** Every bullet above is real, working admin CRUD, built and delivered as one phase (not a numbered sub-series — see `docs/phases/PHASE-15-README.md` for why the roadmap only ever names one Phase 15). Two migrations: `0011_content_workflow_touch.sql` (an `updated_at`-touch trigger for `services`/`engagement_models`, live-verified) and `0012_media_storage_and_inquiry_attachments.sql` (the `media` Storage bucket — public-read, 5 MB limit, image types only — plus `inquiry_attachments` and a rate-limiting `media_assets.uploaded_by_ip_hash` column), both applied and verified live on Supabase, `get_advisors` clean.

New admin read layer (`lib/admin/content.ts`, `lib/admin/media.ts`, `lib/admin/settings.ts`) and Server Actions layer (`app/actions/content.ts`, `app/actions/media.ts`, `app/actions/settings.ts`) give `editor`-accessible (per § 13's role split — content, unlike § 14's leads, isn't owner-only) CRUD for every entity: services (+ nested process steps, packages, add-ons, FAQs), engagement models, global FAQs, projects (+ case-study sections, tech-stack picker, screenshot gallery), articles (the schema's richer `draft → review → scheduled → published → archived` status enum), the media library (real file upload — type/size validated server-side, safe-generated filenames, required bilingual alt text, click-to-set focal point driving CSS `object-position` for responsive crops), site settings (availability, response commitment, working languages, external profiles), and navigation item structure (href, which surfaces show it, sort order — never the fixed key set or its translated label). Every mutation is audit-logged; every entity with a `published` flag reuses that existing boolean rather than inventing a new draft/publish state, with per-locale completeness computed at read time and gating the one publish action server-side (§ 15's "per-locale" language interpreted as a completeness gate on the one flag that exists, not a genuine independent per-locale publish state — no table in the § 12 schema models that, and building one would mean touching RLS and every public selector, a deliberate, disclosed simplification, not an oversight).

Brief Builder attachments (`/start`): real uploads through the same validation rules as the admin library, rate-limited per IP hash (never the raw IP), capped at 3 files client- and server-side, linked to the inquiry on submit via `inquiry_attachments`, best-effort exactly like `inquiry_events` — a failed link never undoes the successful inquiry insert.

**Deliberately not wired, disclosed rather than silently incomplete:** the public site's header, footer, mobile nav, command palette, and Availability Card still render from the static `lib/site.ts`/`lib/home-content.ts` values, not from the now-real, now-editable `navigation_items`/`site_settings` tables — switching that read path touches the root layout and 16 files that import `lib/site.ts` (several unrelated to navigation at all), a genuinely larger and riskier refactor than a CMS phase, and one this session had no way to visually verify against the live site. The CRUD is real and live; the public switch-over is real, named follow-up work, not a claimed completion. `project_media`'s screenshot gallery is similarly real and editable but not yet rendered on the public `/work/[slug]` case-study template — closed as an out-of-sequence update, not a roadmap phase; see § 23. 88 + 121 + 63 (263 `Admin` + 9 `BriefBuilder`) new i18n keys across the phase, both locales, 686/686 final parity. `tsc --noEmit`: 0 errors. `next build`: compiles every route with zero errors; the same isolate-and-rebuild check used throughout confirmed every new admin route builds and pre-renders correctly in both locales — the only failure is the same pre-existing, already-disclosed Phase-12 Supabase-network gap. Full detail, every decision, and the complete known-limitations list: `docs/phases/PHASE-15-README.md`.

## Phase 16 — Verified Evidence (Recommendations & Testimonials)  ✅ COMPLETE (code) — see `docs/phases/PHASE-16-README.md`
- the owner generates a single-use **request link**; the recommender submits statement, role, relationship, optional profile URL and explicit consent to publish
- moderation queue: approve · request change · reject; meaning is never edited, typos only with consent
- verification labels shown publicly: *Submitted via verified request* · *Linked to platform review* · *Linked public profile*
- recommendation = about working with the developer; testimonial = tied to a delivered project/service
- sections stay hidden until at least one item is published

**Shipped 18 September 2026:** Migration `0015_recommendation_requests.sql` — a new `recommendation_requests` table (single-use `token`, no public RLS policy at all; access is mediated entirely through server code, the same trust model `inquiry_attachments`' IP-hash check already uses) and four new columns on `recommendations` (0005): `consent_to_publish`, `request_id`, `moderation_note`, `related_service_id` — plus a fourth `status` value, `'changes-requested'`, the loop that closes when the recommender revisits the same link. Applied and verified live on Supabase (`ukzovqnpqjcrwofycalc`), `get_advisors` clean (only the same pre-existing, already-disclosed findings). No database trigger enforces the moderation transition graph, unlike the lead pipeline's — a deliberate, disclosed difference: this is a small, fully reversible admin action set behind the existing `editor` session check, not a one-way sales funnel (see the migration's own header for the full reasoning).

Public: `/[locale]/recommend/[token]` — the recommender's own page, reached only via the link the owner shares directly (not in § 15's page map; the same private-utility-route category Phase 20's future reschedule/cancel links will be). Re-validates everything server-side (`app/actions/recommendations.ts#submitRecommendation`), reuses the Brief Builder's honeypot + minimum-fill-time anti-spam pattern, and deliberately carries no separate per-IP rate limit — the token itself (24 random bytes) already is the access control, so abuse is bounded by how many real links exist, not by how fast one visitor can submit. A resubmission (after "request change") merges only the visitor's own locale into the existing bilingual `statement`, so an admin's already-completed translation of the *other* locale survives. Home section 10 (§ 3.3) — `components/home/recommendations.tsx` — reads Supabase directly (`queryApprovedRecommendations()`), unlike `InsightsPreview`, which still reads file-based content ahead of Phase 17: this is the real, live phase these rows belong to. Returns `null` when empty, same pattern every optional home section already follows. No ratings anywhere, per § 14's own component inventory.

Admin: `/admin/content/recommendations` (editor-accessible, per § 13 — content, not leads), linked from the content hub. Two panels: a request-link generator (optional internal note, optional suggested project/service — the owner's own call, never the recommender's, since which project someone worked on is a fact the owner already knows) with copy/revoke controls over every link issued; and the moderation queue itself — every recommendation regardless of status, with per-locale completeness badges, inline edit (typo/translation fixes — § 16's own "typos only with consent" scope), and Approve/Request Change/Reject actions. `approve` checks two independent gates and names which one failed: per-locale completeness (reusing § 15's own rule) and the recommender's `consentToPublish` — a row can be bilingually complete and still lack real consent, and those are different problems. A fourth path, "add a recommendation directly," covers the two verification types a request link never produces — `platform-review` and `public-profile`, real evidence the owner already has and is transcribing, not writing.

**Deliberately not built, disclosed rather than silently incomplete:** no automated e-mail when a link is generated or a change is requested — Phase 19 (Notifications & Outbox) is the provider abstraction this would properly send through, and building a one-off e-mail path here would mean throwing it away once Phase 19 exists; the owner copies the link from the admin panel and shares it directly today. `kind` (`'recommendation'` vs `'testimonial'`) is never a stored column — always derived from whether a project/service is linked, so it can't drift out of sync with the fields that carry the real signal. `tsc --noEmit`: 0 errors. `next build`: Turbopack compiles successfully; page-data collection fails at the same pre-existing, already-disclosed Phase-12 Supabase-network gap every prior phase's build has shown (this run at `/[locale]/services/[slug]`), unrelated to this work. i18n parity: 782/782 (95 new keys — 8 `Recommendations`, 30 `RecommendPage`, 57 `Admin`, both locales). `node scripts/check-content-placeholders.mjs`: passes unchanged (no new static content file — every row here is Supabase-only). Grepped every changed file for physical CSS properties (RTL correctness): none found. `next/font/google` stub applied and reverted per the established pattern, confirmed byte-identical via `diff`; `tsconfig.tsbuildinfo` reverted with `git checkout --`. Not verifiable from this sandbox: the actual rendered request-link page and moderation queue in a browser, in both locales, and a real end-to-end submission against the live Supabase project — the same page-data-collection gap above means `next dev`/build can't reach Supabase from here either. Full detail: `docs/phases/PHASE-16-README.md`.

## Phase 17 — Insights / Engineering Journal  ✅ COMPLETE (code) — migrations `0016`/`0016b` applied live — see `docs/phases/PHASE-17-README.md`
- article model with statuses `Draft · Review · Scheduled · Published · Archived`
- table of contents, LTR-locked code blocks with copy button, images, related projects/services/articles, RSS per locale, reading time per locale
- seed topics from real work (e.g. server-side seat holding, RLS + server authorization, offline-first caching per data type, running bilingual RTL products)

**Shipped 18 September 2026:** see revision 36 above and `docs/phases/PHASE-17-README.md` for the full account. In short: the article model and admin CRUD already existed (0005, Phase 15); this phase adds the public journal (`/insights`, `/insights/[slug]`, per-locale RSS, sitemap, JSON-LD), the ToC and LTR copyable code blocks, media-library images, related projects/services/articles (`0016`), per-locale reading time computed at read time, real scheduled publishing (daily cron, atomic sweep), an admin preview, and the nav/home visibility rules driven by real content. **"Seed topics from real work":** the first topic (`concurrent-seat-booking`, from the Transportation System) is written as an unpublished draft, sourced only from that repository's code, schema and phase write-ups; the remaining topics are a backlog with evidence pointers — `docs/content/insights-topics.md`. Not built, disclosed: tables/nested lists in bodies, full-text RSS, cover image, redirects on slug change.

## Phase 18 — Search & Command Palette
- index built from published content per locale (pages, projects, services, articles, technologies)
- recent searches, suggestions, keyboard navigation, highlighted matches, loading and no-result states
- interface ready for a server-side search provider later

## Phase 19 — Notifications & Outbox
- provider abstraction (e-mail first; others later) with bilingual templates
- events: new inquiry, inquiry confirmation, consultation request/confirmation, evidence submitted, publish events, system error
- retries with backoff, delivery log, alert when a message keeps failing

## Phase 20 — Consultation
- **v1 (request-based):** client proposes time windows in their timezone; owner confirms; calendar invite (ICS) sent; reschedule/cancel links
- **v2:** calendar provider behind the same interface (per D-09); availability slots; buffer times
- consultation always linked to an inquiry

---

# 11. Milestone M3 — Production Assurance

## Phase 21 — Testing
- **Unit:** schemas, formatters (dates/digits per locale), selectors, state transitions, pricing display rules
- **Integration:** inquiry persistence + outbox, RLS policies, admin authorization, CMS mutations, uploads
- **E2E (critical flows):** Home → Work → Case Study · Home → Service → Package → Brief Builder → Submit · language switch on every route type · theme switch · search · admin login · publish project · move inquiry through pipeline
- automated axe checks on key templates in both directions

## Phase 22 — CI/CD & Release Gates
```text
INSTALL → TYPECHECK → LINT → UNIT → INTEGRATION → BUILD → E2E (preview) → SECURITY (deps audit, secret scan) → DEPLOY
```
- branch protection on `main`; agents (v0 included) work through pull requests
- preview deployment per pull request; a failing gate blocks the release

## Phase 23 — Security Hardening
- security headers and CSP; rate limits on every public mutation; CSRF posture of server actions verified
- XSS review of rich content, SQL injection review of any raw query, IDOR tests on admin resources
- upload hardening; secret inventory and rotation plan; dependency policy

## Phase 24 — Observability
- structured logs with correlation IDs from request to database to outbox
- error tracking; business events (inquiry submitted, notification failed, content published, auth events)
- uptime check on the inquiry endpoint; alert on repeated notification failure

## Phase 25 — Backup & Recovery
- decision per D-10; if the database plan has no platform backups, a scheduled external `pg_dump` to separate storage is the minimum (lesson carried over from the Transportation System project, where the free plan had no restorable backups)
- media metadata and storage objects included; content export
- RPO/RTO written down; **a restore test is performed** — a backup never restored is not verified
- rollback procedure for deployments and migrations; recovery runbook

## Phase 26 — Performance & Accessibility Certification
- field data review, Lighthouse CI budgets per route, image and font audit
- manual assistive-technology pass on the finished product in both locales

---

# 12. Milestone M4 — Growth & Business Tools

Prepared for, not built early. Each phase starts only when the owner confirms the need.

## Phase 27 — Proposal & Estimate Builder
Qualified inquiry → proposal (scope, milestones, price, validity, terms) → shareable link → accept → PDF; linked to the lead pipeline.

## Phase 28 — Client Portal (minimal)
Project timeline, milestones, files, decisions log, invoices list; magic-link access; no chat product.

## Phase 29 — Invoicing & Payments
Provider abstraction; payment rails chosen per D-07; platform channel remains an alternative.

## Phase 30 — Content Growth
Newsletter, resources, `/now`, `/uses`, public changelog, downloadable résumé.

## Phase 31 — Conversion Analytics
Funnels from landing to brief submit, drop-off per Brief Builder step, channel attribution; experiments only when traffic makes them meaningful.

---

# 13. Milestone M5 — Final Audit

## Phase 32 — International-Grade Product Audit
- **31.1 UX & design:** hierarchy, typography, spacing, consistency, CTA clarity, motion, empty/error/loading states, 404, dark/light, mobile, RTL
- **31.2 Business conversion:** every question in section 21.2 answered "yes"
- **31.3 Content truth:** every public claim traced to the claims ledger; no placeholder; no stale availability
- **31.4 Security & production:** auth boundaries, public mutations, uploads, secrets, headers, abuse controls, dependencies
- **31.5 Architecture:** component/domain/service boundaries, types, validation, error handling, provider abstractions, CMS extensibility, localization architecture
- **31.6 Localization:** full `fa` walkthrough by a native reader

**Final release decision: MANUAL APPROVAL REQUIRED.**

---

# 14. Artaveo component inventory

Components specific to this product. The generic primitives and patterns they are built from are listed in Phase 4.3–4.4; the identity components are built in Phase 4.5. Each must support Light/Dark, LTR/RTL, keyboard use, and — where data-driven — hide itself when its data is empty.

| Component | Purpose | Origin | Data | Honesty rule |
|---|---|---|---|---|
| **Identity Header** | Name, title, one-line value, portrait | Toptal B-07 | `site_settings` | D-02 resolved (11 Sep 2026): "Zakir Naseri", `/Profile-pic.jpg`, UTC |
| **Availability Card / Chip** | Availability state, next opening, response commitment, timezone overlap, languages | Fiverr B-20 | `site_settings` | Only states the owner maintains; "last updated" date stored. D-08 resolved (11 Sep 2026): "replies within a few hours, same day" |
| **Proof Strip** | Short row of true facts | Contra B-02 | computed from content | Values computed, never typed by hand |
| **Project Card** | Visual, title, summary, role, stack, status, links | Contra / Toptal | `projects` | Status badge must match reality |
| **Case Study Snapshot** | Year, role, duration, stack, status | Toptal | `projects` | Unknown fields omitted |
| **Decision Record Card** | Context → decision → trade-off | Engineering practice | `project_sections` | Only real decisions |
| **Architecture Diagram** | Accessible SVG with text description | Engineering practice | media | Must match the actual system |
| **Engineering Highlight** | The hardest problem and its solution | Toptal B-09 | `project_sections` | Verifiable in code or docs |
| **Proof-Linked Expertise Matrix** | Categories → skills → linked evidence count | Contra B-03 | join tables | No skill without evidence unless labelled *Learning* |
| **Service Card** | Promise, for whom, starting-from, link | Fiverr | `services` | Price only if approved (D-04) |
| **Package Comparison** | Starter / Standard / Custom with included, not included, delivery, revisions, support | Fiverr B-15/16 | `service_packages` | Custom tier never shows a fake price |
| **Add-on List** | Optional extras with price and delivery impact | Fiverr B-17 | `service_addons` | Configurable, not hard-coded |
| **What Drives Cost** | Cost factors + typical ranges | Anti-Toptal B-12 | content | Ranges approved by owner |
| **Engagement Model Selector** | Choose how to work together | Toptal B-11 | `engagement_models` | — |
| **Discovery Sprint Offer** | Fixed first step with fixed deliverable | Toptal B-10 | content | Price and deliverable approved |
| **Hire Channel Selector** | Direct vs via platform, with trade-offs | B-23 | `site_settings` | Only real profiles |
| **Working Agreement Block** | Communication, payment, ownership, handover | Contra B-05 | content | Owner-approved commitments |
| **Process Timeline** | Steps with output and client involvement | — | content | — |
| **Recommendation Card** | Statement, person, relationship, date, verification label, source | Contra B-04 | `recommendations` | Hidden when none; no ratings |
| **Brief Builder** | Multi-step inquiry with summary | Fiverr B-18 | `inquiries` | Success only after persistence |
| **Response Commitment Note** | Small line near every primary CTA | Fiverr B-20 | `site_settings` | Must be kept (SLA in Phase 14) |
| **Sticky Mobile CTA** | Start a Project on mobile content pages | — | — | Never covers content or focus |
| **FAQ Accordion** | Service and global FAQ | Fiverr B-19 | `faqs` | — |
| **Article ToC / Code Block** | Journal reading experience | — | `articles` | Code always LTR |
| **External Profile Links** | GitHub, Fiverr, LinkedIn, Contra | — | `site_settings` | Verified URLs only; no counts or ratings copied |
| **Browser / Device Frame** | Neutral frames for screenshots | — | media | Demo data only |
| **Locale Switch** | Equivalent-route language switch | — | routing | — |
| **Admin Empty State** | Explains what is missing (admin/preview only) | — | — | Never rendered publicly |

## 14.1 Visual direction

Premium · minimal · editorial · technical · confident · human.

The concrete identity — approved logo, derived tokens and variants — is finalized in Phase 4.1 (D-12); this section sets the boundaries the derivation must respect.

Quality comes from typography, spacing, composition, hierarchy, content clarity, image quality, interaction quality and consistent tokens — **not** from gradients, glassmorphism, endless rounded cards, 3D, random floating shapes, infinite marquees, heavy parallax or neon. Motion is restrained, respects `prefers-reduced-motion`, and the design must remain premium with motion disabled.

---

# 15. Page map

```text
/[locale]                         Home
/[locale]/work                    Work index
/[locale]/work/[project]          Case study
/[locale]/services                Services catalogue
/[locale]/services/[service]      Service detail + packages
/[locale]/process                 Process + engagement models + working agreement
/[locale]/about                   About
/[locale]/insights                Journal index        (hidden from nav until content exists)
/[locale]/insights/[article]      Article
/[locale]/start                   Brief Builder        (primary CTA target)
/[locale]/recommend/[token]       Recommendation request link (private, reached only via an owner-issued link — Phase 16)
/[locale]/contact                 Direct contact + hire channels
/[locale]/consultation            Consultation request (Phase 20)
/[locale]/privacy · /terms        Legal
/[locale]/admin/…                 Admin (Phase 13+)
/design-system                    Internal, noindex
Future: /now · /uses · /resume · /changelog
```

Admin sections: Dashboard · Inquiries · Consultations · Projects · Services · Packages · Add-ons · FAQs · Engagement models · Articles · Recommendations · Media · Navigation · Settings (availability, profiles) · Audit log.

---

# 16. Content & voice rules

## 16.1 Voice
- The developer speaks in the first person singular ("I"). "Artaveo" is the brand name, not a "we".
- Calm, precise, specific. Prefer "I built a server-side seat-hold flow" over "I deliver world-class solutions".
- Banned without evidence: *world-class, top 1 %, 10x, trusted by, industry-leading, team of experts, years of experience* claims, client logos.

## 16.2 Bilingual content
- Persian copy is written for Persian readers, not translated word-for-word; the same facts, the same claims.
- Technical terms may stay in Latin script inside `<bdi>`; explain them on first use where helpful.

## 16.3 Placeholders
Missing data uses an explicit placeholder in drafts only — `[CLIENT_NAME]`, `[PROJECT_YEAR]`, `[PROJECT_URL]`, `[RECOMMENDATION]` — and the build fails if one appears in published content (3.1).

## 16.4 Claims ledger
`docs/content/claims-ledger.md` lists every factual public claim with its evidence (file, commit, URL, document) and the date it was checked. A claim without evidence is removed.

## 16.5 Never invent
Clients · reviews · ratings · years of experience · awards · team members · partnerships · revenue · performance metrics · customer counts · project outcomes · certifications · availability.

---

# 17. Definition of Done

No phase is complete because code exists. Every phase closes only when the relevant items pass:

- implementation complete for the defined scope — nothing simulated
- type-check, lint and build pass
- tests appropriate to risk pass (from Phase 21 on, in CI)
- smoke test of affected routes
- **English and Persian** verified; **LTR and RTL** verified
- **Light and Dark** verified
- mobile / tablet / desktop verified; no horizontal overflow
- accessibility checked (keyboard, focus, labels, contrast, headings)
- loading, empty, error and edge states checked
- authorization and security implications reviewed where relevant
- performance implications reviewed
- **content truth check:** no invented claim, no visible placeholder, claims ledger updated
- migrations and rollback notes where relevant
- documentation and phase document written
- known issues and new debt recorded
- this roadmap's status updated

For high-risk workflows (inquiry, publishing, auth, evidence) also verify concurrency, idempotency, retries, failure recovery and auditability.

---

# 18. Phase completion protocol & artifact delivery

A phase is closed only when **both** the code and the handoff package are complete.

## 18.1 Required handoff
1. updated source code
2. tests relevant to the phase
3. verification results
4. updated roadmap status (this file)
5. phase document (`docs/phases/PHASE-X_Y-README.md`)
6. list of changed files
7. known issues / new debt
8. rollback notes where applicable
9. project tree summary if structure changed
10. clean ZIP of the verified state

## 18.2 Roadmap update rule
After each phase: mark status, date, what was implemented, what was verified, limitations, new debt, next recommended phase. Never rewrite the history of completed phases (numbering rule, top of document).

## 18.3 Phase document contents
Objective · scope · dependencies · implementation summary · decisions (link ADRs) · changed files · database changes / migrations · tests · manual verification with screenshots · known issues · debt · rollback · final status.

## 18.4 ZIP rule
Name: `artaveo-phase-X-complete.zip` or `artaveo-phase-X-Y-complete.zip`.  
Exclude `node_modules/`, `.next/`, caches, temp files, `.env*` with secrets, editor/system junk. Include source, migrations, config templates (`.env.example`), docs, tests and public assets. Build from a clean state before packaging; remove debug code; the archive must match the verified source.

## 18.5 Completion report

```text
PHASE: X.Y
STATUS: COMPLETE | PARTIAL | BLOCKED

IMPLEMENTED:
- …

VERIFIED:
- typecheck · lint · tests · build · smoke
- en/fa · LTR/RTL · light/dark · responsive
- accessibility · security review · content truth check

FILES CHANGED:
- …

DATABASE / MIGRATIONS:
- …

KNOWN ISSUES:
- …

NEW DEBT:
- …

DECISIONS NEEDED:
- D-xx …

ARTIFACT: artaveo-phase-X-Y-complete.zip
ROADMAP UPDATED: YES
NEXT PHASE: …
```

## 18.6 Blocked phase rule
If a phase depends on missing credentials, an unavailable provider, an owner decision (section 7) or stakeholder consent, it is marked **BLOCKED** with: the exact blocker, impact, what was completed safely, the required dependency and the next action. A blocked phase is never marked complete.

---

# 19. Documentation architecture

```text
ROAD-MAP-ARTAVEO.md              canonical roadmap: direction, status, decisions, debt, phases
README.md                        what the project is, setup, architecture summary, current status
docs/decisions.md                Decision Register outcomes with dates
docs/adr/ADR-NNN-*.md            architecture decisions
docs/phases/PHASE-X_Y-README.md  implementation and verification history per phase
docs/content/claims-ledger.md    evidence for every public claim
docs/runbooks/                   deploy, rollback, backup, restore, incident
docs/testing.md                  test strategy
docs/security.md                 security model
db/migrations/                   versioned SQL
```

The roadmap keeps status, not details; details live in phase documents.

---

# 20. Agent operating rules

For each phase or sub-phase:

1. read this roadmap (sections listed at the top) and the latest phase document
2. inspect the current code — never assume a previous session's work is in `main`
3. check the Decision Register; if a needed decision is missing, stop that part and mark it BLOCKED
4. implement only the defined scope, on a branch
5. verify against section 17
6. write the phase document and the completion report
7. update this roadmap
8. continue only when the phase is valid

Never: silently skip a failed step · mark unfinished work complete · redesign completed phases without a recorded debt item · copy benchmark visuals · add dependencies without a reason in the phase document · introduce content that is not true.

---

# 21. Final success criteria

## 21.1 Statement

> Artaveo presents a truthful, premium and internationally credible independent developer brand; real projects are the strongest proof of capability; expertise is linked to evidence; services are few, clear, comparable and priced honestly; a visitor can choose a low-risk first step and understands payment, ownership and handover before the first call; inquiries are qualified, persisted and answered within the published commitment; content is managed through a proper CMS; English and Persian work correctly in LTR and RTL; light and dark themes are intentional; accessibility and performance meet the target standards; security boundaries are real; deployment is repeatable; failures are diagnosable; backups are restore-tested; and another professional developer can understand, maintain and extend the system without reverse-engineering it.

## 21.2 Conversion questions (all must be "yes")

Can a stranger understand who Artaveo is in ten seconds? · see real proof? · understand the expertise and its evidence? · understand the services and compare packages? · estimate cost before contacting? · pick a low-risk first step? · understand process, payment, ownership and handover? · decide whether Artaveo is a fit? · start a project in under three minutes on mobile? · request a consultation? · find GitHub and the other real profiles? · use the complete site in Persian, right-to-left, without friction?

If any answer is "no", the release is not complete.

---

# 22. Out of scope & non-negotiables

**Explicitly not built unless a later phase is approved:** marketplace features · multi-freelancer team pages · star ratings · chat widgets or AI chatbots pretending to be the developer · blog comments · 3D hero scenes · animated logo walls · fake live-activity counters.

```text
BUILD A FREELANCE BUSINESS PLATFORM, NOT A PRETTY PORTFOLIO.
REAL WORK IS THE PROOF.
EVERY SKILL POINTS TO EVIDENCE.
FEW SERVICES, CLEAR SCOPE, HONEST PRICE SIGNALS.
A LOW-RISK FIRST STEP FOR EVERY NEW CLIENT.
OWNERSHIP AND HANDOVER ARE PUBLISHED.
SUCCESS ONLY AFTER PERSISTENCE.
EMPTY MEANS HIDDEN.
RTL IS FIRST-CLASS.
ACCESSIBILITY AND PERFORMANCE ARE RELEASE GATES.
BENCHMARKS ARE PATTERNS, NEVER VISUAL COPIES.
EVERY PHASE IS VERIFIED AND DOCUMENTED.
NOTHING IS INVENTED.
```

---

# 23. Out-of-sequence work log

Work logged here is real, shipped, and verified exactly like a phase —
it just isn't part of the M1–M5 phase sequence above, so it gets no
Phase number and doesn't move the "next phase" pointer. Each entry
below has its own doc under `docs/updates/`, not `docs/phases/`.

## 23.1 Case Study Media (17 September 2026)

**What:** the public rendering of `project_media`'s screenshot
gallery on `/work/[slug]` — closing the exact gap Phase 15's own
revision 29 disclosed ("`project_media`'s gallery is similarly real
and editable but not yet rendered on the public case-study template"),
without treating it as a new roadmap phase.

**Why out-of-sequence:** Phase 15 was already complete and Phase 16 is
next; this was real, necessary work but not part of that sequence, so
it's tracked here instead of as an invented "15.1".

**Summary:** 25 real screenshots captured against the actual running
`Transportation-System`/`pezhohesh-portal` repos (demo data only, per
D-06) — 14 for Transportation System, 11 for Pazhuhesh Portal.
Migration `0013_project_media_placement.sql` (applied live on
Supabase) adds `project_media.placement` ('main' | 'gallery') and
populates real `media_assets`/`project_media` rows with real
dimensions/file sizes and bilingual alt/caption text; backfills both
projects' `cover_image` from `null`. `types/content.ts#ProjectMediaItem`
/`Project.media?` (additive). `case-study.tsx`'s Hero now renders every
`main` item in its real capture frame (`BrowserFrame`/`DeviceFrame`);
new `components/work/project-gallery.tsx` renders a lightbox grid for
`gallery` items. `tsc --noEmit` clean, 687/687 i18n parity, `next
build` compiles (same pre-existing Phase-12 Supabase-network gap at
static generation, unrelated). One content-judgment item was flagged
mid-session — `pazhuhesh-portal/gallery/08-achievements.png` shows
real named students and their outcomes, already public on that page
but reused here in a different context — **Zakir confirmed it's fine
to keep as-is.**

Full detail: `docs/updates/2026-09-17-case-study-media.md`.
