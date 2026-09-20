/**
 * The database-backed content selectors (roadmap § 12.2) against the real
 * database seeded by the real import script: what the public site actually
 * reads must equal the typed source content it was imported from.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import '../support/stack-env.mjs'

const home = await import('../../lib/home-content.ts')
const projects = await import('../../lib/home-content-projects.ts')
const services = await import('../../lib/services-content.ts')

const bySlug = (list) => Object.fromEntries(list.map((item) => [item.slug, item]))

describe('services: database == imported source', () => {
  const source = services.getAllServicesRaw()

  it('same set of services', async () => {
    const live = await services.getAllServices()
    assert.deepEqual(live.map((s) => s.slug).sort(), source.map((s) => s.slug).sort())
  })
  it('every service keeps its bilingual text, packages, prices and add-ons', async () => {
    const live = bySlug(await services.getAllServices())
    for (const svc of source) {
      const got = live[svc.slug]
      assert.deepEqual(got.title, svc.title, `${svc.slug} title`)
      assert.deepEqual(got.description, svc.description, `${svc.slug} description`)
      assert.deepEqual((got.packages ?? []).map((p) => [p.id, p.price.type, p.price.amount ?? null]).sort(), (svc.packages ?? []).map((p) => [p.id, p.price.type, p.price.amount ?? null]).sort(), `${svc.slug} packages`)
      // add-on ids are database UUIDs (the source file uses slugs), so compare by content
      const addon = (a) => [a.title.en, a.title.fa, a.price.type, a.price.amount ?? null].join('|')
      assert.deepEqual((got.addOns ?? []).map(addon).sort(), (svc.addOns ?? []).map(addon).sort(), `${svc.slug} add-ons`)
      for (const pkg of svc.packages ?? []) {
        const livePkg = got.packages.find((p) => p.id === pkg.id)
        assert.deepEqual(livePkg.name, pkg.name, `${svc.slug}/${pkg.id} name`)
        assert.deepEqual(livePkg.included, pkg.included, `${svc.slug}/${pkg.id} included`)
        assert.deepEqual(livePkg.notIncluded, pkg.notIncluded, `${svc.slug}/${pkg.id} notIncluded`)
      }
    }
  })
  it('a lookup by slug finds it, and an unknown slug is undefined (not an error)', async () => {
    assert.equal((await services.getServiceBySlug(source[0].slug)).slug, source[0].slug)
    assert.equal(await services.getServiceBySlug('no-such-service'), undefined)
    assert.equal(await services.getServiceBySlug("'; drop table services; --"), undefined)
    assert.ok((await services.getAllServices()).length > 0, 'and the table is still there')
  })
  it('engagement models round-trip', async () => {
    const live = await services.getEngagementModels()
    assert.deepEqual(live.map((m) => m.id).sort(), services.getEngagementModelsRaw().map((m) => m.id).sort())
  })
})

describe('projects: database == imported source', () => {
  const source = home.getAllProjectsRaw()

  it('the two real case studies are published, featured ones first', async () => {
    const live = await projects.getAllProjects()
    assert.deepEqual(live.map((p) => p.slug).sort(), source.filter((p) => p.published).map((p) => p.slug).sort())
    const flags = live.map((p) => Number(p.featured))
    assert.deepEqual(flags, [...flags].sort((a, b) => b - a), 'featured first')
  })
  it('a project keeps its bilingual text, technology list and every case-study section', async () => {
    for (const src of source) {
      const live = await projects.getProjectBySlug(src.slug)
      assert.deepEqual(live.title, src.title, `${src.slug} title`)
      assert.deepEqual(live.summary, src.summary, `${src.slug} summary`)
      assert.deepEqual([...(live.technologies ?? [])].sort(), [...(src.technologies ?? [])].sort(), `${src.slug} technologies`)
      for (const field of ['context', 'problemAndGoals', 'architecture', 'engineeringHighlight', 'dataIntegrityAndSecurity', 'responsiveAndRtl', 'quality', 'currentStatusAndNext', 'lessonsLearned']) {
        assert.deepEqual(live[field], src[field], `${src.slug}.${field}`)
      }
      assert.deepEqual(live.constraints ?? [], src.constraints ?? [], `${src.slug} constraints`)
      assert.equal((live.keyDecisions ?? []).length, (src.keyDecisions ?? []).length, `${src.slug} key decisions`)
    }
  })
  it('featured selector returns only featured, published projects', async () => {
    for (const p of await projects.getFeaturedProjects()) assert.ok(p.featured && p.published)
  })
  it('unknown and hostile slugs are undefined, not errors', async () => {
    assert.equal(await projects.getProjectBySlug('nope'), undefined)
    assert.equal(await projects.getProjectBySlug('%'), undefined)
    assert.equal(await projects.getProjectBySlug("x' or '1'='1"), undefined)
  })
})
