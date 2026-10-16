import 'server-only'
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * Neon Object Storage behind the small slice of the Supabase Storage API the app
 * used (`upload`, `remove`, `getPublicUrl`, `createSignedUrl`, `list`,
 * `download`), so the call sites kept their shape when the files moved off
 * Supabase (October 2026). Underneath it is plain S3 against the branch's
 * storage endpoint, with the app's own scoped credential (`storage:read` +
 * `storage:write`).
 *
 * Buckets (created on the Neon branch, not by migrations):
 *   - `media`         public_read — the CMS library; objects are served by URL.
 *   - `inquiry-files` private     — visitors' brief attachments; read only through
 *                                   a 60-second presigned link (`/api/admin/inquiry-files/[id]`).
 *
 * Every method answers `{ data, error }` and never throws, like the client it
 * replaces — callers already branch on `error`.
 */

type Result<T> = { data: T; error: null } | { data: null; error: Error }

const ok = <T>(data: T): Result<T> => ({ data, error: null })
const fail = (error: unknown): { data: null; error: Error } => ({
  data: null,
  error: error instanceof Error ? error : new Error(String(error)),
})

export type StorageListEntry = { name: string; id: string | null; metadata: { size: number } | null }

export type StorageBucket = {
  upload(path: string, body: Uint8Array, options?: { contentType?: string; upsert?: boolean }): Promise<Result<{ path: string }>>
  remove(paths: string[]): Promise<Result<{ name: string }[]>>
  getPublicUrl(path: string): { data: { publicUrl: string } }
  createSignedUrl(path: string, expiresInSeconds: number, options?: { download?: string }): Promise<Result<{ signedUrl: string }>>
  list(prefix?: string, options?: { limit?: number }): Promise<Result<StorageListEntry[]>>
  download(path: string): Promise<Result<Blob>>
}

export type StorageClient = { from(bucket: string): StorageBucket }

export type StorageConfig = {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
}

export function storageConfigFromEnv(): StorageConfig | null {
  const endpoint = process.env.NEON_STORAGE_ENDPOINT
  const accessKeyId = process.env.NEON_STORAGE_ACCESS_KEY_ID
  const secretAccessKey = process.env.NEON_STORAGE_SECRET_ACCESS_KEY
  if (!endpoint || !accessKeyId || !secretAccessKey) return null
  return { endpoint: endpoint.replace(/\/+$/, ''), region: process.env.NEON_STORAGE_REGION || 'us-east-1', accessKeyId, secretAccessKey }
}

/** `a b/ç.png` → `a%20b/%C3%A7.png` — each key segment encoded, the slashes kept. */
function encodeKey(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

/** RFC 6266 — an ASCII fallback plus the UTF-8 name, so Persian file names survive. */
function attachmentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

export function createStorageClient(config: StorageConfig): StorageClient {
  const s3 = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    forcePathStyle: true,
  })

  return {
    from(bucket: string): StorageBucket {
      return {
        async upload(path, body, options = {}) {
          try {
            await s3.send(
              new PutObjectCommand({
                Bucket: bucket,
                Key: path,
                Body: body,
                ContentType: options.contentType,
                // Every key the app writes is random (`safeStoragePath`), so an existing
                // object at the same key means something is wrong — refuse, like Supabase did.
                ...(options.upsert ? {} : { IfNoneMatch: '*' }),
              }),
            )
            return ok({ path })
          } catch (error) {
            return fail(error)
          }
        },

        async remove(paths) {
          if (paths.length === 0) return ok([])
          try {
            await s3.send(
              new DeleteObjectsCommand({
                Bucket: bucket,
                Delete: { Objects: paths.map((Key) => ({ Key })), Quiet: true },
              }),
            )
            return ok(paths.map((name) => ({ name })))
          } catch (error) {
            return fail(error)
          }
        },

        getPublicUrl(path) {
          return { data: { publicUrl: `${config.endpoint}/${bucket}/${encodeKey(path)}` } }
        },

        async createSignedUrl(path, expiresInSeconds, options = {}) {
          try {
            const signedUrl = await getSignedUrl(
              s3,
              new GetObjectCommand({
                Bucket: bucket,
                Key: path,
                ...(options.download ? { ResponseContentDisposition: attachmentDisposition(options.download) } : {}),
              }),
              { expiresIn: expiresInSeconds },
            )
            return ok({ signedUrl })
          } catch (error) {
            return fail(error)
          }
        },

        async list(prefix = '', options = {}) {
          try {
            const normalized = prefix && !prefix.endsWith('/') ? `${prefix}/` : prefix
            const response = await s3.send(
              new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: normalized || undefined,
                Delimiter: '/',
                MaxKeys: options.limit ?? 1000,
              }),
            )
            // Same shape Supabase returned: "folders" have a null id, files carry their size.
            const folders: StorageListEntry[] = (response.CommonPrefixes ?? []).map((entry) => ({
              name: (entry.Prefix ?? '').slice(normalized.length).replace(/\/$/, ''),
              id: null,
              metadata: null,
            }))
            const files: StorageListEntry[] = (response.Contents ?? []).map((entry) => ({
              name: (entry.Key ?? '').slice(normalized.length),
              id: entry.ETag ?? entry.Key ?? '',
              metadata: { size: entry.Size ?? 0 },
            }))
            return ok([...folders, ...files])
          } catch (error) {
            return fail(error)
          }
        },

        async download(path) {
          try {
            const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: path }))
            const bytes = await response.Body!.transformToByteArray()
            return ok(new Blob([bytes as BlobPart], { type: response.ContentType ?? 'application/octet-stream' }))
          } catch (error) {
            return fail(error)
          }
        },
      }
    },
  }
}
