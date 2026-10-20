#!/usr/bin/env node
/**
 * The public-copy gate (roadmap § 16, Phase 32.3 — it replaces Phase 3.1's
 * placeholder-only check). Fails the build when a public string breaks a rule
 * in `scripts/content-rules.mjs`: a draft placeholder, "§" or a phase number,
 * a technology name or backend word, «دوزبانه» / "bilingual", "one person"
 * framing, «من» / «تو» instead of the brand and «شما», a defensive «…، نه …»,
 * an unproven claim, or an Iranian word where Dari has its own.
 *
 * What it reads — only what a visitor can see:
 *   1. messages/fa.json and messages/en.json, every namespace except the
 *      admin's own (ADMIN_NAMESPACES);
 *   2. the content seeds in lib/ — the published projects' public fields, the
 *      published services, the Brief Builder options, the contact channels,
 *      the legal pages, the founder's profile and the site description;
 *   3. the customer e-mails (lib/notifications/*templates.ts), as string literals;
 *   4. with `--db` (CI and `npm run check:content`, when the Neon Data API is
 *      configured): the published database content — projects, their blocks,
 *      screenshot captions and image descriptions, sale options, after-sales
 *      services, services, steps, questions and the reply line.
 *
 * Run: node --import ./scripts/register-ts-resolve.mjs scripts/check-content.mjs [--db]
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { findViolations, isPersian } from './content-rules.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const withDb = process.argv.includes('--db')

/** Namespaces only the owner sees in the admin, or only the internal /design-system page. */
export const ADMIN_NAMESPACES = ['Admin', 'BlockHints', 'TechCategories', 'ServiceType', 'DesignSystemPage']

/**
 * Words a legal page must use to say who processes a visitor's data — a
 * privacy policy names its processors; that is a disclosure, not marketing.
 */
const LEGAL_ALLOWED = new Set(['tech-name'])

/** Keys the customer says in their own voice («موافقم…», "I agree…") — the first person is theirs, not Artaveo's. */
const CUSTOMER_VOICE = /consentLabel$/

/** @type {{ source: string, where: string, id: string, why: string, match: string, text: string }[]} */
const problems = []

function check(source, where, text, lang, allowed = new Set()) {
  if (typeof text !== 'string') return
  for (const hit of findViolations(text, lang)) {
    if (allowed.has(hit.id)) continue
    problems.push({ source, where, ...hit, text })
  }
}

/** Walks any value; `{ en, fa }` pairs are checked in their own language. */
function walk(source, where, value, allowed, skipKeys = new Set()) {
  if (value == null) return
  if (typeof value === 'string') return check(source, where, value, isPersian(value) ? 'fa' : 'en', allowed)
  if (Array.isArray(value)) return value.forEach((item, i) => walk(source, `${where}[${i}]`, item, allowed, skipKeys))
  if (typeof value !== 'object') return
  const keys = Object.keys(value)
  if (keys.includes('en') && keys.includes('fa') && keys.every((k) => k === 'en' || k === 'fa')) {
    check(source, `${where}.en`, value.en, 'en', allowed)
    check(source, `${where}.fa`, value.fa, 'fa', allowed)
    return
  }
  for (const key of keys) {
    if (skipKeys.has(key)) continue
    walk(source, where ? `${where}.${key}` : key, value[key], allowed, skipKeys)
  }
}

// 1. the dictionaries ---------------------------------------------------------
for (const lang of ['fa', 'en']) {
  const file = `messages/${lang}.json`
  const messages = JSON.parse(readFileSync(path.join(root, file), 'utf8'))
  const flat = (obj, prefix) =>
    Object.entries(obj).forEach(([k, v]) =>
      typeof v === 'string' ? check(file, `${prefix}${k}`, v, lang, CUSTOMER_VOICE.test(k) ? new Set(['voice-i']) : undefined) : flat(v, `${prefix}${k}.`),
    )
  for (const [namespace, value] of Object.entries(messages)) {
    if (ADMIN_NAMESPACES.includes(namespace)) continue
    flat(value, `${namespace}.`)
  }
}

// 2. the content seeds -----------------------------------------------------------
/** Fields of a seed that never reach a page (identifiers, colours, links, flags). */
const NON_COPY = new Set(['id', 'slug', 'icon', 'href', 'src', 'url', 'portrait', 'name', 'technologies', 'brandColor', 'accentColor', 'platforms', 'kind', 'type', 'cta', 'timezone', 'state', 'updatedAt', 'year', 'githubUrl', 'liveUrl', 'coverImage', 'relatedServiceSlug', 'relatedProjectSlugs', 'status'])

const home = await import('../lib/home-content.ts')
for (const project of home.getAllProjectsRaw().filter((p) => p.published)) {
  const { title, category, summary, highlights, industry, outcomeLine, features, blocks } = project
  walk('lib/home-content.ts', `project ${project.slug}`, { title, category, summary, highlights, industry, outcomeLine, features, blocks }, undefined, NON_COPY)
}
walk('lib/home-content.ts', 'founder', home.getDeveloperProfile(), undefined, NON_COPY)

const services = await import('../lib/services-content.ts')
for (const service of services.getAllServicesRaw().filter((s) => s.published !== false)) {
  walk('lib/services-content.ts', `service ${service.slug}`, service, undefined, NON_COPY)
}
if (typeof services.getGlobalFaqsRaw === 'function') walk('lib/services-content.ts', 'global questions', services.getGlobalFaqsRaw(), undefined, NON_COPY)

const inquiry = await import('../lib/inquiry-content.ts')
for (const name of ['projectTypeOptions', 'featureTagOptions', 'timelineOptions', 'budgetBandOptions', 'preferredChannelOptions']) {
  walk('lib/inquiry-content.ts', name, inquiry[name], undefined, NON_COPY)
}

const contact = await import('../lib/contact-content.ts')
walk('lib/contact-content.ts', 'channels', contact.getDirectContactChannels({ whatsapp: '93700000000', phone: '93700000000', email: 'hello@example.com' }), undefined, NON_COPY)

const legal = await import('../lib/legal-content.ts')
walk('lib/legal-content.ts', 'privacy', legal.getPrivacyPolicy('hello@example.com'), LEGAL_ALLOWED, NON_COPY)
walk('lib/legal-content.ts', 'terms', legal.getTermsOfService('hello@example.com'), LEGAL_ALLOWED, NON_COPY)

const site = await import('../lib/site.ts')
walk('lib/site.ts', 'siteConfig', { description: site.siteConfig.description, tagline: site.siteConfig.tagline })

// 3. the customer e-mails, as string literals ---------------------------------------
const LITERAL = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g
for (const file of ['lib/notifications/templates.ts', 'lib/notifications/consultation-templates.ts', 'lib/inquiry-summary.ts']) {
  const lines = readFileSync(path.join(root, file), 'utf8').split('\n')
  lines.forEach((line, i) => {
    if (/^\s*(?:\*|\/\/|\/\*)/.test(line)) return // comments
    if (line.includes('// owner-facing')) return // the owner's own alerts, not customer copy
    for (const m of line.matchAll(LITERAL)) {
      const text = m[1] ?? m[2] ?? m[3]
      // Only sentences a reader sees: Persian text, or English with at least two words.
      if (!isPersian(text) && !/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(text)) continue
      if (/^[a-z_.:/-]+$/i.test(text) || text.includes('${') && !/\s/.test(text.replace(/\$\{[^}]*\}/g, ''))) continue
      check(file, `line ${i + 1}`, text.replace(/\$\{[^}]*\}/g, '…'))
    }
  })
}

// 4. the database ---------------------------------------------------------------------
let dbNote = 'database not checked (run with --db)'
if (withDb) {
  const { getDbClient } = await import('../lib/db/server.ts')
  const client = getDbClient()
  if (!client) {
    dbNote = 'database not checked: NEON_DATA_API_URL / NEON_SERVICE_JWT_PRIVATE_KEY are not set'
  } else {
    const read = async (table, columns, filter = (q) => q) => {
      const { data, error } = await filter(client.from(table).select(columns))
      if (error) throw new Error(`${table}: ${error.message}`)
      return data ?? []
    }
    const projects = await read('projects', 'id, slug, title, category, summary, highlights, industry, outcome_line, features', (q) => q.eq('published', true))
    const projectIds = new Map(projects.map((p) => [p.id, p.slug]))
    for (const { id, slug, ...fields } of projects) walk('database', `projects/${slug}`, fields)

    const inProject = (rows, label) => rows.filter((r) => projectIds.has(r.project_id)).forEach(({ project_id, id, ...fields }) => walk('database', `${label}/${projectIds.get(project_id)}/${id}`, fields))
    inProject(await read('project_blocks', 'id, project_id, title, body', (q) => q.eq('published', true)), 'project_blocks')
    inProject(await read('product_sale_options', 'id, project_id, title, summary, included', (q) => q.eq('published', true)), 'product_sale_options')
    inProject(await read('product_services', 'id, project_id, title, description', (q) => q.eq('published', true)), 'product_services')
    const media = await read('project_media', 'id, project_id, caption, media_assets(alt)')
    inProject(media.map((m) => ({ id: m.id, project_id: m.project_id, caption: m.caption, alt: m.media_assets?.alt ?? null })), 'project_media')

    const live = await read('services', 'id, slug, title, description, tagline, deliverables, for_whom, included, timeline', (q) => q.eq('published', true))
    const serviceIds = new Set(live.map((s) => s.id))
    for (const { id, slug, ...fields } of live) walk('database', `services/${slug}`, fields)
    for (const step of await read('service_process_steps', 'id, service_id, title, description')) {
      if (serviceIds.has(step.service_id)) walk('database', `service_process_steps/${step.id}`, { title: step.title, description: step.description })
    }
    for (const faq of await read('faqs', 'id, scope, service_id, question, answer')) {
      if (faq.scope === 'global' || serviceIds.has(faq.service_id)) walk('database', `faqs/${faq.id}`, { question: faq.question, answer: faq.answer })
    }
    for (const row of await read('site_settings', 'response_commitment')) walk('database', 'site_settings', row)
    dbNote = `database checked (${projects.length} published projects, ${live.length} services)`
  }
}

if (problems.length > 0) {
  console.error(`\n✖ ${problems.length} public string(s) break the content rules (ROAD-MAP-ARTAVEO.md § 16):\n`)
  for (const p of problems) {
    console.error(`  ${p.source} › ${p.where}\n    ${p.why}: «${p.match}»\n    ${p.text.length > 160 ? `${p.text.slice(0, 157)}…` : p.text}\n`)
  }
  console.error('Rewrite the sentence for the customer (§ 16.1–16.3), or unpublish it. Database text is edited in the admin.\n')
  process.exit(1)
}

console.log(`✓ Content check passed — dictionaries, content seeds, customer e-mails; ${dbNote}`)
