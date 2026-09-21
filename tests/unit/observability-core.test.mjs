/**
 * Phase 24 — the logger, the correlation id, and the report parsers.
 */
import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import { bindRequestId, currentRequestId, getRequestId, runWithRequestId } from '../../lib/observability/context.ts'
import { formatLine, log, setLogSink } from '../../lib/observability/logger.ts'
import { cspMessage, parseClientErrorReport, parseCspReports } from '../../lib/observability/reports.ts'
import { isRequestId, newRequestId, requestIdFrom, REQUEST_ID_HEADER } from '../../lib/observability/request-id.ts'
import { resetRequest } from '../support/next-runtime.mjs'

const UUID = '3f2b8c1e-5d4a-4e6b-9a7c-0d1e2f3a4b5c'
const NOW = new Date('2026-09-21T10:00:00.000Z')

afterEach(() => setLogSink(null))

describe('request id', () => {
  it('is a UUID, different every time', () => {
    const a = newRequestId()
    assert.ok(isRequestId(a))
    assert.notEqual(a, newRequestId())
  })
  it('accepts only a UUID from a header — anything else is ignored, never trusted', () => {
    const from = (value) => requestIdFrom((name) => (name === REQUEST_ID_HEADER ? value : null))
    assert.equal(from(UUID), UUID)
    assert.equal(from(UUID.toUpperCase()), UUID)
    for (const bad of ['', 'abc', `${UUID}; drop table`, `${UUID}\nx-injected: 1`, 'x'.repeat(5000), null, undefined]) assert.equal(from(bad), undefined)
  })
  it('getRequestId reads the header the proxy set, and returns undefined (not an invented id) without one', async () => {
    resetRequest({ [REQUEST_ID_HEADER]: UUID })
    assert.equal(await getRequestId(), UUID)
    resetRequest({})
    assert.equal(await getRequestId(), undefined)
    resetRequest({ [REQUEST_ID_HEADER]: 'not-a-uuid' })
    assert.equal(await getRequestId(), undefined)
  })
  it('runWithRequestId reaches every await below it, and concurrent runs do not mix', async () => {
    const deep = async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
      return currentRequestId()
    }
    const [a, b] = await Promise.all([
      runWithRequestId('aaaaaaaa-0000-4000-8000-000000000000', async () => [await deep(), await deep()]),
      runWithRequestId('bbbbbbbb-0000-4000-8000-000000000000', async () => [await deep(), await deep()]),
    ])
    assert.deepEqual(a, ['aaaaaaaa-0000-4000-8000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000000'])
    assert.deepEqual(b, ['bbbbbbbb-0000-4000-8000-000000000000', 'bbbbbbbb-0000-4000-8000-000000000000'])
    assert.equal(currentRequestId(), undefined, 'nothing leaks out of run()')
  })
  it('bindRequestId binds the rest of the calling frame (the way a Server Action uses it)', async () => {
    const action = async (id) => {
      bindRequestId(id)
      await new Promise((resolve) => setTimeout(resolve, 5))
      return currentRequestId()
    }
    const [x, y] = await Promise.all([action('11111111-1111-4111-8111-111111111111'), action('22222222-2222-4222-8222-222222222222')])
    assert.equal(x, '11111111-1111-4111-8111-111111111111')
    assert.equal(y, '22222222-2222-4222-8222-222222222222')
    bindRequestId(undefined) // binds nothing, does not throw
  })
})

describe('logger', () => {
  const parse = (line) => JSON.parse(line)

  it('writes one JSON line with time, level and event', () => {
    const line = parse(formatLine('info', 'inquiry.submitted', { service: 'backend' }, NOW, {}))
    assert.deepEqual(line, { t: '2026-09-21T10:00:00.000Z', level: 'info', event: 'inquiry.submitted', service: 'backend' })
  })
  it('carries the bound request id, the release and the environment', () => {
    const env = { VERCEL_GIT_COMMIT_SHA: 'abcdef1234567890', VERCEL_ENV: 'production' }
    const line = runWithRequestId(UUID, () => parse(formatLine('warn', 'x.y', {}, NOW, env)))
    assert.equal(line.requestId, UUID)
    assert.equal(line.release, 'abcdef1')
    assert.equal(line.env, 'production')
  })
  it('serialises err (an Error, a Supabase-style object, a string) and never leaks what it holds', () => {
    const line = parse(formatLine('error', 'db.failed', { err: { message: 'Key (email)=(a@b.co) already exists', code: '23505', details: 'a@b.co' }, email: 'a@b.co', goal: 'private' }, NOW, {}))
    assert.equal(line.err.code, '23505')
    assert.equal(line.email, '[redacted]')
    assert.equal(line.goal, '[redacted]')
    assert.ok(!JSON.stringify(line).includes('a@b.co'))
  })
  it('an invalid event name is logged under a fixed name, with the original kept short', () => {
    const line = parse(formatLine('info', 'Not A Valid Name!', {}, NOW, {}))
    assert.equal(line.event, 'observability.invalid_event_name')
    assert.equal(line.original, 'Not A Valid Name!')
  })
  it('a huge line keeps its identity and says it was truncated', () => {
    const line = parse(formatLine('error', 'big.thing', { blob: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, 'y'.repeat(290)])), err: new Error('x') }, NOW, {}))
    assert.equal(line.event, 'big.thing')
    assert.equal(line.truncated, true)
    assert.equal(line.err.message, 'x')
  })
  it('goes through the sink, at the level asked, and a sink that throws never throws into the caller', () => {
    const seen = []
    setLogSink((level, text) => seen.push([level, parse(text).event]))
    log.info('a.b')
    log.warn('c.d')
    log.error('e.f')
    assert.deepEqual(seen, [['info', 'a.b'], ['warn', 'c.d'], ['error', 'e.f']])
    setLogSink(() => {
      throw new Error('sink is broken')
    })
    assert.doesNotThrow(() => log.error('g.h'))
  })
})

describe('CSP reports', () => {
  const legacy = (record) => ({ 'csp-report': record })

  it('parses the report-uri format and reduces the blocked URL to an origin', () => {
    const [report] = parseCspReports(legacy({ 'document-uri': 'https://artaveo.test/en/work?x=1', 'violated-directive': 'img-src', 'effective-directive': 'img-src', 'blocked-uri': 'https://cdn.example.com/a/b.png?token=secret', disposition: 'enforce' }))
    assert.deepEqual(report, { directive: 'img-src', blocked: 'https://cdn.example.com', page: '/en/work', disposition: 'enforce' })
  })
  it('parses the Reporting API format', () => {
    const reports = parseCspReports([{ type: 'csp-violation', url: 'https://artaveo.test/', body: { documentURL: 'https://artaveo.test/fa', blockedURL: 'inline', effectiveDirective: 'script-src-elem', disposition: 'report' } }, { type: 'network-error', body: {} }])
    assert.equal(reports.length, 1)
    assert.deepEqual(reports[0], { directive: 'script-src-elem', blocked: 'inline', page: '/fa', disposition: 'report' })
  })
  it('removes a private token from the page path', () => {
    const token = 'Zk3nQ8xLp2VbYw9RtUeA7hGdZk3nQ8xLp2VbYw9R'
    const [report] = parseCspReports(legacy({ 'document-uri': `https://artaveo.test/en/consultation/${token}`, 'effective-directive': 'connect-src', 'blocked-uri': 'https://x.test' }))
    assert.equal(report.page, '/en/consultation/[token]')
  })
  it('drops reports about the visitor’s own browser extensions', () => {
    for (const blocked of ['chrome-extension://abc/x.js', 'moz-extension://abc/x.js', 'safari-extension://x', 'about', 'webkit-masked-url://hidden']) {
      assert.deepEqual(parseCspReports(legacy({ 'document-uri': 'https://artaveo.test/', 'effective-directive': 'script-src', 'blocked-uri': blocked })), [], blocked)
    }
  })
  it('treats garbage as nothing to record, and caps the number of reports per request', () => {
    for (const junk of [null, undefined, 'x', 42, [], {}, { 'csp-report': 'x' }, [{ type: 'csp-violation', body: null }]]) assert.deepEqual(parseCspReports(junk), [])
    const many = Array.from({ length: 50 }, () => ({ type: 'csp-violation', body: { documentURL: 'https://a.test/', blockedURL: 'inline', effectiveDirective: 'script-src' } }))
    assert.equal(parseCspReports(many).length, 5)
  })
  it('an attacker-chosen directive name cannot inject text: it must look like a directive', () => {
    const [report] = parseCspReports(legacy({ 'document-uri': 'https://a.test/', 'effective-directive': "x'; drop table--", 'blocked-uri': 'inline' }))
    assert.equal(report.directive, 'unknown')
  })
  it('the stored message is stable per (directive, origin, page)', () => {
    const report = { directive: 'img-src', blocked: 'https://cdn.example.com', page: '/en/work', disposition: 'enforce' }
    assert.equal(cspMessage(report), 'img-src blocked https://cdn.example.com on /en/work')
  })
})

describe('client error reports', () => {
  it('accepts a well-formed report and scrubs the path', () => {
    const r = parseClientErrorReport({ message: 'x is not a function', name: 'TypeError', stack: 'TypeError: x\n at y', path: '/en/recommend/Zk3nQ8xLp2VbYw9RtUeA7hGdZk3nQ8xLp2VbYw9R', digest: '12345', kind: 'window' })
    assert.equal(r.path, '/en/recommend/[token]')
    assert.equal(r.name, 'TypeError')
    assert.equal(r.digest, '12345')
    assert.equal(r.kind, 'window')
  })
  it('defaults what is missing and rejects what cannot be a report', () => {
    assert.equal(parseClientErrorReport({ message: 'm' }).kind, 'window')
    assert.equal(parseClientErrorReport({ message: 'm' }).name, 'Error')
    for (const bad of [null, undefined, 'x', 1, [], {}, { message: '' }, { message: 5 }]) assert.equal(parseClientErrorReport(bad), null)
  })
  it('bounds every field and refuses an odd name or digest', () => {
    const r = parseClientErrorReport({ message: 'm'.repeat(5000), name: 'bad name!<script>', stack: 's'.repeat(9000), path: `/${'p'.repeat(9000)}`, digest: "1'; --", kind: 'nonsense' })
    assert.equal(r.message.length, 300)
    assert.equal(r.name, 'Error')
    assert.equal(r.stack.length, 2000)
    assert.ok(r.path.length <= 200)
    assert.equal(r.digest, null)
    assert.equal(r.kind, 'window')
  })
})
