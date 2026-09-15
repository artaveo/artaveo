#!/usr/bin/env node
/**
 * One-way import script (roadmap § 12): reads the live content straight
 * out of `lib/home-content.ts` and `lib/services-content.ts` — by
 * importing those actual modules at runtime, not by hand-copying their
 * values — and either upserts it into Supabase directly via
 * `@supabase/supabase-js`, or (with `--sql`) prints the equivalent SQL so
 * it can be reviewed or applied by another tool. Both modes are built from
 * the exact same row objects (see "buildImportModel" below) — there is no
 * separate hand-written SQL path that could drift from what the real
 * upserts do.
 *
 * Requires Node >= 22.6 (native `--experimental-strip-types`) — no
 * transpiler dependency. Type-only imports in the content files (e.g.
 * `import type { LocalizedText } from '@/types/content'`) are erased by
 * the flag and never need the `@/` alias resolved at runtime.
 *
 * Usage:
 *   node --experimental-strip-types scripts/import-content-to-db.ts --sql > /tmp/import.sql
 *     Prints upsert SQL to stdout. Doesn't touch the database. Useful for
 *     review, or for applying through a tool that isn't this script (e.g.
 *     the Supabase CLI, dashboard SQL editor, or — as this session
 *     actually did it, since the sandbox has no network route to
 *     Supabase — the Supabase MCP's `apply_migration`/`execute_sql`; see
 *     docs/phases/PHASE-12.2-README.md, "How this session actually ran it").
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node --experimental-strip-types scripts/import-content-to-db.ts
 *     Upserts directly via `@supabase/supabase-js` (same env vars
 *     `lib/supabase/server.ts` already uses) — the real path for a normal
 *     dev machine or CI job with network access to the project.
 *
 * Idempotent: `projects`, `services`, `technologies` and
 * `engagement_models` are upserted on their natural `slug` key;
 * `service_packages` on its natural `(service_id, tier)` key. Child
 * tables with no natural per-row key of their own (`project_sections`,
 * `project_technologies`, `service_process_steps`, `service_addons`, a
 * service's `faqs` rows) are fully resynced per parent — delete, then
 * re-insert the current set — so removing an item from the content file
 * also removes it from the database on the next import, a real one-way
 * sync rather than an accumulate-only insert.
 *
 * Imports every project/service from the content file regardless of its
 * `published` flag — `getAllProjectsRaw()`/`getAllServicesRaw()` return
 * the raw arrays, unfiltered. The database's own `published` column and
 * its RLS policy (roadmap § 12, migrations 0003/0004) are what actually
 * gate public visibility, so an unpublished draft can live in the
 * database (for an editor to review later) without ever being served —
 * filtering at import time would make that impossible. There are no
 * unpublished items in the content today either way. Everything imported
 * here maps to the entities
 * `types/content.ts` documents as mirroring the Phase 12 schema: Project,
 * Service, ServicePackage, ServiceAddon, EngagementModel, Technology (see
 * ROAD-MAP-ARTAVEO.md § 8.1's `types/content.ts` doc-comment reference).
 * `Capability`, `Principle`, `ProcessStep`, `WorkingLanguage`,
 * `ProcessPhase`, `QualityCommitment`, `WorkingAgreementItem` and
 * `HireChannel` are deliberately NOT imported — they are not in that list
 * and stay file-based; see docs/phases/PHASE-12.2-README.md.
 */

import { getAllProjectsRaw, getTechStack } from '../lib/home-content.ts'
import { getAllServicesRaw, getEngagementModelsRaw } from '../lib/services-content.ts'

const SQL_MODE = process.argv.includes('--sql')

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ---------------------------------------------------------------------------
// Step 1 — build a plain-object model of every row, independent of how it
// will be written. snake_case keys throughout, matching the DB columns
// exactly, so both renderers below can stay dumb.
// ---------------------------------------------------------------------------

function buildImportModel() {
  const projects = getAllProjectsRaw()
  const services = getAllServicesRaw()
  const engagementModels = getEngagementModelsRaw()

  // technologies — one row per distinct proper-noun tech name across all
  // projects. `category` is looked up against getTechStack()'s own
  // grouping (the same data already shown on the Home page's Tech Stack
  // section), not invented here; anything not found there falls back to
  // 'other' — a true statement, not a guess.
  const categoryByName = new Map()
  for (const category of getTechStack()) {
    for (const item of category.items) categoryByName.set(item, category.id)
  }
  const techNames = [...new Set(projects.flatMap((p) => p.technologies ?? []))]
  const technologies = techNames.map((name) => ({
    slug: slugify(name),
    name,
    category: categoryByName.get(name) ?? 'other',
    learning: false,
  }))

  const SINGLE_SECTION_FIELDS = [
    ['context', 'context'],
    ['problemAndGoals', 'problem-and-goals'],
    ['architecture', 'architecture'],
    ['engineeringHighlight', 'engineering-highlight'],
    ['dataIntegrityAndSecurity', 'data-integrity-and-security'],
    ['responsiveAndRtl', 'responsive-and-rtl'],
    ['quality', 'quality'],
    ['currentStatusAndNext', 'current-status-and-next'],
    ['lessonsLearned', 'lessons-learned'],
  ]

  const projectRows = projects.map((project, sortOrder) => {
    const sections = []
    for (const [field, type] of SINGLE_SECTION_FIELDS) {
      if (project[field]) sections.push({ type, body: project[field], sort_order: 0 })
    }
    ;(project.constraints ?? []).forEach((item, i) => sections.push({ type: 'constraint', body: item, sort_order: i }))
    ;(project.keyDecisions ?? []).forEach((d, i) => sections.push({ type: 'key-decision', body: d, sort_order: i }))

    return {
      slug: project.slug,
      row: {
        slug: project.slug,
        title: project.title,
        category: project.category,
        summary: project.summary,
        highlights: project.highlights ?? [],
        status: project.status ?? null,
        cover_image: project.coverImage ?? null,
        github_url: project.githubUrl ?? null,
        live_url: project.liveUrl ?? null,
        year: project.year ?? null,
        role: project.role ?? null,
        related_service_slug: project.relatedServiceSlug ?? null,
        featured: !!project.featured,
        published: !!project.published,
        sort_order: sortOrder,
      },
      sections,
      technologySlugs: (project.technologies ?? []).map(slugify),
    }
  })

  const serviceRows = services.map((service, sortOrder) => ({
    slug: service.slug,
    row: {
      slug: service.slug,
      icon: service.icon,
      title: service.title,
      description: service.description,
      deliverables: service.deliverables ?? [],
      type: service.type ?? null,
      tagline: service.tagline ?? null,
      for_whom: service.forWhom ?? [],
      not_for_whom: service.notForWhom ?? [],
      problem: service.problem ?? null,
      what_i_do: service.whatIDo ?? [],
      included: service.included ?? [],
      not_included: service.notIncluded ?? [],
      timeline: service.timeline ?? null,
      requirements: service.requirements ?? [],
      related_project_slugs: service.relatedProjectSlugs ?? [],
      what_drives_cost: service.whatDrivesCost ?? [],
      payment_schedule_note: service.paymentScheduleNote ?? null,
      published: true,
      sort_order: sortOrder,
    },
    processSteps: (service.process ?? []).map((step, i) => ({
      title: step.title,
      description: step.description,
      sort_order: i,
    })),
    packages: (service.packages ?? []).map((pkg) => ({
      tier: pkg.id,
      name: pkg.name,
      summary: pkg.summary,
      for_whom: pkg.forWhom,
      included: pkg.included ?? [],
      not_included: pkg.notIncluded ?? [],
      deliverables: pkg.deliverables ?? [],
      delivery_days_min: pkg.deliveryDays?.min ?? null,
      delivery_days_max: pkg.deliveryDays?.max ?? null,
      revisions: pkg.revisions ?? null,
      support_days: pkg.supportDays ?? null,
      requirements: pkg.requirements ?? [],
      price_type: pkg.price.type,
      price_amount: pkg.price.amount ?? null,
      price_currency: pkg.price.currency ?? null,
    })),
    addons: (service.addOns ?? []).map((addon, i) => ({
      title: addon.title,
      description: addon.description,
      price_type: addon.price.type,
      price_amount: addon.price.amount ?? null,
      price_currency: addon.price.currency ?? null,
      delivery_impact_days: addon.deliveryImpactDays ?? null,
      sort_order: i,
    })),
    faqs: (service.faq ?? []).map((item, i) => ({
      question: item.question,
      answer: item.answer,
      sort_order: i,
    })),
  }))

  const engagementModelRows = engagementModels.map((m, i) => ({
    slug: m.id,
    // EngagementModel's own field is called `name` (types/content.ts);
    // the DB column is `title` to match the naming convention every other
    // entity's headline field uses (projects.title, services.title) —
    // mapped here, not renamed at the source.
    title: m.name,
    when_it_fits: m.whenItFits,
    billing: m.billing,
    published: true,
    sort_order: i,
  }))

  return { technologies, projectRows, serviceRows, engagementModelRows }
}

// ---------------------------------------------------------------------------
// Step 2a — SQL renderer
// ---------------------------------------------------------------------------

function sqlStr(value) {
  return value === undefined || value === null ? 'null' : `'${String(value).replace(/'/g, "''")}'`
}
function sqlJsonb(value) {
  return value === undefined || value === null ? 'null' : `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
}
function sqlTextArray(values) {
  return !values || values.length === 0 ? "'{}'::text[]" : `ARRAY[${values.map(sqlStr).join(', ')}]::text[]`
}
function sqlBool(value) {
  return value ? 'true' : 'false'
}
function sqlNum(value) {
  return value === undefined || value === null ? 'null' : String(value)
}

function renderSql(model) {
  const out = [
    '-- Generated by scripts/import-content-to-db.ts — do not hand-edit.',
    '-- Source: lib/home-content.ts#getAllProjectsRaw(), lib/services-content.ts#getAllServicesRaw()/#getEngagementModelsRaw().',
    'begin;',
    '',
    '-- technologies',
  ]

  for (const t of model.technologies) {
    out.push(
      `insert into public.technologies (slug, name, category, learning) values (${sqlStr(t.slug)}, ${sqlStr(t.name)}, ${sqlStr(t.category)}, ${sqlBool(t.learning)})\n` +
        `on conflict (slug) do update set name = excluded.name, category = excluded.category;`,
    )
  }

  for (const p of model.projectRows) {
    const slugLit = sqlStr(p.slug)
    const idSub = `(select id from public.projects where slug = ${slugLit})`
    out.push(
      '',
      `-- project: ${p.slug}`,
      `insert into public.projects (slug, title, category, summary, highlights, status, cover_image, github_url, live_url, year, role, related_service_slug, featured, published, sort_order)\n` +
        `values (${slugLit}, ${sqlJsonb(p.row.title)}, ${sqlJsonb(p.row.category)}, ${sqlJsonb(p.row.summary)}, ${sqlJsonb(p.row.highlights)}, ${sqlStr(p.row.status)}, ${sqlStr(p.row.cover_image)}, ${sqlStr(p.row.github_url)}, ${sqlStr(p.row.live_url)}, ${sqlStr(p.row.year)}, ${sqlJsonb(p.row.role)}, ${sqlStr(p.row.related_service_slug)}, ${sqlBool(p.row.featured)}, ${sqlBool(p.row.published)}, ${sqlNum(p.row.sort_order)})\n` +
        `on conflict (slug) do update set title=excluded.title, category=excluded.category, summary=excluded.summary, highlights=excluded.highlights, status=excluded.status, cover_image=excluded.cover_image, github_url=excluded.github_url, live_url=excluded.live_url, year=excluded.year, role=excluded.role, related_service_slug=excluded.related_service_slug, featured=excluded.featured, published=excluded.published, sort_order=excluded.sort_order, updated_at=now();`,
      `delete from public.project_sections where project_id = ${idSub};`,
    )
    if (p.sections.length > 0) {
      const rows = p.sections.map((s) => `(${idSub}, ${sqlStr(s.type)}, ${sqlJsonb(s.body)}, ${sqlNum(s.sort_order)})`)
      out.push(`insert into public.project_sections (project_id, type, body, sort_order) values\n  ${rows.join(',\n  ')};`)
    }
    out.push(`delete from public.project_technologies where project_id = ${idSub};`)
    if (p.technologySlugs.length > 0) {
      const rows = p.technologySlugs.map((s) => `(${idSub}, (select id from public.technologies where slug = ${sqlStr(s)}))`)
      out.push(`insert into public.project_technologies (project_id, technology_id) values\n  ${rows.join(',\n  ')};`)
    }
  }

  for (const s of model.serviceRows) {
    const slugLit = sqlStr(s.slug)
    const idSub = `(select id from public.services where slug = ${slugLit})`
    out.push(
      '',
      `-- service: ${s.slug}`,
      `insert into public.services (slug, icon, title, description, deliverables, type, tagline, for_whom, not_for_whom, problem, what_i_do, included, not_included, timeline, requirements, related_project_slugs, what_drives_cost, payment_schedule_note, published, sort_order)\n` +
        `values (${slugLit}, ${sqlStr(s.row.icon)}, ${sqlJsonb(s.row.title)}, ${sqlJsonb(s.row.description)}, ${sqlJsonb(s.row.deliverables)}, ${sqlStr(s.row.type)}, ${sqlJsonb(s.row.tagline)}, ${sqlJsonb(s.row.for_whom)}, ${sqlJsonb(s.row.not_for_whom)}, ${sqlJsonb(s.row.problem)}, ${sqlJsonb(s.row.what_i_do)}, ${sqlJsonb(s.row.included)}, ${sqlJsonb(s.row.not_included)}, ${sqlJsonb(s.row.timeline)}, ${sqlJsonb(s.row.requirements)}, ${sqlTextArray(s.row.related_project_slugs)}, ${sqlJsonb(s.row.what_drives_cost)}, ${sqlJsonb(s.row.payment_schedule_note)}, ${sqlBool(s.row.published)}, ${sqlNum(s.row.sort_order)})\n` +
        `on conflict (slug) do update set icon=excluded.icon, title=excluded.title, description=excluded.description, deliverables=excluded.deliverables, type=excluded.type, tagline=excluded.tagline, for_whom=excluded.for_whom, not_for_whom=excluded.not_for_whom, problem=excluded.problem, what_i_do=excluded.what_i_do, included=excluded.included, not_included=excluded.not_included, timeline=excluded.timeline, requirements=excluded.requirements, related_project_slugs=excluded.related_project_slugs, what_drives_cost=excluded.what_drives_cost, payment_schedule_note=excluded.payment_schedule_note, published=excluded.published, sort_order=excluded.sort_order, updated_at=now();`,
      `delete from public.service_process_steps where service_id = ${idSub};`,
    )
    if (s.processSteps.length > 0) {
      const rows = s.processSteps.map((st) => `(${idSub}, ${sqlJsonb(st.title)}, ${sqlJsonb(st.description)}, ${sqlNum(st.sort_order)})`)
      out.push(`insert into public.service_process_steps (service_id, title, description, sort_order) values\n  ${rows.join(',\n  ')};`)
    }
    if (s.packages.length > 0) {
      const rows = s.packages.map(
        (pkg) =>
          `(${idSub}, ${sqlStr(pkg.tier)}, ${sqlJsonb(pkg.name)}, ${sqlJsonb(pkg.summary)}, ${sqlJsonb(pkg.for_whom)}, ${sqlJsonb(pkg.included)}, ${sqlJsonb(pkg.not_included)}, ${sqlJsonb(pkg.deliverables)}, ${sqlNum(pkg.delivery_days_min)}, ${sqlNum(pkg.delivery_days_max)}, ${sqlNum(pkg.revisions)}, ${sqlNum(pkg.support_days)}, ${sqlJsonb(pkg.requirements)}, ${sqlStr(pkg.price_type)}, ${sqlNum(pkg.price_amount)}, ${sqlStr(pkg.price_currency)})`,
      )
      out.push(
        `insert into public.service_packages (service_id, tier, name, summary, for_whom, included, not_included, deliverables, delivery_days_min, delivery_days_max, revisions, support_days, requirements, price_type, price_amount, price_currency) values\n  ${rows.join(',\n  ')}\n` +
          `on conflict (service_id, tier) do update set name=excluded.name, summary=excluded.summary, for_whom=excluded.for_whom, included=excluded.included, not_included=excluded.not_included, deliverables=excluded.deliverables, delivery_days_min=excluded.delivery_days_min, delivery_days_max=excluded.delivery_days_max, revisions=excluded.revisions, support_days=excluded.support_days, requirements=excluded.requirements, price_type=excluded.price_type, price_amount=excluded.price_amount, price_currency=excluded.price_currency;`,
      )
    }
    out.push(`delete from public.service_addons where service_id = ${idSub};`)
    if (s.addons.length > 0) {
      const rows = s.addons.map(
        (a) =>
          `(${idSub}, ${sqlJsonb(a.title)}, ${sqlJsonb(a.description)}, ${sqlStr(a.price_type)}, ${sqlNum(a.price_amount)}, ${sqlStr(a.price_currency)}, ${sqlNum(a.delivery_impact_days)}, ${sqlNum(a.sort_order)})`,
      )
      out.push(`insert into public.service_addons (service_id, title, description, price_type, price_amount, price_currency, delivery_impact_days, sort_order) values\n  ${rows.join(',\n  ')};`)
    }
    out.push(`delete from public.faqs where scope = 'service' and service_id = ${idSub};`)
    if (s.faqs.length > 0) {
      const rows = s.faqs.map((f) => `('service', ${idSub}, ${sqlJsonb(f.question)}, ${sqlJsonb(f.answer)}, ${sqlNum(f.sort_order)})`)
      out.push(`insert into public.faqs (scope, service_id, question, answer, sort_order) values\n  ${rows.join(',\n  ')};`)
    }
  }

  out.push('', '-- engagement_models')
  const emRows = model.engagementModelRows.map(
    (m) => `(${sqlStr(m.slug)}, ${sqlJsonb(m.title)}, ${sqlJsonb(m.when_it_fits)}, ${sqlJsonb(m.billing)}, ${sqlBool(m.published)}, ${sqlNum(m.sort_order)})`,
  )
  out.push(
    `insert into public.engagement_models (slug, title, when_it_fits, billing, published, sort_order) values\n  ${emRows.join(',\n  ')}\n` +
      `on conflict (slug) do update set title=excluded.title, when_it_fits=excluded.when_it_fits, billing=excluded.billing, published=excluded.published, sort_order=excluded.sort_order;`,
  )

  out.push('', 'commit;')
  return out.join('\n')
}

// ---------------------------------------------------------------------------
// Step 2b — live Supabase-JS renderer (real upserts, no SQL string building)
// ---------------------------------------------------------------------------

async function runAgainstSupabase(model, client) {
  const { error: techError } = await client.from('technologies').upsert(model.technologies, { onConflict: 'slug' })
  if (techError) throw new Error(`technologies upsert failed: ${techError.message}`)

  for (const p of model.projectRows) {
    const { data: projectRow, error: projectError } = await client
      .from('projects')
      .upsert(p.row, { onConflict: 'slug' })
      .select('id')
      .single()
    if (projectError) throw new Error(`projects upsert failed for ${p.slug}: ${projectError.message}`)
    const projectId = projectRow.id

    await client.from('project_sections').delete().eq('project_id', projectId)
    if (p.sections.length > 0) {
      const { error } = await client
        .from('project_sections')
        .insert(p.sections.map((s) => ({ ...s, project_id: projectId })))
      if (error) throw new Error(`project_sections insert failed for ${p.slug}: ${error.message}`)
    }

    await client.from('project_technologies').delete().eq('project_id', projectId)
    if (p.technologySlugs.length > 0) {
      const { data: techRows, error: techLookupError } = await client
        .from('technologies')
        .select('id, slug')
        .in('slug', p.technologySlugs)
      if (techLookupError) throw new Error(`technology lookup failed for ${p.slug}: ${techLookupError.message}`)
      const { error } = await client
        .from('project_technologies')
        .insert(techRows.map((t) => ({ project_id: projectId, technology_id: t.id })))
      if (error) throw new Error(`project_technologies insert failed for ${p.slug}: ${error.message}`)
    }
  }

  for (const s of model.serviceRows) {
    const { data: serviceRow, error: serviceError } = await client
      .from('services')
      .upsert(s.row, { onConflict: 'slug' })
      .select('id')
      .single()
    if (serviceError) throw new Error(`services upsert failed for ${s.slug}: ${serviceError.message}`)
    const serviceId = serviceRow.id

    await client.from('service_process_steps').delete().eq('service_id', serviceId)
    if (s.processSteps.length > 0) {
      const { error } = await client
        .from('service_process_steps')
        .insert(s.processSteps.map((step) => ({ ...step, service_id: serviceId })))
      if (error) throw new Error(`service_process_steps insert failed for ${s.slug}: ${error.message}`)
    }

    if (s.packages.length > 0) {
      const { error } = await client
        .from('service_packages')
        .upsert(
          s.packages.map((pkg) => ({ ...pkg, service_id: serviceId })),
          { onConflict: 'service_id,tier' },
        )
      if (error) throw new Error(`service_packages upsert failed for ${s.slug}: ${error.message}`)
    }

    await client.from('service_addons').delete().eq('service_id', serviceId)
    if (s.addons.length > 0) {
      const { error } = await client
        .from('service_addons')
        .insert(s.addons.map((a) => ({ ...a, service_id: serviceId })))
      if (error) throw new Error(`service_addons insert failed for ${s.slug}: ${error.message}`)
    }

    await client.from('faqs').delete().eq('scope', 'service').eq('service_id', serviceId)
    if (s.faqs.length > 0) {
      const { error } = await client
        .from('faqs')
        .insert(s.faqs.map((f) => ({ ...f, scope: 'service', service_id: serviceId })))
      if (error) throw new Error(`faqs insert failed for ${s.slug}: ${error.message}`)
    }
  }

  const { error: emError } = await client
    .from('engagement_models')
    .upsert(model.engagementModelRows, { onConflict: 'slug' })
  if (emError) throw new Error(`engagement_models upsert failed: ${emError.message}`)
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const model = buildImportModel()

  if (SQL_MODE) {
    console.log(renderSql(model))
    return
  }

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    console.error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. Re-run with --sql to print the SQL instead, ' +
        'or set both env vars to upsert directly.',
    )
    process.exitCode = 1
    return
  }

  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    await runAgainstSupabase(model, client)
  } catch (err) {
    console.error('Import failed:', err.message)
    process.exitCode = 1
    return
  }

  console.log(
    `Imported ${model.projectRows.length} project(s), ${model.serviceRows.length} service(s), ` +
      `${model.engagementModelRows.length} engagement model(s), ${model.technologies.length} technologies.`,
  )
}

main()
