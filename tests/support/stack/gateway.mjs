/**
 * The stand-in for the Neon services in front of the real test database: ONE
 * origin that routes
 *
 *   /rest/v1/*  → PostgREST (real — RLS, constraints and triggers all apply).
 *                 The app reaches it as NEON_DATA_API_URL, exactly as it reaches
 *                 the Neon Data API (which is PostgREST-compatible).
 *   /auth/*     → a small stand-in for Managed Better Auth (NEON_AUTH_BASE_URL):
 *                 e-mail/password sign-in, get-session, sign-out, for the
 *                 accounts it is given — the calls `@neondatabase/auth` makes.
 *   /s3/*       → an in-memory stand-in for Neon Object Storage
 *                 (NEON_STORAGE_ENDPOINT): the S3 operations the app's storage
 *                 client sends (put, get, presigned get, batch delete, list), with
 *                 the two access levels of the real buckets.
 *   /_test/*    → read-only inspection for the suite (stored objects, health)
 *
 * What this proves and what it does not: the database and PostgREST are real,
 * so everything that depends on a constraint, a trigger, an index or an RLS
 * policy is genuinely exercised. The auth and storage services are NOT real —
 * they implement only the calls the app makes, so they say nothing about Better
 * Auth's behaviour (password policy, rate limits, e-mail flows) or the storage
 * service's signature checks and limits. Two-factor codes are the app's own
 * (lib/admin/totp.ts), so those ARE exercised for real.
 */
import crypto from 'node:crypto'
import http from 'node:http'

const SESSION_COOKIE = '__Secure-neon-auth.session_token'
const SESSION_TTL_SECONDS = 7 * 24 * 3600

const json = (res, status, body, headers = {}) => {
  const text = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text), ...headers })
  res.end(text)
}

const xml = (res, status, body, headers = {}) => {
  const text = `<?xml version="1.0" encoding="UTF-8"?>\n${body}`
  res.writeHead(status, { 'content-type': 'application/xml', 'content-length': Buffer.byteLength(text), ...headers })
  res.end(text)
}

const s3Error = (res, status, code, message) => xml(res, status, `<Error><Code>${code}</Code><Message>${message}</Message></Error>`)

const escapeXml = (text) => String(text).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c])

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

/** `content-encoding: aws-chunked` (the AWS SDK's trailing-checksum upload): `<hex size>[;…]` CRLF `<bytes>` CRLF … `0` CRLF `<trailers>`. */
function decodeAwsChunked(raw) {
  const parts = []
  let offset = 0
  while (offset < raw.length) {
    const lineEnd = raw.indexOf('\r\n', offset)
    if (lineEnd === -1) break
    const size = parseInt(raw.subarray(offset, lineEnd).toString('latin1').split(';')[0], 16)
    if (!size) break
    parts.push(raw.subarray(lineEnd + 2, lineEnd + 2 + size))
    offset = lineEnd + 2 + size + 2
  }
  return Buffer.concat(parts)
}

function cookieValue(req, name) {
  for (const part of String(req.headers.cookie ?? '').split(';')) {
    const index = part.indexOf('=')
    if (index > 0 && part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim())
  }
  return null
}

/**
 * @param {{ port: number, postgrestUrl: string,
 *           accounts: Array<{ id: string, email: string, password: string }>,
 *           publicBuckets: string[] }} options
 */
export function createGateway({ port, postgrestUrl, accounts, publicBuckets }) {
  const origin = `http://127.0.0.1:${port}`
  const sessions = new Map() // token → session
  const objects = new Map() // `${bucket}/${key}` → { body, contentType }
  const PUBLIC_BUCKETS = new Set(publicBuckets)

  // ---------------------------------------------------------------------------
  // Managed Better Auth stand-in

  const userOf = (account) => ({
    id: account.id,
    email: account.email,
    name: account.email.split('@')[0],
    emailVerified: true,
    image: null,
    role: null,
    banned: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })

  function sessionCookie(token, maxAge) {
    return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
  }

  function currentSession(req) {
    const token = cookieValue(req, SESSION_COOKIE)
    const session = token ? sessions.get(token) : null
    if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null
    return session
  }

  async function handleAuth(req, res, url) {
    const path = url.pathname.replace(/^\/auth/, '')

    if (path === '/sign-in/email' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}')
      const account = accounts.find((a) => a.email.toLowerCase() === String(body.email ?? '').toLowerCase())
      if (!account || account.password !== body.password) {
        return json(res, 401, { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' })
      }
      const now = new Date()
      const token = crypto.randomBytes(24).toString('base64url')
      sessions.set(token, {
        id: crypto.randomUUID(),
        token,
        userId: account.id,
        expiresAt: new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        ipAddress: null,
        userAgent: null,
      })
      return json(res, 200, { redirect: false, token, user: userOf(account) }, { 'set-cookie': sessionCookie(token, SESSION_TTL_SECONDS) })
    }

    if (path === '/get-session' && req.method === 'GET') {
      const session = currentSession(req)
      const account = session && accounts.find((a) => a.id === session.userId)
      if (!session || !account) return json(res, 200, null)
      return json(res, 200, { session, user: userOf(account) })
    }

    if (path === '/sign-out' && req.method === 'POST') {
      const token = cookieValue(req, SESSION_COOKIE)
      if (token) sessions.delete(token)
      return json(res, 200, { success: true }, { 'set-cookie': sessionCookie('', 0) })
    }

    return json(res, 404, { code: 'NOT_IMPLEMENTED_IN_TEST_STACK', message: `${req.method} ${path} is not implemented by the test stack` })
  }

  // ---------------------------------------------------------------------------
  // Neon Object Storage (S3, path-style) stand-in

  const isPresigned = (url) => url.searchParams.has('X-Amz-Signature')
  const isSigned = (req, url) => isPresigned(url) || /^AWS4-HMAC-SHA256 /.test(String(req.headers.authorization ?? ''))

  function presignExpired(url) {
    const date = url.searchParams.get('X-Amz-Date') // 20261016T171429Z
    const expires = Number(url.searchParams.get('X-Amz-Expires') ?? 0)
    const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(date ?? '')
    if (!match) return true
    const signedAt = Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6])
    return signedAt + expires * 1000 < Date.now()
  }

  async function handleS3(req, res, url) {
    const [, bucket, ...rest] = url.pathname.replace(/^\/s3/, '').split('/')
    const key = rest.map(decodeURIComponent).join('/')
    if (!bucket) return s3Error(res, 400, 'InvalidBucketName', 'no bucket')

    // Every write needs a credential, on every bucket (the real service checks the signature).
    if ((req.method === 'PUT' || req.method === 'POST' || req.method === 'DELETE') && !isSigned(req, url)) {
      return s3Error(res, 403, 'AccessDenied', 'Access Denied')
    }

    if (req.method === 'PUT' && key) {
      const raw = await readBody(req)
      const body = /aws-chunked/.test(String(req.headers['content-encoding'] ?? '')) ? decodeAwsChunked(raw) : raw
      const id = `${bucket}/${key}`
      if (req.headers['if-none-match'] === '*' && objects.has(id)) {
        return s3Error(res, 412, 'PreconditionFailed', 'At least one of the pre-conditions you specified did not hold')
      }
      objects.set(id, { body, contentType: String(req.headers['content-type'] ?? 'application/octet-stream') })
      res.writeHead(200, { etag: `"${crypto.createHash('md5').update(body).digest('hex')}"` })
      return res.end()
    }

    if (req.method === 'POST' && !key && url.searchParams.has('delete')) {
      const body = (await readBody(req)).toString('utf8')
      for (const match of body.matchAll(/<Key>([\s\S]*?)<\/Key>/g)) {
        const decoded = match[1].replace(/&lt;|&gt;|&amp;|&apos;|&quot;/g, (e) => ({ '&lt;': '<', '&gt;': '>', '&amp;': '&', '&apos;': "'", '&quot;': '"' })[e])
        objects.delete(`${bucket}/${decoded}`)
      }
      return xml(res, 200, '<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"></DeleteResult>')
    }

    if (req.method === 'GET' && !key) {
      if (!isSigned(req, url)) return s3Error(res, 403, 'AccessDenied', 'Access Denied')
      const prefix = url.searchParams.get('prefix') ?? ''
      const delimiter = url.searchParams.get('delimiter')
      const contents = []
      const prefixes = new Set()
      for (const [id, object] of objects) {
        if (!id.startsWith(`${bucket}/`)) continue
        const objectKey = id.slice(bucket.length + 1)
        if (!objectKey.startsWith(prefix)) continue
        const remainder = objectKey.slice(prefix.length)
        const cut = delimiter ? remainder.indexOf(delimiter) : -1
        if (cut >= 0) prefixes.add(prefix + remainder.slice(0, cut + delimiter.length))
        else contents.push({ objectKey, size: object.body.length })
      }
      const body =
        '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">' +
        `<Name>${escapeXml(bucket)}</Name><Prefix>${escapeXml(prefix)}</Prefix><KeyCount>${contents.length + prefixes.size}</KeyCount><IsTruncated>false</IsTruncated>` +
        contents.map((c) => `<Contents><Key>${escapeXml(c.objectKey)}</Key><Size>${c.size}</Size><ETag>"${crypto.createHash('md5').update(c.objectKey).digest('hex')}"</ETag></Contents>`).join('') +
        [...prefixes].map((p) => `<CommonPrefixes><Prefix>${escapeXml(p)}</Prefix></CommonPrefixes>`).join('') +
        '</ListBucketResult>'
      return xml(res, 200, body)
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && key) {
      // public_read buckets serve anyone; private ones only signed requests (or unexpired presigned links).
      if (!PUBLIC_BUCKETS.has(bucket)) {
        if (!isSigned(req, url)) return s3Error(res, 403, 'AccessDenied', 'Access Denied')
        if (isPresigned(url) && presignExpired(url)) return s3Error(res, 403, 'AccessDenied', 'Request has expired')
      }
      const object = objects.get(`${bucket}/${key}`)
      if (!object) return s3Error(res, 404, 'NoSuchKey', 'The specified key does not exist.')
      const headers = { 'content-type': object.contentType, 'content-length': object.body.length }
      // Like the real service: `response-*` overrides only on signed requests.
      const disposition = url.searchParams.get('response-content-disposition')
      if (disposition && isSigned(req, url)) headers['content-disposition'] = disposition
      res.writeHead(200, headers)
      return res.end(req.method === 'HEAD' ? undefined : object.body)
    }

    return s3Error(res, 501, 'NotImplemented', `${req.method} ${url.pathname} is not implemented by the test stack`)
  }

  // ---------------------------------------------------------------------------
  // Data API (PostgREST)

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
      if (url.pathname === '/auth' || url.pathname.startsWith('/auth/')) return await handleAuth(req, res, url)
      if (url.pathname.startsWith('/s3/')) return await handleS3(req, res, url)
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
