#!/usr/bin/env node
/**
 * Dependency-advisory gate (Phase 22, roadmap "SECURITY (deps audit)").
 *
 *   node scripts/audit-gate.mjs
 *
 * Runs `pnpm audit` twice (production tree, and everything) and applies THIS policy:
 *
 *   - an advisory of severity HIGH or CRITICAL in the PRODUCTION tree fails the gate,
 *     unless it is listed in `.security/audit-allowlist.json` with a reason and a review date;
 *   - a CRITICAL advisory that exists only in the development tree (build tools, test
 *     tools) fails the gate too, on the same terms;
 *   - everything else (moderate/low, and high in dev-only tooling) is reported, never blocking.
 *
 * Why an allowlist and not "audit must be clean": a transitive advisory with no patched
 * release in the version of Next.js the project is on cannot be fixed by the project, but it
 * can be judged (is the vulnerable code reachable from visitor input?) and revisited. An
 * entry EXPIRES: past its date the gate fails again, which forces the judgement to be
 * repeated. An entry whose advisory no longer exists is reported as stale so the list shrinks.
 *
 * The audit itself needs the network (the npm advisory endpoint). If it cannot be reached
 * the gate FAILS — an unavailable check is not a passed check.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }

/**
 * Pure: decide the outcome from two audit reports and the allowlist.
 * `prod` / `all` are the `advisories` maps of `pnpm audit --json`.
 */
export function evaluate({ prod, all }, allowlist, now = new Date()) {
  const entries = allowlist?.entries ?? []
  const idOf = (advisory) => advisory.github_advisory_id ?? String(advisory.id)
  const prodIds = new Set(Object.values(prod).map(idOf))

  const blocking = []
  const allowed = []
  const informational = []
  const seen = new Set()

  for (const advisory of Object.values(all)) {
    const id = idOf(advisory)
    seen.add(id)
    const inProd = prodIds.has(id)
    const severity = advisory.severity
    const blocks = inProd ? RANK[severity] >= RANK.high : severity === 'critical'
    const record = { id, severity, module: advisory.module_name, title: advisory.title, tree: inProd ? 'production' : 'development', patched: advisory.patched_versions }
    if (!blocks) {
      informational.push(record)
      continue
    }
    const entry = entries.find((e) => e.id === id)
    if (!entry) blocking.push({ ...record, why: 'not in the allowlist' })
    else if (!entry.reason || !entry.expires) blocking.push({ ...record, why: 'allowlist entry has no reason or no expiry date' })
    else if (new Date(entry.expires).getTime() < now.getTime()) blocking.push({ ...record, why: `allowlist entry expired on ${entry.expires} — re-judge it, then renew or fix` })
    else allowed.push({ ...record, reason: entry.reason, expires: entry.expires })
  }

  const stale = entries.filter((e) => !seen.has(e.id)).map((e) => e.id)
  return { ok: blocking.length === 0, blocking, allowed, informational, stale }
}

function runAudit(prodOnly) {
  const args = ['audit', '--json', ...(prodOnly ? ['--prod'] : [])]
  // `pnpm audit` exits non-zero when it finds anything; the JSON on stdout is what matters.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = spawnSync('pnpm', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    try {
      const parsed = JSON.parse(result.stdout)
      if (parsed && typeof parsed.advisories === 'object') return parsed.advisories
    } catch {
      // fall through to retry
    }
    if (attempt === 2) throw new Error(`pnpm ${args.join(' ')} gave no usable report:\n${(result.stderr || result.stdout || '').slice(0, 600)}`)
  }
  return {}
}

function main() {
  let allowlist = { entries: [] }
  try {
    allowlist = JSON.parse(readFileSync(path.join(ROOT, '.security/audit-allowlist.json'), 'utf8'))
  } catch (err) {
    console.error(`cannot read .security/audit-allowlist.json: ${err.message}`)
    process.exit(2)
  }

  let report
  try {
    report = evaluate({ prod: runAudit(true), all: runAudit(false) }, allowlist)
  } catch (err) {
    console.error(`\nAUDIT COULD NOT RUN — treated as a failure.\n${err.message}`)
    process.exit(2)
  }

  const line = (r) => `  ${r.severity.padEnd(8)} ${r.module} — ${r.title.slice(0, 80)} [${r.id}] (${r.tree})`
  console.log(`Dependency audit: ${report.blocking.length} blocking, ${report.allowed.length} allowed, ${report.informational.length} informational.`)
  if (report.allowed.length) console.log('\nAllowed by .security/audit-allowlist.json (reviewed):\n' + report.allowed.map((r) => `${line(r)}\n           reason: ${r.reason}\n           review by ${r.expires}`).join('\n'))
  if (report.stale.length) console.log(`\nStale allowlist entries (advisory no longer present — delete them): ${report.stale.join(', ')}`)
  if (report.informational.length) console.log('\nNot blocking (moderate/low, or high in development-only tooling):\n' + report.informational.map(line).join('\n'))
  if (report.blocking.length) {
    console.error('\nBLOCKING:\n' + report.blocking.map((r) => `${line(r)}\n           ${r.why}${r.patched ? `; patched in ${r.patched}` : ''}`).join('\n'))
    process.exit(1)
  }
  console.log('\nGate passed.')
}

if (import.meta.url === `file://${process.argv[1]}`) main()
