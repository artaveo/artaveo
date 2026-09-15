# Phase 11.4 — Launch Readiness: Pre-launch Content Check & Deploy

**Status:** ✅ COMPLETE — M1 LAUNCH gate approved
**Date:** 15 September 2026 (gate approved 15 September 2026, same session,
after the content-check work below and a direct in-conversation question
to Zakir)

## Objective

The final go/no-go checklist immediately before the M1 launch gate:
every published claim evidenced, no placeholder, every link real, both
locales complete, a designed 404, and the operational readiness items
(domain, env vars, deploy protections).

## Scope

Roadmap § 11.4:

> every claim in the claims ledger · no visible placeholder · every
> link resolves · both locales complete · 404 designed
> production domain (D-01) · environment variables audited · preview
> deployments on · `main` protected
>
> **Gate:** `M1 LAUNCH — MANUAL APPROVAL REQUIRED`.

## Governance note

Two of this checklist's bullets (production domain, and by extension
the launch gate itself) require **D-01**, which is not resolved — no
domain has been purchased or DNS-authenticated. Two more (preview
deployments, branch protection) are GitHub/Vercel dashboard settings
with no code representation — nothing in this repository to read,
verify, or fix. Per this roadmap's own § 7 Decision Register rule
("agents must not invent these answers; they mark the dependent phase
BLOCKED... and continue with work that is safe to do"), those four
items are marked blocked/out-of-reach below rather than assumed done.
Everything else in the checklist — the actual content-and-code
half — was fully audited and fixed where broken.

## Findings & fixes

### 1. Broken external link: Fiverr profile URL

`lib/site.ts`'s `socialLinks` pointed at
`https://www.fiverr.com/sellers/zakir_naseri`. Fetched it directly:
it redirects to Fiverr's generic "Become a Seller" sign-up page, not a
profile. Cross-checked against Zakir's own GitHub profile bio (which
links `fiverr.com/zakir_naseri`, no `/sellers/` segment) and fetched
that URL directly — it resolves to the real, live seller profile
("Artaveo — Full Stack NextJS and Supabase Developer", bio text
matching this site's own copy almost verbatim).

**Fix:** corrected the one source of truth (`lib/site.ts` — everything
else, including `lib/contact-content.ts`'s hire-channel selector,
derives from it) to `https://www.fiverr.com/zakir_naseri`. Confirmed
in rendered build output: both the footer (every page) and `/contact`
now emit the corrected URL.

### 2. Undocumented environment variable

Grepped every `process.env.*` reference across the actual project
source (`app`, `lib`, `components`, `types`, `i18n`, `scripts`, `db`
— excluding `node_modules`/`.next`, whose framework-internal env reads
aren't this project's concern) and diffed against `.env.example`.
`NEXT_PUBLIC_SITE_URL` (`lib/seo.ts#SITE_URL` — controls the canonical
URL, hreflang, OpenGraph/Twitter tags, and every `sitemap.xml` entry;
directly tied to D-01) was read in code but never documented as a
variable to set.

**Fix:** added it to `.env.example` with the same doc-comment style
the file already uses for `EMAIL_PROVIDER` — including the direct tie
to D-01, so whoever sets the real domain later finds this variable in
the same file as the other D-01-gated ones instead of having to
grep the codebase for it. (`VERCEL_GIT_COMMIT_SHA` / `SOURCE_VERSION`,
the only other two undocumented reads found, are Vercel's own
auto-provisioned build vars in `scripts/generate-sw.mjs`'s fallback
chain — correctly not documented, since nobody sets those by hand.)

### 3. Repo-root cruft: five dead delivery-manifest files

`DELETE-THESE-FILES.txt`, `DELETE_THESE_FILES.txt`,
`APPLY-THIS-ZIP.txt`, `CHANGES.txt`, `README-DEPLOY.txt` — one-off
"drop this zip into your repo" instructions from five different past
phases (4.1.3, 5.1, 5.2/6.1, 9.3, 4.3 respectively, confirmed via
`git log --oneline -- <file>` against each), all already applied,
sitting in the repo root as dead weight ever since. Not visible on the
live site, but visible to anyone who opens the repository — exactly
what a credible-launch review should catch.

**Fix:** removed all five (`git rm`). Full content preserved in git
history if ever needed for reference.

### 4. Repo-root cruft: superseded logo-exploration folder

`Data/` (7 PNGs, 3.3 MB, spaces in every filename) — confirmed via
`grep` that nothing in the codebase references any file in it. These
are pre-D-12 logo option sheets; `public/brand/source/` already holds
the canonical post-D-12 reference (`artaveo-master-reference.png`),
and every actual brand asset the site uses lives in `public/brand/`
proper. Same category as finding 3: unreferenced, unshipped, but
visible clutter in the repository itself.

**Fix:** removed (`git rm -r`). Recoverable from git history.

## Verified correct, no fix needed

- **Claims ledger** (`docs/content/claims-ledger.md`) — every entry
  still carries its original evidence citation and checked-date; the
  ledger documents a dated snapshot of each upstream case-study repo
  (2026-09-10/09-12), which is what the site's case-study copy
  describes — it is not a commitment to track those repos live, so a
  repo having moved forward since (confirmed true for Transportation
  System, now well past the phase described) doesn't invalidate what
  the ledger claims. No claim found unevidenced or stale relative to
  what it actually asserts.
- **No visible placeholder.** `node scripts/check-content-placeholders.mjs`
  passes. Broadened the search by hand beyond that script's narrow
  `[BRACKETED_CASE]` pattern — grepped all of `lib`, `messages`, `app`,
  `components`, `types` for `lorem ipsum`, `TODO`, `FIXME`, `coming
  soon`, `TBD`, `[insert`, etc. Every hit was either content
  describing the site's own no-placeholder policy (design-system copy)
  or a genuine forward-looking code comment (`types/content.ts`'s
  `TODO(Phase 9)`), not a placeholder that shipped. The unused
  `public/placeholder-*.{png,jpg,svg}` scaffold files (shadcn/v0
  template defaults) were checked and confirmed unreferenced anywhere
  in the codebase — dead files, but not "visible" since nothing links
  to them; left alone rather than treated as urgent (unlike findings 3
  and 4 above, these ship as part of the Next.js static-asset bundle
  either way, so removing them has no launch-readiness effect, and
  `public/` wasn't otherwise in scope for this pass).
- **Every internal link resolves.** Built the site (sandbox font stub,
  restored after — see Manual verification) and wrote a script that
  crawled all 47 generated routes' rendered HTML, extracted every
  internal `href`, and checked each against the actual generated route
  set (including the two dynamic patterns, `/​[locale]/services/[slug]`
  and `/​[locale]/work/[slug]`). Zero broken internal links. The five
  hrefs the script initially flagged (`/favicon.ico`,
  `/icon-{dark,light}-{16x16,32x32}.png`) were false positives — real
  static files served from `app/`/`public/` by Next's file
  conventions, outside where the script looked.
- **Both locales complete.** i18n key parity re-checked (flattened
  `en.json`/`fa.json` key sets): still an exact match, unaffected since
  this phase touched no content or translation files.
- **404 designed.** Both `app/not-found.tsx` (root-level fallback, for
  when the `[locale]` segment itself doesn't match — plain by
  necessity, no locale context exists yet) and
  `app/[locale]/not-found.tsx` (the normal case — full `SiteShell`
  header/footer, translated copy, a real "back home" action) are
  genuinely designed states, not framework defaults.

## Launch decision

D-01 and the `M1 LAUNCH` gate both genuinely required Zakir's own
decision — not something to infer from the codebase. Asked directly,
in-conversation, after the content-check work below was done:

1. **Production domain (D-01):** proceed with the interim Vercel URL
   (`https://artaveo-seven.vercel.app`) rather than wait on a
   purchased domain. `NEXT_PUBLIC_SITE_URL` (documented in
   `.env.example` as part of this phase's own findings, see below)
   stays unset — `lib/seo.ts` already falls back to that URL with no
   code change required, same pattern as every other D-01-gated
   default in this codebase.
2. **`M1 LAUNCH — MANUAL APPROVAL REQUIRED` gate:** approved, on that
   interim URL, 15 September 2026.

D-01's Decision Register row and § 11.4's own roadmap section record
both. A real domain purchase, DNS authentication, and activating § 9.3's
real e-mail sending are now explicitly **post-launch** follow-up, not
pre-launch blockers.

## Still open — GitHub/Vercel dashboard settings

Branch protection on `main` and confirming Vercel's preview
deployments are on are both dashboard-only settings with no
representation in this repository's code — nothing to read, verify, or
fix from a coding session, and outside this session's access (no
push/dashboard access; Zakir pushes via GitHub Desktop). Neither blocks
the site being live today; both are deploy-safety hardening worth doing
soon. `vercel.json` was checked and contains only the § 9.3 cron
schedule — nothing in-repo works against either setting's default-on
behavior.

## Changed files

```
lib/site.ts                            Fiverr profile URL fixed (/sellers/zakir_naseri → /zakir_naseri)
.env.example                           + NEXT_PUBLIC_SITE_URL documented
DELETE-THESE-FILES.txt                 removed — dead, already-applied delivery manifest
DELETE_THESE_FILES.txt                 removed — same
APPLY-THIS-ZIP.txt                     removed — same
CHANGES.txt                            removed — same
README-DEPLOY.txt                      removed — same
Data/                                  removed — superseded logo-exploration source (7 files, unreferenced)
```

## Database / migrations

None.

## Tests

No automated test suite exists yet (Phase 21).

## Manual verification

- Fetched `https://www.fiverr.com/sellers/zakir_naseri` directly:
  confirmed it redirects to the generic sign-up page. Fetched
  `https://github.com/artaveo` directly: confirmed the real bio links
  `fiverr.com/zakir_naseri`. Fetched that URL directly: confirmed it's
  the real, live profile. Fetched
  `https://github.com/artaveo/Transportation-System` directly:
  resolves, public, real. LinkedIn (`linkedin.com/in/artaveodevelops`)
  blocks automated fetches by its own `robots.txt` — same
  can't-verify-by-fetch category as § 11.1's social-preview gap, not
  treated as broken on that basis.
- `git log --oneline -- <file>` run against each of the five removed
  root `.txt` files individually, confirming each was a one-off
  manifest from a specific already-shipped phase, not live
  documentation.
- `grep` confirmed zero references to any `Data/` file or any unused
  `public/placeholder-*` file anywhere in `app`/`lib`/`components`/`types`.
- `tsc --noEmit`: clean.
- `node scripts/check-content-placeholders.mjs`: passes.
- i18n key parity (`en.json` vs `fa.json` flattened key sets): exact
  match, 323 keys each — unaffected, no content touched.
- `next build` (fonts stubbed and restored per the established sandbox
  pattern, `diff`-confirmed byte-identical restoration of
  `app/[locale]/layout.tsx`; `pnpm-workspace.yaml`/`tsconfig.tsbuildinfo`
  sandbox-only edits reverted via `git checkout --`): clean, all 47
  routes generated, both before and after the cruft removal.
- Rendered HTML spot-checked directly: the corrected Fiverr URL
  confirmed present on both `/en.html` (footer, sitewide) and
  `/en/contact.html`; a custom crawl script checked all 47 pages'
  rendered `href`s against the real route set, zero broken internal
  links.

## Known issues

None found in the content/code half of this checklist that weren't
fixed. Branch protection and preview-deployment confirmation (Still
open, above) remain as post-launch dashboard hardening.

## New debt

- The unused `public/placeholder-*.{png,jpg,svg}` scaffold files could
  be removed in a future pass (harmless today — unreferenced, so
  never shipped to a real page — but still dead weight in the repo).
  Left out of this phase's scope since, unlike findings 3–4, `public/`
  asset cleanup wasn't part of what this checklist's bullets cover.
- Branch protection on `main` and confirming Vercel preview
  deployments are on (Still open, above).
- A real domain purchase + DNS authentication (D-01), which also
  unlocks § 9.3's real e-mail sending — explicitly deferred
  post-launch by Zakir's own decision, not an oversight.

## Rollback

Revert `lib/site.ts` and `.env.example`; restore the five deleted
`.txt` files and the `Data/` folder from git history
(`git checkout <commit before this phase> -- <path>` for each, or
`git revert` this phase's commit).

## Final status

**COMPLETE.** Every part of this checklist a coding session could
verify or fix is done: a real broken link found and fixed, a real
missing env-var doc found and fixed, real repo-root cruft removed, and
everything else (claims ledger, placeholders, internal links, locale
completeness, 404 design) audited and confirmed already correct. The
two remaining items requiring an actual decision — the domain and the
launch gate itself — were put to Zakir directly rather than assumed;
he chose the interim Vercel URL and approved the gate the same
session. **M1 is launched.** What's left (dashboard hardening, a real
domain) is explicit post-launch follow-up, not a blocker any future
session needs to re-litigate.
