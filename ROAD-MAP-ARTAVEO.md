# ROAD-MAP — ARTAVEO
## Independent Full-Stack Developer · Freelance Business Platform

## Document status

**Last revision:** 11 September 2026 (revision 4 — Phase 3 closure checklist 3.5 completed)  
**Project status:** Phase 1 complete (audit pending) · Phase 2 **PARTIAL** · Phase 3 **✅ COMPLETE (checklist 3.5 closed)**.  
**Next step:** run **Phase 4.1** to derive the design system from the approved logo (assets in `public/brand/`, see 4.1).  
**Document type:** canonical product + design + engineering roadmap **and** implementation prompt for AI agents (v0, Claude, others).  
**Repository:** `github.com/artaveo/artaveo`  
**Stack already in repo:** Next.js 16 · React 19 · TypeScript 5.7 · Tailwind CSS v4 · Base UI + shadcn primitives · Geist / Geist Mono / Vazirmatn · Vercel Analytics  
**Languages / direction:** English (LTR) + Persian (RTL) — both first-class  
**Themes:** Light + Dark — both intentional  
**Final release decision:** **MANUAL APPROVAL REQUIRED**

This document records the real state of the project, the product direction, the benchmark decisions, known debt, the phased plan and the completion criteria. It is the single source of truth for planning. Detailed implementation history lives in phase documents (section 19), not here.

> **Numbering rule.** Phases that have started (1, 2, 3) keep their numbers forever. No new phase is ever inserted before a phase that has started. Anything discovered later — even if it "should" have been done earlier — is recorded in section 6 (Debt) or added as a later phase with the label **Historical debt / added after audit**. Completed phases are never re-marked as incomplete because a later audit found more work.

> **How an AI agent must use this document.** Before writing code, read sections 1–8, the section of the phase being implemented, section 14 (components), section 16 (content rules), section 17 (Definition of Done) and section 18 (completion protocol). Implement **one phase (or sub-phase) per session**. Never implement a later milestone to make an earlier one look finished. Never replace required backend behaviour with UI simulation.

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
9. **Typed content mirrors the future database.** Content that lives in files today must have the same shape as the tables it will move into (no rewrites at Phase 11).
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

This history reflects the real state of `main` after the Phase 3 closure session (11 September 2026). It must be preserved; later audits may add debt but may not erase it.

```text
Phase 1   Design System Foundation              ✅ COMPLETE  (built with v0 — audit pending, see 6.4)
Phase 2   Global Shell                          ⚠️ PARTIAL   (components exist, not mounted; i18n simulated)
Phase 3   Home Page                             ✅ COMPLETE  (Home mounted with 10 sections; closure checklist 3.5 done)
Phase 4   Brand Identity & Design System        ⬜ NEXT      (added after audit — see 6.6)
```

**Phase 1 — delivered:** OKLCH colour tokens for light/dark (`app/globals.css`), brand colour, typography with Geist / Geist Mono / Vazirmatn, spacing, radius, Button / Badge / Card / Input primitives, and a showcase page for colours, typography, spacing, layout, buttons, cards and forms (`/design-system`, now `noindex`/`nofollow` — closed in Phase 3.5).

**Phase 2 — delivered:** `site-header`, `mobile-nav`, `site-footer`, `theme-toggle`, `language-switcher`, `command-palette`, `breadcrumb`, `page-transition`, `site-shell`, `lib/site.ts`, `components/icon.tsx`.  
**Phase 2 — missing:** `SiteShell` is not used by any route; the language switcher only flips `dir` (no locale routes, no dictionaries); "Home" is missing from navigation; the command palette uses a hard-coded list.

**Phase 3 — delivered in `main` (`4ef6f87`):** `app/page.tsx` renders the Home inside `SiteShell` with Hero, Capability Strip, Featured Work, Services, Why Artaveo, Tech Stack, Process, About Preview, Insights Preview and Final CTA; `types/content.ts` defines content shapes; `lib/home-content.ts` now contains only the two real projects (Transportation System, Pazhuhesh Portal) with facts taken from their repositories; fictional projects and metrics removed.  
**Phase 3 — closure checklist 3.5 delivered (11 September 2026):** `lib/site.ts` cleaned of the unverified placeholder e-mail and the X link, real GitHub/LinkedIn/Fiverr/WhatsApp links in place; voice pass to first-person/brand wording across nav, `siteConfig`, Home metadata and the Hero CTA; unused fictional-project and v0 placeholder images deleted; `/design-system` marked `noindex`/`nofollow`; Insights Preview hides itself while nothing is published; build-time placeholder guard added (`scripts/check-content-placeholders.mjs`); content fields are now `{ en, fa }` and every Home component reads through selector functions in `lib/home-content.ts`. Full detail and verification in `docs/phases/PHASE-3-README.md`.  
**Phase 3 — new information recorded during closure:** the owner supplied a real e-mail (`artaveo.dev@gmail.com`) and WhatsApp number mid-session; used as the interim contact channel (see updated D-01 note in section 7). Phase 3 has no more open items.

---

# 6. Debt found in audit (added 10 September 2026)

These findings do not change the historical status of phases 1–3. They are resolved inside Phase 3 (closure), Phase 4 (design) and Phase 5 (i18n) unless stated otherwise.

## 6.1 Content debt — P0 (blocks any public deployment)

- ~~`lib/home-content.ts` contains fictional projects (*Atlas Analytics*, *Meridian Pay*, *Northline Commerce*) with invented metrics~~ — **resolved in Phase 3 (`4ef6f87`)**.
- ~~`public/images/work-*.png` (AI-generated screenshots of those fictional products) are no longer referenced but are still in the repository~~ — **resolved in Phase 3 closure (3.5, 11 Sep 2026)**: deleted, along with the unused v0 placeholder template assets.
- ~~`lib/site.ts`: the e-mail `hello@artaveo.studio` is unverified (domain ownership not confirmed — D-01); `socialLinks` point to the root of github.com / x.com / linkedin.com; an X profile is not part of the strategy~~ — **resolved in Phase 3 closure**: the unverified address and the X link are gone; `socialLinks` now points at the real GitHub, LinkedIn and Fiverr profiles plus WhatsApp. A real, owner-confirmed e-mail (`artaveo.dev@gmail.com`) was supplied mid-closure and is in use as an interim contact channel — see the updated D-01 row in section 7. A domain-backed sending address for Phase 9.4 is still open.
- ~~Copy uses "we / our / the studio" and implies a team (nav descriptions, site description, Home metadata, Hero "View our work")~~ — **resolved in Phase 3 closure**: voice rewritten to first person / brand name per 16.1 in every location the checklist named.

## 6.2 UX / architecture debt

- `/` renders the design-system showcase, duplicating `/design-system`.
- No locale routing (`/en`, `/fa`), no dictionaries, no translated metadata.
- Mobile navigation is a sheet; decide in Phase 5.4 whether to keep it (acceptable if accessible) or switch to a full overlay.
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

- v0 pushes directly to `main`, and every merge to `main` auto-deploys. Until Phase 21, rule: v0 and other agents work on a branch; `main` changes only through a reviewed pull request.

## 6.6 Roadmap gap — design system & brand identity (added 10 September 2026, after audit)

- Phase 1 delivered exactly the foundation v0 was asked for (tokens, typography, spacing, Button / Badge / Card / Input, breakpoints, container). The **full design system** specified in the previous roadmap revision — links, icon buttons, all form controls, tables, dialogs, tooltips, tabs, accordions, pagination, surfaces/shadows/borders, loading/empty/error states — the **Professional Identity System** (identity header, availability, external profiles, hire CTAs) and the **responsive system** (explicit breakpoint matrix) were compressed into section 14 of revision 1 without a phase that builds them.
- There is **no brand identity yet**: `public/icon.svg` and the favicons are v0 defaults, `placeholder-logo.*` files are unused templates, and no art direction has been chosen — the current UI is the default shadcn/v0 look.
- Resolution: new **Phase 4 — Brand Identity & Design System Completion**, placed before i18n and before any new page, because every later page (package table, FAQ accordion, Brief Builder stepper, dialogs, admin tables) is assembled from these parts. Phase 1 keeps its status (numbering rule).

---

# 7. Decision Register (owner decisions)

Some phases cannot be completed honestly without a decision from the owner. Agents must not invent these answers; they mark the dependent phase **BLOCKED** (section 18.6) and continue with work that is safe to do.

| ID | Decision | Recommended default | Blocks (phase) |
|---|---|---|---|
| **D-01** | Brand spelling, production domain, sending e-mail domain | **Spelling resolved: "Artaveo"** (confirmed by the approved logo, 10 Sep 2026). **Interim contact e-mail resolved (11 Sep 2026):** `artaveo.dev@gmail.com` and WhatsApp `+93 790685832` are real, owner-confirmed channels, now live in `lib/site.ts` and the footer/mobile nav. **Still open:** the production domain and a domain-backed *sending* address with SPF, DKIM and DMARC for Phase 9.4's automated notifications — a personal Gmail inbox is a fine interim contact address but is not a substitute for that | 4.1 · 9.4 · 10.7 |
| **D-02** | Public identity: real name, portrait, published location / timezone | Real name + real portrait + timezone (city optional) | 3.3 (Hero) · 4.5 · 8.1 |
| **D-03** | Persian variant for `fa`: Dari-leaning (fa-AF), Iranian (fa-IR) or neutral; calendar and digits | Neutral vocabulary; Gregorian dates with Persian month names; Persian digits in prose, Latin digits in code, IDs and technical values. If Solar Hijri is added later, note that Afghan and Iranian month names differ (e.g. *Hamal* vs *Farvardin*) | 4.1 (Persian type) · 5.3 |
| **D-04** | Pricing transparency | Publish **starting-from** prices for productized packages and **typical ranges** for custom work; Discovery Sprint at a fixed price | 7.3–7.6 · 9.1 |
| **D-05** | Hire channels and which external profiles are real | Direct + one platform profile (Fiverr) for clients who want buyer protection; list only profiles that exist. **Confirmed live in footer (11 Sep 2026):** GitHub, LinkedIn, Fiverr, WhatsApp — all real, owner-supplied | 8.4 · 5.4 (footer) |
| **D-06** | Publication rights for case studies (Transportation System, Pazhuhesh Portal): client/employer consent, what may be shown | Written consent; screenshots with **demo data only**; no customer PII; confidential details generalised | 6.3 · 6.4 |
| **D-07** | Jurisdiction of operation (privacy law, invoicing, business registration, payment rails) | Document it; if EU-based, GDPR-grade privacy policy and data-processing choices | 10.2 · 28 |
| **D-08** | Availability state and response commitment | A promise that is sustainable (e.g. "reply within 1 business day") | 4.5 (Availability) · 13 (SLA) |
| **D-09** | Consultation format: free intro call length, paid consultation, tool | Free 20–30 min intro call, request-based in v1 | 19 |
| **D-10** | Supabase plan and region | Start on the plan that includes backups before real leads are stored, or implement Phase 24's external dump first | 9.3 · 24 |
| **D-11** | Optional early-client offer | None unless the owner explicitly wants one; if used, it is labelled clearly and time-boxed | 7.5 |
| **D-12** | Visual direction and light-theme / small-size logo variants | **Primary mark approved** (`Artaveo_-_Logo.png`, received 10 Sep 2026): a faceted charcoal "A" with a gold interior facet, wordmark ARTAVEO, tagline "Digital Development". Phase 4.1 derives tokens and missing variants from it instead of proposing options from scratch; the owner approves the derived light-theme wordmark, the simplified mark and the favicon in 4.1 | 4.1 · 4.6 |

Decisions and their dates are recorded in `docs/decisions.md`.

---

# 8. Release milestones & dependency rule

```text
M1  CREDIBLE LAUNCH       Phases 3–10   Brand identity, complete design system, real content, real services, working inquiry, SEO, legal, live on own domain
M2  OPERATING LAYER       Phases 11–19  Full schema, admin, lead pipeline, CMS, evidence, journal, search, notifications, consultation
M3  PRODUCTION ASSURANCE  Phases 20–25  Tests, CI/CD gates, security, observability, backup/restore, performance & a11y certification
M4  GROWTH & BUSINESS     Phases 26–30  Proposals, client portal, invoicing, content growth, conversion analytics
M5  FINAL AUDIT           Phase 31      International-grade audit → manual release decision
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
→ Launch readiness                           (10)  ── M1 gate
→ Full schema → Auth → Pipeline → CMS → Evidence → Journal → Search → Notifications → Consultation   ── M2
→ Tests → CI/CD → Security → Observability → Recovery → Certification                                ── M3
→ Growth tools                                                                                        ── M4
→ Final audit                                                                                         ── M5
```

Later phases may inform earlier design decisions, but they are never used as an excuse to skip an earlier phase's Definition of Done.

---

# 9. Milestone M1 — Credible Launch

Each phase below lists its goal, sub-phases and **exit criteria**. Exit criteria are in addition to the general Definition of Done (section 17).

## Phase 3 — Content Truth Pass & Home Page  ✅ COMPLETE

**Goal:** a truthful, finished home page mounted inside the site shell, fed by a typed content layer.

> Phase 3 comes before i18n routing (Phase 5) only because it had already started. To respect principle 10, all Phase 3 content is bilingual-shaped from day one (`{ en, fa }`), and Phase 5 moves the page under `app/[locale]/` without rewriting it.

### 3.1 Content truth pass
- delete the fictional projects, their metrics and the AI-generated product images (6.1)
- replace placeholder e-mail and social links with real values from D-01 / D-05, or remove them until they exist
- rewrite the voice to section 16.1 (one developer, "I"; brand name "Artaveo")
- add a build-time guard that fails if a published content item contains an unresolved placeholder pattern such as `[CLIENT_NAME]`

### 3.2 Typed content layer
- `content/` holds data; `types/content.ts` holds shapes that match the Phase 11 tables: `Project`, `Service`, `ServicePackage`, `ServiceAddon`, `EngagementModel`, `Recommendation`, `Article`, `Technology`, `SiteSettings` (incl. availability)
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

### 3.5 Closure checklist — ✅ CLOSED (11 September 2026)

All eight items complete. Full implementation and verification detail in `docs/phases/PHASE-3-README.md`.

- [x] `lib/site.ts`: removed `hello@artaveo.studio`; replaced root `github.com` / `linkedin.com` links with real profile URLs; dropped X. **Update:** the owner then supplied a real, currently-active e-mail (`artaveo.dev@gmail.com`) and WhatsApp number mid-closure — added as the confirmed interim contact channel (see D-01, section 7). This wasn't in the original eight items; it's owner-supplied new information, not scope creep.
- [x] voice (16.1): nav descriptions, `siteConfig.tagline`/`description`, Home metadata ("development studio") and Hero "View our work" → rewritten to first person / brand wording. `app/layout.tsx`'s default metadata (same "studio" wording, not originally named in this bullet) was fixed too and now derives from `siteConfig` instead of duplicating it.
- [x] deleted unused `public/images/work-*.png` and the unused v0 placeholder assets.
- [x] `/design-system`: `robots: { index: false, follow: false }` added and verified in the served HTML.
- [x] Insights Preview renders nothing while no article is published; the "In writing" draft state was removed from the public component (reserved for a future admin/preview view instead).
- [x] placeholder guard from 3.1: `scripts/check-content-placeholders.mjs`, wired into `pnpm build`; tested passing and failing.
- [x] bilingual shape (3.2): every prose content field is `{ en, fa }` (mirrored for now); all nine Home components read exclusively through selector functions in `lib/home-content.ts`.
- [x] phase document: `docs/phases/PHASE-3-README.md`, with Light/Dark × LTR/RTL × mobile/tablet/desktop screenshots.

**Scope moved out of Phase 3 (recorded, not dropped):** the Availability chip, Identity Header, Sticky Mobile CTA and the Expertise-matrix layout are designed and built in Phase 4 (4.5, 4.6); "How to Work Together", starting-from signals and proof-linked expertise *data* arrive with Phases 7 and 8. **Home is a living page:** every later phase that produces content for a Home section wires that section as part of its own Definition of Done.

**Exit criteria — met:** no fictional content anywhere in the repo's published content; every Home section renders correctly or is hidden when empty (Insights Preview, currently); Light/Dark × LTR/RTL × mobile/tablet/desktop screenshots recorded in the phase document; no horizontal overflow in any combination tested.

---

## Phase 4 — Brand Identity & Design System Completion  ⬜ NEXT

> **Historical debt / added after audit (10 September 2026)** — see 6.6. Phase 1 keeps its status; this phase restores the design scope of the previous roadmap revision and adds the missing brand identity.

**Goal:** a distinctive Artaveo identity and a complete, documented design system, applied to the existing shell and Home — so every later page is assembled from finished parts instead of inventing UI on the fly.

### 4.1 Art direction & brand identity (requires D-12, D-01 — **logo received 10 Sep 2026, spelling resolved**)

The primary mark is approved — a faceted charcoal "A" (folded-ribbon facets) with a gold interior facet, paired with a wide-tracked wordmark **ARTAVEO** and the tagline "Digital Development". This sub-phase no longer proposes direction options from scratch; it **derives the system from the approved logo** and fills the gaps the logo doesn't cover (light theme, small sizes, RTL, motion).

**Assets to place before this sub-phase starts** (provided outside the repo; see 4.1.1):
```text
public/brand/artaveo-mark-source.png       full-resolution source render (reference only, not production-optimized)
public/brand/artaveo-lockup-reference.png  mark + wordmark + tagline, cropped
public/brand/artaveo-mark-reference.png    mark only, cropped
```
These three files are **reference crops of the supplied render**, not production assets: the background is a photographic smoke texture, not transparent, and the mark itself is a glossy 3D render (gradients, bevel highlights, rim light) rather than flat vector art. They are enough to derive colour tokens and to use as a large hero asset, but production UI (header logo, favicon, badges) needs the derivation work below.

**4.1.1 Colour tokens derived from the logo** (measured from the supplied file):
- charcoal facet (mark) → base of a new **brand-neutral** scale, sampled around `#353535` (mid-facet) to `#5D5B5D` (highlight facet)
- gold interior facet / tagline → **brand accent**, sampled around `#C68B4B` (median) — use as an accent only (borders, icons, small highlights, the tagline-style small caps line), never as body text or large fills, since it doesn't clear AA contrast on either pure black or pure white at text sizes
- confirm both against the existing OKLCH tokens from Phase 1; adjust the brand hue to match the gold rather than inventing a new one

**4.1.2 Logo system — derive the missing variants** (none of these exist yet; the supplied file is the dark-theme hero lockup only):

| Variant | What changes from the supplied logo | Why |
|---|---|---|
| **Light-theme wordmark** | Wordmark switches from white to a near-black / dark-charcoal fill. Tagline gold can stay, or move slightly darker/less saturated for AA contrast on white. The mark itself (charcoal + gold) already reads on light backgrounds — it likely needs no colour change, only a check on legibility where the darkest facet nearly disappears against a pure-white page (a subtle 1px contour or a slightly lighter charcoal floor may be enough). | The supplied file is white-on-dark only; the site runs Light and Dark as equally first-class (principle 4). |
| **Flat / simplified mark** | Remove the gradients, bevel highlights and rim-light glow; flatten each facet to one solid tone (two tones total: charcoal + gold, or one tone for single-colour contexts). Keep the silhouette and the folded-ribbon negative space — that's the recognizable part. | The current render is a photorealistic 3D asset. At UI sizes (header ~28–32px, favicon 16–48px) the fine gradient and thin gold sliver won't survive; a flat version is what actually gets used in the product. The 3D render stays as a large "hero" asset (About page, Open Graph image, loading states) used sparingly. |
| **Monochrome mark** | Single flat colour: pure white version for dark surfaces, pure near-black version for light surfaces. No gold. | Needed for contexts with one ink: favicon fallback, watermark, print, embossed/engraved use, places the brand accent would clash. |
| **Mark-only lockup** | Just the "A", no wordmark, no tagline. | The full lockup's wide letter-spacing doesn't fit compact UI (header on narrow mobile, browser tab, avatar-sized badge). |
| **Compact lockup** | Mark + wordmark, tagline dropped. | Header logo at normal sizes — the tagline is a poster-level detail, not a UI-level one. |

None of this is a new design; it is the same approved mark rebuilt as flat, layered vector art (SVG) so it scales and recolors cleanly. If the owner has the original design file (Figma/Illustrator/AI-tool project), export directly from there instead of rebuilding from the PNG — it will be cleaner than any rebuild from a rendered image.

**4.1.3 Everything else this sub-phase still owns**
- benchmarks are used for patterns only; no visual copying (section 4)
- clear-space and minimum-size rules for every lockup variant above; the wordmark is Latin-only and is never mirrored in RTL contexts (in `fa` layouts it still reads left-to-right, set apart from the surrounding RTL text)
- favicon, app icons (light/dark), Open Graph image template — replacing the v0 default `icon.svg` and placeholder logos, built from the flat/monochrome variants above, not the 3D render
- semantic colours (success / warning / danger / info) in both themes, chosen to sit alongside the charcoal/gold palette without competing with the gold accent
- **typography pairing:** the wordmark's own geometric, wide-tracked display style is a strong cue for the Latin display face; pair it with a readable Latin text face, and the Persian face (Vazirmatn or a chosen alternative) matched in optical size and weight; separate scales and line-heights per script; numeral rules per D-03
- **imagery rules:** product screenshots only inside frames with demo data; architecture diagrams in one consistent style; no stock photos of people; no AI images of fictional products
- **iconography:** one icon set (lucide) with size and stroke rules and an explicit RTL mirroring list; stroke weight chosen to sit comfortably next to the mark's facet style
- **motion principles:** durations, easing, what may animate, reduced-motion behaviour; the design must stand without motion — the mark's rim-light/glow is a static design detail here, not something to animate on every hover

**Output:** `docs/design/art-direction.md` records the derived tokens, the approved logo variants (with the files above), and the light-theme + small-size rules — for the owner to confirm rather than choose from scratch.

### 4.2 Token refinement & design-system audit (closes P1-A)
- AA contrast for every text/background pair in both themes; one focus-ring token used everywhere
- surface / elevation levels, border and shadow scales, radius scale, z-index scale, motion tokens
- layout tokens: container widths, grid, section-spacing rhythm, reading width for prose
- **responsive matrix:** small mobile 320–374 · mobile 375–639 · tablet 640–1023 · laptop 1024–1279 · desktop 1280–1535 · large 1536–1919 · ultra-wide ≥ 1920 (capped content width, no stretched lines)
- logical properties only in components (`ms-*`, `me-*`, `ps-*`, `start-*`) — no physical left/right

### 4.3 Missing primitives
Existing: Button, Badge, Card, Input. Add — each RTL-correct, keyboard-accessible, both themes, built on the existing Base UI / shadcn foundation:

| Group | Primitives |
|---|---|
| Actions | Link (inline, standalone, external with indicator) · IconButton · ButtonGroup · Kbd |
| Forms | Label · Field (label + hint + error) · Textarea · Select · Checkbox · RadioGroup · Switch · SegmentedControl · FileInput shell (upload wiring in Phase 14) · FormMessage |
| Overlays | Dialog · Sheet / Drawer · Popover · Tooltip · DropdownMenu · Toast |
| Disclosure & navigation | Tabs · Accordion · Pagination · Stepper (Brief Builder) · Progress |
| Data display | Table (with stacked mobile mode) · Tag · Avatar · Separator · Skeleton · Status badge set (*Live · In development · Private · Archived · Concept*) |
| Content | Callout · Code block (LTR-locked, copy button) · Blockquote · Prose styles for articles in `en` and `fa` |

Split into sessions if needed: **4.3a** actions + forms · **4.3b** overlays · **4.3c** disclosure, data display, content.

### 4.4 Patterns & states
- Page Header, Section Header (promote the Home one to a shared pattern), CTA Section, feature list, proof row without numbers
- state patterns: Empty (admin/preview only), Loading (skeletons), Error (inline / section / page), Success, Rate-limited, Offline
- Browser Frame / Device Frame, diagram container with text alternative
- form layouts: single-column and multi-step

### 4.5 Identity components (restores the previous revision's Professional Identity System)
- Identity Header (name, title, tagline, portrait slot — content per D-02)
- Availability Chip + Availability Card (states from settings, "last updated")
- Response Commitment Note
- External Profile Links (verified URLs only)
- primary Hire CTA and Consultation CTA variants
- Sticky Mobile CTA

### 4.6 Visual pass on Shell & Home (requires D-12 approval of the derived variants from 4.1)
- apply the chosen direction to header, mobile navigation, footer, command palette and every Home section
- redesign the Home "Tech Stack" block into the Expertise-matrix layout (data wiring follows in Phases 7–8)
- fix known Home issues: Hero code-panel line overflow around 1024 px, "Why Artaveo" heading line break, portrait-placeholder head shape
- no content changes beyond the rules of Phase 3

### 4.7 Living documentation
- `/design-system` presents every token, primitive, pattern and state in Light/Dark × LTR/RTL with usage notes and do / don't examples (still `noindex`)

**Exit criteria:** D-12 approved and recorded (derived tokens, logo variants, light-theme and small-size rules); every primitive verified for keyboard, screen reader, RTL and both themes (results in `docs/phases/PHASE-4-README.md`); no component uses physical left/right; no hard-coded colours outside tokens; the Home visual pass approved by the owner; no dependency added without a reason.

---

## Phase 5 — Internationalization & Shell Completion

**Goal:** real bilingual routing and a finished global shell **before** any new page is built.

### 5.1 Locale routing
- `app/[locale]/…` with `en` and `fa`; middleware negotiates the locale on first visit and respects a stored choice
- the language switcher maps to the **equivalent route** in the other locale (never back to Home)
- `<html lang dir>` set server-side per locale — no client-side direction flip, no flash

### 5.2 Dictionaries
- typed message keys; a missing key fails type-check or tests
- metadata, navigation, validation messages, empty/error states and alt text are all translated

### 5.3 Persian specifics (per D-03)
- Vazirmatn for `fa`, with line-height and letter-spacing tuned separately from Latin
- dates, numbers and currency through `Intl` with the chosen conventions
- Latin technical terms inside Persian sentences wrapped with `<bdi>` (e.g. *Next.js*, *PostgreSQL*)
- code blocks, terminal output, URLs and e-mail addresses always LTR
- icon mirroring rules: directional icons mirror, brand/media icons never do

### 5.4 Shell completion
- "Home" added; navigation: Work · Services · Process · About · Insights (Insights hidden until content exists) · Contact
- right controls: Search · Language · Theme · **Start a Project**
- mobile: accessible navigation (decide sheet vs full overlay and record the decision) + wire the **Sticky Mobile CTA** (built in 4.5) on content pages
- header: sticky, scroll-state, solid on content pages, keyboard accessible, skip-to-content link
- footer: only real links; external profiles from D-05; locale-aware legal links
- command palette fed by the content selectors, per locale

### 5.5 Global boundaries
- `loading`, `error` and `not-found` per locale, designed (not default)

**Exit criteria:** switching language on any existing route lands on the same route in the other locale with correct `lang`/`dir`; no hard-coded UI strings; RTL review completed for the shell.

---

## Phase 6 — Work & Case Study Engine

**Goal:** real projects become the strongest proof on the site.

### 6.1 `/work` index
- project grid (1 / 2 / 2–3 columns), featured first
- filters (category, technology) appear **only when there are enough projects to need them** (threshold recorded in config; with two projects, no filters)
- honest status badges: *Live* · *In development* · *Internal / private* · *Archived* · *Concept*

### 6.2 Case study template

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

### 6.3 Case study — Transportation System (requires D-06)
Candidate highlights from the repository (verify each against the code before publishing):
- intercity booking with a live seat map; seat holds and confirmation enforced server-side, never in the browser
- PostgreSQL row-level security combined with server-side authorization and a permission center for limited admins
- operations admin: routes, buses, drivers, trips, trip lifecycle, bookings, reports, CSV exports
- coupons, loyalty foundation, public CMS lite and responsive image cropping
- payment infrastructure: database-level payment state machine, payment status history, refunds including partial refunds
- honest status: in active development; real payment-provider integration pending
- process evidence: phased roadmap and per-phase implementation documents

### 6.4 Case study — Pazhuhesh Complex Portal (requires D-06)
- bilingual Dari/English portal with RTL-native interface
- two admin roles with role-based routing and department-scoped permissions
- offline-first data layer and installable PWA with caching tuned per data type; admin excluded from caching
- server-side rate-limited submissions via an edge function

### 6.5 Engineering evidence
- "How this was built" links from each case study to the public repository and, where allowed, to its roadmap and phase documents — real, verifiable process evidence

### 6.6 Media v1
- screenshots captured with **demo data only**; Browser Frame / Device Frame components; required alt text; `next/image` with explicit sizes and priority only for above-the-fold media

**Exit criteria:** both case studies published in `en` and `fa` (or explicitly blocked on D-06); every factual claim listed in the claims ledger; no real personal data visible.

---

## Phase 7 — Services, Packages & Pricing Signals

**Goal:** a visitor can understand, compare and pre-qualify an offer without a call.

### 7.1 Curated service catalogue (5–7 services)

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

### 7.2 Service detail blueprint

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

### 7.3 Package model
- tiers: **Starter · Standard · Custom** (Custom = "scoped after discovery", never a fake price)
- fields per tier: `summary`, `forWhom`, `included[]`, `notIncluded[]`, `deliverables[]`, `deliveryDays {min,max}`, `revisions`, `supportDays`, `requirements[]`, `price {amount, currency, type: fixed | from | quote}`
- mobile: stacked cards with a sticky tier switcher; desktop: side-by-side table with a "Not included" row

### 7.4 Add-ons
- configurable records (`title`, `description`, `price`, `deliveryImpactDays`); never hard-coded in components

### 7.5 Pricing signals (per D-04)
- **What drives cost** block: number of roles, integrations, content volume, languages, deadlines
- typical ranges for custom work; starting-from for packages; payment schedule summary linking to the Working Agreement
- optional early-client offer only if D-11 says so

### 7.6 Engagement models

| Model | When it fits | Billing |
|---|---|---|
| **Discovery Sprint** | New or unclear projects — the low-risk first step | Fixed price, fixed deliverable: scope, architecture outline, estimate |
| Fixed-scope Project | Clear scope after discovery | Milestones |
| Productized Service | Standard needs matching a package | Package price + add-ons |
| Care Plan | Live product needing ongoing care | Monthly |
| Long-term Part-time | Ongoing product development | Monthly block of hours |

**Exit criteria:** every published service has all blueprint sections in both locales; no price shown that the owner has not approved; package table accessible (real table semantics on desktop, labelled cards on mobile).

---

## Phase 8 — About, Process & Working Agreement

**Goal:** answer the questions clients are afraid to ask.

### 8.1 About
Story (not a CV) · the person (D-02) · technical focus · how I work · values · languages · timezone and overlap hours · tools · external profiles (verified only) · CTA.

### 8.2 Process
`01 Discover · 02 Define · 03 Design · 04 Architect · 05 Build · 06 Test · 07 Launch · 08 Support` — each with purpose, activities, output, client involvement, decisions and risks.

### 8.3 Working Agreement ("How we'll work")
- communication channel and cadence (e.g. weekly written update, demo per milestone)
- response commitment (D-08)
- milestones, deposits and payment timing
- **ownership:** code and IP transfer to the client on payment; third-party accounts (domain, hosting, database) created in the client's name
- handover package: repository, documentation, environment template, runbook, credentials transfer
- warranty window for defects; what counts as a change request and how it is priced
- confidentiality / NDA availability

### 8.4 Hire channels (per D-05)
**Hire Channel Selector** comparing: *Direct* (direct contact, no platform fee) vs *Via platform* (buyer protection/escrow, platform fees and rules). The website stays canonical; platform profiles link back to it.

### 8.5 Quality baseline
A short, honest page of what every project receives — only commitments the owner actually keeps (e.g. TypeScript, tests on critical flows, WCAG 2.2 AA target, security review, documentation, handover).

**Exit criteria:** every commitment on these pages is approved by the owner and recorded in `docs/decisions.md`.

---

## Phase 9 — Start a Project (Inquiry v1 — first real backend slice)

**Goal:** qualified, persisted, notified inquiries — no fake success.

### 9.1 Brief Builder
Steps: engagement model / service → project type → goal → key features (checklist) → timeline → budget range (optional; ranges per D-04) → links / references → contact details → preferred language and channel → consent.
- pre-fill from the page that launched it (`?service=`, `?package=`)
- per-step validation, back/forward without data loss, keyboard and screen-reader friendly
- final **Brief Summary** screen before submit; the client receives the same summary by e-mail

### 9.2 Server handling
- one schema shared by client and server; server re-validates everything
- honeypot + rate limit per IP/e-mail + optional privacy-friendly challenge
- idempotency key per submission to prevent duplicates on double click or retry

### 9.3 Persistence (minimal slice of the Phase 11 schema)
- `inquiries` and `inquiry_events` tables; RLS: no public select; inserts only through the server
- source attribution (referrer, UTM, channel) stored without extra personal data

### 9.4 Notifications (requires D-01 domain + DNS authentication)
- owner alert + client confirmation through a provider abstraction
- **outbox pattern:** persist first, send after; failed e-mails are retried and never lose the inquiry

### 9.5 States
`Idle · Editing · Step error · Submitting · Persisted-notification-pending · Success · Server error · Rate limited · Offline`

### 9.6 Scope limits
File attachments are deferred to Phase 14 (uploads are a security surface); v1 accepts links.

**Exit criteria:** end-to-end submission verified in both locales; duplicate submission creates one record; provider outage does not lose data; spam controls tested.

---

## Phase 10 — Launch Readiness  (M1 gate)

### 10.1 SEO
Unique titles/descriptions per page and locale · canonical · hreflang · sitemap · robots · dynamic Open Graph images · structured data: `Person`, `ProfessionalService`, `WebSite`, `BreadcrumbList`, `CreativeWork` for case studies, `Service` + `Offer` only where a price is published, `FAQPage` for FAQs.

### 10.2 Legal & privacy (per D-07)
Privacy policy (what the inquiry collects, why, retention, rights, processors) · terms · imprint if required · prefer cookie-less analytics; if any non-essential cookie is used, a consent banner with a real reject option.

### 10.3 Analytics events
`page_view · project_view · service_view · package_compare · cta_click · brief_start · brief_step · brief_submit · consultation_request · external_profile_click · language_switch · search_used` — no form contents, no personal data in events.

### 10.4 Performance budget
Mobile CWV targets from section 3; route JS budget recorded; fonts subset and preloaded carefully; images sized and modern formats.

### 10.5 Accessibility
Keyboard-only pass, screen reader pass (one desktop + one mobile), 200 % zoom, reduced motion, contrast, form errors announced, RTL reading order.

### 10.6 Pre-launch content check
Every claim in the claims ledger · no visible placeholder · every link resolves · both locales complete · 404 designed.

### 10.7 Deploy
Production domain (D-01) · environment variables audited · preview deployments on · `main` protected.

**Gate:** `M1 LAUNCH — MANUAL APPROVAL REQUIRED`.

---

# 10. Milestone M2 — Operating Layer

## Phase 11 — Data Model & Migrations

**Goal:** the typed content model becomes the database, without changing page components.

- ADR for bilingual storage (per-locale columns vs `*_translations` tables) before the first migration
- migrations are versioned SQL files in `db/migrations/`, each with a rollback note
- one-way import script from `content/` to the database; selectors switch source behind the same interface
- RLS on every table; public reads only for `published = true` rows; writes only through server code

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

## Phase 12 — Admin Authentication & Authorization
- Supabase Auth for admin only; MFA required for the owner role
- roles: `owner`, `editor` (content only, no leads) — permissions checked server-side on every action
- protected `/[locale]/admin` routes and server actions; no reliance on hidden routes
- secure sessions, auth event logging, audit log for every admin mutation

## Phase 13 — Lead Pipeline
```text
NEW → REVIEWED → QUALIFIED → CONTACTED → DISCOVERY → PROPOSAL → WON | LOST → ARCHIVED
```
- transitions enforced in the database; every transition written to `inquiry_events`
- notes, tags, priority, follow-up date, source attribution, link to service/package
- **SLA indicator** comparing time-to-first-reply with the published response commitment
- CSV export; no fake dashboards or invented business metrics

## Phase 14 — CMS & Media
- editors: projects + case-study sections, services, packages, add-ons, FAQs, engagement models, articles, settings/availability, navigation
- draft → preview → publish → unpublish; per-locale completeness indicator; publishing a locale requires its required fields
- media uploads: type/size validation server-side, safe names, storage policy, required alt text, focal-point cropping for responsive crops
- on-demand revalidation of affected routes after publish
- attachments for the Brief Builder enabled here, behind the same upload rules

## Phase 15 — Verified Evidence (Recommendations & Testimonials)
- the owner generates a single-use **request link**; the recommender submits statement, role, relationship, optional profile URL and explicit consent to publish
- moderation queue: approve · request change · reject; meaning is never edited, typos only with consent
- verification labels shown publicly: *Submitted via verified request* · *Linked to platform review* · *Linked public profile*
- recommendation = about working with the developer; testimonial = tied to a delivered project/service
- sections stay hidden until at least one item is published

## Phase 16 — Insights / Engineering Journal
- article model with statuses `Draft · Review · Scheduled · Published · Archived`
- table of contents, LTR-locked code blocks with copy button, images, related projects/services/articles, RSS per locale, reading time per locale
- seed topics from real work (e.g. server-side seat holding, RLS + server authorization, offline-first caching per data type, running bilingual RTL products)

## Phase 17 — Search & Command Palette
- index built from published content per locale (pages, projects, services, articles, technologies)
- recent searches, suggestions, keyboard navigation, highlighted matches, loading and no-result states
- interface ready for a server-side search provider later

## Phase 18 — Notifications & Outbox
- provider abstraction (e-mail first; others later) with bilingual templates
- events: new inquiry, inquiry confirmation, consultation request/confirmation, evidence submitted, publish events, system error
- retries with backoff, delivery log, alert when a message keeps failing

## Phase 19 — Consultation
- **v1 (request-based):** client proposes time windows in their timezone; owner confirms; calendar invite (ICS) sent; reschedule/cancel links
- **v2:** calendar provider behind the same interface (per D-09); availability slots; buffer times
- consultation always linked to an inquiry

---

# 11. Milestone M3 — Production Assurance

## Phase 20 — Testing
- **Unit:** schemas, formatters (dates/digits per locale), selectors, state transitions, pricing display rules
- **Integration:** inquiry persistence + outbox, RLS policies, admin authorization, CMS mutations, uploads
- **E2E (critical flows):** Home → Work → Case Study · Home → Service → Package → Brief Builder → Submit · language switch on every route type · theme switch · search · admin login · publish project · move inquiry through pipeline
- automated axe checks on key templates in both directions

## Phase 21 — CI/CD & Release Gates
```text
INSTALL → TYPECHECK → LINT → UNIT → INTEGRATION → BUILD → E2E (preview) → SECURITY (deps audit, secret scan) → DEPLOY
```
- branch protection on `main`; agents (v0 included) work through pull requests
- preview deployment per pull request; a failing gate blocks the release

## Phase 22 — Security Hardening
- security headers and CSP; rate limits on every public mutation; CSRF posture of server actions verified
- XSS review of rich content, SQL injection review of any raw query, IDOR tests on admin resources
- upload hardening; secret inventory and rotation plan; dependency policy

## Phase 23 — Observability
- structured logs with correlation IDs from request to database to outbox
- error tracking; business events (inquiry submitted, notification failed, content published, auth events)
- uptime check on the inquiry endpoint; alert on repeated notification failure

## Phase 24 — Backup & Recovery
- decision per D-10; if the database plan has no platform backups, a scheduled external `pg_dump` to separate storage is the minimum (lesson carried over from the Transportation System project, where the free plan had no restorable backups)
- media metadata and storage objects included; content export
- RPO/RTO written down; **a restore test is performed** — a backup never restored is not verified
- rollback procedure for deployments and migrations; recovery runbook

## Phase 25 — Performance & Accessibility Certification
- field data review, Lighthouse CI budgets per route, image and font audit
- manual assistive-technology pass on the finished product in both locales

---

# 12. Milestone M4 — Growth & Business Tools

Prepared for, not built early. Each phase starts only when the owner confirms the need.

## Phase 26 — Proposal & Estimate Builder
Qualified inquiry → proposal (scope, milestones, price, validity, terms) → shareable link → accept → PDF; linked to the lead pipeline.

## Phase 27 — Client Portal (minimal)
Project timeline, milestones, files, decisions log, invoices list; magic-link access; no chat product.

## Phase 28 — Invoicing & Payments
Provider abstraction; payment rails chosen per D-07; platform channel remains an alternative.

## Phase 29 — Content Growth
Newsletter, resources, `/now`, `/uses`, public changelog, downloadable résumé.

## Phase 30 — Conversion Analytics
Funnels from landing to brief submit, drop-off per Brief Builder step, channel attribution; experiments only when traffic makes them meaningful.

---

# 13. Milestone M5 — Final Audit

## Phase 31 — International-Grade Product Audit
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
| **Identity Header** | Name, title, one-line value, portrait | Toptal B-07 | `site_settings` | Portrait and name only if D-02 approves |
| **Availability Card / Chip** | Availability state, next opening, response commitment, timezone overlap, languages | Fiverr B-20 | `site_settings` | Only states the owner maintains; "last updated" date stored |
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
| **Response Commitment Note** | Small line near every primary CTA | Fiverr B-20 | `site_settings` | Must be kept (SLA in Phase 13) |
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
/[locale]/contact                 Direct contact + hire channels
/[locale]/consultation            Consultation request (Phase 19)
/[locale]/privacy · /terms        Legal
/[locale]/admin/…                 Admin (Phase 12+)
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
- tests appropriate to risk pass (from Phase 20 on, in CI)
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
