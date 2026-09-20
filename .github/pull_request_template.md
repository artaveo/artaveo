<!-- Every change reaches `main` through a pull request; CI must pass ("CI passed"). Delete what does not apply. -->

## What and why


## Checklist

- [ ] **CI passed** (typecheck, lint, unit, integration, build + browser tests, dependency audit, secret scan)
- [ ] Every visible string exists in **both** languages (`messages/en.json` and `messages/fa.json`), and the change was looked at in **Persian / right-to-left** too
- [ ] Logical CSS properties only (`ms-`/`me-`/`ps-`/`pe-`/`start`/`end`, `inset-inline-*`) — no `left`/`right`/`ml`/`mr`
- [ ] New behaviour has a test at the right level (`docs/testing.md`): unit for logic, integration for anything the database decides, browser for a user journey
- [ ] No new `[PLACEHOLDER]`, invented figure, price or claim (D-04, D-06)

## Only if it applies

- [ ] **Database migration** — file in `db/migrations/`, applied where and when: ____; RLS enabled on every new table; rollback block in the header
- [ ] **New dependency or environment variable** — reason: ____ (runtime dependencies are exceptions, not the default)
- [ ] **Decision Register** item touched: D-__
- [ ] **Preview** checked: (link)

## Notes for the reviewer

