# Artaveo

The website of **Artaveo**, an independent full-stack development studio run by one developer. It is a bilingual (English / Persian, left-to-right and right-to-left) portfolio and client-acquisition site: real projects as proof, a small set of clearly described services, and a low-risk first step — a brief or a short intro call — before any commitment.

Live (interim domain): <https://artaveo-seven.vercel.app>

This repository holds the public site, the private admin panel, the database schema and the tests. Everything on the site is traceable to a real project, repository or document; nothing is invented (`docs/content/claims-ledger.md`).

## What is in it

- **Public site** — Home, Work (case studies), Services and packages, About, Process, Contact, Insights (an engineering journal with per-language RSS), Privacy and Terms. Search palette, dark and light themes, installable as a PWA with an offline-safe shell.
- **Start a project** — a multi-step Brief Builder with server-side validation, idempotent submission, an offline outbox and optional image attachments.
- **Consultation** — a request-based intro call: the visitor proposes time windows in their own time zone, the owner confirms, and a calendar invitation is sent. A private page per request lets the visitor cancel or ask for another time.
- **Verified recommendations** — people the owner has worked with submit a statement through a single-use link; nothing is published until the owner approves it.
- **Admin panel** (`/admin`) — sign-in with optional two-factor authentication and two roles (`owner`, `editor`). The owner works the lead pipeline, consultations and the notification log; editors manage content (services, projects, articles, media, settings, navigation).
- **Notifications** — one idempotent outbox with retries and a delivery log. Real e-mail sending is switched off until the production domain is set up (see *Status*).

## Stack

Next.js (App Router) · React 19 · TypeScript · Tailwind CSS v4 · `next-intl` (en / fa) · Supabase (PostgreSQL, Auth, Storage) · Base UI · deployed on Vercel.

No component library is used for the site's own design system beyond Base UI primitives; there is no client-side Supabase — the browser never talks to the database, every read and write goes through server code.

## Getting started

Requirements: **Node.js 22** (`.nvmrc`) and **pnpm 10**.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local      # then fill in what you need (see below)
pnpm dev                        # http://localhost:3000
```

Environment variables are described in `.env.example`, and every one the code reads is explained — purpose, what a leak costs, how to rotate — in [`docs/security.md`](docs/security.md) § 6. Nothing secret belongs in the repository.

Most content and every form are backed by Supabase. Without `SUPABASE_URL` and the keys, database-backed features (inquiries, consultations, the admin, CMS content) are unavailable. For a complete local environment with no external account, use the **test stack** — a throw-away PostgreSQL and PostgREST with every migration applied — described in [`docs/testing.md`](docs/testing.md).

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | development server |
| `pnpm build` | content-placeholder check, service-worker generation, production build |
| `pnpm start` | serve the production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint — errors block; the warning count may not grow |
| `pnpm check:content` | fails if a `[PLACEHOLDER]` appears in published copy |
| `pnpm check:audit` | dependency-advisory policy (needs network) |
| `pnpm verify` | typecheck + lint + content check + unit tests |
| `pnpm test:unit` | unit tests (Node only) |
| `pnpm test:stack:up` / `down` | start / stop the local database stack |
| `pnpm test:integration` | integration tests against the stack |
| `pnpm test:stack:build` then `pnpm test:e2e` | production build against the stack, then browser and accessibility tests |

## Repository layout

```text
app/            routes (App Router), Server Actions (app/actions), route handlers (app/api)
components/     UI: design system, site sections, admin, forms
lib/            domain logic, data access, notifications, consultation, search, security
messages/       en.json and fa.json — the two dictionaries (kept in parity by a test)
i18n/           locale routing
db/migrations/  versioned SQL, applied in order
docs/           roadmap companions: phase reports, ADRs, runbooks, security, testing, CI
tests/          unit, integration and browser tests, and the local test stack
scripts/        build and maintenance scripts
public/         static assets
```

## Documentation

| Document | Read it for |
|---|---|
| [`ROAD-MAP-ARTAVEO.md`](ROAD-MAP-ARTAVEO.md) | the source of truth: goals, principles, decisions, every phase and its status |
| [`docs/phases/`](docs/phases) | what each phase changed, how it was verified, known issues |
| [`docs/security.md`](docs/security.md) | the security model, controls, secret inventory, residual risks |
| [`docs/testing.md`](docs/testing.md) | the three test layers and the local test stack |
| [`docs/ci.md`](docs/ci.md) | the CI pipeline, required checks, one-time GitHub and Vercel settings |
| [`docs/runbooks/`](docs/runbooks) | admin onboarding, notifications, secret rotation |
| [`docs/adr/`](docs/adr) | architecture decisions |
| [`docs/content/claims-ledger.md`](docs/content/claims-ledger.md) | the evidence behind every public claim |

## Quality gates

Every pull request runs typecheck, lint, the content check, unit tests, integration tests on real PostgreSQL and PostgREST, a production build with browser and accessibility (axe) tests in both languages and both themes, a dependency-advisory gate and a secret scan of the full history. One aggregate check, **`CI passed`**, is the only status branch protection needs to require. Details: [`docs/ci.md`](docs/ci.md).

## Status

The roadmap is the single source of truth for what is done and what is next — start with the "Document status" section of [`ROAD-MAP-ARTAVEO.md`](ROAD-MAP-ARTAVEO.md). In short: the site is live on an interim domain; the production domain is still to be decided, and until it is, real e-mail sending stays off (notifications are logged, not delivered).

## Security

Please report vulnerabilities privately to **artaveo.dev@gmail.com** rather than opening a public issue. What is protected, by what, and what is knowingly left open: [`docs/security.md`](docs/security.md).

## Contact

- GitHub: <https://github.com/artaveo>
- LinkedIn: <https://www.linkedin.com/in/artaveodevelops>
- Fiverr: <https://www.fiverr.com/sellers/zakir_naseri>
- E-mail: artaveo.dev@gmail.com

## License

The source is published for reference. No license is granted for reuse, copying or redistribution; all rights are reserved by the owner.
