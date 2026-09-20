/**
 * The "fake Supabase" in front of the real database: ONE origin (what the app
 * calls `SUPABASE_URL`) that routes
 *
 *   /rest/v1/*     → PostgREST (real — RLS, constraints and triggers all apply)
 *   /auth/v1/*     → a small stand-in for GoTrue: password sign-in, refresh,
 *                    `getUser`, sign-out, for the accounts it is given
 *   /storage/v1/*  → an in-memory stand-in for Storage: upload, delete, public read
 *   /_test/*       → read-only inspection for the suite (stored objects, health)
 *
 * What this proves and what it does not: the database and PostgREST are real,
 * so everything that depends on a constraint, a trigger, an index or an RLS
 * policy is genuinely exercised. The auth and storage services are NOT real —
 * they implement only the calls the app makes, so they say nothing about
 * GoTrue's behaviour (password policy, MFA, rate limits, e-mail flows) or
 * Storage's bucket limits and policies.
 */
import crypto from 'node:crypto'
import http from 'node:http'

import { signJwt, verifyJwt } from './jwt.mjs'

const json = (res, status, body, headers = {}) => {
  const text = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text), ...headers })
  res.end(text)
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

/**
 * @param {{ port: number, postgrestUrl: string, jwtSecret: string,
 *           accounts: Array<{ id: string, email: string, password: string }> }} options
 */
export function createGateway({ port, postgrestUrl, jwtSecret, accounts }) {
  const origin = `http://127.0.0.1:${port}`
  const refreshTokens = new Map() // refresh token → account
  const objects = new Map() // `${bucket}/${path}` → { body, contentType }
  const signedTokens = new Map() // token → { key, expires }
  // Buckets created with `public = false` (migration 0020). Kept in step with the migration by
  // tests/unit/security-migration.test.mjs — the stand-in cannot read storage.buckets itself.
  const PRIVATE_BUCKETS = new Set(['inquiry-files'])

  const userOf = (account) => ({
    id: account.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: account.email,
    email_confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    factors: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  })

  const sessionFor = (account) => {
    const now = Math.floor(Date.now() / 1000)
    const expiresIn = 3600
    const accessToken = signJwt(
      {
        iss: `${origin}/auth/v1`,
        aud: 'authenticated',
        sub: account.id,
        email: account.email,
        role: 'authenticated',
        aal: 'aal1',
        amr: [{ method: 'password', timestamp: now }],
        session_id: crypto.randomUUID(),
        iat: now,
        exp: now + expiresIn,
      },
      jwtSecret,
    )
    const refreshToken = crypto.randomBytes(12).toString('hex')
    refreshTokens.set(refreshToken, account)
    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: expiresIn,
      expires_at: now + expiresIn,
      refresh_token: refreshToken,
      user: userOf(account),
    }
  }

  async function handleAuth(req, res, url) {
    const path = url.pathname.replace(/^\/auth\/v1/, '')

    if (path === '/token' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}')
      const grant = url.searchParams.get('grant_type')
      if (grant === 'password') {
        const account = accounts.find((a) => a.email.toLowerCase() === String(body.email ?? '').toLowerCase())
        if (!account || account.password !== body.password) {
          return json(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
        }
        return json(res, 200, sessionFor(account))
      }
      if (grant === 'refresh_token') {
        const account = refreshTokens.get(body.refresh_token)
        if (!account) return json(res, 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' })
        refreshTokens.delete(body.refresh_token)
        return json(res, 200, sessionFor(account))
      }
      return json(res, 400, { code: 400, error_code: 'unsupported_grant_type', msg: 'unsupported grant type' })
    }

    if (path === '/user' && req.method === 'GET') {
      const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
      const claims = verifyJwt(token, jwtSecret)
      const account = claims && accounts.find((a) => a.id === claims.sub)
      if (!account) return json(res, 401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' })
      return json(res, 200, userOf(account))
    }

    if (path === '/logout' && req.method === 'POST') {
      res.writeHead(204)
      return res.end()
    }

    return json(res, 404, { code: 404, error_code: 'not_implemented_in_test_stack', msg: `${req.method} ${path} is not implemented by the test stack` })
  }

  async function handleStorage(req, res, url) {
    const path = url.pathname.replace(/^\/storage\/v1/, '')

    // Signed URLs (Phase 23, for private buckets): POST /object/sign/<bucket>/<path…> answers
    // with a short-lived link, GET /object/sign/<bucket>/<path…>?token=… serves it. The token
    // is checked for the object it was issued for and for expiry, like the real service.
    const sign = path.match(/^\/object\/sign\/([^/]+)\/(.+)$/)
    if (sign && req.method === 'POST') {
      const { expiresIn = 60 } = JSON.parse((await readBody(req)).toString('utf8') || '{}')
      const key = `${sign[1]}/${decodeURIComponent(sign[2])}`
      if (!objects.has(key)) return json(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' })
      const token = crypto.randomUUID()
      signedTokens.set(token, { key, expires: Date.now() + Number(expiresIn) * 1000 })
      return json(res, 200, { signedURL: `/object/sign/${sign[1]}/${sign[2]}?token=${token}` })
    }
    if (sign && req.method === 'GET') {
      const grant = signedTokens.get(url.searchParams.get('token') ?? '')
      const key = `${sign[1]}/${decodeURIComponent(sign[2])}`
      if (!grant || grant.key !== key || grant.expires < Date.now()) return json(res, 400, { statusCode: '400', error: 'InvalidJWT', message: 'invalid or expired token' })
      const object = objects.get(key)
      if (!object) return json(res, 404, { statusCode: '404', error: 'not_found', message: 'Object not found' })
      const headers = { 'content-type': object.contentType, 'content-length': object.body.length }
      const download = url.searchParams.get('download')
      if (download !== null) headers['content-disposition'] = `attachment; filename="${download || 'download'}"`
      res.writeHead(200, headers)
      return res.end(object.body)
    }

    // Upload: POST /object/<bucket>/<path…>
    const upload = path.match(/^\/object\/([^/]+)\/(.+)$/)
    if (upload && (req.method === 'POST' || req.method === 'PUT') && upload[1] !== 'public') {
      const [, bucket, objectPath] = upload
      const raw = await readBody(req)
      const contentType = String(req.headers['content-type'] ?? 'application/octet-stream')
      let body = raw
      let type = contentType
      if (contentType.startsWith('multipart/form-data')) {
        const form = await new Response(raw, { headers: { 'content-type': contentType } }).formData()
        const file = [...form.values()].find((value) => typeof value !== 'string')
        if (file) {
          body = Buffer.from(await file.arrayBuffer())
          type = file.type || 'application/octet-stream'
        }
      }
      const key = `${bucket}/${decodeURIComponent(objectPath)}`
      if (objects.has(key) && String(req.headers['x-upsert']) !== 'true') {
        return json(res, 400, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' })
      }
      objects.set(key, { body, contentType: type })
      return json(res, 200, { Id: crypto.randomUUID(), Key: key })
    }

    // Remove: DELETE /object/<bucket> with { prefixes: [...] }
    const removal = path.match(/^\/object\/([^/]+)$/)
    if (removal && req.method === 'DELETE') {
      const { prefixes = [] } = JSON.parse((await readBody(req)).toString('utf8') || '{}')
      const removed = []
      for (const prefix of prefixes) {
        if (objects.delete(`${removal[1]}/${prefix}`)) removed.push({ name: prefix, bucket_id: removal[1] })
      }
      return json(res, 200, removed)
    }

    // Public read: GET /object/public/<bucket>/<path…>
    const read = path.match(/^\/object\/public\/([^/]+)\/(.+)$/)
    if (read && req.method === 'GET') {
      // A private bucket has no public URL — the real service answers "bucket not found".
      if (PRIVATE_BUCKETS.has(read[1])) return json(res, 404, { statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' })
      const object = objects.get(`${read[1]}/${decodeURIComponent(read[2])}`)
      if (!object) return json(res, 404, { statusCode: '404', error: 'not_found', message: 'Object not found' })
      res.writeHead(200, { 'content-type': object.contentType, 'content-length': object.body.length })
      return res.end(object.body)
    }

    return json(res, 404, { message: `${req.method} ${path} is not implemented by the test stack` })
  }

  function handleRest(req, res, url) {
    const target = new URL(url.pathname.replace(/^\/rest\/v1/, '') + url.search, postgrestUrl)
    const upstream = http.request(
      target,
      { method: req.method, headers: { ...req.headers, host: target.host } },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers)
        response.pipe(res)
      },
    )
    upstream.on('error', (err) => json(res, 502, { message: `PostgREST unreachable: ${err.message}` }))
    req.pipe(upstream)
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', origin)
      if (url.pathname.startsWith('/rest/v1')) return handleRest(req, res, url)
      if (url.pathname.startsWith('/auth/v1')) return await handleAuth(req, res, url)
      if (url.pathname.startsWith('/storage/v1')) return await handleStorage(req, res, url)
      if (url.pathname === '/_test/health') return json(res, 200, { ok: true })
      if (url.pathname === '/_test/storage') {
        return json(res, 200, {
          objects: [...objects.entries()].map(([key, value]) => ({ key, bytes: value.body.length, contentType: value.contentType })),
        })
      }
      return json(res, 404, { message: 'not found' })
    } catch (err) {
      return json(res, 500, { message: String(err?.message ?? err) })
    }
  })

  return {
    origin,
    listen: () => new Promise((resolve) => server.listen(port, '127.0.0.1', resolve)),
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}
